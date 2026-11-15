# RABTO Agent Working Agreement

## Project identity and non-negotiable constraints

- Build RABTO as a premium, practical product that connects physical products (NFC/QR) to editable digital destinations and pages.
- Preserve the approved interlocking geometric R mark and RABTO wordmark. Approved palette: charcoal/near-black, light sage green, and ivory.
- Arabic-first with correct RTL; English must work in LTR.
- Do not invent product capabilities, testimonials, metrics, integrations, or completed workflows.
- Keep the product scope in `docs/PRODUCT_BASELINE.md` and the MVP deferrals in the approved product baseline. Do not add HR/payroll, ERP, or deferred MVP modules.
- Protect Resolver behavior, tenant boundaries, credit accounting, and append-only audit history. UI changes must not silently change business rules.
- Never merge to `main`, deploy, alter production data, or perform destructive Git operations without explicit user authorization.

## Skill activation and required workflow

At the start of a relevant UI task, inspect the local skill directories and read the applicable `SKILL.md` files. Do not claim a skill is installed or invoked if it is unavailable in the active environment.

### Public-facing website, landing pages, product pages
Use:
1. `design-taste-frontend` for original art direction and page composition.
2. `unslop` for a critique and refinement pass.
3. `ui-ux-pro-max` for design-system intelligence, style/palette/type options, and UX checks.
4. `awesome-design-md` only as inspiration; never copy another brand.
5. `image-to-code` when a screenshot/reference image is supplied.
6. `web-design-guidelines` to audit accessibility, semantics, responsiveness, and interaction behavior.
7. `playwright-cli` to inspect rendered output at mobile and desktop widths.

### Customer and admin dashboards / app screens
Use:
1. `ui-ux-pro-max` for dashboard patterns, component decisions, palettes, typography, and UX/accessibility checks.
2. `unslop` for visual critique and consistency.
3. `web-design-guidelines` for accessibility and interaction audit.
4. `image-to-code` when a reference screenshot is supplied.
5. `react-bits` selectively, only when a component solves a real need and is accessible, RTL-compatible, lightweight, and license-compatible.
6. `playwright-cli` for rendered-flow and responsive verification.

### Motion and transitions
- Use Motion.dev (`motion` package and its `motion-ai` skill) as the default React animation system for entrances/exits, layout transitions, gestures, and small coordinated interactions.
- Use CSS for simple hover/color transitions.
- Use `gsap-skills` and GSAP only for complex, purposeful timelines or scroll choreography that Motion does not simplify; do not duplicate animation engines for the same effect.
- Use `transitions.dev` as a reference for appropriate transitions.
- Prefer CSS for simple state changes. Respect `prefers-reduced-motion`.
- Never add motion that delays navigation, obscures state, or harms low-end/mobile performance.

### Designlang
Use Designlang to extract/inspect rendered design tokens and compare screens when its CLI/MCP is installed and a runnable preview exists. Do not invent MCP availability or claim a live extraction without running it.

## Mandatory design process

1. Inspect the current repository, existing routes, design tokens, component conventions, and product requirements before editing.
2. For a substantial redesign, write a concise audit and proposed visual direction first; separate observed defects from design proposals.
3. Define or reuse shared tokens and primitives. Maintain consistent public, customer, and admin experiences.
4. Implement real responsive states, loading/empty/error/success states, focus behavior, accessible labels, keyboard navigation, and RTL/LTR.
5. Inspect the actual rendered result with Playwright when the app can run. Check at least a narrow mobile viewport and a desktop viewport.
6. Run available lint, typecheck, build, and relevant tests. Report only commands that actually ran and their outcomes.
7. Review diffs for regressions, dependency bloat, license concerns, secrets, and accidental product-scope changes.

## Skill availability and setup

The repository setup script is `scripts/setup-frontend-tooling.sh`. It installs the Design Workbench pack and UI/UX Pro Max into the local developer environment/project skill directory. The script must be run from the repository root on a machine with Git, Node.js/npm, and Python 3.x. Browser binaries are intentionally not installed by default.

The GitHub repository itself does not execute local setup scripts. If skills are not present in the active agent runtime, follow their documented guidance only when available and clearly disclose that the runtime installation is pending. Do not state that all skills are active merely because their setup instructions are committed.


## MotionSites.ai inspiration reference

Use https://motionsites.ai/ as a visual inspiration library for motion concepts and section treatments, not as a source to clone a site's identity or copy assets/code.

When designing RABTO motion, selectively study:
- Hero-section entrances and layered reveal sequences.
- Subtle animated backgrounds that support the product story rather than compete with it.
- Scroll-triggered section reveals with restrained stagger.
- Product/feature showcases that use depth, perspective, or parallax only when they clarify the physical-to-digital connection.
- CTA and footer transitions that provide a polished ending without delaying actions.

Translate ideas into RABTO's charcoal, light-sage, and ivory identity. Prefer a restrained physical-to-digital motif: a product/tag, a fine sage connection path, then its digital destination. Avoid generic neon glows, excessive floating particles, constant movement, heavy video backgrounds, and motion that obscures content.

For each proposed effect, document its purpose, trigger, duration, reduced-motion fallback, and mobile/performance cost. Use Motion.dev as the default React implementation engine; use CSS for simple transitions and GSAP only for complex choreography. Check keyboard access and `prefers-reduced-motion`. Do not reproduce MotionSites' or showcased sites' exact layouts, logos, imagery, or copy.
