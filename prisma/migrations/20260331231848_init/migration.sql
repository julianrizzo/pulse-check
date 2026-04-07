-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('employee', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('draft', 'submitted', 'locked');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('open', 'submitted', 'decided');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'employee',
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerReview" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "servingClientRating" INTEGER,
    "servingClientComment" TEXT,
    "investingFutureRating" INTEGER,
    "investingFutureComment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearInReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "summaryNarrative" TEXT,
    "overallStrengths" TEXT,
    "growthAreas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YearInReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCase" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "targetRole" "EmployeeRole" NOT NULL,
    "justification" TEXT,
    "managerDecision" TEXT,
    "status" "PromotionStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_clerkUserId_key" ON "Employee"("clerkUserId");

-- CreateIndex
CREATE INDEX "ReviewCycle_year_quarter_idx" ON "ReviewCycle"("year", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCycle_year_quarter_key" ON "ReviewCycle"("year", "quarter");

-- CreateIndex
CREATE INDEX "PeerReview_revieweeId_cycleId_idx" ON "PeerReview"("revieweeId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "PeerReview_reviewerId_revieweeId_cycleId_key" ON "PeerReview"("reviewerId", "revieweeId", "cycleId");

-- CreateIndex
CREATE INDEX "YearInReview_year_idx" ON "YearInReview"("year");

-- CreateIndex
CREATE UNIQUE INDEX "YearInReview_employeeId_year_key" ON "YearInReview"("employeeId", "year");

-- CreateIndex
CREATE INDEX "PromotionCase_year_idx" ON "PromotionCase"("year");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionCase_employeeId_year_key" ON "PromotionCase"("employeeId", "year");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_ManagedEmployees_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_Reviewer_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_Reviewee_fkey" FOREIGN KEY ("revieweeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearInReview" ADD CONSTRAINT "YearInReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCase" ADD CONSTRAINT "PromotionCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
