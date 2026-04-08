-- Migrate legacy role enum (employee/manager/admin) to explicit level roles.
BEGIN;

CREATE TYPE "EmployeeRole_new" AS ENUM (
  'Graduate',
  'Consultant',
  'SeniorConsultant',
  'Manager',
  'SeniorManager',
  'Director',
  'ManagingDirector',
  'Partner'
);

ALTER TABLE "Employee"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "Employee"
  ALTER COLUMN "role" TYPE "EmployeeRole_new"
  USING (
    CASE "role"::text
      WHEN 'employee' THEN 'Consultant'
      WHEN 'manager' THEN 'Manager'
      WHEN 'admin' THEN 'Partner'
      WHEN 'Graduate' THEN 'Graduate'
      WHEN 'Consultant' THEN 'Consultant'
      WHEN 'SeniorConsultant' THEN 'SeniorConsultant'
      WHEN 'Manager' THEN 'Manager'
      WHEN 'SeniorManager' THEN 'SeniorManager'
      WHEN 'Director' THEN 'Director'
      WHEN 'ManagingDirector' THEN 'ManagingDirector'
      WHEN 'Partner' THEN 'Partner'
      ELSE 'Consultant'
    END
  )::"EmployeeRole_new";

ALTER TABLE "PromotionCase"
  ALTER COLUMN "targetRole" TYPE "EmployeeRole_new"
  USING (
    CASE "targetRole"::text
      WHEN 'employee' THEN 'Consultant'
      WHEN 'manager' THEN 'Manager'
      WHEN 'admin' THEN 'Partner'
      WHEN 'Graduate' THEN 'Graduate'
      WHEN 'Consultant' THEN 'Consultant'
      WHEN 'SeniorConsultant' THEN 'SeniorConsultant'
      WHEN 'Manager' THEN 'Manager'
      WHEN 'SeniorManager' THEN 'SeniorManager'
      WHEN 'Director' THEN 'Director'
      WHEN 'ManagingDirector' THEN 'ManagingDirector'
      WHEN 'Partner' THEN 'Partner'
      ELSE 'Consultant'
    END
  )::"EmployeeRole_new";

DROP TYPE "EmployeeRole";
ALTER TYPE "EmployeeRole_new" RENAME TO "EmployeeRole";

ALTER TABLE "Employee"
  ALTER COLUMN "role" SET DEFAULT 'Consultant';

COMMIT;
