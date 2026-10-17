import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DaysSince } from "./days-since";

describe("DaysSince", () => {
  it("shows the count of days since you talked", () => {
    render(<DaysSince days={12} targetDays={30} />);

    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("days since you talked")).toBeTruthy();
  });

  it("flags a Contact past their Cadence, in words as well as colour", () => {
    render(<DaysSince days={45} targetDays={30} />);

    expect(screen.getByText("Past your Cadence of 30 days.")).toBeTruthy();
    expect(screen.getByText("45").className).toContain("text-amber");
  });

  it("stays calm on the target day itself", () => {
    render(<DaysSince days={30} targetDays={30} />);

    expect(screen.queryByText(/past your cadence/i)).toBeNull();
    expect(screen.getByText("30").className).not.toContain("text-amber");
  });

  it("never flags a Contact that has no target", () => {
    render(<DaysSince days={400} targetDays={null} />);

    expect(screen.queryByText(/past your cadence/i)).toBeNull();
    expect(screen.getByText("400").className).not.toContain("text-amber");
  });
});
