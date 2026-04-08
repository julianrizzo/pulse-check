import { prisma } from "@/lib/prisma";
import { getOrCreateEmployee, isManagerOrAboveInSession } from "@/lib/employee";

type Point = {
  label: string;
  servingAvg: number | null;
  investingAvg: number | null;
  reviewCount: number;
};

function LineChart({
  points,
  value,
  yLabel,
}: {
  points: Point[];
  value: (p: Point) => number | null;
  yLabel: string;
}) {
  const values = points.map((p) => value(p)).filter((v) => v != null) as number[];
  const min = 1;
  const max = 5;

  const width = 520;
  const height = 180;
  const pad = 28;

  const xForIndex = (i: number) => {
    const denom = Math.max(points.length - 1, 1);
    return pad + (i * (width - pad * 2)) / denom;
  };

  const yForValue = (v: number) => {
    const t = (v - min) / (max - min);
    return height - pad - t * (height - pad * 2);
  };

  const polyPoints = points
    .map((p, i) => {
      const v = value(p);
      if (v == null) return null;
      return `${xForIndex(i)},${yForValue(v)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
          {yLabel}
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Avg (1-5)
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* grid */}
          {[1, 2, 3, 4, 5].map((v) => {
            const y = yForValue(v);
            return (
              <g key={v}>
                <line
                  x1={pad}
                  x2={width - pad}
                  y1={y}
                  y2={y}
                  stroke="rgb(228 228 231)"
                  strokeWidth={1}
                />
                <text
                  x={6}
                  y={y + 4}
                  fontSize={10}
                  fill="rgb(113 113 122)"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* line */}
          {polyPoints ? (
            <polyline
              points={polyPoints}
              fill="none"
              stroke="rgb(24 24 27)"
              strokeWidth={2}
            />
          ) : null}

          {/* points */}
          {points.map((p, i) => {
            const v = value(p);
            if (v == null) return null;
            const x = xForIndex(i);
            const y = yForValue(v);
            return (
              <g key={p.label}>
                <circle cx={x} cy={y} r={3.5} fill="rgb(24 24 27)" />
              </g>
            );
          })}

          {/* x labels (sparse) */}
          {points.map((p, i) => {
            const shouldShow = points.length <= 6 || i === 0 || i === points.length - 1 || i % 2 === 0;
            if (!shouldShow) return null;
            return (
              <text
                key={`x-${p.label}`}
                x={xForIndex(i)}
                y={height - 8}
                fontSize={10}
                textAnchor="middle"
                fill="rgb(113 113 122)"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default async function SnapshotsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const employee = await getOrCreateEmployee();
  const canView = await isManagerOrAboveInSession(employee.role);

  if (!canView) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/70 dark:bg-zinc-900/50 p-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Snapshots
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          You don’t have permission to view performance snapshots.
        </p>
      </div>
    );
  }

  const employees = await prisma.employee.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  const selectedEmployeeIdRaw = searchParams.employeeId;
  const selectedEmployeeId =
    typeof selectedEmployeeIdRaw === "string" &&
    employees.some((e) => e.id === selectedEmployeeIdRaw)
      ? selectedEmployeeIdRaw
      : employee.id;

  const reviews = await prisma.peerReview.findMany({
    where: {
      revieweeId: selectedEmployeeId,
      status: { in: ["submitted", "locked"] },
    },
    select: {
      servingClientRating: true,
      investingFutureRating: true,
      cycle: { select: { year: true, quarter: true } },
      // status is used for filtering via where clause.
      status: true,
    },
  });

  const grouped = new Map<
    string,
    { servingSum: number; servingCount: number; investingSum: number; investingCount: number; reviewCount: number; year: number; quarter: number }
  >();

  for (const r of reviews) {
    const year = r.cycle.year;
    const quarter = r.cycle.quarter;
    const key = `${year}-Q${quarter}`;

    const existing =
      grouped.get(key) ??
      ({
        servingSum: 0,
        servingCount: 0,
        investingSum: 0,
        investingCount: 0,
        reviewCount: 0,
        year,
        quarter,
      } as const);

    const next = existing as any;
    if (r.servingClientRating != null) {
      next.servingSum += r.servingClientRating;
      next.servingCount += 1;
    }
    if (r.investingFutureRating != null) {
      next.investingSum += r.investingFutureRating;
      next.investingCount += 1;
    }
    next.reviewCount += 1;
    grouped.set(key, next);
  }

  const points: Point[] = Array.from(grouped.entries())
    .map(([key, v]) => ({
      label: `${v.year.toString().slice(-2)}Q${v.quarter}`,
      servingAvg: v.servingCount ? v.servingSum / v.servingCount : null,
      investingAvg: v.investingCount ? v.investingSum / v.investingCount : null,
      reviewCount: v.reviewCount,
    }))
    .sort((a, b) => {
      // Compare by label-derived order isn't safe; use year/quarter in map keys:
      const aParts = a.label.split("Q");
      const bParts = b.label.split("Q");
      const aQ = Number(aParts[1]);
      const bQ = Number(bParts[1]);
      return aQ - bQ;
    });

  // Better: sort by actual cycle ordering using the map values:
  points.sort((pa, pb) => {
    const paYear = Number(pa.label.slice(0, 2)) + 2000;
    const pbYear = Number(pb.label.slice(0, 2)) + 2000;
    const paQuarter = Number(pa.label.split("Q")[1]);
    const pbQuarter = Number(pb.label.split("Q")[1]);
    if (paYear !== pbYear) return paYear - pbYear;
    return paQuarter - pbQuarter;
  });

  const latest = points.length ? points[points.length - 1] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="flex flex-col gap-2 flex-1">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Performance Snapshots
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Trend view aggregated from submitted peer ratings.
            </p>
          </div>
          <form method="GET" className="w-full md:w-72">
            <label className="text-sm text-zinc-700 dark:text-zinc-200">
              Employee
            </label>
            <select
              name="employeeId"
              defaultValue={selectedEmployeeId}
              className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm w-full"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.displayName}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="mt-3 px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
            >
              View
            </button>
          </form>
        </div>

        {latest ? (
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white/60 dark:bg-zinc-950/40">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Latest quarter ({latest.label})
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>Serving client avg: {latest.servingAvg?.toFixed(2) ?? "—"}</span>
              <span>Investing future avg: {latest.investingAvg?.toFixed(2) ?? "—"}</span>
              <span>Peer reviews: {latest.reviewCount}</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            No submitted peer reviews yet for this employee.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LineChart points={points} value={(p) => p.servingAvg} yLabel="Serving Client" />
        <LineChart points={points} value={(p) => p.investingAvg} yLabel="Investing in the Future" />
      </div>
    </div>
  );
}

