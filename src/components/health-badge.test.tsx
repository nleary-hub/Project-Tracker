import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthBadge } from "./health-badge";

describe("HealthBadge", () => {
  it.each([
    ["on_track", "On track", "circle"],
    ["at_risk", "At risk", "triangle"],
    ["off_track", "Off track", "diamond"],
    ["on_hold", "On hold", "ring"],
  ] as const)("renders %s with a text label and its shape", (status, label, shape) => {
    const { container } = render(<HealthBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-shape", shape);
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("marks overrides", () => {
    render(<HealthBadge status="at_risk" override />);
    expect(screen.getByText("override")).toBeInTheDocument();
  });
});
