"use client";

import { useState } from "react";

type TargetRole = "employee" | "manager" | "admin";
type PromotionStatus = "open" | "submitted" | "decided";

export default function PromotionCaseEditor({
  employeeId,
  year,
  canEdit,
  initial,
}: {
  employeeId: string;
  year: number;
  canEdit: boolean;
  initial: {
    targetRole: TargetRole | null;
    justification: string | null;
    managerDecision: string | null;
    status: PromotionStatus | null;
  };
}) {
  const [targetRole, setTargetRole] = useState<TargetRole>(
    initial.targetRole ?? "manager"
  );
  const [justification, setJustification] = useState(initial.justification ?? "");
  const [managerDecision, setManagerDecision] = useState(
    initial.managerDecision ?? ""
  );
  const [status, setStatus] = useState<PromotionStatus>(
    initial.status ?? "open"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/promotion-cases/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employeeId,
          year,
          targetRole,
          justification,
          managerDecision,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Unable to save.");
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
          Promotion Case
        </div>
        <div className="mt-3 space-y-4 text-sm">
          <TextBlock label="Target role" value={initial.targetRole ?? "—"} />
          <TextBlock label="Status" value={initial.status ?? "—"} />
          <TextBlock
            label="Justification"
            value={initial.justification ?? null}
          />
          <TextBlock
            label="Manager decision"
            value={initial.managerDecision ?? null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
          Promotion Case
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
        <div className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">
            Target role
          </div>
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value as TargetRole)}
            className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm w-full"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <div className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">
            Status
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PromotionStatus)}
            className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm w-full"
          >
            <option value="open">Open</option>
            <option value="submitted">Submitted</option>
            <option value="decided">Decided</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <Field
          label="Justification"
          value={justification}
          onChange={setJustification}
          placeholder="Describe evidence supporting the promotion (impact, behaviors, outcomes)..."
        />
        <Field
          label="Manager decision"
          value={managerDecision}
          onChange={setManagerDecision}
          placeholder="Decision notes (if any)..."
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
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
        placeholder={placeholder}
      />
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-50">
        {value ?? "—"}
      </div>
    </div>
  );
}

