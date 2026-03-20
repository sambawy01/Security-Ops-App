import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-mono font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700 border border-slate-200',
        critical: 'bg-red-100 text-red-800 border border-red-200',
        high: 'bg-orange-100 text-orange-800 border border-orange-200',
        medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        low: 'bg-blue-100 text-blue-800 border border-blue-200',
        success: 'bg-green-100 text-green-800 border border-green-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
