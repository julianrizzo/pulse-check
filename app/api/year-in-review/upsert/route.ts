import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateEmployee, isManagerOrAboveInSession } from "@/lib/employee";

const BodySchema = z.object({
  employeeId: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  summaryNarrative: z.string().max(4000).optional().nullable(),
  overallStrengths: z.string().max(4000).optional().nullable(),
  growthAreas: z.string().max(4000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const employee = await getOrCreateEmployee();

    const canEdit = await isManagerOrAboveInSession(employee.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: "Only Manager-level users and above can edit year-in-review narratives" },
        { status: 403 }
      );
    }

    const upserted = await prisma.yearInReview.upsert({
      where: {
        employeeId_year: { employeeId: body.employeeId, year: body.year },
      },
      update: {
        summaryNarrative: body.summaryNarrative ?? null,
        overallStrengths: body.overallStrengths ?? null,
        growthAreas: body.growthAreas ?? null,
      },
      create: {
        employeeId: body.employeeId,
        year: body.year,
        summaryNarrative: body.summaryNarrative ?? null,
        overallStrengths: body.overallStrengths ?? null,
        growthAreas: body.growthAreas ?? null,
      },
      select: {
        id: true,
        employeeId: true,
        year: true,
        summaryNarrative: true,
        overallStrengths: true,
        growthAreas: true,
      },
    });

    return NextResponse.json({ yearInReview: upserted });
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

