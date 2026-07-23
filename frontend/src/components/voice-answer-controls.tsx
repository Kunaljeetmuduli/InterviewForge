"use client";

import { Mic, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;
const subscribeToBrowserCapabilities = () => () => undefined;

function recognitionConstructor() {
  const browser = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

export function VoiceAnswerControls({
  question,
  answer,
  onAnswerChange,
  onVoiceMetrics,
}: {
  question: string;
  answer: string;
  onAnswerChange: (value: string) => void;
  onVoiceMetrics: (durationSeconds: number | null) => void;
}) {
  const supported = useSyncExternalStore(
    subscribeToBrowserCapabilities,
    () => Boolean(recognitionConstructor()),
    () => false,
  );
  const [voiceState, setVoiceState] = useState<
    "idle" | "speaking_question" | "listening" | "reviewing" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [questionPaused, setQuestionPaused] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const startedAt = useRef<number | null>(null);
  const recognitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionFailed = useRef(false);
  const recognitionTimedOut = useRef(false);

  useEffect(() => {
    return () => {
      recognition.current?.abort();
      window.speechSynthesis?.cancel();
      if (recognitionTimeout.current) clearTimeout(recognitionTimeout.current);
    };
  }, []);

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setQuestionPaused(false);
    setVoiceState("idle");
  }

  function toggleQuestionPause() {
    if (questionPaused) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
    setQuestionPaused((current) => !current);
  }

  function readQuestion() {
    if (!("speechSynthesis" in window)) {
      setMessage("Question playback is not supported in this browser.");
      return;
    }
    recognition.current?.abort();
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.onend = () => {
      setQuestionPaused(false);
      setVoiceState("idle");
    };
    utterance.onerror = () => {
      setMessage("Question playback could not start. You can read it on screen.");
      setVoiceState("error");
    };
    window.speechSynthesis.cancel();
    setVoiceState("speaking_question");
    setMessage("Question is playing. Recording is unavailable during playback.");
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    window.speechSynthesis?.cancel();
    const instance = new Constructor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = "en-US";
    const initial = answer.trim();
    instance.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? "";
      }
      onAnswerChange([initial, transcript.trim()].filter(Boolean).join(" "));
    };
    instance.onerror = (event) => {
      recognitionFailed.current = true;
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setMessage(denied
        ? "Microphone access was denied. You can continue by typing."
        : event.error === "no-speech"
          ? "No speech was detected before the microphone timed out. You can retry or type."
          : "Voice input stopped unexpectedly. Your transcript remains editable.");
      setVoiceState("error");
      onVoiceMetrics(null);
    };
    instance.onend = () => {
      if (recognitionTimeout.current) clearTimeout(recognitionTimeout.current);
      if (startedAt.current && !recognitionFailed.current) {
        onVoiceMetrics(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      }
      startedAt.current = null;
      setVoiceState((current) => (current === "error" ? current : "reviewing"));
      if (!recognitionFailed.current && !recognitionTimedOut.current) {
        setMessage("Recording stopped. Review and edit the transcript before submitting.");
      }
    };
    recognition.current = instance;
    startedAt.current = Date.now();
    recognitionFailed.current = false;
    recognitionTimedOut.current = false;
    setMessage("Recording. Stop when finished, then review and edit the transcript.");
    setVoiceState("listening");
    instance.start();
    recognitionTimeout.current = setTimeout(() => {
      recognitionTimedOut.current = true;
      setMessage("Voice input reached the two-minute limit. Review the transcript or continue by typing.");
      instance.stop();
    }, 120_000);
  }

  function stopListening() {
    recognition.current?.stop();
  }

  return (
    <div className="mt-4 rounded-md border border-border bg-surface-subtle p-4">
      <div className="flex flex-wrap gap-3">
        {voiceState === "speaking_question" ? (
          <>
            <button type="button" onClick={toggleQuestionPause} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-semibold">
              {questionPaused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
              {questionPaused ? "Resume question" : "Pause question"}
            </button>
            <button type="button" onClick={stopSpeaking} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-semibold">
              <VolumeX aria-hidden="true" className="size-4" /> Stop question
            </button>
          </>
        ) : (
          <button type="button" onClick={readQuestion} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 text-sm font-semibold">
            <Volume2 aria-hidden="true" className="size-4" /> Play question
          </button>
        )}
        {supported ? (
          voiceState === "listening" ? (
            <button type="button" onClick={stopListening} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-destructive px-4 text-sm font-semibold text-primary-foreground">
              <Square aria-hidden="true" className="size-4" /> Stop recording
            </button>
          ) : (
            <button type="button" onClick={startListening} disabled={voiceState === "speaking_question"} className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Mic aria-hidden="true" className="size-4" /> Answer with voice
            </button>
          )
        ) : (
          <span className="self-center text-sm text-muted-foreground">Voice input is unavailable. Text answers work normally.</span>
        )}
      </div>
      {message ? <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p> : null}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Voice uses your browser&apos;s speech service. Review the editable transcript before submitting. Pace and filler counts are limited delivery signals, not personality or hiring judgments.
      </p>
    </div>
  );
}
