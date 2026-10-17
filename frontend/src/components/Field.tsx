import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className = "",
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        className={`w-full rounded-[12px] border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-mute/70 ${
          error
            ? "border-[#EF4444] focus:shadow-[0_0_0_4px_rgba(239,68,68,0.12)]"
            : "border-line focus:border-primary focus:shadow-[0_0_0_4px_rgba(91,75,219,0.12)]"
        } ${className}`}
        {...rest}
      />
      {hint && !error ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-[#EF4444]">{error}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  error,
  hint,
  className = "",
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <textarea
        className={`min-h-[110px] w-full rounded-[12px] border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-mute/70 ${
          error
            ? "border-[#EF4444]"
            : "border-line focus:border-primary focus:shadow-[0_0_0_4px_rgba(91,75,219,0.12)]"
        } ${className}`}
        {...rest}
      />
      {hint && !error ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-[#EF4444]">{error}</span> : null}
    </label>
  );
}

export function Select({
  label,
  error,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <select
        className={`w-full rounded-[12px] border bg-white px-3.5 py-2.5 text-sm outline-none ${
          error ? "border-[#EF4444]" : "border-line focus:border-primary"
        }`}
        {...rest}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-xs text-[#EF4444]">{error}</span> : null}
    </label>
  );
}
