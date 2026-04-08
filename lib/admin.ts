import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

export function isAdminFlag(value: unknown) {
  return value === true;
}

export async function isCurrentUserAdmin() {
  const user = await currentUser();
  return isAdminFlag(user?.publicMetadata?.admin);
}

export async function requireAdminUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (!isAdminFlag(user.publicMetadata?.admin)) {
    throw new Error("Forbidden");
  }
  return userId;
}

