import { describe, expect, it } from "vitest";

import { parseCustomFieldValues, parseFieldDefinitionInput } from "../src/custom-field";
import type { FieldDefinition } from "../src/custom-field";

function field(type: FieldDefinition["type"], options: string[] = []): FieldDefinition {
  return { id: `field-${type}`, name: "Test", type, options };
}

describe("parseFieldDefinitionInput", () => {
  it("normalizes a field definition", () => {
    expect(
      parseFieldDefinitionInput({
        name: "  Family  ",
        type: "single-select",
        options: [" Family ", "Friends", "Family", ""],
      }),
    ).toEqual({
      ok: true,
      field: { name: "Family", type: "single-select", options: ["Family", "Friends"] },
    });
  });

  it("drops options for types that don't use them", () => {
    expect(
      parseFieldDefinitionInput({ name: "Family size", type: "number", options: ["One", "Two"] }),
    ).toEqual({
      ok: true,
      field: { name: "Family size", type: "number", options: [] },
    });
  });

  it("requires a name", () => {
    expect(parseFieldDefinitionInput({ name: "   ", type: "text" })).toEqual({
      ok: false,
      message: "Add a name for this field.",
    });
  });
});

describe("parseCustomFieldValues", () => {
  it("accepts a value for each field type", () => {
    const definitions = [
      field("text"),
      field("number"),
      field("date"),
      field("single-select", ["Family", "Friends"]),
      field("multi-select", ["Home", "Work"]),
      field("long-text"),
      field("boolean"),
      field("url"),
    ];

    expect(
      parseCustomFieldValues(definitions, {
        "field-text": "  Sourdough starter  ",
        "field-number": 3,
        "field-date": "1990-05-14",
        "field-single-select": "Family",
        "field-multi-select": ["Work", "Home", "Work"],
        "field-long-text": "  Allergic to nuts  ",
        "field-boolean": true,
        "field-url": "instagram.com/bob",
      }),
    ).toEqual({
      ok: true,
      values: {
        "field-text": "Sourdough starter",
        "field-number": 3,
        "field-date": "1990-05-14",
        "field-single-select": "Family",
        "field-multi-select": ["Work", "Home"],
        "field-long-text": "Allergic to nuts",
        "field-boolean": true,
        "field-url": "https://instagram.com/bob",
      },
    });
  });

  it("drops empty values instead of storing them", () => {
    const definitions = [
      field("text"),
      field("number"),
      field("date"),
      field("single-select", ["Family"]),
      field("multi-select", ["Home"]),
      field("long-text"),
      field("boolean"),
      field("url"),
    ];

    expect(
      parseCustomFieldValues(definitions, {
        "field-text": "   ",
        "field-number": "",
        "field-date": "",
        "field-single-select": "",
        "field-multi-select": ["   "],
        "field-long-text": "",
        "field-url": "  ",
      }),
    ).toEqual({ ok: true, values: {} });
  });

  it("keeps false and zero", () => {
    const definitions = [field("boolean"), field("number")];

    expect(
      parseCustomFieldValues(definitions, { "field-boolean": false, "field-number": 0 }),
    ).toEqual({ ok: true, values: { "field-boolean": false, "field-number": 0 } });
  });

  it("rejects values that don't match the field type", () => {
    const cases: [FieldDefinition, unknown, string][] = [
      [field("number"), "three", 'Add a number for "Test".'],
      [field("date"), "14-05-1990", '"Test" needs a date like 1990-05-04.'],
      [
        field("single-select", ["Family"]),
        "Neighbours",
        'Pick one of the options for "Test".',
      ],
      [field("multi-select", ["Home"]), "Home", 'Pick from the options for "Test".'],
      [
        field("multi-select", ["Home"]),
        ["Away"],
        '"Away" isn\'t one of the options for "Test".',
      ],
      [field("boolean"), "yes", '"Test" needs a yes or no.'],
      [
        field("url"),
        "not a url",
        '"Test" needs a full web address, like https://example.com.',
      ],
      [field("text"), 42, '"Test" needs to be text.'],
    ];

    for (const [definition, value, message] of cases) {
      expect(parseCustomFieldValues([definition], { [definition.id]: value })).toEqual({
        ok: false,
        message,
      });
    }
  });

  it("caps the length of text and long text", () => {
    expect(
      parseCustomFieldValues([field("text")], { "field-text": "a".repeat(501) }),
    ).toEqual({
      ok: false,
      message: '"Test" is too long. Keep it under 500 characters.',
    });
    expect(
      parseCustomFieldValues([field("long-text")], { "field-long-text": "a".repeat(5001) }),
    ).toEqual({
      ok: false,
      message: '"Test" is too long. Keep it under 5000 characters.',
    });
  });

  it("refuses field ids the user never defined", () => {
    expect(parseCustomFieldValues([], { "field-text": "Anything" })).toEqual({
      ok: false,
      message: "One of those fields isn't yours.",
    });
  });

  it("treats missing values as an empty set", () => {
    expect(parseCustomFieldValues([field("text")], undefined)).toEqual({ ok: true, values: {} });
    expect(parseCustomFieldValues([field("text")], null)).toEqual({ ok: true, values: {} });
  });

  it("rejects values that aren't an object", () => {
    expect(parseCustomFieldValues([field("text")], ["nope"])).toEqual({
      ok: false,
      message: "Send the custom fields as an object.",
    });
  });
});
