import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing products to prevent duplicates when re-seeding
  await prisma.products.deleteMany({});
  console.log("🧹 Cleared existing products.");

  const products = [
    { title: "Ecokart", status: ProductStatus.ACTIVE, url: "https://www.ecokartuk.com" },
    { title: "WP Automation", status: ProductStatus.ACTIVE, url: "https://wpautomation.com" },
    { title: "Puja Pandit", status: ProductStatus.ACTIVE, url: "https://www.pujapanditonline.com" },
    { title: "Virtual CTO", status: ProductStatus.ACTIVE, url: "https://va.prabisha.com/" },
    { title: "Client Portal", status: ProductStatus.ACTIVE, url: "https://project.prabisha.com/" },
    { title: "DM Automation", status: ProductStatus.ACTIVE, url: "https://ai.prabisha.com/" },
    { title: "Crosslist", status: ProductStatus.ACTIVE, url: "https://warm-licorice-ccf7e4.netlify.app" },
    { title: "HRMS", status: ProductStatus.PENDING, url: "https://example.com" },
    { title: "Real Estate CRM", status: ProductStatus.PENDING, url: "https://example.com" },
    { title: "Global Indians Info", status: ProductStatus.ACTIVE, url: "https://globalindiansinfo.com" },
    { title: "Better World Media", status: ProductStatus.INACTIVE, url: "https://example.com" },
    { title: "Printezz", status: ProductStatus.ACTIVE, url: "https://www.printtez.com/" },
    { title: "Interview Pro", status: ProductStatus.PENDING, url: "https://example.com" },
    { title: "PTE", status: ProductStatus.PENDING, url: "https://example.com" },
    { title: "LMS Portal", status: ProductStatus.ACTIVE, url: "https://www.geniusgurukul.com/" },
    { title: "Bricksense", status: ProductStatus.ACTIVE, url: "https://www.brickpass.com/" },
    { title: "Chatbot", status: ProductStatus.PENDING, url: "https://example.com" },
    { title: "UK Biz Network", status: ProductStatus.ACTIVE, url: "https://ukbiznetwork.com/" },
    { title: "Harrow Business", status: ProductStatus.ACTIVE, url: "https://harrowbusiness.com/" },
    { title: "AgenticAI", status: ProductStatus.ACTIVE, url: "https://www.pratyushkumar.co.uk/agenticai/" },
    { title: "NDCHRC", status: ProductStatus.ACTIVE, url: "https://www.pratyushkumar.co.uk/ndchrc/" },
    { title: "Bookify Dashboard", status: ProductStatus.ACTIVE, url: "https://prabisha-bookify.vercel.app/dashboard" },
    { title: "SEO Dashboard", status: ProductStatus.ACTIVE, url: "https://prabisha-seo-dashboard-latest.vercel.app/" },
    { title: "Prisha the Explorer", status: ProductStatus.ACTIVE, url: "https://prishatheexplorer.com/" },
  ];

  await prisma.products.createMany({
    data: products,
    skipDuplicates: true,
  });

  console.log(`✅ ${products.length} products seeded successfully.`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding products:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });