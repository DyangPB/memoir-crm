import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DefaultCadenceForm } from "./default-cadence-form";

describe("DefaultCadenceForm", () => {
  it("shows the current global Cadence", () => {
    render(<DefaultCadenceForm days={30} onSave={async () => null} />);

    expect((screen.getByLabelText("Days between catch-ups") as HTMLInputElement).value).toBe("30");
  });

  it("saves a new whole number of days and confirms it", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => null);

    render(<DefaultCadenceForm days={30} onSave={onSave} />);

    const input = screen.getByLabelText("Days between catch-ups");

    await user.clear(input);
    await user.type(input, "14");
    await user.click(screen.getByRole("button", { name: "Save Cadence" }));

    expect(onSave).toHaveBeenCalledWith(14);
    expect(await screen.findByText("Saved.")).toBeTruthy();
  });

  it("shows what went wrong when saving fails", async () => {
    const user = userEvent.setup();

    render(
      <DefaultCadenceForm days={30} onSave={async () => "That didn't reach Memoir."} />,
    );

    await user.click(screen.getByRole("button", { name: "Save Cadence" }));

    expect(await screen.findByText("That didn't reach Memoir.")).toBeTruthy();
    expect(screen.queryByText("Saved.")).toBeNull();
  });

  it("won't send something that isn't a whole number of days", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => null);

    render(<DefaultCadenceForm days={30} onSave={onSave} />);

    await user.clear(screen.getByLabelText("Days between catch-ups"));
    await user.click(screen.getByRole("button", { name: "Save Cadence" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/whole number of days/i)).toBeTruthy();
  });
});
