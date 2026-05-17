import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-sm bg-bg-raised px-3.5 text-body text-fg-primary',
        'border border-hairline placeholder:text-fg-tertiary',
        'transition-colors duration-120 ease-standard',
        'focus-visible:outline-none focus-visible:border-accent-amber focus-visible:ring-2 focus-visible:ring-accent-amber/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-system-danger aria-[invalid=true]:ring-system-danger/30',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
