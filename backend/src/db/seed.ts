import { prisma } from "../config/db.js";
import { getOrCreateDefaultEtherealAccount } from "../config/mailer.js";

async function main() {
  console.log("[Seed] Seeding initial ReachInbox data...");

  const ethereal = await getOrCreateDefaultEtherealAccount();

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo.user@reachinbox.ai" },
    update: {},
    create: {
      googleId: "demo_user_12345",
      email: "demo.user@reachinbox.ai",
      name: "Alex Morgan",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexMorgan",
    },
  });

  console.log(`[Seed] Created / Verified user: ${user.name} (${user.email})`);

  // Create default Ethereal sender
  const sender = await prisma.senderAccount.upsert({
    where: {
      userId_email: {
        userId: user.id,
        email: ethereal.user,
      },
    },
    update: {},
    create: {
      userId: user.id,
      email: ethereal.user,
      displayName: "ReachInbox Outreach Lead",
      smtpHost: "smtp.ethereal.email",
      smtpPort: 587,
      smtpUser: ethereal.user,
      smtpPass: ethereal.pass,
      isDefault: true,
      hourlyLimit: 200,
    },
  });

  console.log(`[Seed] Created / Verified sender account: ${sender.email}`);
  console.log("[Seed] Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("[Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });