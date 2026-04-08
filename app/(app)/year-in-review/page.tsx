import { prisma } from "@/lib/prisma";
import { getOrCreateEmployee, isManagerOrAboveInSession } from "@/lib/employee";
import {
  ensureReviewCyclesForYear,
  getCurrentYearQuarter,
} from "@/lib/reviewCycles";
import YearInReviewEditor from "./YearInReviewEditor";

function avg(sum: number, count: number) {
  return count ? sum / count : null;
}

export default async function YearInReviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const employee = await getOrCreateEmployee();

  const canViewAll = await isManagerOrAboveInSession(employee.role);
  const { year: currentYear } = getCurrentYearQuarter();

  const allEmployees = canViewAll
    ? await prisma.employee.findMany({
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true },
      })
    : [];

  const selectedEmployeeId = canViewAll
    ? typeof searchParams.employeeId === "string" &&
      allEmployees.some((e) => e.id === searchParams.employeeId)
      ? searchParams.employeeId
      : employee.id
    : employee.id;

  const selectedYear =
    typeof searchParams.year === "string"
      ? Number(searchParams.year)
      : currentYear;

  await ensureReviewCyclesForYear(selectedYear);

  const reviews = await prisma.peerReview.findMany({
    where: {
      revieweeId: selectedEmployeeId,
      status: { in: ["submitted", "locked"] },
      cycle: { year: selectedYear },
    },
    select: {
      servingClientRating: true,
      investingFutureRating: true,
      cycle: { select: { quarter: true } },
    },
  });

  const quarterStats = new Map<
    number,
    {
      servingSum: number;
      servingCount: number;
      investingSum: number;
      investingCount: number;
      reviewCount: number;
    }
  >();

  for (const r of reviews) {
    const q = r.cycle.quarter;
    const existing =
      quarterStats.get(q) ??
      ({
        servingSum: 0,
        servingCount: 0,
        investingSum: 0,
        investingCount: 0,
        reviewCount: 0,
      } as const);

    const next = { ...existing } as any;
    if (r.servingClientRating != null) {
      next.servingSum += r.servingClientRating;
      next.servingCount += 1;
    }
    if (r.investingFutureRating != null) {
      next.investingSum += r.investingFutureRating;
      next.investingCount += 1;
    }
    next.reviewCount += 1;
    quarterStats.set(q, next);
  }

  const quarters = [1, 2, 3, 4].map((q) => {
    const s = quarterStats.get(q);
    return {
      quarter: q,
      servingAvg: s ? avg(s.servingSum, s.servingCount) : null,
      investingAvg: s ? avg(s.investingSum, s.investingCount) : null,
      reviewCount: s?.reviewCount ?? 0,
    };
  });

  const totalServing = quarters.reduce((acc, q) => {
    if (q.servingAvg == null) return acc;
    return acc + q.servingAvg;
  }, 0);
  const totalInvesting = quarters.reduce((acc, q) => {
    if (q.investingAvg == null) return acc;
    return acc + q.investingAvg;
  }, 0);
  const servedQuarterCount = quarters.filter((q) => q.servingAvg != null)
    .length;
  const investingQuarterCount = quarters.filter((q) => q.investingAvg != null)
    .length;

  const overallServingAvg =
    servedQuarterCount ? totalServing / servedQuarterCount : null;
  const overallInvestingAvg =
    investingQuarterCount ? totalInvesting / investingQuarterCount : null;

  const narrative = canViewAll
    ? await prisma.yearInReview.findUnique({
        where: { employeeId_year: { employeeId: selectedEmployeeId, year: selectedYear } },
      })
    : await prisma.yearInReview.findUnique({
        where: {
          employeeId_year: { employeeId: employee.id, year: selectedYear },
        },
      });

  const canEdit = canViewAll;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Year in Review
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {selectedYear} · Aggregated from submitted peer ratings.
            </p>
          </div>

          {canViewAll ? (
            <form method="GET" className="w-full md:w-72">
              <label className="text-sm text-zinc-700 dark:text-zinc-200">
                Employee
              </label>
              <select
                name="employeeId"
                defaultValue={selectedEmployeeId}
                className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm w-full"
              >
                {allEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.displayName}
                  </option>
                ))}
              </select>

              <label className="text-sm text-zinc-700 dark:text-zinc-200 mt-3 block">
                Year
              </label>
              <input
                name="year"
                type="number"
                defaultValue={selectedYear}
                className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm w-full"
              />

              <button
                type="submit"
                className="mt-3 px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
              >
                View
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 p-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Serving Client (overall)
            </div>
            <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
              {overallServingAvg != null ? overallServingAvg.toFixed(2) : "—"}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/40 p-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Investing in the Future (overall)
            </div>
            <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
              {overallInvestingAvg != null ? overallInvestingAvg.toFixed(2) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
          Quarterly breakdown
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          {quarters.map((q) => (
            <div
              key={q.quarter}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white/60 dark:bg-zinc-950/40"
            >
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Q{q.quarter}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                Serving: {q.servingAvg != null ? q.servingAvg.toFixed(2) : "—"}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Investing:{" "}
                {q.investingAvg != null ? q.investingAvg.toFixed(2) : "—"}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Reviews: {q.reviewCount}
              </div>
            </div>
          ))}
        </div>
      </div>

      <YearInReviewEditor
        employeeId={selectedEmployeeId}
        year={selectedYear}
        initial={{
          summaryNarrative: narrative?.summaryNarrative ?? null,
          overallStrengths: narrative?.overallStrengths ?? null,
          growthAreas: narrative?.growthAreas ?? null,
        }}
        canEdit={canEdit}
      />
    </div>
  );
}

