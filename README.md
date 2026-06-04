# 백광인 · Portfolio

Frontend Engineer 백광인의 포트폴리오 사이트입니다.

## Stack

- **Framework**: React 19 + Vite + TypeScript
- **Styling**: TailwindCSS v4 (CSS-first `@theme`)
- **UI Primitives**: Radix UI (NavigationMenu, ToggleGroup)
- **Component Variants**: class-variance-authority + tailwind-merge
- **Animation**: framer-motion (scroll reveal, count-up, parallax)
- **Utilities**: es-toolkit
- **Linting**: OxLint
- **Formatting**: Biome

## Routes

| Path | Description |
|------|-------------|
| `/` | Single-page portfolio (Hero, About, Stats, Stack, Career, Work, Contact) |
| `/posts` | Writing / blog listing with category filter and search |

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm preview
```

## Project Structure

```
src/
  Main.tsx              # entry point
  App.tsx               # router setup
  styles/Globals.css    # design tokens + global styles
  data/
    Portfolio.ts        # stats, stack, career, work, contact data
    Posts.ts            # blog post data
  hooks/
    UseCountAnimation.ts
    UseNavScroll.ts
  components/
    Nav.tsx
    Hero.tsx
    About.tsx
    Stats.tsx
    Stack.tsx
    Career.tsx
    Work.tsx
    Contact.tsx
    Footer.tsx
    posts/
      FeaturedPost.tsx
      PostCard.tsx
      PostsHeader.tsx
      PostsList.tsx
      PostsToolbar.tsx
    ui/
      Box.tsx Flex.tsx Grid.tsx HStack.tsx VStack.tsx
      Text.tsx Button.tsx Badge.tsx Chip.tsx Reveal.tsx
  pages/
    PortfolioPage.tsx
    PostsPage.tsx
```
