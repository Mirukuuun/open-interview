// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// jsdom does not ship window.matchMedia; stub a light-mode default so
// ThemeProvider's useEffect can initialise without throwing.
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

describe("ThemeToggle (M1/T1.3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with aria-label containing '主题'", () => {
    const { getByRole } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(getByRole("button", { name: /主题/ })).toBeTruthy();
  });

  it("cycles system → light → dark → system and syncs localStorage + .dark class", () => {
    const { getByRole } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const btn = getByRole("button", { name: /主题/ });

    fireEvent.click(btn); // system → light
    expect(window.localStorage.getItem("openInterviewTheme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    fireEvent.click(btn); // light → dark
    expect(window.localStorage.getItem("openInterviewTheme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(btn); // dark → system
    expect(window.localStorage.getItem("openInterviewTheme")).toBe("system");
  });
});
