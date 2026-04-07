"use client";

import { useState } from "react";

export default function YearInReviewEditor({
  employeeId,
  year,
  initial,
  canEdit,
}: {
  employeeId: string;
  year: number;
  initial: {
    summaryNarrative: string | null;
    overallStrengths: string | null;
    growthAreas: string | null;
  };
  canEdit: boolean;
}) {
  const [summaryNarrative, setSummaryNarrative] = useState(
    initial.summaryNarrative ?? ""
  );
  const [overallStrengths, setOverallStrengths] = useState(
    initial.overallStrengths ?? ""
  );
  const [growthAreas, setGrowthAreas] = useState(
    initial.growthAreas ?? ""
  );

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/year-in-review/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employeeId,
          year,
          summaryNarrative,
          overallStrengths,
          growthAreas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Unable to save. Please try again.");
        if (data?.error) setError(data.error);
        return;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
          Narrative (read-only)
        </div>
        <div className="mt-4 space-y-4">
          <TextBlock title="Summary" value={initial.summaryNarrative} />
          <TextBlock title="Overall strengths" value={initial.overallStrengths} />
          <TextBlock title="Growth areas" value={initial.growthAreas} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
          Narrative
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {error ? (
        <div className="mt-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Summary narrative (annual)" value={summaryNarrative} onChange={setSummaryNarrative} />
        <Field label="Overall strengths" value={overallStrengths} onChange={setOverallStrengths} />
        <Field label="Growth areas" value={growthAreas} onChange={setGrowthAreas} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm min-h-[90px] w-full"
      />
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <div className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">
        {title}
      </div>
      <div className="mt-2 text-sm text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap">
        {value ?? "—"}
      </div>
    </div>
  );
}

