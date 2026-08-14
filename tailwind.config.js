/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas:    "#FAF8F4", // warm off-white — page background
        ink:       "#1A1A18", // near-black — primary text
        "ink-muted": "#6B6B64", // muted — secondary text, labels
        terra:     "#B5654A", // terracotta — single accent
        "terra-light": "#F2E8E3", // tint for hover/active states
        border:    "#E0DDD7", // hairline border colour
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:  ["var(--font-inter)",    "system-ui", "sans-serif"],
        mono:  ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm:  "1px",
        md:  "3px",
        lg:  "4px",
        full: "9999px",
      },
      borderWidth: {
        DEFAULT: "1px",
      },
    },
  },
  plugins: [],
};
