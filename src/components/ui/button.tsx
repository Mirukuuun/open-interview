import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-accent text-white shadow-[0_1px_0_rgba(79,70,229,0.18)] hover:bg-accent-secondary",
  secondary:
    "border border-border-strong bg-white text-text-strong hover:border-accent hover:bg-accent-soft",
  ghost:
    "border border-transparent bg-transparent text-text-muted hover:bg-surface-muted hover:text-text-strong",
};

type SharedProps = {
  className?: string;
  variant?: ButtonVariant;
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

function buttonClasses(variant: ButtonVariant, className?: string) {
  return cn(
    "inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-[14px] px-4 text-sm font-medium tracking-[0.01em] transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
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
      ...linkProps
    } = props;

    return (
      <Link className={buttonClasses(variant, className)} href={href} {...linkProps}>
        {children}
      </Link>
    );
  }

  const {
    className,
    type = "button",
    variant = "secondary",
    ...buttonProps
  } = props;

  return (
    <button
      className={buttonClasses(variant, className)}
      type={type}
      {...buttonProps}
    />
  );
}
