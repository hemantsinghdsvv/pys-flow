import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Checking DB connection...");
  const start = Date.now();
  const count = await prisma.user.count();
  console.log(`Successfully connected! Total users in DB: ${count}. Time taken: ${Date.now() - start}ms`);
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, designation: true, department: { select: { name: true } }, orgRole: { select: { name: true } } },
    take: 10,
  });
  console.log("Sample users:", JSON.stringify(users, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("DB connection error:", err);
  process.exit(1);
});
