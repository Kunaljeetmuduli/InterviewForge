---
name: InterviewForge
description: A calm, evidence-led workspace for adaptive interview practice.
colors:
  forge-blue: "#2563EB"
  forge-blue-hover: "#1D4ED8"
  forge-blue-soft: "#DBEAFE"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  surface-subtle: "#F1F5F9"
  slate-950: "#0F172A"
  slate-600: "#475569"
  border: "#E2E8F0"
  success: "#16A34A"
  success-soft: "#DCFCE7"
  warning: "#D97706"
  warning-soft: "#FEF3C7"
  destructive: "#DC2626"
  destructive-soft: "#FEE2E2"
  violet: "#7C3AED"
  violet-soft: "#EDE9FE"
typography:
  display:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  metric:
    fontFamily: "Geist Mono, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.forge-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.forge-blue-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate-950}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate-950}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate-950}"
    rounded: "{rounded.lg}"
    padding: "24px"
  navigation-active:
    backgroundColor: "{colors.forge-blue-soft}"
    textColor: "{colors.forge-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: InterviewForge

## Overview

**Creative North Star: "The Calm Practice Studio"**

InterviewForge should feel like a well-prepared coaching workspace: bright, orderly, specific, and supportive. The visual system recedes behind the practice task while preserving enough warmth to make difficult feedback feel actionable. Predictable grids, restrained Forge Blue, precise Geist typography, and generous breathing room create trust without making the interface sterile.

This is a light-first product system for sustained laptop use. Information density may increase on dashboards and reports, but the current task must always remain obvious. The system explicitly rejects the PRODUCT.md anti-references: a neon AI product, a gaming dashboard, a corporate HR portal, a generic SaaS landing-page cliché, and a dark-mode-first developer tool.

**Key Characteristics:**

- Light-first Forge Blue + Slate palette.
- Familiar product navigation and clear information hierarchy.
- Evidence-led feedback with restrained semantic color.
- Flat surfaces separated primarily by space, tint, and one-pixel borders.
- Responsive, keyboard-friendly layouts with state-only motion.

## Colors

Forge Blue is the single product accent. Slate neutrals carry most of the interface; semantic colors communicate named states and never decorate inactive content.

### Primary

- **Forge Blue:** The primary action, selected navigation, links, recording state, focus indication, and meaningful progress.
- **Forge Blue Hover:** The hover and pressed counterpart for filled primary controls.
- **Forge Blue Mist:** A low-emphasis selection background for active navigation, informational icons, and blue badges.

### Secondary

- **Growth Green:** Successful analysis, strengths, positive score movement, and completed states.
- **Attention Amber:** Warnings, partial completion, or suggestions that need review but do not block progress.
- **Correction Red:** Validation errors, destructive actions, failed processing, and clearly labeled weak areas.

### Tertiary

- **Insight Violet:** A limited secondary data-series color for charts and structured AI insight categories. It is not a second brand accent.

### Neutral

- **Cloud Canvas:** The application background behind primary surfaces.
- **Paper Surface:** Cards, dialogs, form controls, and the main content plane.
- **Slate Wash:** Sidebars, toolbars, skeletons, and low-emphasis grouped regions.
- **Ink Slate:** Primary text and high-contrast icons.
- **Quiet Slate:** Secondary copy, metadata, and inactive navigation labels.
- **Hairline Slate:** Dividers, input outlines, and card boundaries.

### Named Rules

**The One Blue Rule.** Forge Blue is reserved for primary action, selection, focus, recording, links, and progress; it is never background decoration.

**The Named State Rule.** Green, amber, red, and violet must always appear with a label, icon, pattern, or explanatory text.

**The Light-First Rule.** Dark mode, near-black panels, neon accents, and decorative gradients are prohibited in the MVP.

## Typography

**Display Font:** Geist Sans (with Arial and sans-serif fallback)  
**Body Font:** Geist Sans (with Arial and sans-serif fallback)  
**Label/Mono Font:** Geist Mono (with Consolas and monospace fallback)

**Character:** Geist keeps the product precise and contemporary without introducing a second visual voice. Hierarchy comes from weight, size, line height, and spacing; headings are decisive but never oversized inside the application.

### Hierarchy

- **Display** (700, 32px, 1.2): Public-page hero titles and rare top-level empty states only.
- **Headline** (600, 24px, 1.3): Page titles and report summaries.
- **Title** (600, 18px, 1.4): Section titles, card titles, and prominent question labels.
- **Body** (400, 16px, 1.6): Questions, answers, feedback, and explanatory copy; prose is capped near 65–75 characters.
- **Label** (500, 14px, 1.4): Controls, navigation, form labels, status text, and table headings.
- **Metric** (500, 14px, 1.4): Timings, question counts, scores, IDs, and technical measurements; tabular numerals are enabled.

### Named Rules

**The Product Scale Rule.** Use fixed sizes, not fluid application typography. A heading that changes size because it moves into a sidebar is a failure.

**The Mono Precision Rule.** Geist Mono is limited to metrics, timings, identifiers, counts, and code-like content; it never carries paragraphs.

## Elevation

