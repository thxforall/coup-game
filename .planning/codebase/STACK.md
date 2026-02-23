# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- TypeScript ^5 - Main development language for all source code
- JavaScript - Configuration files and Next.js setup

**Secondary:**
- CSS - Tailwind CSS utility framework

## Runtime

**Environment:**
- Node.js (version not explicitly specified, managed via npm)

**Package Manager:**
- npm - Package dependency management
- Lockfile: `package-lock.json` (present and tracked)

## Frameworks

**Core:**
- Next.js 14.2.20 - React framework with API routes, SSR, and static generation
- React ^18 - UI library for components
- React DOM ^18 - DOM rendering for React

**Styling:**
- Tailwind CSS ^3.4.1 - Utility-first CSS framework with custom game theme
- PostCSS ^8 - CSS processing pipeline
- Autoprefixer ^10.0.1 - Vendor prefix automation

**Testing:**
- Jest ^29 - Test runner and framework
- ts-jest ^29 - TypeScript support for Jest

**Build/Dev:**
- TypeScript ^5 - Type checking and compilation
- ESLint ^8 - Code linting (Next.js default config)
- eslint-config-next 14.2.20 - Next.js recommended lint rules

## Key Dependencies

**Critical:**
- firebase ^11.3.1 - Firebase Realtime Database (both REST API and SDK)
  - Server: REST API (`lib/firebase.ts`)
  - Client: SDK with real-time subscriptions (`lib/firebase.client.ts`)

**Infrastructure:**
- next 14.2.20 - Full-stack framework with API routes and file-based routing

## Configuration

**Environment:**
- Environment variables stored in `.env.local` (example: `.env.local.example`)
- Required Firebase variables:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (required for both client and server)

**Build:**
- `next.config.js` - Minimal Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` = project root)
- `tailwind.config.js` - Custom color palette for game roles and animations
- `postcss.config.js` - PostCSS plugins for Tailwind and Autoprefixer
- `jest.config.js` - Jest test configuration with ts-jest preset

**Custom Tailwind Theme:**
- Font: Noto Sans KR (Korean typography)
- Custom colors for game roles:
  - `duke` (#7c3aed - purple)
  - `contessa` (#dc2626 - red)
  - `captain` (#2563eb - blue)
  - `assassin` (#1f2937 - dark gray)
  - `ambassador` (#065f46 - green)
- Custom animations:
  - `card-flip` - 3D card rotation (0.6s)
  - `slide-up` - Content entrance animation (0.3s)
  - `pulse-coin` - Coin glow effect (1.5s loop)

## Platform Requirements

**Development:**
- Node.js with npm
- TypeScript 5+
- Modern browser with ES2020+ support

**Production:**
- Node.js runtime (Vercel, traditional Node.js server, or serverless)
- Environment variables must be configured before deployment
- Browser: Modern browsers supporting ES2020+, Web Vibration API for haptic feedback

---

*Stack analysis: 2026-02-23*
