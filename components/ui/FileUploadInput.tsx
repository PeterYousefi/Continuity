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
      if (typeof text === "string") {
        onChange(text);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Choose file
        </button>
        <span className="text-sm text-gray-500">
          {filename ?? "No file chosen"}
        </span>
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
