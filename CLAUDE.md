# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rootts & Routes, Foods S.L.U** - International logistics company web platform offering maritime container shipping, air parcel delivery, local ground transport, and real-time tracking.

## Development Commands

```bash
pnpm dev          # Start dev server at localhost:4321
pnpm build        # Build production site to ./dist/
pnpm preview      # Preview production build locally
```

## Tech Stack

- **Framework**: Astro 5
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 (via @tailwindcss/vite)
- **Animations**: GSAP + @midudev/tailwind-animations
- **Package Manager**: pnpm (exclusively)
**Icons**: Use tabler-icons with explicit imports (never barrel imports)


**Key patterns:**
- Global styles are in `Layout.astro` using `<style is:global>` with Tailwind imports
- Sections are self-contained with their own data, styles, and scripts
- GSAP animations loaded via CDN with `is:inline` scripts
- JetBrains Mono font loaded locally from `/public/fonts/`


## Code Standards
### Styling & UI
- **Tailwind CSS only**: The only styling solution allowed
- Don't duplicate classes; extract a component instead
- Prioritize readability over visual micro-optimizations
- **Icons**: Use tabler-icons with explicit imports (never barrel imports)
### TypeScript
- Strict mode enabled (extends `astro/tsconfigs/strict`)
- Avoid `any` and `unknown`
- Prefer type inference

### Imports
- **Always use @ aliases** for imports instead of relative paths
- Available aliases:
  - `@/*` -> `src/*`
  - `@components/*` -> `src/components/*`
  - `@sections/*` -> `src/sections/*`
  - `@layouts/*` -> `src/layouts/*`
  - `@styles/*` -> `src/styles/*`
- Example: `import Header from '@sections/Header.astro'` (not `../sections/Header.astro`)

### Components
- Server Components by default
- Client Components (`client:*` directives) only for interactivity
- Small, single-responsibility components
- No business logic in UI components

### Data Fetching
- Prefer server-side fetching
- Centralize API calls in `lib/api` (when needed)
- Always handle loading and error states

### Accessibility
- Semantic HTML required
- ARIA roles where appropriate
- Focus management on interactive elements
- WCAG compliance

## Design System

### Typography
- JetBrains Mono for all text (loaded locally)

### Principles
- Professional, modern, trustworthy
- Mobile-first responsive design
- Performance optimized
- Colores: #0B2A3C Azul Marino, #0E5F7C Azul Océano, #6FB63F Verde Global, #9ED46A Verde Claro

## SEO Keywords
- Envío de contenedores internacionales
- Paquetería aérea por peso
- Rastrear envío
- Transporte puerta a puerta
- Cotizar envío internacional

## Code Style Guidelines

### Universal Rules
- **NO EMOJIS**: Never use emojis in code, comments, docstrings, print statements, or any other part of the codebase. Windows codepage limitations cause encoding errors.
- **Minimal Comments**: Only add comments for complex logic that isn't self-evident. Don't add comments to simple or obvious code.
- **Clean Code**: Write self-documenting code with clear variable and function names instead of relying on comments.
- **Avoid Premature Abstractions**: Don't create utilities or helpers for one-time operations. Three similar lines are better than a premature abstraction.
- **Dependencies**: Only add dependencies when actually needed, not preemptively.
