"use client";

import { useId, useState } from "react";

type ColorFieldProps = {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
};

export function ColorField({
  name,
  label,
  defaultValue = "",
  placeholder = "#e36a2f",
}: ColorFieldProps) {
  const inputId = useId();
  const normalized = defaultValue?.trim() ?? "";
  const [value, setValue] = useState(normalized);
  const pickerValue = /^#([0-9a-f]{6})$/i.test(value) ? value : "#e36a2f";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[var(--espresso)]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-[18px] border border-[rgba(61,34,23,0.12)] bg-[rgba(255,253,249,0.94)] px-3 py-2">
        <input
          id={inputId}
          type="color"
          value={pickerValue}
          onChange={(event) => setValue(event.target.value)}
          className="h-11 w-14 rounded-[14px] border-0 bg-transparent p-0"
        />
        <input
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="field border-0 bg-transparent px-1 py-2 shadow-none focus:border-0 focus:shadow-none"
          placeholder={placeholder}
        />
      </div>
    </label>
  );
}
