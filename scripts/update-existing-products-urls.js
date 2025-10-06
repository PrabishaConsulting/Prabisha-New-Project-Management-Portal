// scripts/update-existing-products-urls.js
import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Mapping of product titles to their URLs
  const productUrlMap = {
    "EcoKart UK": "https://www.ecokartuk.com",
    "WP Automation": "https://wpautomation.com",
    "Puja Pandit": "https://www.pujapanditonline.com",
    "Virtual CTO": "https://va.prabisha.com/",
    "Client Portal": "https://project.prabisha.com/",
    "DM Automation": "https://ai.prabisha.com/",
    "HR Portal": "https://example.com",
    "Real Estate CRM": "https://example.com",
    "Global Indians Info": "https://globalindiansinfo.com",
    "Better World Media": "https://example.com",
    "Printezz": "https://www.printtez.com/",
    "Interview Pro": "https://example.com",
    "PTE": "https://example.com",
    "LMS Portal": "https://www.geniusgurukul.com/",
    "Bricksense": "https://www.brickpass.com/",
    "Chatbot": "https://example.com",
    "UK Biz Network": "https://ukbiznetwork.com/",
    "Harrow Business": "https://harrowbusiness.com/",
    "AgenticAI": "https://www.pratyushkumar.co.uk/agenticai/",
    "NDCHRC": "https://www.pratyushkumar.co.uk/ndchrc/",
    "Bookify Dashboard": "https://prabisha-bookify.vercel.app/dashboard",
    "SEO Software": "https://prabisha-seo-dashboard-latest.vercel.app/",
    "Prisha the Explorer": "https://prishatheexplorer.com/",
  };

  // Get all existing products from database
  const existingProducts = await prisma.products.findMany();
  
  console.log(`Found ${existingProducts.length} products in database.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of existingProducts) {
    const url = productUrlMap[product.title];
    
    if (url) {
      // Only update if URL is missing or empty
      if (!product.url || product.url === "") {
        await prisma.products.update({
          where: { id: product.id },
          data: { url },
        });
        console.log(`✅ Updated "${product.title}" with URL: ${url}`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped "${product.title}" - already has URL: ${product.url}`);
        skippedCount++;
      }
    } else {
      console.log(`⚠️  No URL mapping found for "${product.title}"`);
      skippedCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${existingProducts.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error updating products:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });