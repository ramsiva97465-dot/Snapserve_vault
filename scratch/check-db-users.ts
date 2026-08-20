import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        organization: {
          select: { name: true },
        },
      },
    });

    console.log(`=== DATABASE USER LIST (Total: ${users.length}) ===`);
    console.table(
      users.map((u) => ({
        ID: u.id,
        Name: u.name,
        Email: u.email,
        Role: u.role,
        Organization: u.organization?.name || "N/A",
        CreatedAt: u.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error querying users from DB:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
