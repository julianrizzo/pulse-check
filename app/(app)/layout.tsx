import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateEmployee, resolveRoleFromClerkMetadata } from "@/lib/employee";
import { levelRoleLabel } from "@/lib/roles";
import { isCurrentUserAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const employee = await getOrCreateEmployee();
  const levelRole = await resolveRoleFromClerkMetadata(employee.role);
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black flex items-center justify-center font-semibold">
              PC
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                Pulse Check
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {employee.displayName} · {levelRoleLabel(levelRole)}
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2 overflow-auto">
            <NavLink href="/dashboard" label="Dashboard" />
            <NavLink href="/reviews" label="Peer Ratings" />
            <NavLink href="/snapshots" label="Snapshots" />
            <NavLink href="/year-in-review" label="Year in Review" />
            <NavLink href="/promotion-cases" label="Promotion Cases" />
            {isAdmin ? <NavLink href="/admin" label="Admin Console" /> : null}
          </nav>

          <div className="flex items-center gap-3">
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="text-sm px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 whitespace-nowrap"
    >
      {label}
    </Link>
  );
}

