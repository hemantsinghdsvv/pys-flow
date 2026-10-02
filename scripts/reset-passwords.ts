import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching all student users...");
  const students = await prisma.user.findMany({
    where: { studentProfile: { isNot: null } },
    select: { id: true, email: true },
  });

  console.log(`Found ${students.length} students. Resetting passwords to Password@123...`);

  const passwordHash = await hashPassword("Password@123");

  let updatedCount = 0;
  for (const student of students) {
    try {
      await prisma.account.updateMany({
        where: {
          userId: student.id,
          providerId: "credential",
        },
        data: {
          password: passwordHash,
        },
      });
      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`Updated ${updatedCount}/${students.length}...`);
      }
    } catch (err) {
      console.error(`Failed to update password for ${student.email}:`, err);
    }
  }

  console.log(`\nSuccessfully reset passwords for ${updatedCount} students.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
