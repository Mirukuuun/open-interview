import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <h2 className="text-base font-semibold tracking-[-0.02em] text-text-strong">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-6 text-text-muted">{description}</p>
      ) : null}
    </div>
  );
}
