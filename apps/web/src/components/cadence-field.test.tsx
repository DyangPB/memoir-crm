import type { CadenceSettings } from "@memoir/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { CadenceField } from "./cadence-field";

function Harness({
  initial,
  onChange,
}: {
  initial: CadenceSettings;
  onChange: (value: CadenceSettings) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <CadenceField
      defaultDays={30}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      value={value}
    />
  );
}

const FOLLOWING_DEFAULT: CadenceSettings = { cadenceDays: null, cadenceTracked: true };

describe("CadenceField", () => {
  it("says a Contact follows the default Cadence until told otherwise", () => {
    render(<Harness initial={FOLLOWING_DEFAULT} onChange={() => {}} />);

    const choice = screen.getByLabelText("Cadence") as HTMLSelectElement;

    expect(choice.selectedOptions[0]?.textContent).toBe("Use my default (every 30 days)");
    expect(screen.queryByLabelText("Days between catch-ups")).toBeNull();
  });

  it("sets an override of the user's own choosing", async () => {
    const user = userEvent.setup();
    const changes: CadenceSettings[] = [];

    render(<Harness initial={FOLLOWING_DEFAULT} onChange={(value) => changes.push(value)} />);

    await user.selectOptions(screen.getByLabelText("Cadence"), "Choose my own");

    const days = screen.getByLabelText("Days between catch-ups") as HTMLInputElement;

    expect(days.value).toBe("30");

    await user.clear(days);
    await user.type(days, "14");

    expect(changes.at(-1)).toEqual({ cadenceDays: 14, cadenceTracked: true });
  });

  it("shows an existing override", () => {
    render(<Harness initial={{ cadenceDays: 7, cadenceTracked: true }} onChange={() => {}} />);

    expect((screen.getByLabelText("Days between catch-ups") as HTMLInputElement).value).toBe("7");
  });

  it("opts a Contact out of Cadence", async () => {
    const user = userEvent.setup();
    const changes: CadenceSettings[] = [];

    render(
      <Harness
        initial={{ cadenceDays: 7, cadenceTracked: true }}
        onChange={(value) => changes.push(value)}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Cadence"), "Don't track a Cadence");

    expect(changes.at(-1)).toEqual({ cadenceDays: null, cadenceTracked: false });
    expect(screen.queryByLabelText("Days between catch-ups")).toBeNull();
  });

  it("goes back to the default", async () => {
    const user = userEvent.setup();
    const changes: CadenceSettings[] = [];

    render(
      <Harness
        initial={{ cadenceDays: 7, cadenceTracked: true }}
        onChange={(value) => changes.push(value)}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Cadence"), "Use my default (every 30 days)");

    expect(changes.at(-1)).toEqual(FOLLOWING_DEFAULT);
  });

  it("never leaves a value in the form that the box doesn't show", async () => {
    const user = userEvent.setup();
    const changes: CadenceSettings[] = [];

    render(
      <Harness
        initial={{ cadenceDays: 7, cadenceTracked: true }}
        onChange={(value) => changes.push(value)}
      />,
    );

    const days = screen.getByLabelText("Days between catch-ups") as HTMLInputElement;

    await user.clear(days);
    await user.tab();

    expect(days.value).toBe("7");
    expect(changes).toEqual([]);
  });

  it("remembers an override while the Contact is switched off and on again", async () => {
    const user = userEvent.setup();

    render(<Harness initial={{ cadenceDays: 7, cadenceTracked: true }} onChange={() => {}} />);

    await user.selectOptions(screen.getByLabelText("Cadence"), "Don't track a Cadence");
    await user.selectOptions(screen.getByLabelText("Cadence"), "Choose my own");

    expect((screen.getByLabelText("Days between catch-ups") as HTMLInputElement).value).toBe("7");
  });
});
