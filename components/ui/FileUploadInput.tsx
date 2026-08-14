"use client";

import { useRef } from "react";

interface FileUploadInputProps {
  label: string;
  /** Controls the displayed filename — set by parent for both real files and sample loads */
  value?: string | null;
  onChange: (text: string) => void;
  /** Called with the real filename when the user picks a file via the browser dialog */
  onFilenameChange?: (name: string) => void;
}

export default function FileUploadInput({
  label,
  value,
  onChange,
  onFilenameChange,
}: FileUploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFilenameChange?.(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") onChange(text);
    };
    reader.readAsText(file);
  }

  const hasValue = value != null && value.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      <div
        className={`flex items-center gap-4 border border-border rounded px-4 py-3 bg-canvas
          transition-colors ${hasValue ? "border-ink" : "hover:border-ink-muted"}`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-ghost py-1.5 px-3 text-xs shrink-0"
        >
          Choose file
        </button>
        <span className={`font-sans text-sm truncate ${hasValue ? "text-ink" : "text-ink-muted"}`}>
          {value ?? "No file chosen"}
        </span>
        {hasValue && (
          <span className="ml-auto text-terra text-xs font-sans select-none">✓</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
