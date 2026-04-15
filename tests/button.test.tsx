// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button (M1/T1.4)", () => {
  it("renders primary md by default", () => {
    const { container } = render(<Button>Click</Button>);
    const btn = container.querySelector("button");
    expect(btn).toBeTruthy();
    expect(btn?.className).toMatch(/border/);
  });

  it("supports sm size", () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const btn = container.querySelector("button");
    expect(btn?.className).toMatch(/h-7|h-\[28px\]/);
  });

  it("renders destructive variant", () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const btn = container.querySelector("button");
    expect(btn?.textContent).toBe("Delete");
  });

  it("renders link variant without button border", () => {
    const { container } = render(<Button variant="link">Learn more</Button>);
    const btn = container.querySelector("button");
    expect(btn?.className).not.toMatch(/\bh-\d+\b/);
  });

  it("switches to Link when href is provided", () => {
    const { container } = render(<Button href="/foo">Go</Button>);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/foo");
  });

  it("applies disabled styling", () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    expect(container.querySelector("button")?.className).toMatch(/opacity-50/);
  });
});
