export const FILLER_TERMS = [
  "um",
  "uh",
  "like",
  "basically",
  "actually",
  "you know",
  "so",
] as const;

export interface VoiceMetrics {
  wordCount: number;
  fillerWords: Array<{ word: string; count: number }>;
  fillerRate: number;
  wordsPerMinute: number;
  deliveryScore: number;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function calculateVoiceMetrics(
  transcript: string,
  speakingDurationSeconds: number,
): VoiceMetrics {
  const words = transcript.trim().split(/\s+/u).filter(Boolean);
  const normalized = transcript.toLocaleLowerCase("en");
  const fillerWords = FILLER_TERMS.flatMap((term) => {
    const matches = normalized.match(
      new RegExp(`\\b${escapeRegExp(term)}\\b`, "gu"),
    );
    return matches?.length ? [{ word: term, count: matches.length }] : [];
  });
  const fillerCount = fillerWords.reduce((sum, item) => sum + item.count, 0);
  const fillerRate =
    words.length === 0 ? 0 : Number(((fillerCount / words.length) * 100).toFixed(1));
  const wordsPerMinute = Math.round(
    words.length / (speakingDurationSeconds / 60),
  );

  // A limited delivery signal based only on observable pace and filler use.
  // It is not a personality, confidence, fluency, or hiring judgment.
  const pacePenalty =
    wordsPerMinute < 90
      ? Math.min(25, (90 - wordsPerMinute) * 0.5)
      : wordsPerMinute > 180
        ? Math.min(25, (wordsPerMinute - 180) * 0.35)
        : 0;
  const fillerPenalty = Math.min(30, fillerRate * 3);

  return {
    wordCount: words.length,
    fillerWords,
    fillerRate,
    wordsPerMinute,
    deliveryScore: Math.round(Math.max(0, 100 - pacePenalty - fillerPenalty)),
  };
}
