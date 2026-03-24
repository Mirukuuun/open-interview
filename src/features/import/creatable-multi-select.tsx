"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CreatableMultiSelectProps = {
  options: string[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  placeholder: string;
  emptyText: string;
  createText: string;
  disabled?: boolean;
  maxSelected?: number;
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
  placeholder,
  emptyText,
  createText,
  disabled = false,
  maxSelected,
}: CreatableMultiSelectProps) {
  const [draftValue, setDraftValue] = useState("");
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
    const query = normalizedDraft.toLowerCase();

    return allOptions
      .filter((option) =>
        query.length === 0 ? true : option.toLowerCase().includes(query),
      )
      .slice(0, 12);
  }, [allOptions, normalizedDraft]);
  const canCreate =
    normalizedDraft.length > 0 && !includesValue(allOptions, normalizedDraft);

  function setSelectedValue(nextValue: string) {
    if (maxSelected === 1) {
      onChange([nextValue]);
      return;
    }

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

    setSelectedValue(normalizedDraft);
    setDraftValue("");
  }

  return (
    <div className="space-y-3">
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
              <span>{item}</span>
              <span className="text-xs">移除</span>
            </button>
          ))
        )}
      </div>

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
          placeholder={placeholder}
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

      <div className="flex flex-wrap gap-2">
        {visibleOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong px-3 py-2 text-sm text-text-muted">
            没有匹配项，可直接新建。
          </div>
        ) : (
          visibleOptions.map((option) => {
            const selected = includesValue(value, option);

            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border-muted bg-surface-muted text-text-strong hover:border-border-strong hover:bg-white",
                )}
                disabled={disabled}
                key={option}
                onClick={() => setSelectedValue(option)}
                type="button"
              >
                {option}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
