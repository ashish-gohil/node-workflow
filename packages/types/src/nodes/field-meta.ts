/* ------------------------------------------------------------------ */
/*  Shared UI metadata types                                           */
/*                                                                    */
/*  These types describe how a Zod schema field should render in the  */
/*  frontend. They are intentionally decoupled from validation — the  */
/*  Zod schema stays the single source of truth for shape, and the    */
/*  UIMeta only controls presentation.                                */
/* ------------------------------------------------------------------ */

export type FieldWidth = "full" | "twoThirds" | "half" | "third" | "quarter";

export type FieldOption = {
  label: string;
  value: string;
};

/** Show this field only when another field has (or does not have) the listed values. */
export type ShowWhen = {
  field: string;
  in?: string[];
  notIn?: string[];
};

interface BaseFieldMeta {
  label?: string;
  width?: FieldWidth;
  showWhen?: ShowWhen;
  helper?: string;
}

export interface TextFieldMeta extends BaseFieldMeta {
  widget: "text";
  placeholder?: string;
  inputType?: "text" | "password" | "email" | "url";
  default?: string;
}

export interface NumberFieldMeta extends BaseFieldMeta {
  widget: "number";
  placeholder?: string;
  default?: number;
  min?: number;
  max?: number;
}

export interface TextAreaFieldMeta extends BaseFieldMeta {
  widget: "textArea";
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}

export interface SelectFieldMeta extends BaseFieldMeta {
  widget: "select";
  options: FieldOption[];
  default?: string;
  placeholder?: string;
}

export interface MultiSelectFieldMeta extends BaseFieldMeta {
  widget: "multiSelect";
  options: FieldOption[];
  default?: string[];
}

export interface KeyValueFieldMeta extends BaseFieldMeta {
  widget: "keyValueList";
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
}

export interface JsonEditorFieldMeta extends BaseFieldMeta {
  widget: "jsonEditor";
  placeholder?: string;
  rows?: number;
}

export interface DateTimePickerFieldMeta extends BaseFieldMeta {
  widget: "dateTimePicker";
}

/** Renders one of several widgets based on a sibling field's value. */
export interface ConditionalFieldMeta extends BaseFieldMeta {
  widget: "conditional";
  dependsOn: string;
  /** Map: dependsOn value → widget name (or null to hide). */
  widgetMap: Record<string, FieldMeta["widget"] | null>;
}

/** Nested object: renders a sub-form. Sibling references in `showWhen` resolve within `fields`. */
export interface ObjectFieldMeta extends BaseFieldMeta {
  widget: "object";
  fields: Record<string, FieldMeta>;
}

/** Repeatable list of records, e.g. SetVariable.assignments. */
export interface FieldArrayMeta extends BaseFieldMeta {
  widget: "fieldArray";
  addLabel?: string;
  itemFields: Record<string, FieldMeta>;
}

export type FieldMeta =
  | TextFieldMeta
  | NumberFieldMeta
  | TextAreaFieldMeta
  | SelectFieldMeta
  | MultiSelectFieldMeta
  | KeyValueFieldMeta
  | JsonEditorFieldMeta
  | DateTimePickerFieldMeta
  | ConditionalFieldMeta
  | ObjectFieldMeta
  | FieldArrayMeta;

export type EmptyStateMeta = {
  message: string;
  hint?: string;
};

export type NodeUIMeta = {
  nodeType: string;
  displayName: string;
  icon: string;
  category: "trigger" | "action" | "logic";
  description: string;
  fields: Record<string, FieldMeta>;
  emptyState?: EmptyStateMeta;
};
