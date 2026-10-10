# BuildProof enterprise landing page

The page is structured as a server-rendered product narrative with small client boundaries for navigation, motion and the two interactive product demonstrations.

## Architecture

- `content.ts` — the shared navigation, problem, workflow, capability, evidence-chain, role, security, pilot and footer models.
- `primitives.tsx` — the restrained button, container, heading, card and icon-chip system.
- `motion.tsx` — reduced-motion-safe reveals and the dashboard/field hero composition.
- `interactive.tsx` — the four-stage workflow explorer, role-based views and lightweight progress states.
- `navbar.tsx` — sticky desktop navigation and the accessible mobile menu.
- `hero.tsx` — the primary product promise, pilot calls to action and real product imagery.
- `sections.tsx` — audience, problem, platform, evidence chain, teams, security, pilot, CTA and footer sections.
- `landing-page.tsx` — top-level page composition.

## Visual system

Tailwind v4 tokens live in `app/globals.css`. Pure white and warm off-white carry the page, orange is reserved for decisions and calls to action, pale sky blue separates operating concepts, and deep navy anchors product and security surfaces.

## Interaction and QA rules

- Native links remain available without JavaScript; enhanced tabs and menus use explicit ARIA roles and state.
- Motion is short, purposeful and disabled by `prefers-reduced-motion`.
- Product imagery uses local `next/image` assets with descriptive alternatives and responsive sizing.
- Focus rings, color contrast and 44px minimum action heights are maintained across breakpoints.
- Layouts are tested at 320, 360, 768, 1024 and 1440px with no document-level horizontal overflow.
- Authentication, onboarding and workspace routes remain separate from the public marketing surface.
