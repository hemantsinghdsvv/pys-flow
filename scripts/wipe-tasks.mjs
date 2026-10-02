import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Wiping task data...');
  await prisma.task.deleteMany({});
  console.log('Task data wiped successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
