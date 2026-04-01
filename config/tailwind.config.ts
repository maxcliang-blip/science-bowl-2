import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  safelist: [
    "text-white", "text-gray-800", "text-gray-700", "text-gray-600", "text-gray-500", "text-gray-400", "text-gray-300", "text-gray-200", "text-gray-100", "text-gray-900", "text-black",
    "text-red-500", "text-red-400", "text-green-500", "text-green-400", "text-blue-500", "text-blue-400", "text-yellow-500", "text-purple-500", "text-indigo-500", "text-pink-500",
    "bg-white", "bg-gray-800", "bg-gray-700", "bg-gray-600", "bg-gray-500", "bg-gray-400", "bg-gray-300", "bg-gray-200", "bg-gray-100", "bg-gray-900", "bg-black",
    "bg-red-500", "bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-purple-500", "bg-indigo-500", "bg-pink-500",
    "bg-transparent", "bg-current", "bg-none",
    "border-white", "border-gray-800", "border-gray-700", "border-gray-600", "border-gray-500", "border-gray-400", "border-gray-300", "border-gray-200", "border-gray-100",
    "border-red-500", "border-green-500", "border-blue-500",
    "hover:text-white", "hover:bg-gray-700", "dark:text-white", "dark:bg-gray-800", "dark:border-gray-700",
    "w-6", "w-8", "w-14", "w-full", "w-1/2", "w-1/3", "w-2/3", "w-1/4",
    "h-6", "h-8", "h-full", "h-screen",
    "p-1", "p-2", "p-3", "p-4", "p-5", "p-6", "px-2", "px-3", "px-4", "py-1", "py-2", "py-3",
    "m-1", "m-2", "m-3", "m-4", "mt-1", "mt-2", "mt-3", "mt-4", "mb-1", "mb-2", "mb-3", "mb-4",
    "rounded", "rounded-lg", "rounded-xl", "rounded-full", "rounded-md", "rounded-sm",
    "shadow-md", "shadow-lg", "shadow-sm",
    "flex", "flex-col", "flex-row", "flex-wrap", "flex-1", "flex-shrink-0", "flex-grow",
    "grid", "grid-cols-2", "grid-cols-3", "grid-cols-4",
    "block", "inline", "inline-block", "inline-flex",
    "hidden", "absolute", "relative", "fixed", "sticky",
    "z-10", "z-20", "z-30", "z-40", "z-50",
    "top-0", "top-1", "top-2", "top-4", "bottom-0", "bottom-1", "bottom-2", "bottom-4",
    "left-0", "left-1", "left-2", "right-0", "right-1", "right-2",
    "overflow-hidden", "overflow-auto", "overflow-scroll",
    "cursor-pointer", "cursor-default", "cursor-not-allowed",
    "transition-colors", "transition-transform", "transition-all",
    "duration-200", "duration-300", "duration-500",
    "opacity-0", "opacity-50", "opacity-75", "opacity-100",
    "text-sm", "text-xs", "text-lg", "text-xl", "text-2xl", "text-base",
    "font-medium", "font-bold", "font-semibold",
    "items-center", "items-start", "items-end", "justify-center", "justify-between", "justify-end", "justify-start",
    "space-x-1", "space-x-2", "space-x-3", "space-x-4", "space-y-1", "space-y-2", "space-y-3", "space-y-4",
    "min-h-screen", "min-w-0", "max-h-screen", "max-w-full",
    "divide-y", "divide-gray-200", "divide-gray-700",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
