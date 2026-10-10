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
- **Persistent product shell:** a white rail with orange active states, a sticky project header, and a separate content scroll area keep context stable across modules. Carbon describes a product shell as the persistent interaction pattern shared across a platform: https://v10.carbondesignsystem.com/components/UI-shell-right-panel/usage/
- **Construction-specific workflow:** the information architecture centers on current drawings/evidence, RFIs/issues, materials, approvals, schedule, finance, and the connection between field and office. Procore likewise positions construction management around a central project record, field access, schedules, RFIs, submittals, documents, financials, and risk: https://www.procore.com/project-management

## Orange without losing operational meaning

Pure white surfaces dominate the interface. Light orange marks active navigation and supporting brand surfaces; light blue groups informational content. Primary actions use orange-700 rather than pale orange so white button text remains readable. Green indicates accepted or verified records, amber indicates review or risk, and red indicates rejection or flagged records. Those states also have explicit labels; color alone is not the explanation.

## Typography and content

- Plus Jakarta Sans at 600/700 provides headings and the wordmark.
- Inter provides forms, navigation, records, tables, and controls.
- JetBrains Mono provides numeric annotations and keyboard shortcuts.
- Dense project data uses tabular numerals and smaller but high-contrast labels.
- Headings describe the user’s current task; supporting copy explains consequence or scope, not marketing claims.
- Buttons use verbs that predict the result: “Continue with email”, “Launch workspace”, “Upload evidence”, and “Record delivery”.
- Humanizer informed the copy pass: removed inflated claims and implementation jargon, keeping instructions about real site tasks.
- Top-aligned labels and task-grouped forms follow Carbon's form guidance: [Carbon forms](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms).

## Accessibility and responsive behavior

- Interactive targets are approximately 40–54 CSS pixels, with mobile navigation and primary actions sized for touch.
- Keyboard focus uses visible outlines/rings. Escape closes dialogs; focus remains inside an open dialog and returns to the mobile menu trigger when navigation closes. See [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
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

`npm run qa:ui` renders the actual authentication, onboarding and workspace components with isolated browser fixtures at 320, 360, 768, 1280 and 1536 CSS pixels. It checks Axe WCAG 2 A/AA rules, unintended horizontal overflow, invisible headings, reduced motion, mouse and keyboard journeys, module navigation and forms. Sorting is tested with 30 records to cover multiple pages. Reports and screenshots are saved under the ignored `test-results/ui` directory.

The local harness intercepts Supabase HTTP calls, uses a fictional user, refuses remote origins and removes its development-only route on completion or failure. It is not a production login bypass and does not test real OAuth, email delivery, tenant isolation or saved production records. Automated accessibility checks are not a conformance certification.

Release checks separately cover lint, TypeScript, production compilation, the existing secret/environment scan and production dependency advisories. Provider configuration, database security and enterprise readiness still require live end-to-end verification and operational evidence; visual polish alone cannot establish them.
