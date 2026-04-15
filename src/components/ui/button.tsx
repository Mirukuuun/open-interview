import Link from "next/link";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand)]/90",
  secondary:
    "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-subtle)]",
  ghost:
    "border border-transparent bg-transparent text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-subtle)]",
  destructive:
    "border border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)] text-white hover:bg-[color:var(--color-destructive)]/90",
  link: "text-[color:var(--color-brand)] underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs rounded-[var(--radius-md)]",
  md: "h-[34px] px-3.5 text-[13px] rounded-[var(--radius-md)]",
  lg: "h-10 px-4.5 text-sm rounded-[var(--radius-md)]",
  xl: "h-[46px] px-6.5 text-[15px] rounded-[var(--radius-md)]",
};

const linkSizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-[13px]",
  lg: "text-sm",
  xl: "text-[15px]",
};

type SharedProps = {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type ButtonProps = SharedProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkButtonProps = SharedProps &
  Omit<React.ComponentProps<typeof Link>, "className">;

function isLinkButtonProps(
  props: ButtonProps | LinkButtonProps,
): props is LinkButtonProps {
  return "href" in props && props.href !== undefined;
}

function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  const isLink = variant === "link";
  const base =
    "inline-flex items-center justify-center font-medium transition-colors duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

  return cn(
    base,
    isLink ? linkSizeClasses[size] : sizeClasses[size],
    variantClasses[variant],
    className,
  );
}

export function Button(props: ButtonProps | LinkButtonProps) {
  if (isLinkButtonProps(props)) {
    const {
      children,
      className,
      href,
      variant = "secondary",
      size = "md",
      ...linkProps
    } = props;

    return (
      <Link
        className={buttonClasses(variant, size, className)}
        href={href}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }

  const {
    className,
    type = "button",
    variant = "secondary",
    size = "md",
    ...buttonProps
  } = props;

  return (
    <button
      className={buttonClasses(variant, size, className)}
      type={type}
      {...buttonProps}
    />
  );
}
