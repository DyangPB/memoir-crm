import { isIsoDay } from "./contact";

export const fieldTypes = [
  "text",
  "number",
  "date",
  "single-select",
  "multi-select",
  "long-text",
  "boolean",
  "url",
] as const;

export type FieldType = (typeof fieldTypes)[number];

export type FieldDefinitionInput = {
  name: string;
  type: FieldType;
  options: string[];
};

export type FieldDefinition = FieldDefinitionInput & {
  id: string;
};

export type FieldDefinitionSummary = FieldDefinition & {
  contactCount: number;
};

export type FieldDefinitionParseResult =
  | { ok: true; field: FieldDefinitionInput }
  | { ok: false; message: string };

export type CustomFieldValues = Record<string, unknown>;

export type CustomFieldValuesParseResult =
  | { ok: true; values: CustomFieldValues }
  | { ok: false; message: string };

type FieldValueParseResult = { ok: true; value: unknown } | { ok: false; message: string };

type FieldValueParser = (
  value: unknown,
  field: FieldDefinitionInput,
) => FieldValueParseResult;

const NAME_MAX_LENGTH = 50;
const OPTION_MAX_LENGTH = 50;
const MAX_OPTIONS = 50;
const TEXT_MAX_LENGTH = 500;
const LONG_TEXT_MAX_LENGTH = 5000;

function omit(): FieldValueParseResult {
  return { ok: true, value: undefined };
}

function parseText(
  value: unknown,
  field: FieldDefinitionInput,
  maxLength: number,
): FieldValueParseResult {
  if (value === null || value === undefined) {
    return omit();
  }

  if (typeof value !== "string") {
    return { ok: false, message: `"${field.name}" needs to be text.` };
  }

  const text = value.trim();

  if (text === "") {
    return omit();
  }

  if (text.length > maxLength) {
    return {
      ok: false,
      message: `"${field.name}" is too long. Keep it under ${maxLength} characters.`,
    };
  }

  return { ok: true, value: text };
}

function parseNumber(value: unknown, field: FieldDefinitionInput): FieldValueParseResult {
  if (value === null || value === undefined || value === "") {
    return omit();
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, message: `Add a number for "${field.name}".` };
  }

  return { ok: true, value };
}

function parseDate(value: unknown, field: FieldDefinitionInput): FieldValueParseResult {
  if (value === null || value === undefined || value === "") {
    return omit();
  }

  if (typeof value !== "string" || !isIsoDay(value.trim())) {
    return { ok: false, message: `"${field.name}" needs a date like 1990-05-04.` };
  }

  return { ok: true, value: value.trim() };
}

function parseSingleSelect(value: unknown, field: FieldDefinitionInput): FieldValueParseResult {
  if (value === null || value === undefined || value === "") {
    return omit();
  }

  if (typeof value !== "string" || !field.options.includes(value.trim())) {
    return { ok: false, message: `Pick one of the options for "${field.name}".` };
  }

  return { ok: true, value: value.trim() };
}

function parseMultiSelect(value: unknown, field: FieldDefinitionInput): FieldValueParseResult {
  if (value === null || value === undefined) {
    return omit();
  }

  if (!isStringArray(value)) {
    return { ok: false, message: `Pick from the options for "${field.name}".` };
  }

  const picked = [...new Set(value.map((item) => item.trim()).filter((item) => item !== ""))];

  if (picked.length === 0) {
    return omit();
  }

  const unknown = picked.find((item) => !field.options.includes(item));

  if (unknown !== undefined) {
    return { ok: false, message: `"${unknown}" isn't one of the options for "${field.name}".` };
  }

  return { ok: true, value: picked };
}

function parseBoolean(value: unknown, field: FieldDefinitionInput): FieldValueParseResult {
  if (value === null || value === undefined) {
    return omit();
  }

  if (typeof value !== "boolean") {
    return { ok: false, message: `"${field.name}" needs a yes or no.` };
  }

  return { ok: true, value };
}

function parseUrl(value: unknown, field: FieldDefinitionInput): FieldValueParseResult {
  if (value === null || value === undefined || value === "") {
    return omit();
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      message: `"${field.name}" needs a full web address, like https://example.com.`,
    };
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return omit();
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return { ok: true, value: new URL(withScheme).toString() };
  } catch {
    return {
      ok: false,
      message: `"${field.name}" needs a full web address, like https://example.com.`,
    };
  }
}

const fieldValueParsers: Record<FieldType, FieldValueParser> = {
  text: (value, field) => parseText(value, field, TEXT_MAX_LENGTH),
  number: parseNumber,
  date: parseDate,
  "single-select": parseSingleSelect,
  "multi-select": parseMultiSelect,
  "long-text": (value, field) => parseText(value, field, LONG_TEXT_MAX_LENGTH),
  boolean: parseBoolean,
  url: parseUrl,
};

export function parseCustomFieldValues(
  definitions: readonly FieldDefinition[],
  input: unknown,
): CustomFieldValuesParseResult {
  if (input === undefined || input === null) {
    return { ok: true, values: {} };
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Send the custom fields as an object." };
  }

  const values: CustomFieldValues = {};

  for (const [fieldId, raw] of Object.entries(input)) {
    const definition = definitions.find((item) => item.id === fieldId);

    if (definition === undefined) {
      return { ok: false, message: "One of those fields isn't yours." };
    }

    const parsed = fieldValueParsers[definition.type](raw, definition);

    if (!parsed.ok) {
      return parsed;
    }

    if (parsed.value !== undefined) {
      values[fieldId] = parsed.value;
    }
  }

  return { ok: true, values };
}

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && (fieldTypes as readonly string[]).includes(value);
}

export function fieldTypeLabel(type: FieldType): string {
  switch (type) {
    case "text":
      return "Text";
    case "number":
      return "Number";
    case "date":
      return "Date";
    case "single-select":
      return "Single select";
    case "multi-select":
      return "Multi select";
    case "long-text":
      return "Long text";
    case "boolean":
      return "Boolean";
    case "url":
      return "URL";
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseFieldDefinitionInput(input: unknown): FieldDefinitionParseResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "Send the field as JSON." };
  }

  const record = input as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";

  if (name === "") {
    return { ok: false, message: "Add a name for this field." };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, message: "That field name is too long. Keep it under 50 characters." };
  }

  if (!isFieldType(record.type)) {
    return { ok: false, message: "Pick a field type." };
  }

  let options: string[] = [];

  if (record.type === "single-select" || record.type === "multi-select") {
    const raw = record.options ?? [];

    if (!isStringArray(raw)) {
      return { ok: false, message: "Select fields need a list of options." };
    }

    options = [...new Set(raw.map((option) => option.trim()).filter((option) => option !== ""))];

    if (options.length === 0) {
      return { ok: false, message: "Add at least one option for a select field." };
    }

    if (options.length > MAX_OPTIONS) {
      return { ok: false, message: "Select fields take at most 50 options." };
    }

    if (options.some((option) => option.length > OPTION_MAX_LENGTH)) {
      return { ok: false, message: "That option is too long. Keep it under 50 characters." };
    }
  }

  return { ok: true, field: { name, type: record.type, options } };
}
