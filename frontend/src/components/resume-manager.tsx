"use client";

import {
  CheckCircle2,
  FileText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { resumeApi, type Resume } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

type ListState = "loading" | "ready" | "error";
type UploadState = "idle" | "uploading" | "success" | "error";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const statusStyles: Record<Resume["status"], string> = {
  pending: "bg-primary-soft text-primary",
  processing: "bg-warning-soft text-foreground",
  completed: "bg-success-soft text-success-foreground",
  failed: "bg-destructive-soft text-destructive",
};

const statusLabels: Record<Resume["status"], string> = {
  pending: "Uploaded",
  processing: "Processing",
  completed: "Analysis ready",
  failed: "Needs attention",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateResumeFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Choose a PDF file.";
  }

  if (file.type && file.type !== "application/pdf") {
    return "The selected file is not recognized as a PDF.";
  }

  if (file.size <= 0 || file.size > MAX_RESUME_SIZE_BYTES) {
    return "The PDF must be larger than 0 bytes and no more than 5 MB.";
  }

  return null;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ResumeManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [listState, setListState] = useState<ListState>("loading");
  const [listError, setListError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadResumes = useCallback(async () => {
    setListState("loading");
    setListError("");

    try {
      const loadedResumes = await resumeApi.list();
      setResumes(loadedResumes);
      setListState("ready");
    } catch (error) {
      setListError(errorMessage(error, "Your resumes could not be loaded."));
      setListState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;

    void resumeApi.list().then(
      (loadedResumes) => {
        if (!active) {
          return;
        }

        setResumes(loadedResumes);
        setListState("ready");
      },
      (error: unknown) => {
        if (!active) {
          return;
        }

        setListError(errorMessage(error, "Your resumes could not be loaded."));
        setListState("error");
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFileError("");
    setUploadMessage("");

    if (!selectedFile) {
      setFileError("Choose a resume PDF before uploading.");
      return;
    }

    const validationError = validateResumeFile(selectedFile);

    if (validationError) {
      setFileError(validationError);
      return;
    }

    setUploadState("uploading");
    let createdResume: Resume | null = null;

    try {
      const resume = await resumeApi.create({
        file_name: selectedFile.name,
        mime_type: "application/pdf",
        file_size: selectedFile.size,
      });
      createdResume = resume;

      const { error } = await getSupabaseBrowserClient()
        .storage.from("resumes")
        .upload(resume.storage_path, selectedFile, {
          cacheControl: "3600",
          contentType: "application/pdf",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setResumes((current) => [resume, ...current]);
      setSelectedFile(null);
      setUploadState("success");
      setUploadMessage("Resume uploaded to private storage.");

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      let message = errorMessage(error, "The resume could not be uploaded.");

      if (createdResume) {
        try {
          await resumeApi.delete(createdResume.id);
        } catch {
          message = `${message} The incomplete record could not be cleaned up automatically.`;
          void loadResumes();
        }
      }

      setUploadState("error");
      setUploadMessage(message);
    }
  };

  const handleDelete = async (resume: Resume) => {
    const confirmed = window.confirm(
      `Delete ${resume.file_name}? This removes the private file and its record.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(resume.id);
    setListError("");

    try {
      await resumeApi.delete(resume.id);
      setResumes((current) =>
        current.filter((item) => item.id !== resume.id),
      );
    } catch (error) {
      setListError(errorMessage(error, "The resume could not be deleted."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-10 space-y-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-12">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8"
        >
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
            <UploadCloud aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">
            Upload your resume
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Choose a text-based PDF. Scanned or image-only files cannot be
            analyzed reliably.
          </p>

          <label
            htmlFor="resume-file"
            className="mt-6 block text-sm font-semibold text-foreground"
          >
            Resume PDF
          </label>
          <input
            ref={inputRef}
            id="resume-file"
            name="resume-file"
            type="file"
            accept=".pdf,application/pdf"
            disabled={uploadState === "uploading"}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              setFileError(file ? (validateResumeFile(file) ?? "") : "");
              setUploadState("idle");
              setUploadMessage("");
            }}
            aria-describedby="resume-file-guidance resume-file-error"
            className="mt-2 block min-h-11 w-full rounded-sm border border-border bg-surface text-sm text-muted-foreground file:mr-4 file:min-h-11 file:border-0 file:border-r file:border-border file:bg-surface-subtle file:px-4 file:text-sm file:font-semibold file:text-foreground hover:file:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p
            id="resume-file-guidance"
            className="mt-2 text-xs leading-5 text-muted-foreground"
          >
            PDF only, maximum 5 MB.
          </p>
          {fileError ? (
            <p
              id="resume-file-error"
              role="alert"
              className="mt-2 text-sm text-destructive"
            >
              {fileError}
            </p>
          ) : null}

          {uploadMessage ? (
            <p
              role={uploadState === "error" ? "alert" : "status"}
              className={`mt-5 rounded-sm px-3 py-2.5 text-sm ${
                uploadState === "error"
                  ? "bg-destructive-soft text-destructive"
                  : "bg-success-soft text-success-foreground"
              }`}
            >
              {uploadMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={uploadState === "uploading"}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud aria-hidden="true" className="size-4" />
            {uploadState === "uploading" ? "Uploading..." : "Upload resume"}
          </button>
        </form>

        <div className="border-y border-border py-7 lg:self-center">
          <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Private by design</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Resume files are stored in a private bucket under your user ID.
            Ownership policies prevent another signed-in user from reading,
            replacing, or deleting them.
          </p>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-success"
              />
              Server-generated storage paths
            </li>
            <li className="flex gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-success"
              />
              PDF type and size restrictions
            </li>
            <li className="flex gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-success"
              />
              No public resume URLs
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="resume-list-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Your documents</p>
            <h2
              id="resume-list-heading"
              className="mt-1 text-2xl font-semibold tracking-tight"
            >
              Uploaded resumes
            </h2>
          </div>
          {listState === "error" ? (
            <button
              type="button"
              onClick={() => void loadResumes()}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-surface-subtle"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry
            </button>
          ) : null}
        </div>

        {listError ? (
          <p
            role="alert"
            className="mt-5 rounded-sm bg-destructive-soft px-3 py-2.5 text-sm text-destructive"
          >
            {listError}
          </p>
        ) : null}

        {listState === "loading" ? (
          <div
            aria-busy="true"
            aria-label="Loading resumes"
            className="mt-6 space-y-3"
          >
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-20 rounded-md border border-border bg-surface-subtle"
              />
            ))}
          </div>
        ) : null}

        {listState === "ready" && resumes.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
            <FileText
              aria-hidden="true"
              className="mx-auto size-7 text-muted-foreground"
            />
            <h3 className="mt-4 text-lg font-semibold">No resumes uploaded</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Upload a text-based PDF above to create your private preparation
              record.
            </p>
          </div>
        ) : null}

        {listState === "ready" && resumes.length > 0 ? (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <FileText aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {resume.file_name}
                    </p>
                    {resume.is_primary ? (
                      <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatFileSize(resume.file_size)} · Uploaded{" "}
                    {dateFormatter.format(new Date(resume.created_at))}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[resume.status]}`}
                >
                  {statusLabels[resume.status]}
                </span>
                <button
                  type="button"
                  disabled={deletingId === resume.id}
                  onClick={() => void handleDelete(resume)}
                  className="inline-flex min-h-10 w-fit items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {deletingId === resume.id ? "Deleting..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
