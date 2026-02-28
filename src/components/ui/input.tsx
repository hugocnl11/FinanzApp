import React from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="relative w-full">
        <input
          id={inputId}
          ref={ref}
          className={cn(
            `block px-4 pt-6 pb-2 w-full text-md bg-transparent border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring peer transition-all text-foreground border-input placeholder-transparent`,
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          placeholder={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="absolute left-4 top-2 text-muted-foreground text-sm pointer-events-none transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-background px-1"
        >
          {label}
        </label>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input }; 