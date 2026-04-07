import { prisma } from "@/lib/prisma";

export function getCurrentYearQuarter(now = new Date()) {
  const year = now.getFullYear();
  // getMonth(): 0-11
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1; // 1-4
  return { year, quarter };
}

export async function ensureReviewCyclesForYear(year: number) {
  const { quarter: currentQuarter } = getCurrentYearQuarter();

  const existing = await prisma.reviewCycle.findMany({
    where: { year },
    select: { quarter: true },
  });
  const existingQuarters = new Set(existing.map((c) => c.quarter));

  const ops: Promise<unknown>[] = [];
  for (let q = 1; q <= 4; q++) {
    const isOpen = year === getCurrentYearQuarter().year && q === currentQuarter;
    if (!existingQuarters.has(q)) {
      ops.push(
        prisma.reviewCycle.create({
          data: { year, quarter: q, isOpen },
        })
      );
    } else {
      // Keep cycles consistent if quarter changes.
      ops.push(
        prisma.reviewCycle.updateMany({
          where: { year, quarter: q },
          data: { isOpen },
        })
      );
    }
  }

  await Promise.all(ops);
  return prisma.reviewCycle.findMany({
    where: { year },
    orderBy: { quarter: "asc" },
  });
}

export async function getOrCreateCurrentCycle() {
  const { year, quarter } = getCurrentYearQuarter();
  const cycles = await ensureReviewCyclesForYear(year);
  const current = cycles.find((c) => c.quarter === quarter);
  if (!current) throw new Error("Current cycle not found after ensure.");
  return current;
}

