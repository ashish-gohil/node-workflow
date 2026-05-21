"use client";

import { type Ref, useImperativeHandle } from "react";
import {
  type FieldValues,
  FormProvider,
  type Resolver,
  useForm,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NodeUIMeta } from "@repo/types";
import type { ZodType } from "zod";

import { SchemaFieldRenderer } from "./fields/schema-field-renderer";

export interface SchemaNodeConfigFormHandle<
  T extends FieldValues = FieldValues,
> {
  /** Trigger validation + submit. Resolves to true on success. */
  submit: () => Promise<boolean>;
  /** Current values without validating. */
  getValues: () => T;
}

interface SchemaNodeConfigFormProps<T extends FieldValues> {
  schema: ZodType<T>;
  uiMeta: NodeUIMeta;
  defaultValues: T;
  onSubmit: (data: T) => void;
  /** Exposes a submit() handle so the parent dialog's footer "Save" button can drive submission. */
  formRef?: Ref<SchemaNodeConfigFormHandle<T>>;
}

export function SchemaNodeConfigForm<T extends FieldValues>({
  schema,
  uiMeta,
  defaultValues,
  onSubmit,
  formRef,
}: SchemaNodeConfigFormProps<T>) {
  const methods = useForm<T>({
    // Generic ZodType<T> is too loose for @hookform/resolvers; cast at the boundary.
    resolver: zodResolver(schema as never) as Resolver<T>,
    defaultValues: defaultValues as never,
    mode: "onBlur",
  });
  useImperativeHandle(
    formRef,
    () => ({
      submit: async () => {
        let ok = false;
        await methods.handleSubmit((data) => {
          onSubmit(data);
          ok = true;
        })();
        return ok;
      },
      getValues: () => methods.getValues() as T,
    }),
    [methods, onSubmit]
  );

  // Handle empty-state nodes (e.g. ManualTrigger) — no fields to render.
  const hasFields = Object.keys(uiMeta.fields).length > 0;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        {hasFields ? (
          <SchemaFieldRenderer fields={uiMeta.fields} />
        ) : uiMeta.emptyState ? (
          <div className="text-text-muted flex flex-col gap-1 py-8 text-center">
            <p className="text-body-md text-text-secondary">
              {uiMeta.emptyState.message}
            </p>
            {uiMeta.emptyState.hint && (
              <p className="text-body-sm">{uiMeta.emptyState.hint}</p>
            )}
          </div>
        ) : null}
      </form>
    </FormProvider>
  );
}
