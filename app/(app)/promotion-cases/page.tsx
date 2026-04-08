import { prisma } from "@/lib/prisma";
import { getOrCreateEmployee, isManagerOrAboveInSession } from "@/lib/employee";
import { getCurrentYearQuarter } from "@/lib/reviewCycles";
import PromotionCaseEditor from "./PromotionCaseEditor";

export default async function PromotionCasesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const employee = await getOrCreateEmployee();
  const canEditAll = await isManagerOrAboveInSession(employee.role);
  const { year: currentYear } = getCurrentYearQuarter();

  const employees = canEditAll
    ? await prisma.employee.findMany({
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true },
      })
    : [];

  const selectedEmployeeId = canEditAll
    ? typeof searchParams.employeeId === "string" &&
      employees.some((e) => e.id === searchParams.employeeId)
      ? searchParams.employeeId
      : employee.id
    : employee.id;

  const selectedYear =
    typeof searchParams.year === "string"
      ? Number(searchParams.year)
      : currentYear;

  const promotionCase = await prisma.promotionCase.findUnique({
    where: {
      employeeId_year: { employeeId: selectedEmployeeId, year: selectedYear },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Promotion Cases
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {canEditAll ? "Create and decide promotion cases." : "Your promotion case."}
            </p>
          </div>

          {canEditAll ? (
            <form method="GET" className="flex gap-3 items-end">
              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  Employee
                </label>
                <select
                  name="employeeId"
                  defaultValue={selectedEmployeeId}
                  className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-zinc-700 dark:text-zinc-200">
                  Year
                </label>
                <input
                  name="year"
                  type="number"
                  defaultValue={selectedYear}
                  className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm w-28"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-black"
              >
                View
              </button>
            </form>
          ) : (
            <div className="text-sm text-zinc-800 dark:text-zinc-100">
              Year: {selectedYear}
            </div>
          )}
        </div>
      </div>

      <PromotionCaseEditor
        employeeId={selectedEmployeeId}
        year={selectedYear}
        canEdit={canEditAll}
        initial={{
          targetRole: promotionCase?.targetRole ?? null,
          justification: promotionCase?.justification ?? null,
          managerDecision: promotionCase?.managerDecision ?? null,
          status: promotionCase?.status ?? null,
        }}
      />
    </div>
  );
}

