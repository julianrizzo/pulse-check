import { isCurrentUserAdmin } from "@/lib/admin";
import AdminConsoleClient from "./AdminConsoleClient";

export default async function AdminPage() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/70 dark:bg-zinc-900/50 p-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Admin Console
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          You do not have access to this page.
        </p>
      </div>
    );
  }

  return <AdminConsoleClient />;
}

