# Product

## Register

product

## Users

InterviewForge serves students, recent graduates, career switchers, and early-career candidates preparing for software interviews. They usually practice on a laptop in focused 30-to-45-minute sessions and may not have access to a coach, reliable feedback, or a clear study sequence.

Their core job is to turn a resume and a target job description into realistic practice, understand why an answer was strong or weak, and know exactly what to improve next. They need useful guidance without the product pretending to make hiring decisions.

## Product Purpose

InterviewForge is an AI-assisted interview practice platform that creates resume-aware and job-aware interviews, evaluates each answer, and adapts the next question to demonstrated performance. It supports HR, technical, behavioral, and DSA verbal practice through text and optional browser-native voice input.

The product exists to close the loop between practice, evidence-based feedback, and targeted improvement:

1. Analyze the candidate's resume and pasted job description.
2. Run a 5-question quick practice or 10-question full interview.
3. Evaluate each submitted answer with a stable structured rubric.
4. Use deterministic `adaptive-v1` rules to select the next topic, difficulty, and follow-up strategy.
5. Show progress, weak topics, history, and an actionable learning roadmap.

Success means a candidate can explain what improved, identify remaining gaps, and begin the next practice session with a specific goal. InterviewForge is a preparation tool, not a hiring predictor, scoring authority, or substitute for human judgment.

## Brand Personality

**Focused, honest, encouraging.**

The interface should feel credible, calm, and quietly capable. Its voice is direct and supportive: it explains evidence, acknowledges uncertainty, and converts criticism into a next action. It should build confidence through clarity rather than hype, celebration effects, or competitive pressure.

## Anti-references

InterviewForge must not resemble:

- A **neon AI product** with purple gradients, glowing controls, glass panels, or “magic” language.
- A **gaming dashboard** with points, streak pressure, leaderboards, confetti, or artificial urgency.
- A **corporate HR portal** that feels bureaucratic, cold, dense, or judgmental.
- A **generic SaaS landing-page cliché** made from oversized claims, endless identical cards, decorative AI art, and vague promises.
- A **dark-mode-first developer tool**. Dark mode is outside the MVP.

It must also avoid presenting an evaluation as a hiring verdict, exposing hidden rubrics before an answer, or using color as the only signal of quality or status.

## Design Principles

1. **Every screen earns its place.** Each view supports one clear task and keeps its primary action obvious.
2. **Show the evidence.** Feedback connects scores to observable answer content and clearly distinguishes fact, inference, and suggestion.
3. **Turn weakness into direction.** Every negative finding leads to a practical next step without shame or gamification pressure.
4. **Make adaptation legible.** Users should understand that question difficulty and topic change in response to prior performance, while the deterministic engine remains the authority.
5. **Protect candidate trust.** Personal career information, answer content, and AI limitations are handled transparently and conservatively.

## Accessibility & Inclusion

The MVP targets WCAG 2.2 AA for primary flows. All core tasks must be keyboard-operable, use visible focus treatment, preserve semantic headings and landmarks, and work at 200% zoom without loss of function. Controls require accessible names and at least 44px touch targets where practical.

Color is never the only status indicator. Charts, scores, recording state, strengths, and weaknesses also use labels, icons, patterns, or explanatory text. Motion respects `prefers-reduced-motion` and communicates state only. Voice is optional; every voice interaction has an editable text fallback, and microphone denial must never block an interview.

Language should be plain, non-discriminatory, and careful around confidence. The system evaluates answer structure and content, not accent, personality, emotion, appearance, or psychological state.
