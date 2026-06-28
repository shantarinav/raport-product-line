import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../cn";

const headerIconButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-raport-action-border bg-raport-action-bg text-raport-primary transition-colors hover:bg-raport-action-bg-active";

type HeaderIconButtonBaseProps = {
  children: ReactNode;
  className?: string;
  title: string;
  "aria-label"?: string;
};

type HeaderIconButtonLinkProps = HeaderIconButtonBaseProps & {
  to: LinkProps["to"];
  onClick?: never;
};

type HeaderIconButtonButtonProps = HeaderIconButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "title"> & {
    to?: never;
  };

type HeaderIconButtonProps = HeaderIconButtonLinkProps | HeaderIconButtonButtonProps;

export function HeaderIconButton({ children, className, title, ...props }: HeaderIconButtonProps) {
  const ariaLabel = props["aria-label"] ?? title;
  const classes = cn(headerIconButtonClass, className);

  if ("to" in props && props.to !== undefined) {
    return (
      <Link to={props.to} title={title} aria-label={ariaLabel} className={classes}>
        {children}
      </Link>
    );
  }

  const { to: _to, ...buttonProps } = props;

  return (
    <button type="button" title={title} aria-label={ariaLabel} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
