import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-blue-700 focus-visible:outline-accent",
  secondary:
    "border border-border-strong bg-white text-text-strong hover:bg-surface-muted focus-visible:outline-border-strong",
  ghost:
    "bg-transparent text-text-muted hover:bg-surface-muted hover:text-text-strong focus-visible:outline-border-strong",
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
    "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
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
