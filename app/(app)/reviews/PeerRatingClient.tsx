"use client";

import { useMemo, useState } from "react";

type ReviewStatus = "draft" | "submitted" | "locked";

type CycleDto = {
  id: string;
  year: number;
  quarter: number;
  isOpen: boolean;
};

type PeerDto = {
  id: string;
  displayName: string;
};

type ReviewDto = {
  status: ReviewStatus;
  servingClientRating: number | null;
  servingClientComment: string | null;
  investingFutureRating: number | null;
  investingFutureComment: string | null;
};

export default function PeerRatingClient({
  canSubmitClosedCycles,
  peers,
  cycles,
  reviewMap,
  initialPeerId,
  initialCycleId,
}: {
  canSubmitClosedCycles: boolean;
  peers: PeerDto[];
  cycles: CycleDto[];
  reviewMap: Record<string, ReviewDto>;
  initialPeerId: string;
  initialCycleId: string;
}) {
  const [peerId, setPeerId] = useState(initialPeerId);
  const [cycleId, setCycleId] = useState(initialCycleId);
  const [map, setMap] = useState<Record<string, ReviewDto>>(reviewMap);

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.id === cycleId),
    [cycles, cycleId]
  );

  const reviewKey = useMemo(() => `${peerId}:${cycleId}`, [peerId, cycleId]);
  const existing = map[reviewKey];

  const [servingClientRating, setServingClientRating] = useState<number | null>(
    existing?.servingClientRating ?? null
  );
  const [servingClientComment, setServingClientComment] = useState<string>(
    existing?.servingClientComment ?? ""
  );
  const [investingFutureRating, setInvestingFutureRating] = useState<
    number | null
  >(existing?.investingFutureRating ?? null);
  const [investingFutureComment, setInvestingFutureComment] = useState<string>(
    existing?.investingFutureComment ?? ""
  );
  const [status, setStatus] = useState<ReviewStatus>(existing?.status ?? "draft");

  const isPrivileged = canSubmitClosedCycles;

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onChangePeer(nextPeerId: string) {
    setPeerId(nextPeerId);
    const nextKey = `${nextPeerId}:${cycleId}`;
    const r = map[nextKey];
    setServingClientRating(r?.servingClientRating ?? null);
    setServingClientComment(r?.servingClientComment ?? "");
    setInvestingFutureRating(r?.investingFutureRating ?? null);
    setInvestingFutureComment(r?.investingFutureComment ?? "");
    setStatus(r?.status ?? "draft");
    setFormError(null);
  }

  function onChangeCycle(nextCycleId: string) {
    setCycleId(nextCycleId);
    const nextKey = `${peerId}:${nextCycleId}`;
    const r = map[nextKey];
    setServingClientRating(r?.servingClientRating ?? null);
    setServingClientComment(r?.servingClientComment ?? "");
    setInvestingFutureRating(r?.investingFutureRating ?? null);
    setInvestingFutureComment(r?.investingFutureComment ?? "");
    setStatus(r?.status ?? "draft");
    setFormError(null);
  }

  async function submit(nextStatus: "draft" | "submitted") {
    setFormError(null);

    if (nextStatus === "submitted") {
      if (!peerId) {
        setFormError("No eligible peers available for your current level.");
        return;
      }
      if (servingClientRating == null || investingFutureRating == null) {
        setFormError("Please provide both ratings before submitting.");
        return;
      }
      if (!selectedCycle?.isOpen && !isPrivileged) {
        setFormError("This cycle is closed.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reviews/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          revieweeId: peerId,
          cycleId,
          status: nextStatus,
          servingClientRating: servingClientRating ?? undefined,
          servingClientComment: servingClientComment.trim() || undefined,
          investingFutureRating: investingFutureRating ?? undefined,
          investingFutureComment: investingFutureComment.trim() || undefined,
        }),
      });

      const data = (await res.json()) as
        | { error: string }
        | { review: ReviewDto };

      if (!res.ok) {
        setFormError("Unable to save. Please try again.");
        if ("error" in data) setFormError(data.error);
        return;
      }

      if ("review" in data) {
        const updated = data.review;
        const nextKey = `${peerId}:${cycleId}`;
        setMap((prev) => ({
          ...prev,
          [nextKey]: {
            ...prev[nextKey],
            status: updated.status,
            servingClientRating: updated.servingClientRating ?? null,
            servingClientComment:
              updated.servingClientRating != null
                ? servingClientComment.trim() || null
                : servingClientComment.trim() || null,
            investingFutureRating: updated.investingFutureRating ?? null,
            investingFutureComment: investingFutureComment.trim() || null,
          },
        }));
        setStatus(updated.status);
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm text-zinc-700 dark:text-zinc-200">
              Peer
            </label>
            <select
              value={peerId}
              onChange={(e) => onChangePeer(e.target.value)}
              disabled={peers.length === 0}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm"
            >
              {peers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-56">
            <label className="text-sm text-zinc-700 dark:text-zinc-200">
              Review cycle
            </label>
            <select
              value={cycleId}
              onChange={(e) => onChangeCycle(e.target.value)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.year} · Q{c.quarter} {c.isOpen ? "(Open)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="md:pb-1">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Status: <span className="font-medium">{status}</span>
            </div>
          </div>
        </div>

        {!selectedCycle?.isOpen && !isPrivileged ? (
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            This cycle is closed. You can save drafts, but only Manager-level
            users and above can submit.
          </div>
        ) : null}
        {peers.length === 0 ? (
          <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            No eligible peers yet. You can only review users at levels below
            your own.
          </div>
        ) : null}
      </div>

      {formError ? (
        <div className="rounded-lg border border-red-200 text-red-700 bg-red-50 dark:border-red-900 dark:text-red-300 dark:bg-red-950 px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RatingSection
          title="Serving Client"
          description="How effectively does your peer serve customers/clients?"
          rating={servingClientRating}
          onRatingChange={setServingClientRating}
          comment={servingClientComment}
          onCommentChange={setServingClientComment}
        />
        <RatingSection
          title="Investing in the Future"
          description="How are they building capabilities for what’s next?"
          rating={investingFutureRating}
          onRatingChange={setInvestingFutureRating}
          comment={investingFutureComment}
          onCommentChange={setInvestingFutureComment}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-end">
        <button
          disabled={saving}
          onClick={() => submit("draft")}
          className="px-4 py-2 rounded-lg bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save draft"}
        </button>
        <button
          disabled={saving}
          onClick={() => submit("submitted")}
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

function RatingSection({
  title,
  description,
  rating,
  onRatingChange,
  comment,
  onCommentChange,
}: {
  title: string;
  description: string;
  rating: number | null;
  onRatingChange: (n: number | null) => void;
  comment: string;
  onCommentChange: (s: string) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
      <div className="font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </div>
      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
        {description}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="text-sm text-zinc-700 dark:text-zinc-200">
          Rating (1-5)
        </label>
        <select
          value={rating ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onRatingChange(v === "" ? null : Number(v));
          }}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm"
        >
          <option value="">Not set</option>
          <option value="1">1 - Needs improvement</option>
          <option value="2">2</option>
          <option value="3">3 - Meets expectations</option>
          <option value="4">4</option>
          <option value="5">5 - Exceptional</option>
        </select>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="text-sm text-zinc-700 dark:text-zinc-200">
          Comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm min-h-[110px]"
          placeholder="Add a short note to support your rating..."
        />
      </div>
    </div>
  );
}

