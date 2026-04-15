// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

describe("Atomic UI (M1/T1.5)", () => {
  it("Badge: no uppercase/tracking by default", () => {
    const { container } = render(<Badge>New</Badge>);
    const span = container.querySelector("span");
    expect(span?.className).not.toMatch(/uppercase/);
    expect(span?.className).not.toMatch(/tracking-\[0\.08em\]/);
  });

  it("Badge: supports destructive tone (new)", () => {
    const { container } = render(<Badge tone="destructive">Gone</Badge>);
    expect(container.querySelector("span")?.textContent).toBe("Gone");
  });

  it("Input: uses radius-md token", () => {
    const { container } = render(<Input />);
    expect(container.querySelector("input")?.className).toMatch(
      /rounded-\[var\(--radius-md\)\]|rounded-\[6px\]/,
    );
  });

  it("Select: height h-10", () => {
    const { container } = render(<Select />);
    expect(container.querySelector("select")?.className).toMatch(/h-10/);
  });

  it("Textarea: min-height 3 lines", () => {
    const { container } = render(<Textarea />);
    expect(container.querySelector("textarea")?.className).toMatch(/min-h-\[84px\]|min-h-20/);
  });

  it("Skeleton: uses surface-subtle + radius-md", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    const div = container.querySelector("div");
    expect(div?.className).toMatch(/surface-subtle/);
    expect(div?.className).toMatch(/rounded-\[var\(--radius-md\)\]|rounded-\[6px\]/);
  });
});