The system is flat by default. Depth comes from Cloud Canvas behind Paper Surface, subtle tonal grouping, one-pixel Hairline Slate borders, and spacing. Shadows are uncommon and ambient, never dark or sharply outlined.

### Shadow Vocabulary

- **Surface Lift** (`0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05)`): Large dashboard surfaces and dialogs that must separate from the canvas.
- **Floating Overlay** (`0 16px 40px rgba(15, 23, 42, 0.12)`): Menus, sheets, and dialogs only.

### Named Rules

**The Flat-by-Default Rule.** Resting controls and nested content do not receive shadows. If every region appears to float, the hierarchy has failed.

**The No Card-in-Card Rule.** Use headings, dividers, lists, and whitespace inside a surface; nested cards are prohibited.

## Components

Components feel refined and restrained. Every interactive component defines default, hover, focus-visible, active, disabled, loading, and error behavior before it is considered complete.

### Buttons

- **Shape:** Gently rounded rectangle (8px radius), at least 44px high, with concise verb-first labels.
- **Primary:** Forge Blue fill, white text, and 16px horizontal padding. Only one dominant primary action appears in a local task region.
- **Hover / Focus:** Hover shifts to Forge Blue Hover over 180ms. Focus uses a 2px Forge Blue ring with a 2px surface offset. Active state may translate by at most 1px; reduced-motion removes the transform.
- **Secondary:** Paper Surface with a one-pixel Hairline Slate border and Ink Slate text.
- **Ghost:** Transparent at rest; Slate Wash on hover. Use for low-priority actions and navigation utilities.
- **Destructive:** Correction Red is reserved for confirmed destructive actions and never replaces an inline validation message.

### Chips

- **Style:** Soft semantic tint, dark readable text, 999px radius, and concise text or icon-plus-text.
- **State:** Selected filter chips use Forge Blue Mist plus a check icon; status chips use explicit words such as “Completed,” “Needs work,” or “Failed.”

### Cards / Containers

- **Corner Style:** Calm, consistent corners (12px radius).
- **Background:** Paper Surface on Cloud Canvas; Slate Wash for nested non-interactive groupings.
- **Shadow Strategy:** Flat by default; Surface Lift only for primary dashboard regions that need clear separation.
- **Border:** One-pixel Hairline Slate where boundaries are necessary.
- **Internal Padding:** 16px on compact mobile regions, 24px on desktop cards, and 32px on high-focus interview surfaces.

### Inputs / Fields

- **Style:** Paper Surface, one-pixel Hairline Slate outline, 8px radius, 44px minimum height, and persistent labels.
- **Focus:** Two-pixel Forge Blue ring with a two-pixel surface offset; never remove the focus outline without replacement.
- **Error / Disabled:** Errors use Correction Red border, icon, and adjacent message. Disabled fields use Slate Wash and Quiet Slate while remaining legible.
- **Long Text:** Resume/JD and answer text areas show character guidance, keep readable line length, and never use a file affordance for job descriptions in the MVP.

### Navigation

- Desktop uses a persistent sidebar with the InterviewForge wordmark, section labels, and icon-plus-text destinations. Active navigation uses Forge Blue Mist, Forge Blue text, and an explicit `aria-current` state.
- The contextual top bar stays compact and exposes page title, relevant utilities, and account access.
- Below the desktop breakpoint, the sidebar becomes an accessible sheet with focus trapping, an obvious close action, and restored trigger focus.
- Lucide icons use an approximately 2px stroke and support labels rather than replacing ambiguous text.

### Interview Workspace

The interview room deliberately reduces dashboard density. Its top bar shows interview type, `Question n of 5/10`, and “End interview.” The question and editable answer remain the visual center; voice controls sit beside the transcript, and evaluation is revealed only after submission. On narrow screens the order is Question, Answer, Controls, then Evaluation.

## Do's and Don'ts

### Do:

- **Do** reserve Forge Blue for primary action, selection, focus, recording, links, and meaningful progress.
- **Do** use whitespace, section headings, one-pixel borders, and Slate Wash before adding another card.
- **Do** pair scores, strengths, weaknesses, and chart series with labels or icons so color is never the only signal.
- **Do** use 150–250ms state transitions on opacity, color, and transform and honor `prefers-reduced-motion`.
- **Do** preserve a text fallback beside every browser-native voice interaction.
- **Do** keep 5-question and 10-question formats explicit throughout setup and the interview room.

### Don't:

- **Don't** make InterviewForge look like a **neon AI product**: purple gradients, glowing controls, glassmorphism, and “magic” visual language are prohibited.
- **Don't** make it look like a **gaming dashboard**: no streak pressure, points, leaderboards, confetti, or decorative progress theatrics.
- **Don't** make it look like a **corporate HR portal**: avoid bureaucratic density, judgmental copy, and cold data walls.
- **Don't** use a **generic SaaS landing-page cliché**: no oversized empty claims, endless identical card grids, or decorative AI art.
- **Don't** create a **dark-mode-first developer tool**. Dark mode is outside the MVP.
- **Don't** use gradient text, decorative gradients, decorative glow, nested cards, side-stripe accent borders, custom scrollbars, or decorative motion.
- **Don't** create a job-description PDF upload control; the MVP accepts pasted job-description text only.
