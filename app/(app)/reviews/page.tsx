import { prisma } from "@/lib/prisma";
import { ensureReviewCyclesForYear, getCurrentYearQuarter } from "@/lib/reviewCycles";
import { getOrCreateEmployee, isManagerOrAboveInSession } from "@/lib/employee";
import PeerRatingClient from "./PeerRatingClient";
import { getPeersFromClerkDirectory } from "@/lib/peerDirectory";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const employee = await getOrCreateEmployee();
  const canSubmitClosedCycles = await isManagerOrAboveInSession(employee.role);

  const { year } = getCurrentYearQuarter();
  await ensureReviewCyclesForYear(year);
  const cycles = await prisma.reviewCycle.findMany({
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
  });
  const currentCycle = getCurrentYearQuarter().quarter;
  const currentCycleId =
    cycles.find((c) => c.quarter === currentCycle)?.id ?? cycles[0]?.id;

  const peers = await getPeersFromClerkDirectory(employee);

  const peerIdRaw = searchParams.peerId;
  const peerId =
    typeof peerIdRaw === "string" && peers.some((p) => p.id === peerIdRaw)
      ? peerIdRaw
      : peers[0]?.id;

  const cycleIdRaw = searchParams.cycleId;
  const cycleId =
    typeof cycleIdRaw === "string" &&
    cycles.some((c) => c.id === cycleIdRaw)
      ? cycleIdRaw
      : currentCycleId;

  const cycleIds = cycles.map((c) => c.id);
  const existing = await prisma.peerReview.findMany({
    where: { reviewerId: employee.id, cycleId: { in: cycleIds } },
    select: {
      reviewerId: true,
      revieweeId: true,
      cycleId: true,
      status: true,
      servingClientRating: true,
      servingClientComment: true,
      investingFutureRating: true,
      investingFutureComment: true,
    },
  });

  const reviewMap: Record<
    string,
    {
      status: "draft" | "submitted" | "locked";
      servingClientRating: number | null;
      servingClientComment: string | null;
      investingFutureRating: number | null;
      investingFutureComment: string | null;
    }
  > = {};

  for (const r of existing) {
    reviewMap[`${r.revieweeId}:${r.cycleId}`] = {
      status: r.status,
      servingClientRating: r.servingClientRating ?? null,
      servingClientComment: r.servingClientComment ?? null,
      investingFutureRating: r.investingFutureRating ?? null,
      investingFutureComment: r.investingFutureComment ?? null,
    };
  }

  return (
    <PeerRatingClient
      canSubmitClosedCycles={canSubmitClosedCycles}
      peers={peers}
      cycles={cycles.map((c) => ({
        id: c.id,
        year: c.year,
        quarter: c.quarter,
        isOpen: c.isOpen,
      }))}
      reviewMap={reviewMap}
      initialPeerId={peerId}
      initialCycleId={cycleId}
    />
  );
}

