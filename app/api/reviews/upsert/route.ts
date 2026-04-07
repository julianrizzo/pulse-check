import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateEmployee } from "@/lib/employee";

const BodySchema = z.object({
  revieweeId: z.string().min(1),
  cycleId: z.string().min(1),
  servingClientRating: z.number().int().min(1).max(5).optional(),
  servingClientComment: z.string().max(2000).optional().nullable(),
  investingFutureRating: z.number().int().min(1).max(5).optional(),
  investingFutureComment: z.string().max(2000).optional().nullable(),
  status: z.enum(["draft", "submitted"]),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const employee = await getOrCreateEmployee();

    const cycle = await prisma.reviewCycle.findUnique({
      where: { id: body.cycleId },
      select: { id: true, year: true, quarter: true, isOpen: true },
    });
    if (!cycle) {
      return NextResponse.json(
        { error: "Cycle not found" },
        { status: 404 }
      );
    }

    if (body.status === "submitted" && !cycle.isOpen) {
      const isPrivileged =
        employee.role === "manager" || employee.role === "admin";
      if (!isPrivileged) {
        return NextResponse.json(
          { error: "This cycle is closed" },
          { status: 403 }
        );
      }
    }

    if (body.status === "submitted") {
      if (
        body.servingClientRating == null ||
        body.investingFutureRating == null
      ) {
        return NextResponse.json(
          { error: "Ratings are required for submission" },
          { status: 400 }
        );
      }
    }

    const upserted = await prisma.peerReview.upsert({
      where: {
        reviewerId_revieweeId_cycleId: {
          reviewerId: employee.id,
          revieweeId: body.revieweeId,
          cycleId: body.cycleId,
        },
      },
      create: {
        reviewerId: employee.id,
        revieweeId: body.revieweeId,
        cycleId: body.cycleId,
        status: body.status,
        servingClientRating: body.servingClientRating ?? null,
        servingClientComment: body.servingClientComment ?? null,
        investingFutureRating: body.investingFutureRating ?? null,
        investingFutureComment: body.investingFutureComment ?? null,
        submittedAt: body.status === "submitted" ? new Date() : null,
      },
      update: {
        status: body.status,
        servingClientRating: body.servingClientRating ?? null,
        servingClientComment: body.servingClientComment ?? null,
        investingFutureRating: body.investingFutureRating ?? null,
        investingFutureComment: body.investingFutureComment ?? null,
        submittedAt: body.status === "submitted" ? new Date() : null,
      },
      select: {
        id: true,
        status: true,
        servingClientRating: true,
        investingFutureRating: true,
      },
    });

    return NextResponse.json({ review: upserted });
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

