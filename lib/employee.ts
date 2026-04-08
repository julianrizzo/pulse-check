import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { EmployeeRole } from "@prisma/client";
import { coerceLevelRole, isManagerOrAbove } from "@/lib/roles";

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export async function getOrCreateEmployee() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const existing = await prisma.employee.findUnique({
    where: { clerkUserId: userId },
  });
  if (existing) return existing;

  const user = await currentUser();
  if (!user) throw new Error("Clerk user not found");

  const email = normalizeEmail(user.primaryEmailAddress?.emailAddress);
  const displayName =
    user.fullName ?? user.firstName ?? user.lastName ?? email ?? "Employee";

  const role = coerceLevelRole(user.publicMetadata?.role) ?? "Consultant";

  return prisma.employee.create({
    data: {
      clerkUserId: userId,
      displayName,
      email,
      role,
      managerId: null,
    },
  });
}

/**
 * Prefer Clerk `publicMetadata.role`, fall back to the role stored on `Employee`.
 */
export async function resolveRoleFromClerkMetadata(
  storedRole: EmployeeRole
): Promise<EmployeeRole> {
  const user = await currentUser();
  return coerceLevelRole(user?.publicMetadata?.role) ?? storedRole;
}

export async function isManagerOrAboveInSession(storedRole: EmployeeRole) {
  const role = await resolveRoleFromClerkMetadata(storedRole);
  return isManagerOrAbove(role);
}
