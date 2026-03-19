import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 px-2.5 py-0.5 text-xs font-semibold",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 px-2.5 py-0.5 text-xs font-semibold",
        outline: "text-foreground px-2.5 py-0.5 text-xs font-semibold",
        /** Main Color pill with white text — event dates, categories. */
        primary: "border border-primary/[0.35] bg-primary/20 text-primary-foreground px-2.5 py-1.5 text-xs w-fit max-w-full min-w-0 break-words self-start",
        /** Main Color pill with white text, larger — profile category (e.g. DJ · Sydney). */
        primaryMd: "border border-primary/[0.35] bg-primary/20 text-primary-foreground px-4 py-1.5 text-sm gap-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
