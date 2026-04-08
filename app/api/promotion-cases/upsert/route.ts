import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateEmployee, isManagerOrAboveInSession } from "@/lib/employee";

const BodySchema = z.object({
  employeeId: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  targetRole: z.enum([
    "Graduate",
    "Consultant",
    "SeniorConsultant",
    "Manager",
    "SeniorManager",
    "Director",
    "ManagingDirector",
    "Partner",
  ]),
  justification: z.string().max(4000).optional().nullable(),
  managerDecision: z.string().max(4000).optional().nullable(),
  status: z.enum(["open", "submitted", "decided"]),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const employee = await getOrCreateEmployee();

    const canEdit = await isManagerOrAboveInSession(employee.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: "Only Manager-level users and above can edit promotion cases" },
        { status: 403 }
      );
    }

    const upserted = await prisma.promotionCase.upsert({
      where: {
        employeeId_year: { employeeId: body.employeeId, year: body.year },
      },
      update: {
        targetRole: body.targetRole,
        justification: body.justification ?? null,
        managerDecision: body.managerDecision ?? null,
        status: body.status,
      },
      create: {
        employeeId: body.employeeId,
        year: body.year,
        targetRole: body.targetRole,
        justification: body.justification ?? null,
        managerDecision: body.managerDecision ?? null,
        status: body.status,
      },
      select: {
        id: true,
        employeeId: true,
        year: true,
        targetRole: true,
        justification: true,
        managerDecision: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ promotionCase: upserted });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

