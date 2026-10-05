# BuildProof interface research and design standard

This document records the rationale behind the October 2026 authentication, onboarding, and workspace redesign. “AI-looking” is not a formal usability category; the observations below are a design synthesis based on recurring failure modes in generated interfaces and the standards used by mature public-service and enterprise design systems.

## What makes a generated interface feel artificial

1. **Every element asks for attention.** Excessive gradients, glow, oversized headings, floating cards, pills, and decorative icons create no clear hierarchy.
2. **Components are styled individually.** Radius, spacing, border, shadow, and color choices drift because there is no shared token system.
3. **Cards replace information architecture.** Content is divided into many interchangeable rectangles instead of being grouped by task, decision, and workflow.
4. **Marketing language enters operational screens.** Generic claims and decorative labels displace precise status, ownership, dates, and next actions.
5. **Typography is used as decoration.** Too many weights, oversized display text, weak body contrast, and inconsistent line height make the interface feel like a mock-up.
6. **Color carries brand and status at the same time.** When the brand color is also used for success, warning, and selection, users cannot reliably interpret meaning.
7. **Desktop screenshots are treated as the product.** Controls become too small, tables are not responsive, focus is invisible, and navigation breaks when data or text changes.
8. **Empty and error states are unfinished.** A realistic product explains what is missing, why it matters, and the safe next action.

## Professional system adopted for BuildProof

- **Governed foundations:** one orange brand scale, one neutral scale, one spacing rhythm, three radii, two font roles, and restrained elevation. Atlassian treats color, typography, spacing, iconography, elevation, borders, and radius as shared foundations rather than page-level decoration: https://atlassian.design/foundations
- **Task-based navigation:** BuildProof navigation names project tasks rather than mirroring an internal company structure. This follows USWDS guidance to use clear labels, prioritize important destinations, and highlight the current section: https://designsystem.digital.gov/components/header/
- **Progressive setup:** onboarding exposes the active work while keeping the full process visible, supports save-and-exit, and uses actionable validation. USWDS recommends progressive disclosure, save-and-resume, clear help, and blame-free errors for complex forms: https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/
- **Operational data density:** the dashboard uses compact metric groups, a project-health summary, evidence ledger, material trace, and persistent project context. Carbon recommends tables for finding and acting on records, with toolbars for search, filtering, and actions: https://v10.carbondesignsystem.com/components/data-table/usage/
- **Persistent product shell:** the orange rail, project header, and tabs create stable navigation across modules. Carbon describes a product shell as the persistent interaction pattern shared across a platform: https://v10.carbondesignsystem.com/components/UI-shell-right-panel/usage/
- **Construction-specific workflow:** the information architecture centers on current drawings/evidence, RFIs/issues, materials, approvals, schedule, finance, and the connection between field and office. Procore likewise positions construction management around a central project record, field access, schedules, RFIs, submittals, documents, financials, and risk: https://www.procore.com/project-management

## Orange without losing operational meaning

Orange is now BuildProof’s structural brand color: navigation rails, primary actions, active tabs, progress accents, and the custom architectural mark. It is intentionally deep and earthy rather than bright. Green is reserved for accepted, verified, compliant, or ready states; amber is reserved for review and risk; red is reserved for rejection, overdue, or destructive states. This preserves semantic recognition instead of using the brand palette for everything.

## Typography and content

- Source Serif 4 is limited to identity and major editorial headings.
- Geist is used for forms, navigation, metrics, records, tables, and controls.
- Dense project data uses tabular numerals and smaller but high-contrast labels.
- Headings describe the user’s current task; supporting copy explains consequence or scope, not marketing claims.
- Buttons use verbs that predict the result: “Create secure account”, “Launch workspace”, “Upload evidence”, and “Generate release pack”.

## Accessibility and responsive behavior

- Interactive targets are approximately 40–54 CSS pixels, with mobile navigation and primary actions sized for touch.
- Keyboard focus uses a visible 3 px blue outline that is independent of brand color. WCAG 2.2 requires a visible focus indicator with sufficient area and contrast: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance
- Controls and meaningful graphics maintain non-text contrast instead of relying on subtle color differences: https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html
- Focus order follows the visual and task order: https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html
- Layout is mobile-first at the narrow breakpoint: the navigation becomes an explicit drawer, tables remain horizontally inspectable, onboarding becomes one column, and authentication becomes a vertical story-to-form flow. GOV.UK recommends beginning with a single-column small-screen layout and adding columns only where the space supports them: https://design-system.service.gov.uk/styles/layout/
- Reduced-motion preferences disable non-essential transitions.

## Security UX retained

- Passwordless authentication and OAuth continue to use Supabase’s existing secure flow.
- Tenant isolation, server-enforced row-level access, protected routes, nonce CSP, and secure headers are unchanged.
- Authentication errors remain specific enough to recover from but do not expose provider or account internals.
- Invitation links remain email-bound and time-limited.
- Evidence upload continues to validate MIME type and size, calculate SHA-256, store in a private tenant path, and register through an audited RPC.

## QA standard

Each core surface must pass lint, TypeScript, production build, desktop rendering, 390 px mobile rendering, visible keyboard focus, no unintended horizontal page overflow, and a check that branding never replaces semantic status color.
