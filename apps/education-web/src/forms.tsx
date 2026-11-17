import { useId, useRef, useState } from "react";
export function useFormValidation() {
  const prefix = useId(); const [errors, setErrors] = useState<Record<string, string>>({});
  const labels = useRef<Record<string, string>>({});
  const validate = (form: HTMLFormElement) => {
    const next: Record<string, string> = {}; let first: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined;
    for (const field of Array.from(form.elements)) {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) || !field.name || field.disabled || field.validity.valid) continue;
      first ??= field; const label = field.labels?.[0]?.childNodes[0]?.textContent?.trim() ?? "This field";
      labels.current[field.name] = label;
      next[field.name] = field.validity.valueMissing ? `${label} is required.` : field.validity.typeMismatch ? "Enter a valid email address." : field.validity.tooShort ? `Enter at least ${field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field.minLength : 1} characters.` : field.validity.rangeOverflow ? `Enter ${field instanceof HTMLInputElement ? field.max : "a smaller value"} or less.` : field.validity.rangeUnderflow ? `Enter ${field instanceof HTMLInputElement ? field.min : "a larger value"} or more.` : field.validity.stepMismatch ? "Use the allowed number of decimal places." : "Enter a valid value.";
    }
    setErrors(next); first?.focus(); return !first;
  };
  const props = (name: string) => ({ name, "aria-label": labels.current[name], "aria-invalid": errors[name] ? true as const : undefined, "aria-describedby": errors[name] ? `${prefix}-${name}` : undefined });
  const error = (name: string) => errors[name] ? <span id={`${prefix}-${name}`} className="form-error">{errors[name]}</span> : null;
  return { validate, props, error, errors, clear: () => setErrors({}) };
}
