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
      <span className="mb-1.5 block text-sm font-medium text-slate-200">{label}</span>
      <input
        className={`w-full rounded-[12px] border bg-slate-900/90 text-slate-100 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-500 ${
          error
            ? "border-rose-500 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.25)]"
            : "border-slate-700/80 focus:border-cyan focus:shadow-[0_0_0_3px_rgba(6,182,212,0.25)]"
        } ${className}`}
        {...rest}
      />
      {hint && !error ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : null}
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
      <span className="mb-1.5 block text-sm font-medium text-slate-200">{label}</span>
      <textarea
        className={`min-h-[110px] w-full rounded-[12px] border bg-slate-900/90 text-slate-100 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-500 ${
          error
            ? "border-rose-500"
            : "border-slate-700/80 focus:border-cyan focus:shadow-[0_0_0_3px_rgba(6,182,212,0.25)]"
        } ${className}`}
        {...rest}
      />
      {hint && !error ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : null}
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
      <span className="mb-1.5 block text-sm font-medium text-slate-200">{label}</span>
      <select
        className={`w-full rounded-[12px] border bg-slate-900/90 text-slate-100 px-3.5 py-2.5 text-sm outline-none ${
          error ? "border-rose-500" : "border-slate-700/80 focus:border-cyan focus:shadow-[0_0_0_3px_rgba(6,182,212,0.25)]"
        }`}
        {...rest}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-xs text-rose-400">{error}</span> : null}
    </label>
  );
}
