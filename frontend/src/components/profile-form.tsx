"use client";

import { type FormEvent, useEffect, useState } from "react";

import { profileApi } from "@/lib/api-client";

const emptyProfile = {
  full_name: "",
  target_role: "",
  experience_level: "",
};

export function ProfileForm() {
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    profileApi
      .get()
      .then((profile) => {
        if (active && profile) {
          setForm({
            full_name: profile.full_name,
            target_role: profile.target_role,
            experience_level: profile.experience_level,
          });
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "The profile could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      await profileApi.update(form);
      setSaved(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The profile could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="mt-8 text-sm text-muted-foreground">Loading profile...</p>;
  }

  return (
    <form className="mt-8 max-w-2xl space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-lg border border-border bg-surface p-6 surface-shadow sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="full_name" className="text-sm font-medium">Full name</label>
            <input
              id="full_name"
              required
              maxLength={120}
              autoComplete="name"
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base shadow-sm hover:border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="target_role" className="text-sm font-medium">Target role</label>
            <input
              id="target_role"
              required
              maxLength={120}
              value={form.target_role}
              onChange={(event) => setForm({ ...form, target_role: event.target.value })}
              placeholder="Frontend Developer"
              className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base shadow-sm hover:border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="experience_level" className="text-sm font-medium">Experience level</label>
            <input
              id="experience_level"
              required
              maxLength={80}
              value={form.experience_level}
              onChange={(event) => setForm({ ...form, experience_level: event.target.value })}
              placeholder="Entry level"
              className="mt-2 min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base shadow-sm hover:border-slate-300"
            />
          </div>
        </div>

        {error && <p role="alert" className="mt-5 rounded-sm bg-destructive-soft px-3 py-2.5 text-sm text-destructive">{error}</p>}
        {saved && <p role="status" className="mt-5 rounded-sm bg-success-soft px-3 py-2.5 text-sm text-success-foreground">Profile saved.</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>
    </form>
  );
}
