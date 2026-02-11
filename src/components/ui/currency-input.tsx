import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  /** Show R$ prefix. Default: true */
  showPrefix?: boolean;
}

/**
 * Currency input with R$ formatting and numeric keyboard on mobile.
 * Stores value as a plain decimal string (e.g. "129.90") for easy parsing.
 * Displays formatted as "129,90" to the user.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, showPrefix = true, placeholder = "0,00", ...props }, ref) => {
    // Convert internal decimal string to display format (dot → comma)
    const displayValue = value ? value.replace('.', ',') : '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      // Allow only digits, comma, and dot
      raw = raw.replace(/[^\d.,]/g, '');
      // Normalize: replace comma with dot for internal storage
      raw = raw.replace(',', '.');
      // Only allow one decimal point
      const parts = raw.split('.');
      if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
      }
      // Limit to 2 decimal places
      if (parts.length === 2 && parts[1].length > 2) {
        raw = parts[0] + '.' + parts[1].slice(0, 2);
      }
      onChange(raw);
    };

    return (
      <div className="relative">
        {showPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none select-none">
            R$
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-base text-zinc-100 ring-offset-background placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            showPrefix && "pl-10",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
