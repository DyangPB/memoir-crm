import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CadenceHealthPill } from "./cadence-health-pill";

describe("CadenceHealthPill", () => {
  it("shows the share of Contacts in touch", () => {
    render(<CadenceHealthPill health={{ tracked: 6, inTouch: 5, percent: 84 }} />);

    expect(screen.getByText("84% in touch")).toBeTruthy();
  });

  it("explains the figure for anyone who hovers or uses a screen reader", () => {
    render(<CadenceHealthPill health={{ tracked: 6, inTouch: 5, percent: 84 }} />);

    expect(screen.getByTitle("5 of 6 contacts are within their Cadence")).toBeTruthy();
  });

  it("is absent until there is somebody to measure", () => {
    const { container } = render(<CadenceHealthPill health={null} />);

    expect(container.textContent).toBe("");
  });
});
