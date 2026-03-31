# AGENTS.md - Development Guidelines for Crimson Lynx Run

This document provides guidance for AI agents working in this codebase.

## Project Overview

This is a React-based in-app browser application with:
- Multiple tabs, bookmarks, history, security features
- Proxy system for bypassing X-Frame-Options restrictions
- Deployed on Vercel (frontend) and Val Town (proxy backend)

## Build Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:8080)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

## Code Style Guidelines

### React Components

- Use `"use client"` directive for client-side components
- Use named exports for utility functions, default exports for page components
- Prefer functional components with hooks
- Use `React.forwardRef` for components that need ref forwarding (like Button)

```tsx
// Good
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

### TypeScript Conventions

- Use interfaces for object shapes that may be extended
- Use type for unions, intersections, and utility types
- Import types explicitly: `import { type SomeType } from "module"`
- Avoid `any` when possible; this codebase has `noImplicitAny: false` in tsconfig

### Naming Conventions

- **Components**: PascalCase (`InAppBrowser`, `Button`)
- **Functions/Hooks**: camelCase (`useCallback`, `navigateTo`)
- **Interfaces**: PascalCase with descriptive names (`SecuritySettings`)
- **Constants**: SCREAMING_SNAKE_CASE for config constants (`MAX_HISTORY`)
- **CSS Classes**: kebab-case in Tailwind, camelCase in JS

### Imports

- React imports: `import React, { useState, useCallback } from "react"`
- UI components: `@/components/ui/button`
- Utilities: `@/lib/utils` or `@/utils/toast`
- Absolute paths with `@/` alias pointing to `./src`

### Tailwind CSS

- Use Tailwind utility classes for all styling
- Use CSS variables for theme colors (defined in tailwind.config.ts)
- Example: `className="text-primary bg-background border-border"`
- Dark mode: Use `dark:` prefix, detect with `darkMode` state

### State Management

- Use React hooks (`useState`, `useCallback`, `useMemo`, `useRef`)
- Use `useCallback` for functions passed to child components
- Use `useMemo` for expensive computations
- Keep state local to components when possible

### Error Handling

- Wrap async operations in try/catch
- Use `showError()` from `@/utils/toast` for user-facing errors
- Use `showSuccess()` for confirmations

### File Organization

```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, Input, etc.)
│   ├── InAppBrowser.tsx  # Main browser component (~2000 lines)
│   └── browser-types.ts  # TypeScript interfaces
├── pages/            # Route pages (Index, NotFound)
├── lib/              # Utility libraries (utils.ts)
├── utils/            # Utilities (toast.ts)
├── hooks/            # Custom React hooks
├── App.tsx           # Root component with routing
├── main.tsx          # Entry point
└── globals.css       # Global styles + Tailwind
```

## Key Patterns

### URL Proxy

The browser uses a proxy system:
- Frontend: `InAppBrowser.tsx` renders sites in iframes
- Proxy: Val Town function (`proxy.val.ts`) fetches pages and injects anti-frame-busting scripts
- URL: `https://laxmiang--c1a496be2bd511f19a8942dde27851f2.web.val.run/?url=<encoded-url>`

### Security Features

Located in Security Settings (`lax://security`):
- Tracker blocking with custom blocklist
- Ad blocking with domain blocklist
- Fingerprinting protection
- Cookie and storage managers
- Request logger

### Local Storage Keys

```javascript
browserBookmarks       // Bookmarks and folders
browserFullHistory    // Browsing history
browserDarkMode       // Dark mode preference
browserSecuritySettings  // Security settings
browserCustomBlocklist // Custom tracker blocklist
```

## Vercel Deployment

The frontend is deployed on Vercel. Deploy by:
1. Push to GitHub
2. Vercel auto-deploys from main branch

## Common Issues

- **TypeScript errors about DOM types**: This project has relaxed TypeScript settings
- **Build fails**: Ensure dependencies are installed with `npm install`
- **Iframe issues**: Some sites (GitHub, banks) block iframe embedding - use "Open in new tab" button

## Dependencies

Key dependencies:
- **React 18** - UI framework
- **Vite 5** - Build tool
- **Tailwind CSS 3** - Styling
- **Radix UI** - Headless UI components
- **Lucide React** - Icons
- **Sonner** - Toast notifications
- **React Router 6** - Routing
- **Class Variance Authority** - Component variants

## Val Town Proxy

The proxy server (`proxy.val.ts`) uses Deno runtime:
- Exports default async function
- Fetches target pages, injects scripts
- Handles frame-busting bypass
