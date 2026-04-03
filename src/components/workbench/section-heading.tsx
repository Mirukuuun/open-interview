import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({
  title,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-text-strong">
        {title}
      </h2>
    </div>
  );
}
