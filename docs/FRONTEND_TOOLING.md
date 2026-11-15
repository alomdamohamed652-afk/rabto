# RABTO — Frontend design and quality toolchain

This project uses a deliberately small, brand-led toolchain. Skills guide implementation; CLIs inspect and test the rendered application; component libraries are used selectively. Do not install every visual component or animation effect by default.

## Approved product direction

- **Product:** RABTO connects physical products to their editable digital destinations and product pages.
- **Character:** precise, connected, quietly confident.
- **World:** physical product materials, printed labels, QR marks, NFC tags, and warm ivory paper.
- **Moments:** a convincing product/tag-to-digital-page preview on the public site; clear product, channel, destination, and status views in the customer/admin application.
- **Signature:** the interlocking R monogram and a restrained sage connection line linking physical item, QR/NFC, and destination.

## Brand constraints

- Preserve the approved RABTO interlocking geometric R mark and wordmark.
- Preserve charcoal/near-black, light sage green, and ivory.
- Arabic-first with correct RTL, with English support.
- No unapproved logo redraws, gradients, glowing chrome, decorative blobs, or gratuitous animation.
- Keep the app surfaces neutral; reserve sage for primary actions, selection, and meaningful connection states.
- Accessibility, keyboard focus, reduced motion, responsive behavior, and performance are release requirements.

## Tool register

| Tool | Role | How it is used |
| --- | --- | --- |
| Unslop | UI audit and craft pass | Audit each screen, define direction, refine spacing, color, icons, copy, type, layout, details, visuals, and motion. |
| Designlang | Design-system extraction and verification | Extract/score rendered pages, compare them to the approved brand, and expose local MCP tools when a developer runs the CLI. |
| Impeccable | Design critique and polish workflow | Use audit/critique/polish/harden and keep its PRODUCT/DESIGN context aligned with this file. |
| Taste Skill | Frontend art direction and redesign guidance | Use its redesign workflow and layout/type/motion guidance without overriding the approved RABTO brand. |
| GSAP Skills | Animation implementation guidance | Use GSAP only for purposeful timelines or scroll-linked motion; prefer CSS for simple state transitions. |
| React Bits | Selective React component source | Install/copy only components that solve a real RABTO need; review dependencies, accessibility, RTL, bundle cost, and license before adoption. |
| Playwright CLI | Browser verification | Verify key flows, responsive layouts, accessibility-facing behavior, and screenshots on desktop/mobile. |
| Transitions.dev | Motion recipes and motion audit | Review motion first; use selected recipes only where they improve feedback or comprehension. |

## Local setup

Run from the repository root with Node.js 20+ and npm:

```bash
# Agent skills (workspace-local)
npx skills add https://github.com/heydamir/unslop
npx skills add pbakaus/impeccable
npx skills add https://github.com/Leonxlnx/taste-skill --skill "redesign-existing-projects"
npx skills add https://github.com/greensock/gsap-skills
npx skills add Jakubantalik/transitions.dev

# Project inspection and browser tooling
npm install -D designlang @playwright/cli
npx playwright-cli install
```

Impeccable's native installer can be used instead of the shared-skill install when provider-specific hooks are wanted:

```bash
npx impeccable install
```

Designlang MCP is opt-in and local. After extracting a site, run `npx designlang mcp` and configure the developer's MCP client to launch it from the project root. Do not commit API keys or machine-specific MCP credentials.

React Bits is a source component library, not a global runtime dependency. Browse its documentation and add individual components only when selected:
- https://www.reactbits.dev/

GSAP runtime packages are added only when the implementation actually uses GSAP:

```bash
npm install gsap @gsap/react
```

The Playwright browser may need to be installed once per development environment. Keep browser binaries and generated snapshots out of Git unless they are deliberate test artifacts.

## Operating rules

1. Audit before changing a screen; record findings and the proposed direction.
2. Preserve the approved RABTO identity and all existing product behavior.
3. Make one coherent design-system pass across public, customer, and admin experiences.
4. Use shared tokens and components; do not build visually unrelated dashboards.
5. Prefer CSS transitions for simple interactions; use GSAP for complex sequencing only.
6. Avoid importing React Bits effects merely because they look impressive.
7. Test Arabic RTL, English LTR, narrow mobile widths, keyboard navigation, and reduced-motion preferences.
8. Run lint, typecheck, build, browser checks, and database tests when the required local environment is available. Never report a check as passed unless it actually ran.
9. Review all generated diffs before merge. Never merge to main or deploy without explicit authorization.

## Current UI scope and limitations

The repository currently contains a public landing page only. Customer/admin dashboards, authentication screens, and their workflows are not yet implemented. The visual system must therefore be applied to those screens as they are built; do not claim to have redesigned screens that do not exist yet.


## Additional five-skill pack from the supplied reference image

The five names in the second reference image correspond to the focused skills in the maintained [Design Workbench Skills pack](https://github.com/arthurmi681/design-workbench-skills), plus its orchestrator:

- Taste Skill → `design-taste-frontend`
- Web Design Guidelines → `web-design-guidelines`
- Awesome Design → `awesome-design-md` (84 DESIGN.md references)
- Image to Code → `image-to-code` (includes its helper kit and upstream license)
- Playwright CLI → official `@playwright/cli` and its agent skill
- Additional orchestrator → `design-workbench`

Use `scripts/setup-frontend-tooling.sh` to clone and validate the upstream pack, then run its installer with `--no-browser`. This installs skills into the local agent skills directory (default `~/.agents/skills`) and installs the Playwright CLI globally. It intentionally skips the Chrome browser download. To enable browser-driven checks afterward, run `playwright-cli install-browser chrome` in the local development environment.

The upstream installer backs up existing same-named skill folders before replacing them and includes an uninstall/restore path. The setup script is a local developer-machine operation; committing it to GitHub does not execute it on the user's machine or install skills into ChatGPT itself. Review `THIRD_PARTY_NOTICES.md` in the upstream pack for component-specific licenses. The pack's DESIGN.md examples are references only; RABTO's approved identity remains authoritative.


## UI/UX Pro Max

Also install the official [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) through its maintained CLI. The setup script runs:

```bash
npm exec --yes --package=ui-ux-pro-max-cli -- uipro init --ai universal
```

This targets the universal Agent Skills directory for Codex-compatible agents. The skill supplies searchable design intelligence: interface styles, palettes, typography, UX/accessibility guidance, charts, and stack-specific implementation references. Its search tooling requires Python 3.x. It complements Design Workbench; it does not replace RABTO's approved brand tokens or product decisions.


## Motion.dev

Use the official [Motion](https://motion.dev/) React animation library and its free, open-source AI Kit skill:

- AI skill installer: `npx motion-ai`
- React runtime: `npm install motion`
- React import: `import { motion } from "motion/react"`
- Next.js App Router server-component-friendly entry point: `import * as motion from "motion/react-client"` where appropriate.

Motion is the default choice for declarative React UI motion: entrance/exit, layout changes, gestures, and small coordinated transitions. Prefer CSS for simple hover/color transitions. Use GSAP only when a complex timeline or scroll choreography justifies it; avoid implementing the same animation with multiple engines.

Respect `prefers-reduced-motion`, keep animations brief and purposeful, prioritize transform/opacity, and avoid animating layout-heavy properties. Do not introduce Motion+ paid features or assume they are available. The setup script installs the free Motion AI skill and the `motion` package into the RABTO project.
