# CLAUDE.md

## Project

Personal portfolio site for 백광인 (Baik Gwangin), Frontend Engineer at goorm Inc.
Two routes: `/` (portfolio) and `/posts` (writing list).

## Tech Stack

- React 19 + Vite + TypeScript (strict mode)
- TailwindCSS v4 — CSS-first config via `@theme {}` in `src/styles/Globals.css`. No `tailwind.config.js`.
- Radix UI — NavigationMenu (Nav), ToggleGroup (PostsToolbar)
- framer-motion — all animations (scroll reveal via `<Reveal>`, count-up, glow parallax)
- class-variance-authority (CVA) + tailwind-merge for component variants
- es-toolkit for utility functions (debounce, groupBy helpers, last, etc.)
- Biome for both linting and formatting

## Conventions

### File naming
All files start with an uppercase letter — including hooks, data files, styles, and the entry point (`Main.tsx`).

### Imports
Use `#/` absolute paths (maps to `./src/`). Never use relative `../` paths between `src/` modules.

### React 19 patterns
No `forwardRef`. Pass `ref` as a regular prop with `ref?: Ref<T>` in the interface. Use `React.createElement` for polymorphic components (see `Box.tsx`) instead of type assertions.

### Type assertions
Avoid `as SomeType` casts. Use discriminated unions, narrowing, or `createElement` patterns instead.

### Pointer events
Use `PointerEvent` / `pointermove` instead of `MouseEvent` / `mousemove` for interactive effects. Guard touch events (check `e.pointerType`) when touch conflicts with scroll.

### Animations
- Page-load animations in Hero: CSS classes `.reveal.in` (opacity/translateY via keyframe).
- Scroll-reveal for all other sections: `<Reveal delay={n}>` wrapper (framer-motion `whileInView`).
- Count-up: `useCountAnimation` hook (framer-motion `useMotionValue` + `useInView`).
- `prefers-reduced-motion`: skip all JS-driven animations.

### Design tokens
All colors and fonts are defined as CSS custom properties in `@theme {}` inside `Globals.css`.
Reference as Tailwind utility classes: `bg-accent`, `text-text-2`, `border-border-strong`, etc.

### Comments
No comments unless the WHY is non-obvious. No docstrings.

## Commands

```bash
pnpm dev        # start dev server
pnpm build      # tsc -b && vite build
pnpm preview    # preview production build
pnpm lint       # biome lint --write src
pnpm format     # biome format --write src
pnpm check      # biome check --write src (lint + format)
```
