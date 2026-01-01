import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import CornerIcons from './corners'

const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-none text-sm font-medium transition-all',
    'disabled:pointer-events-none disabled:opacity-60',
    'outline-none focus-visible:ring-[3px] focus-visible:ring-state-focus',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 hover:cursor-pointer',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-btn-primary-bg',
          'text-btn-primary-text',
          'hover:bg-btn-primary-hover',
        ].join(' '),

        secondary: [
          'bg-btn-secondary-bg',
          'text-btn-secondary-text',
          'hover:bg-btn-secondary-hover',
        ].join(' '),

        outline: [
          'border border-border-default',
          'bg-transparent',
          'text-text-primary',
          'hover:bg-state-hover',
        ].join(' '),

        ghost: [
          'bg-transparent',
          'text-text-primary',
          'hover:bg-btn-ghost-hover',
        ].join(' '),

        link: [
          'bg-transparent',
          'text-accent-primary',
          'underline underline-offset-4',
          'hover:text-accent-secondary',
        ].join(' '),
      },

      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'size-9',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  allowCorners?: boolean
  cornerSize?: 'xs' | 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      allowCorners = false,
      cornerSize = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          'relative', // required for corners
          className
        )}
        {...props}
      >
        {children}

        {allowCorners && <CornerIcons size={cornerSize} />}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
