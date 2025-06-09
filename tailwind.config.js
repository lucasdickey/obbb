/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-blue-50",
    "bg-blue-100",
    "bg-blue-500",
    "bg-blue-600",
    "bg-white",
    "text-blue-600",
    "text-gray-600",
    "text-gray-800",
    "flex",
    "flex-col",
    "h-screen",
    "rounded-lg",
    "shadow-lg",
    "p-4",
    "p-6",
    "p-8",
    "px-4",
    "px-6",
    "py-4",
    "py-8",
    "mb-3",
    "mb-6",
    "font-bold",
    "font-medium",
    "text-xl",
    "text-2xl",
    "text-sm",
    "border",
    "border-blue-200",
    "border-gray-200",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
  corePlugins: {
    backdropFilter: true,
  },
};
