import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Employee, EmployeeRole } from "@prisma/client";
import { canReviewPeer, coerceLevelRole } from "@/lib/roles";

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

/** Prefer primary, then any verified email from Clerk’s list. */
function emailFromClerkUser(user: {
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: { emailAddress?: string | null }[] | null;
}) {
  const primary = normalizeEmail(user.primaryEmailAddress?.emailAddress);
  if (primary) return primary;
  const fromList = user.emailAddresses?.map((e) =>
    normalizeEmail(e?.emailAddress)
  );
  const first = fromList?.find((e) => e.length > 0);
  return first ?? "";
}

/** `Employee.email` is required; use a stable synthetic value when Clerk has no email. */
function syntheticEmailForClerkUserId(clerkUserId: string) {
  return `no-email+${clerkUserId}@users.clerk.local`;
}

function displayNameForClerkUser(user: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: { emailAddress?: string | null }[] | null;
}) {
  const email = emailFromClerkUser(user);
  return (
    (user.fullName ??
      user.firstName ??
      user.lastName ??
      user.username ??
      email) ||
    "Employee"
  );
}

async function listAllClerkUsers() {
  const client = await clerkClient();
  const users = [] as Awaited<
    ReturnType<typeof client.users.getUserList>
  >["data"];
  let offset = 0;
  const limit = 200;

  // Clerk paginates; iterate until exhaustion.
  for (;;) {
    const page = await client.users.getUserList({ limit, offset });
    users.push(...page.data);
    if (page.data.length < limit) break;
    offset += limit;
  }

  return users;
}

export type PeerDirectoryEntry = {
  id: string;
  displayName: string;
  levelRole: EmployeeRole;
};

/**
 * Source of truth for who appears in peer review pickers:
 * Clerk user directory, mapped onto local `Employee` rows (for stable FK ids).
 */
export async function getPeersFromClerkDirectory(
  currentEmployee: Pick<Employee, "id" | "clerkUserId" | "role">
): Promise<PeerDirectoryEntry[]> {
  const clerkUsers = await listAllClerkUsers();
  const currentClerkUser = clerkUsers.find((u) => u.id === currentEmployee.clerkUserId);
  const currentLevelRole =
    coerceLevelRole(currentClerkUser?.publicMetadata?.role) ?? currentEmployee.role;

  const candidates = clerkUsers
    .filter((u) => u.id !== currentEmployee.clerkUserId)
    .map((u) => {
      let email = emailFromClerkUser(u);
      if (!email) email = syntheticEmailForClerkUserId(u.id);
      const displayName = displayNameForClerkUser(u);
      const levelRole = coerceLevelRole(u.publicMetadata?.role);

      return {
        clerkUserId: u.id,
        email,
        displayName,
        levelRole,
      };
    })
    .filter(
      (u): u is typeof u & { levelRole: EmployeeRole } => u.levelRole != null
    );

  const upserted = await prisma.$transaction(
    candidates.map((u) =>
      prisma.employee.upsert({
        where: { clerkUserId: u.clerkUserId },
        create: {
          clerkUserId: u.clerkUserId,
          displayName: u.displayName,
          email: u.email,
          role: u.levelRole,
          managerId: null,
        },
        update: {
          displayName: u.displayName,
          email: u.email,
        },
        select: { id: true, displayName: true, role: true },
      })
    )
  );

  // Ensure we don't accidentally include self (if multiple Clerk accounts map oddly).
  return upserted
    .map((e) => ({
      id: e.id,
      displayName: e.displayName,
      levelRole: e.role,
    }))
    .filter((e) => e.id !== currentEmployee.id)
    .filter((e) => canReviewPeer(currentLevelRole, e.levelRole))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

