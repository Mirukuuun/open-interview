import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormField({
  label,
  description,
  className,
  children,
}: Readonly<FormFieldProps>) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[13px] font-medium text-[color:var(--color-foreground)]">
        {label}
      </span>
      {children}
      {description ? (
        <p className="text-xs leading-5 text-[color:var(--color-muted-foreground)]">
          {description}
        </p>
      ) : null}
    </label>
  );
}
