# InterviewForge Plan Amendments

These amendments override the corresponding parts of the master project handoff. All other decisions and scope remain unchanged.

## 1. Job descriptions are paste-only in the MVP

The MVP accepts job descriptions as pasted text only. PDF upload for job descriptions is postponed.

### Updated MVP behavior

- The user pastes a job description into a text area.
- Fastify validates its length and content.
- Fastify stores the raw text and runs structured Gemini analysis.
- The user can retry a failed analysis.
- The application does not create a job-description Storage bucket or accept JD files.

### Updated `job_descriptions` fields

- `id`
- `user_id`
- `title`
- `company`
- `raw_text`
- `status`
- `error_message`
- `created_at`
- `updated_at`

Remove `source_type`, `file_name`, and `storage_path` from this table.

### Updated job-description routes

```http
POST   /api/v1/job-descriptions
GET    /api/v1/job-descriptions
GET    /api/v1/job-descriptions/:jobDescriptionId
POST   /api/v1/job-descriptions/:jobDescriptionId/retry
DELETE /api/v1/job-descriptions/:jobDescriptionId
```

`POST /api/v1/job-descriptions` creates the record and performs the paste-text analysis. Remove the separate JD PDF upload and processing flow.

### Related scope changes

- Supabase Storage is used for resume PDFs only.
- Remove `job-descriptions/{userId}/{jobDescriptionId}.pdf` from the storage design.
- Replace "Paste or upload a job description" with "Paste a job description" throughout the MVP scope, schedule, tests, and definition of done.

## 2. Interviews contain either 5 or 10 questions

Replace the approximate 6-to-8-question format with two explicit choices:

- **Quick practice:** 5 questions
- **Full interview:** 10 questions

The user selects the format when creating an interview. The default is 5 questions.

### Data and validation rules

- `interviews.question_limit` must be either `5` or `10`.
- `MAX_INTERVIEW_QUESTIONS` remains `10`.
- The AdaptiveEngine ends the interview when the selected question limit is reached.
- The interview interface displays the selected limit, for example `Question 3 of 5` or `Question 7 of 10`.

## 3. AdaptiveEngine versioning

Every interview records the adaptive ruleset used for that session.

### Database change

Add to `interviews`:

```text
adaptive_engine_version
```

Set it when the interview is created. The initial value is:

```text
adaptive-v1
```

The version remains fixed for the entire interview, even if a newer engine version is deployed later.

### Engine contract

The pure TypeScript engine exports a version constant:

```ts
export const ADAPTIVE_ENGINE_VERSION = "adaptive-v1";
```

Its result includes the version:

```json
{
  "engineVersion": "adaptive-v1",
  "difficulty": "easy",
  "topic": "Operating Systems",
  "strategy": "easier_follow_up",
  "focusConcepts": ["process", "thread"],
  "reason": "The previous answer missed the difference between processes and threads."
}
```

Tests must verify that the version is returned and persisted with the interview.

## 4. Locked visual direction

InterviewForge uses a light-first, restrained product interface called **Forge Blue + Slate**. The supplied InterviewForge dashboard reference is the visual source of truth for the palette, density, navigation, component styling, and icon treatment.

### Product scene

A student uses the product on a laptop during a focused 30-to-45-minute practice session in a normally lit room. The interface should feel calm, credible, and encouraging. It must not resemble a neon AI dashboard, game interface, or corporate HR portal.

### Color strategy

Use cool blue-tinted neutrals for most of the interface. Forge Blue occupies less than roughly 10% of the surface and is reserved for primary actions, active navigation, recording state, focus, links, and meaningful progress. Green, amber, red, and violet are semantic colors rather than competing brand accents.

The reference colors are `#2563EB` primary, `#DBEAFE` primary light, `#F8FAFC` background, `#0F172A` primary text, `#475569` secondary text, `#E2E8F0` borders, and `#16A34A` success. Implementation uses their OKLCH equivalents:

```css
:root {
  --background: oklch(0.984 0.003 248);
  --surface: oklch(0.995 0.002 248);
  --surface-subtle: oklch(0.968 0.007 248);
  --foreground: oklch(0.208 0.040 266);
  --muted-foreground: oklch(0.446 0.037 257);
  --border: oklch(0.929 0.013 256);

  --primary: oklch(0.546 0.215 263);
  --primary-hover: oklch(0.488 0.217 264);
  --primary-foreground: oklch(0.984 0.003 248);
  --primary-soft: oklch(0.932 0.032 256);
  --focus-ring: oklch(0.546 0.215 263);

  --success: oklch(0.627 0.170 149);
  --success-soft: oklch(0.962 0.043 157);
  --warning: oklch(0.769 0.165 70);
  --warning-soft: oklch(0.962 0.058 96);
  --destructive: oklch(0.637 0.208 25);
  --destructive-soft: oklch(0.936 0.031 18);
  --accent-violet: oklch(0.541 0.247 293);
  --accent-violet-soft: oklch(0.943 0.028 295);
}
```

All text, controls, focus rings, and semantic states must meet WCAG AA contrast requirements. Do not use color as the only indicator of status.

### Typography and components

- Geist Sans for interface text.
- Geist Mono only for timings, question counts, scores, IDs, and technical metrics.
- 10-to-12px radii.
- Borders and spacing provide most separation; shadows remain subtle and uncommon.
- Lucide icons support labels but do not replace them where meaning could be ambiguous.
- Skeletons are used for content loading.
- Motion lasts 150-to-250ms and communicates state only.
- No gradient text, glassmorphism, decorative glow, nested cards, or dark mode in the MVP.

### Application layout

#### Public pages

- Compact top navigation with the InterviewForge wordmark.
- Focused landing page explaining adaptive practice, resume-aware questions, evaluation, and progress.
- One primary action and one secondary action in the hero.
- Product examples should look like real interview feedback, not decorative AI artwork.

#### Authenticated application

- Persistent desktop sidebar for Dashboard, Resume, Job Description, Interviews, History, and Roadmap.
- Compact contextual top bar for page title and account actions.
- Sidebar collapses into an accessible sheet on narrow screens.
- Pages use clear sections and whitespace instead of placing every block inside a card.

#### Dashboard

- Progress summary at the top.
- Interview trend and topic mastery form the main visual hierarchy.
- Recent interviews appear as a compact list or table.
- Strongest and weakest topics use semantic labels plus text, not color alone.

#### Interview room

- A distraction-reduced layout replaces the normal dashboard density.
- The top bar shows interview type, `Question n of 5/10`, and End interview.
- The question and answer workspace receive primary focus.
- Voice controls remain adjacent to the editable transcript.
- Evaluation appears only after submission and does not visually compete with the next question.
- On small screens, sections stack in the order Question, Answer, Controls, Evaluation.

## 5. Implementation boundary

These are documentation and planning changes only. Do not begin authentication, database migrations, scaffolding, or UI implementation until the updated master plan is approved.
