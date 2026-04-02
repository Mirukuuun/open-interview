import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type SafeMarkdownProps = {
  content: string;
  className?: string;
};

function MarkdownParagraph(props: ComponentPropsWithoutRef<"p">) {
  return <p className="leading-7 text-text-strong" {...props} />;
}

function MarkdownList(props: ComponentPropsWithoutRef<"ul">) {
  return <ul className="list-disc space-y-2 pl-6 text-text-strong" {...props} />;
}

function MarkdownOrderedList(props: ComponentPropsWithoutRef<"ol">) {
  return <ol className="list-decimal space-y-2 pl-6 text-text-strong" {...props} />;
}

function MarkdownCode({
  className,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  const isBlockCode = className?.startsWith("language-");

  return (
    <code
      className={cn(
        isBlockCode
          ? "block whitespace-pre-wrap rounded-xl bg-slate-950/95 px-4 py-3 text-[13px] leading-6 text-slate-50"
          : "rounded bg-slate-950/8 px-1.5 py-0.5 text-[13px] text-text-strong",
        className,
      )}
      {...props}
    />
  );
}

function MarkdownPre(props: ComponentPropsWithoutRef<"pre">) {
  return <pre className="overflow-x-auto rounded-xl bg-slate-950/95" {...props} />;
}

export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  return (
    <div className={cn("space-y-4 text-sm", className)}>
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-lg font-semibold tracking-[-0.02em] text-text-strong"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-base font-semibold tracking-[-0.02em] text-text-strong"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-sm font-semibold tracking-[-0.01em] text-text-strong"
              {...props}
            />
          ),
          p: MarkdownParagraph,
          ul: MarkdownList,
          ol: MarkdownOrderedList,
          li: ({ ...props }) => <li className="leading-7" {...props} />,
          strong: ({ ...props }) => (
            <strong className="font-semibold text-text-strong" {...props} />
          ),
          a: ({ className: linkClassName, ...props }) => (
            <a
              className={cn("font-medium text-accent hover:underline", linkClassName)}
              rel="noreferrer"
              target="_blank"
              {...props}
            />
          ),
          pre: MarkdownPre,
          code: MarkdownCode,
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-border-strong pl-4 text-text-muted"
              {...props}
            />
          ),
        }}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
