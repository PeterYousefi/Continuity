"use client";

import { useRef, useState } from "react";

interface FileUploadInputProps {
  label: string;
  onChange: (text: string) => void;
}

export default function FileUploadInput({
  label,
  onChange,
}: FileUploadInputProps) {
  const [filename, setFilename] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") onChange(text);
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      <div
        className={`flex items-center gap-4 border border-border rounded px-4 py-3 bg-canvas
          transition-colors ${filename ? "border-ink" : "hover:border-ink-muted"}`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-ghost py-1.5 px-3 text-xs"
        >
          Choose file
        </button>
        <span className={`font-sans text-sm truncate ${filename ? "text-ink" : "text-ink-muted"}`}>
          {filename ?? "No file chosen"}
        </span>
        {filename && (
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
