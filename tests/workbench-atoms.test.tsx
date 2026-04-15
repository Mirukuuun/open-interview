// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DetailGrid } from "@/components/workbench/detail-grid";
import { EmptyList } from "@/components/workbench/empty-list";
import { FormField } from "@/components/workbench/form-field";
import { PageHeader } from "@/components/workbench/page-header";
import { PlaceholderTable } from "@/components/workbench/placeholder-table";
import { SectionHeading } from "@/components/workbench/section-heading";
import { StatsRow } from "@/components/workbench/stats-row";

describe("Workbench atoms (M1/T1.7)", () => {
  it("PageHeader: no eyebrow badge rendered", () => {
    const { container } = render(<PageHeader eyebrow="工作台" title="练习" />);
    // 原实现会渲染 Badge 元素带 "工作台" 文本；新实现不再渲染
    expect(container.textContent).not.toContain("工作台");
    expect(container.textContent).toContain("练习");
  });

  it("PageHeader: title is text-base", () => {
    const { container } = render(<PageHeader title="练习" />);
    const h1 = container.querySelector("h1");
    expect(h1?.className).toMatch(/text-base|text-\[16px\]/);
  });

  it("StatsRow: renders items", () => {
    render(<StatsRow items={[{ label: "总数", value: "12" }]} />);
    expect(screen.getByText("总数")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
  });

  it("SectionHeading: 14px semibold", () => {
    const { container } = render(<SectionHeading title="Section" />);
    expect(container.querySelector("h2")?.className).toMatch(
      /text-\[14px\]|text-sm/,
    );
    expect(container.querySelector("h2")?.className).toMatch(/font-semibold/);
  });

  it("EmptyList: does not use reveal-list class", () => {
    const { container } = render(
      <EmptyList title="空空如也" bullets={["a", "b"]} />,
    );
    expect(container.querySelector(".reveal-list")).toBeNull();
  });

  it("DetailGrid: value not super-large", () => {
    const { container } = render(
      <DetailGrid items={[{ label: "K", value: "V" }]} />,
    );
    const dd = container.querySelector("dd");
    expect(dd?.className).not.toMatch(/text-\[19px\]/);
  });

  it("FormField: renders label and child", () => {
    render(
      <FormField label="姓名">
        <input />
      </FormField>,
    );
    expect(screen.getByText("姓名")).toBeDefined();
  });

  it("PlaceholderTable: no uppercase tracking", () => {
    const { container } = render(
      <PlaceholderTable columns={["A"]} rows={[["1"]]} />,
    );
    expect(container.querySelector("th")?.className).not.toMatch(/uppercase/);
  });
});
