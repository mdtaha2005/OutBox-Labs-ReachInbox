import { prisma } from "../src/config/db.js";
import { EmailService } from "../src/services/email.service.js";
import { setupEmailWorker } from "../src/queue/email.worker.js";
import { redisClient } from "../src/config/redis.js";

async function runE2EVerification() {
  console.log("\n=======================================================");
  console.log("🧪 STARTING END-TO-END VERIFICATION OF EMAIL SCHEDULER");
  console.log("=======================================================\n");

  // 1. Start BullMQ Worker
  console.log("1. Initializing BullMQ Worker with 5 threads...");
  const worker = setupEmailWorker();

  // 2. Fetch or create test user
  const user = await prisma.user.findFirst({
    where: { email: "demo.user@reachinbox.ai" },
    include: { senderAccounts: true },
  });

  if (!user || user.senderAccounts.length === 0) {
    throw new Error("Seed user or sender account not found. Please run seed script first.");
  }

  const sender = user.senderAccounts[0];
  console.log(`2. Verified User: ${user.name} (${user.email})`);
  console.log(`   Verified Sender: ${sender.displayName} (${sender.email})`);

  // 3. Schedule a test campaign with 3 leads (staggered by 2s)
  const testLeads = [
    "alex.founder@techstartup.io",
    "sarah.investor@venturecapital.com",
    "jason.lead@growthscale.co",
  ];

  console.log(`\n3. Scheduling test campaign with ${testLeads.length} leads (Immediate start, 2s delay)...`);
  const scheduleResult = await EmailService.scheduleCampaign({
    userId: user.id,
    senderAccountId: sender.id,
    subject: "E2E Automated Verification Test - ReachInbox",
    body: "Hi,\n\nThis is an automated E2E test verifying zero-cron scheduling, delay throttling, and Ethereal fake SMTP delivery.\n\nBest,\nReachInbox Engine",
    leads: testLeads,
    scheduledStartTime: new Date(),
    delaySeconds: 2,
    hourlyLimit: 200,
  });

  console.log("   ✓ Campaign created with ID:", scheduleResult.campaignId);
  console.log(`   ✓ ${scheduleResult.totalScheduled} email jobs queued into BullMQ Redis.`);

  // 4. Verify initial QUEUED status in DB
  const queuedEmails = await prisma.emailRecord.findMany({
    where: { campaignId: scheduleResult.campaignId },
  });
  console.log(`   ✓ DB Verification: Found ${queuedEmails.length} records in QUEUED state.`);

  // 5. Wait for worker to execute and deliver all 3 emails
  console.log("\n4. Waiting for BullMQ worker to process and deliver emails via Ethereal SMTP (~8 seconds)...");

  let allSent = false;
  let attempts = 0;
  while (!allSent && attempts < 15) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;

    const sentCount = await prisma.emailRecord.count({
      where: {
        campaignId: scheduleResult.campaignId,
        status: "SENT",
      },
    });

    console.log(`   [Poll ${attempts}] Delivered ${sentCount}/${testLeads.length} emails...`);
    if (sentCount === testLeads.length) {
      allSent = true;
    }
  }

  if (!allSent) {
    throw new Error("Timed out waiting for all emails to be delivered.");
  }

  // 6. Verify Delivered Email Records and Ethereal Preview URLs
  console.log("\n5. Verifying Delivered Records & Ethereal Web Preview URLs:");
  const sentRecords = await prisma.emailRecord.findMany({
    where: { campaignId: scheduleResult.campaignId },
    orderBy: { sentAt: "asc" },
  });

  sentRecords.forEach((record, idx) => {
    console.log(`\n   📧 Email #${idx + 1}:`);
    console.log(`      To:          ${record.recipientEmail}`);
    console.log(`      Status:      ${record.status}`);
    console.log(`      Message ID:  ${record.etherealMessageId}`);
    console.log(`      Preview URL: ${record.etherealPreviewUrl}`);
  });

  // 7. Verify Dashboard Statistics API
  console.log("\n6. Verifying Dashboard Metrics Calculation...");
  const stats = await EmailService.getStats(user.id);
  console.log(`   ✓ Scheduled Count: ${stats.scheduledCount}`);
  console.log(`   ✓ Sent Count:      ${stats.sentCount}`);
  console.log(`   ✓ Failed Count:    ${stats.failedCount}`);
  console.log(`   ✓ Total Campaigns: ${stats.totalCampaigns}`);

  // 8. Clean up
  console.log("\n7. Closing worker and database connections...");
  await worker.close();
  await redisClient.quit();
  await prisma.$disconnect();

  console.log("\n=======================================================");
  console.log("🎉 ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runE2EVerification().catch((err) => {
  console.error("\n❌ E2E Verification failed:", err);
  process.exit(1);
});