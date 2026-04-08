import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { LEVELS } from "@/lib/roles";
import { requireAdminUserId } from "@/lib/admin";

const CreateUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(LEVELS as [string, ...string[]]),
  admin: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    await requireAdminUserId();
    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 200, offset: 0 });

    return NextResponse.json({
      users: users.data.map((u) => ({
        id: u.id,
        email: u.primaryEmailAddress?.emailAddress ?? null,
        displayName: u.fullName ?? u.username ?? "Unknown",
        role: u.publicMetadata?.role ?? null,
        admin: u.publicMetadata?.admin === true,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminUserId();
    const body = CreateUserSchema.parse(await req.json());
    const client = await clerkClient();

    const invitation = await client.invitations.createInvitation({
      emailAddress: body.email,
      publicMetadata: {
        role: body.role,
        admin: body.admin,
      },
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.emailAddress,
        status: invitation.status,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    const status =
      err instanceof Error && err.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: "Unable to create user" }, { status });
  }
}

