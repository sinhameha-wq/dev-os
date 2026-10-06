import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand text-white',
        secondary: 'border-transparent bg-grey-100 text-grey-700',
        success: 'border-transparent bg-success-50 text-success-700',
        warning: 'border-transparent bg-warning-50 text-warning-600',
        danger: 'border-transparent bg-danger-50 text-danger-600',
        outline: 'text-grey-700 border-grey-200',
        custom: 'border-transparent bg-brand-50 text-brand-700',
        edited: 'border-transparent bg-grey-100 text-grey-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
