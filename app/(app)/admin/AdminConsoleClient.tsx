"use client";

import { useEffect, useState } from "react";
import { levelRoleLabel } from "@/lib/roles";

type UserRow = {
  id: string;
  email: string | null;
  displayName: string;
  role: string | null;
  admin: boolean;
  createdAt: number;
};

const ROLE_OPTIONS = [
  "Graduate",
  "Consultant",
  "SeniorConsultant",
  "Manager",
  "SeniorManager",
  "Director",
  "ManagingDirector",
  "Partner",
] as const;

export default function AdminConsoleClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("Consultant");
  const [admin, setAdmin] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load users");
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function inviteUser() {
    setSavingInvite(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role, admin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Unable to invite user");
      setEmail("");
      setRole("Consultant");
      setAdmin(false);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to invite user");
    } finally {
      setSavingInvite(false);
    }
  }

  async function updateUser(userId: string, nextRole: string, nextAdmin: boolean) {
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: nextRole, admin: nextAdmin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Unable to update user");
      return;
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: data.user.role, admin: data.user.admin } : u
      )
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Admin Console
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Manage Clerk users, role metadata, and admin access.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">Add User</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLE_OPTIONS)[number])}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {levelRoleLabel(r)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={admin}
              onChange={(e) => setAdmin(e.target.checked)}
            />
            Admin flag
          </label>
          <button
            onClick={inviteUser}
            disabled={savingInvite || !email}
            className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-black disabled:opacity-60"
          >
            {savingInvite ? "Inviting..." : "Send invite"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">Users</div>
        {error ? (
          <div className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</div>
        ) : null}
        {loading ? (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-600 dark:text-zinc-400">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Admin</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-2 pr-3">{u.displayName}</td>
                    <td className="py-2 pr-3">{u.email ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={u.role ?? "Consultant"}
                        onChange={(e) => void updateUser(u.id, e.target.value, u.admin)}
                        className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-2 py-1"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {levelRoleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={u.admin}
                        onChange={(e) => void updateUser(u.id, u.role ?? "Consultant", e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

