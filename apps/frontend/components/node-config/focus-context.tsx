"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useFormContext } from "react-hook-form";

/* ============================================================
   FocusContext — bridges the data panel and the parameter form.

   Text fields register themselves on focus; the input panel calls
   insertAtCursor() when a user clicks a value in the JSON tree.

   The provider lives at the dialog level (outside the RHF
   FormProvider) so both panels share state. Fields register an
   `onInsert` callback that knows how to splice text into their
   form value — this keeps the provider RHF-agnostic.
   ============================================================ */

type FocusTarget = {
  element: HTMLInputElement | HTMLTextAreaElement;
  onInsert: (text: string) => void;
};

interface FocusContextValue {
  register: (target: FocusTarget) => void;
  unregister: (element: HTMLInputElement | HTMLTextAreaElement) => void;
  insertAtCursor: (text: string) => void;
  hasFocusTarget: () => boolean;
}

const FocusContext = createContext<FocusContextValue | null>(null);

interface FocusProviderProps {
  children: ReactNode;
}

export function FocusProvider({ children }: FocusProviderProps) {
  const targetRef = useRef<FocusTarget | null>(null);

  const value = useMemo<FocusContextValue>(
    () => ({
      register: (target) => {
        targetRef.current = target;
      },
      unregister: (element) => {
        if (targetRef.current?.element === element) {
          // Defer clearing so a click in the JSON tree (which blurs the input)
          // still sees the previously focused target.
          setTimeout(() => {
            if (targetRef.current?.element === element) {
              targetRef.current = null;
            }
          }, 150);
        }
      },
      insertAtCursor: (text) => {
        const target = targetRef.current;
        if (!target) {return;}
        target.onInsert(text);
      },
      hasFocusTarget: () => targetRef.current !== null,
    }),
    []
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocusContext(): FocusContextValue | null {
  return useContext(FocusContext);
}

/**
 * Hook for text-style inputs: register the element on focus, deregister on
 * blur. Splices inserted text at the current cursor position and commits via
 * RHF setValue so validation rebinds correctly.
 */
export function useExpressionFocus(formPath: string) {
  const ctx = useFocusContext();
  const form = useFormContext();
  const elementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const insertAtCursor = useCallback(
    (text: string) => {
      const element = elementRef.current;
      if (!element || !form) {return;}
      const current = element.value ?? "";
      const start = element.selectionStart ?? current.length;
      const end = element.selectionEnd ?? current.length;
      const next = current.slice(0, start) + text + current.slice(end);
      form.setValue(formPath, next, { shouldDirty: true, shouldValidate: false });
      requestAnimationFrame(() => {
        element.focus();
        const cursor = start + text.length;
        element.setSelectionRange(cursor, cursor);
      });
    },
    [form, formPath]
  );

  const onFocus = useCallback(() => {
    if (!ctx || !elementRef.current) {return;}
    ctx.register({ element: elementRef.current, onInsert: insertAtCursor });
  }, [ctx, insertAtCursor]);

  const onBlur = useCallback(() => {
    if (!ctx || !elementRef.current) {return;}
    ctx.unregister(elementRef.current);
  }, [ctx]);

  return { elementRef, onFocus, onBlur };
}
