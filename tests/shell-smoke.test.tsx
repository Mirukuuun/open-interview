// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/questions",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ThemeProvider } from "@/components/ui/theme-provider";
import { AppSidebar } from "@/features/workbench/app-sidebar";
import { TopBar } from "@/features/workbench/top-bar";

const mockSummary = { needsReviewCount: 0 } as never;

const mockLlmProvider = {
  configured: true,
  status: "connected",
  message: "OK",
} as never;

function stubMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("Shell (M1/T1.8)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("AppSidebar: no surface-nav class", () => {
    const { container } = render(<AppSidebar summary={mockSummary} />);
    expect(container.innerHTML).not.toMatch(/bg-surface-nav/);
  });

  it("AppSidebar: no text-text-inverse class", () => {
    const { container } = render(<AppSidebar summary={mockSummary} />);
    expect(container.innerHTML).not.toMatch(/text-text-inverse/);
  });

  it("AppSidebar: no sidebar-tooltip CSS class reference", () => {
    const { container } = render(<AppSidebar summary={mockSummary} />);
    expect(container.innerHTML).not.toMatch(/sidebar-tooltip/);
  });

  it("TopBar: no '本地优先' badge text", () => {
    const { container } = render(
      <ThemeProvider>
        <TopBar llmProvider={mockLlmProvider} />
      </ThemeProvider>,
    );
    expect(container.textContent).not.toContain("本地优先");
  });

  it("TopBar: no '工作台' heading text", () => {
    const { container } = render(
      <ThemeProvider>
        <TopBar llmProvider={mockLlmProvider} />
      </ThemeProvider>,
    );
    expect(container.textContent).not.toContain("工作台");
  });
});
