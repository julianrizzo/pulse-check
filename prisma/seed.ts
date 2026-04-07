import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if employees already exist
  const existingCount = await prisma.employee.count();
  if (existingCount > 0) {
    console.log(`⚠️  Database already has ${existingCount} employees. Skipping seed.`);
    return;
  }

  // Create test employees
  const employees = [
    {
      clerkUserId: 'test_admin_001',
      displayName: 'Alice Admin',
      email: 'alice.admin@example.com',
      role: 'admin' as const,
    },
    {
      clerkUserId: 'test_manager_001',
      displayName: 'Bob Manager',
      email: 'bob.manager@example.com',
      role: 'manager' as const,
    },
    {
      clerkUserId: 'test_employee_001',
      displayName: 'Charlie Developer',
      email: 'charlie.dev@example.com',
      role: 'employee' as const,
    },
    {
      clerkUserId: 'test_employee_002',
      displayName: 'Diana Designer',
      email: 'diana.designer@example.com',
      role: 'employee' as const,
    },
    {
      clerkUserId: 'test_employee_003',
      displayName: 'Ethan Engineer',
      email: 'ethan.engineer@example.com',
      role: 'employee' as const,
    },
    {
      clerkUserId: 'test_employee_004',
      displayName: 'Fiona Frontend',
      email: 'fiona.frontend@example.com',
      role: 'employee' as const,
    },
  ];

  // Create employees
  for (const employee of employees) {
    await prisma.employee.create({
      data: employee,
    });
    console.log(`✅ Created employee: ${employee.displayName} (${employee.role})`);
  }

  // Set manager relationships
  const manager = await prisma.employee.findUnique({
    where: { email: 'bob.manager@example.com' },
  });

  if (manager) {
    const employeeEmails = [
      'charlie.dev@example.com',
      'diana.designer@example.com',
      'ethan.engineer@example.com',
      'fiona.frontend@example.com',
    ];

    for (const email of employeeEmails) {
      await prisma.employee.update({
        where: { email },
        data: { managerId: manager.id },
      });
    }
    console.log(`✅ Assigned ${employeeEmails.length} employees to manager: ${manager.displayName}`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
