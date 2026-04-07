import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { EmployeeRole } from "@prisma/client";

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function coerceEmployeeRole(input: unknown): EmployeeRole | null {
  if (typeof input !== "string") return null;
  if (input === "employee" || input === "manager" || input === "admin") {
    return input;
  }
  return null;
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

  // First user becomes admin by default.
  const employeeCount = await prisma.employee.count();
  const fallbackRole: EmployeeRole = employeeCount === 0 ? "admin" : "employee";

  const preferredRole = coerceEmployeeRole(user.publicMetadata?.role);
  const role = preferredRole ?? fallbackRole;

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

export async function requireEmployeeRole(allowed: EmployeeRole[]) {
  const employee = await getOrCreateEmployee();
  if (!allowed.includes(employee.role)) {
    // Let Next handle this as a 500 unless we map it later to 403; keeping it simple for now.
    throw new Error(
      `Forbidden: requires ${allowed.join(", ")} but was ${employee.role}`
    );
  }
  return employee;
}

