import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const existingCount = await prisma.employee.count();
  if (existingCount > 0) {
    console.log(`⚠️  Database already has ${existingCount} employees. Skipping seed.`);
    return;
  }

  const employees = [
    {
      clerkUserId: 'test_partner_001',
      displayName: 'Alice Partner',
      email: 'alice.partner@example.com',
      role: 'Partner' as const,
    },
    {
      clerkUserId: 'test_manager_001',
      displayName: 'Bob Manager',
      email: 'bob.manager@example.com',
      role: 'Manager' as const,
    },
    {
      clerkUserId: 'test_staff_001',
      displayName: 'Charlie Developer',
      email: 'charlie.dev@example.com',
      role: 'Consultant' as const,
    },
    {
      clerkUserId: 'test_staff_002',
      displayName: 'Diana Designer',
      email: 'diana.designer@example.com',
      role: 'SeniorConsultant' as const,
    },
    {
      clerkUserId: 'test_staff_003',
      displayName: 'Ethan Engineer',
      email: 'ethan.engineer@example.com',
      role: 'Consultant' as const,
    },
    {
      clerkUserId: 'test_staff_004',
      displayName: 'Fiona Frontend',
      email: 'fiona.frontend@example.com',
      role: 'Graduate' as const,
    },
  ];

  for (const employee of employees) {
    await prisma.employee.create({
      data: employee,
    });
    console.log(`✅ Created employee: ${employee.displayName} (${employee.role})`);
  }

  const manager = await prisma.employee.findUnique({
    where: { clerkUserId: 'test_manager_001' },
  });

  if (manager) {
    const reportClerkUserIds = [
      'test_staff_001',
      'test_staff_002',
      'test_staff_003',
      'test_staff_004',
    ];

    for (const clerkUserId of reportClerkUserIds) {
      await prisma.employee.update({
        where: { clerkUserId },
        data: { managerId: manager.id },
      });
    }
    console.log(
      `✅ Assigned ${reportClerkUserIds.length} reports to: ${manager.displayName}`
    );
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
