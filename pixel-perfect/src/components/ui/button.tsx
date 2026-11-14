import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold cursor-pointer transition-[background-color,border-color,color,box-shadow,transform,filter] duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:-translate-y-[1px] hover:bg-primary/92 hover:brightness-[1.05] hover:shadow-soft",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-[1px] hover:bg-destructive/90 hover:brightness-105 hover:shadow-soft",
        outline:
          "border border-input bg-card/85 shadow-xs hover:border-hover-border hover:bg-hover-surface hover:text-foreground",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground shadow-sm hover:border-hover-border hover:bg-secondary/80 hover:brightness-[1.03]",
        ghost: "hover:bg-hover-surface hover:text-foreground",
        link: "text-primary underline-offset-4 hover:text-primary/80 hover:underline",
        gold: "bg-gold text-gold-foreground shadow-soft hover:-translate-y-[1px] hover:bg-gold/92 hover:brightness-[1.04] hover:shadow-lift",
        deep: "bg-deep text-deep-foreground shadow-soft hover:-translate-y-[1px] hover:bg-deep/92 hover:brightness-110 hover:shadow-lift",
        soft: "border border-primary/25 bg-secondary text-secondary-foreground hover:-translate-y-[0.5px] hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-soft",
        onDeep:
          "bg-deep-foreground text-deep hover:-translate-y-[1px] hover:bg-deep-foreground/95 hover:shadow-soft",
        ghostOnDeep:
          "border border-deep-foreground/30 text-deep-foreground hover:-translate-y-[1px] hover:border-deep-foreground/55 hover:bg-deep-foreground/12",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 px-7 text-[0.9375rem]",
        xl: "h-14 px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
