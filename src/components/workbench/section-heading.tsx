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
    <div className={cn("space-y-1", className)}>
      <h2 className="text-[14px] font-semibold text-[color:var(--color-foreground)]">
        {title}
      </h2>
      {description ? (
        <p className="text-[13px] text-[color:var(--color-muted-foreground)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
