import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { LEVELS } from "@/lib/roles";
import { requireAdminUserId } from "@/lib/admin";

const UpdateSchema = z.object({
  role: z.enum(LEVELS as [string, ...string[]]).optional(),
  admin: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdminUserId();
    const { userId } = await context.params;
    const body = UpdateSchema.parse(await req.json());
    const client = await clerkClient();

    const existing = await client.users.getUser(userId);
    const mergedPublicMetadata = {
      ...(existing.publicMetadata ?? {}),
      ...(body.role ? { role: body.role } : {}),
      ...(typeof body.admin === "boolean" ? { admin: body.admin } : {}),
    };

    const updated = await client.users.updateUserMetadata(userId, {
      publicMetadata: mergedPublicMetadata,
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        role: updated.publicMetadata?.role ?? null,
        admin: updated.publicMetadata?.admin === true,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    const status =
      err instanceof Error && err.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: "Unable to update user" }, { status });
  }
}

