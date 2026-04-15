// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tooltip } from "@/components/ui/tooltip";

describe("Card and new UI (M1/T1.6)", () => {
  it("Card renders subcomponents", () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Header")).toBeDefined();
    expect(screen.getByText("Body")).toBeDefined();
    expect(screen.getByText("Footer")).toBeDefined();
  });

  it("SurfaceCard still works as alias", () => {
    render(<SurfaceCard muted>Legacy</SurfaceCard>);
    expect(screen.getByText("Legacy")).toBeDefined();
  });

  it("Tooltip shows content on hover", () => {
    const { container } = render(
      <Tooltip content="Hint">
        <button type="button">Target</button>
      </Tooltip>,
    );
    const trigger = screen.getByText("Target");
    fireEvent.mouseEnter(trigger.parentElement ?? trigger);
    expect(container.textContent).toMatch(/Hint/);
  });

  it("Dialog opens when open=true", () => {
    render(
      <Dialog open onOpenChange={() => undefined}>
        <div>Modal content</div>
      </Dialog>,
    );
    expect(screen.getByText("Modal content")).toBeDefined();
  });

  it("Separator has role=separator", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("[role='separator']")).toBeTruthy();
  });
});
