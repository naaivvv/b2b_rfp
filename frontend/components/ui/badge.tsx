import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
        secondary:
          "border-white/10 bg-white/5 text-slate-300",
        outline:
          "border-white/10 text-slate-300",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-300",
        muted:
          "border-white/10 bg-white/5 text-slate-400",
        destructive:
          "border-rose-500/30 bg-rose-500/10 text-rose-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
