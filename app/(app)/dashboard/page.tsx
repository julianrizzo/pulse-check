import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentCycle } from "@/lib/reviewCycles";
import { getOrCreateEmployee } from "@/lib/employee";

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "locked":
      return "Locked";
    default:
      return status;
  }
}

export default async function DashboardPage() {
  const employee = await getOrCreateEmployee();
  const cycle = await getOrCreateCurrentCycle();

  const peers = await prisma.employee.findMany({
    where: { id: { not: employee.id } },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, role: true },
  });

  const myReviews = await prisma.peerReview.findMany({
    where: { reviewerId: employee.id, cycleId: cycle.id },
    select: {
      revieweeId: true,
      status: true,
      servingClientRating: true,
      investingFutureRating: true,
    },
  });

  const myReviewMap = new Map(myReviews.map((r) => [r.revieweeId, r]));

  const peerRatingsAboutMe = await prisma.peerReview.findMany({
    where: { revieweeId: employee.id, cycleId: cycle.id },
    select: {
      reviewerId: true,
      status: true,
      servingClientRating: true,
      investingFutureRating: true,
      reviewer: { select: { displayName: true } },
    },
  });

  const awaitingCount = peerRatingsAboutMe.filter(
    (r) => r.status === "draft"
  ).length;

  const submittedCount = myReviews.filter((r) => r.status === "submitted")
    .length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {cycle.year} · Q{cycle.quarter} {cycle.isOpen ? "(Open)" : "(Closed)"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
          <div className="font-semibold text-zinc-900 dark:text-zinc-50">
            Reviews I need to submit
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {submittedCount} submitted · {peers.length} peers
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {peers.map((peer) => {
              const review = myReviewMap.get(peer.id);
              return (
                <div
                  key={peer.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {peer.displayName}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      {review ? statusLabel(review.status) : "Not started"}
                    </div>
                    {review ? (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        <span>
                          Serving client:{" "}
                          {review.servingClientRating ?? "—"}
                        </span>
                        <span>
                          Investing future:{" "}
                          {review.investingFutureRating ?? "—"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={`/reviews?peerId=${peer.id}`}
                      className="text-sm px-3 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
                    >
                      {review?.status === "submitted"
                        ? "Review"
                        : "Rate"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
          <div className="font-semibold text-zinc-900 dark:text-zinc-50">
            Ratings about me
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {awaitingCount} in draft · {peerRatingsAboutMe.length} total
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            {peerRatingsAboutMe.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                No peer reviews have been submitted for you yet in this
                cycle.
              </div>
            ) : (
              peerRatingsAboutMe.map((r) => (
                <div
                  key={r.reviewerId}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {r.reviewer.displayName}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {statusLabel(r.status)}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      Serving client: {r.servingClientRating ?? "—"}
                    </span>
                    <span>
                      Investing future: {r.investingFutureRating ?? "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

