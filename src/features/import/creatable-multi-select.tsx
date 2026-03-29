"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CreatableMultiSelectProps = {
  options: string[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  formatOptionLabel?: (value: string) => string;
  triggerPlaceholder: string;
  searchPlaceholder: string;
  createPlaceholder: string;
  emptyText: string;
  createText: string;
  disabled?: boolean;
};

function normalizeValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function includesValue(values: string[], candidate: string) {
  const normalizedCandidate = candidate.toLowerCase();

  return values.some((value) => value.toLowerCase() === normalizedCandidate);
}

export function CreatableMultiSelect({
  options,
  value,
  onChange,
  formatOptionLabel = (value) => value,
  triggerPlaceholder,
  searchPlaceholder,
  createPlaceholder,
  emptyText,
  createText,
  disabled = false,
}: CreatableMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const normalizedQuery = normalizeValue(query);
  const normalizedDraft = normalizeValue(draftValue);
  const allOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [...options, ...value]
            .map(normalizeValue)
            .filter((item) => item.length > 0)
            .map((item) => [item.toLowerCase(), item]),
        ).values(),
      ),
    [options, value],
  );
  const visibleOptions = useMemo(() => {
    const selectedValues = new Set(value.map((item) => item.toLowerCase()));
    const currentQuery = normalizedQuery.toLowerCase();

    return allOptions
      .filter((option) =>
        currentQuery.length === 0
          ? true
          : option.toLowerCase().includes(currentQuery) ||
            formatOptionLabel(option).toLowerCase().includes(currentQuery),
      )
      .sort((left, right) => {
        const leftSelected = selectedValues.has(left.toLowerCase());
        const rightSelected = selectedValues.has(right.toLowerCase());

        if (leftSelected === rightSelected) {
          return formatOptionLabel(left).localeCompare(formatOptionLabel(right), "zh-CN", {
            sensitivity: "base",
          });
        }

        return leftSelected ? -1 : 1;
      })
      .slice(0, 12);
  }, [allOptions, formatOptionLabel, normalizedQuery, value]);
  const canCreate =
    normalizedDraft.length > 0 && !includesValue(allOptions, normalizedDraft);

  function closePanel() {
    setIsOpen(false);
    setQuery("");
    setDraftValue("");
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function toggleValue(nextValue: string) {
    if (includesValue(value, nextValue)) {
      onChange(
        value.filter(
          (item) => item.toLowerCase() !== nextValue.toLowerCase(),
        ),
      );
      return;
    }

    onChange([...value, nextValue]);
  }

  function removeValue(target: string) {
    onChange(
      value.filter((item) => item.toLowerCase() !== target.toLowerCase()),
    );
  }

  function addDraftValue() {
    if (!canCreate) {
      return;
    }

    onChange([...value, normalizedDraft]);
    setDraftValue("");
    setQuery("");
  }

  function summarizeSelection() {
    if (value.length === 0) {
      return triggerPlaceholder;
    }

    if (value.length <= 2) {
      return value.map((item) => formatOptionLabel(item)).join("、");
    }

    return `已选 ${value.length} 项`;
  }

  return (
    <div className="relative space-y-3" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-border-strong bg-white px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:border-accent",
          isOpen ? "border-accent" : "hover:border-border-strong",
        )}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            closePanel();
            return;
          }

          setIsOpen(true);
        }}
        type="button"
      >
        <span
          className={cn(
            "truncate",
            value.length === 0 ? "text-text-muted" : "text-text-strong",
          )}
        >
          {summarizeSelection()}
        </span>
        <span className="text-xs text-text-muted">{isOpen ? "收起" : "展开"}</span>
      </button>

      <div className="flex flex-wrap gap-2">
        {value.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted">
            {emptyText}
          </div>
        ) : (
          value.map((item) => (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent/40"
              disabled={disabled}
              key={item}
              onClick={() => removeValue(item)}
              type="button"
            >
              <span>{formatOptionLabel(item)}</span>
              <span className="text-xs">移除</span>
            </button>
          ))
        )}
      </div>

      {isOpen ? (
        <div className="absolute top-full left-0 z-20 mt-2 w-full rounded-xl border border-border-strong bg-white shadow-lg">
          <div className="border-b border-border-muted p-3">
            <Input
              disabled={disabled}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              value={query}
            />
          </div>

          <div className="max-h-64 overflow-auto p-2">
            {visibleOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-sm text-text-muted">
                没有匹配项
              </div>
            ) : (
              <div className="space-y-1">
                {visibleOptions.map((option) => {
                  const selected = includesValue(value, option);

                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "bg-accent-soft text-accent"
                          : "text-text-strong hover:bg-surface-muted",
                      )}
                      disabled={disabled}
                      key={option}
                      onClick={() => toggleValue(option)}
                      type="button"
                    >
                      <span>{formatOptionLabel(option)}</span>
                      <span className="text-xs">
                        {selected ? "已选" : "选择"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border-muted p-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                disabled={disabled}
                onChange={(event) => setDraftValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addDraftValue();
                  }
                }}
                placeholder={createPlaceholder}
                value={draftValue}
              />
              <Button
                className="shrink-0"
                disabled={disabled || !canCreate}
                onClick={addDraftValue}
                type="button"
              >
                {createText}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
