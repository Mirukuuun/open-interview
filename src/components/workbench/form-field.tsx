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
    <label className={cn("block space-y-2", className)}>
      <span className="text-sm font-medium text-text-strong">{label}</span>
      {children}
      {description ? (
        <p className="text-xs leading-5 text-text-muted">{description}</p>
      ) : null}
    </label>
  );
}
