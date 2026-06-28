import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";
import { Button } from "../shadcn/button";

type IconActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function IconActionButton({ children, className, type = "button", ...props }: IconActionButtonProps) {
  return (
    <Button
      type={type}
      className={cn("h-9 w-9 shrink-0 px-0 py-0", className)}
      {...props}
    >
      {children}
    </Button>
  );
}
