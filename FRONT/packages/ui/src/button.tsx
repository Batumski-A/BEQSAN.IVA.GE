import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from './cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm',
    'font-mono uppercase tracking-wider transition-all duration-120 ease-standard',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-amber focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent-amber text-bg-base hover:bg-accent-amber-h',
        secondary:
          'border border-hairline-strong bg-transparent text-fg-primary hover:border-accent-amber hover:text-accent-amber',
        ghost: 'bg-transparent text-fg-secondary hover:text-fg-primary',
        danger: 'bg-system-danger text-fg-primary hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3 text-caption',
        md: 'h-11 px-5 text-mono-spec',
        lg: 'h-12 px-6 text-mono-spec',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
