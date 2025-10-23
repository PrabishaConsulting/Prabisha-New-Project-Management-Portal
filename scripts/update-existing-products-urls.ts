import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding categories...');

  const categories = [
    { name: 'Internal Tools', description: 'Tools used internally by the agency' },
    { name: 'Public Platforms', description: 'Platforms available to the public' },
    { name: 'Automation Systems', description: 'Systems that automate processes' },
  ];

  for (const category of categories) {
    await prisma.categories.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('Categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });