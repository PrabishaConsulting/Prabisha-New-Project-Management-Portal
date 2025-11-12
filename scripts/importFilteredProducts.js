const { PrismaClient } = require('../app/generated/client');
const prisma = new PrismaClient();

// Category ID provided
const categoryId = 'cmh32byxe0001wg6sw3y23dj5';

// Products from products.csv (already in database)
const existingProducts = [
  {
    id: 'cmfwwayo30000wg504m0rqecb',
    title: 'EcoKart UK',
    url: 'https://www.ecokartuk.com',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo30001wg50ypjm4myt',
    title: 'WP Automation',
    url: 'https://wp-automation.prabisha.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo30002wg50e9k30jpd',
    title: 'Puja Pandit',
    url: 'https://www.pujapanditonline.com',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo30003wg50jcm3aj4i',
    title: 'Virtual CTO',
    url: 'https://va.prabisha.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo30004wg50pfoj28ue',
    title: 'Client Portal',
    url: 'https://projects.prabisha.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo30005wg507ygs26ix',
    title: 'DM Automation',
    url: 'https://dma.prabisha.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo40007wg504cpp29i7',
    title: 'HRMS',
    url: 'https://hrms.prabisha.com',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo40009wg50xlylaqp1',
    title: 'Global Indians Info',
    url: 'https://globalindiansinfo.com',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000awg50a32ijafo',
    title: 'Better World Media',
    url: 'https://better-world-media.prabisha.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000bwg500cl89g5t',
    title: 'Printezz',
    url: 'https://www.printtez.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000cwg50nn0l8yuz',
    title: 'Interview Pro',
    url: 'https://interviewpro.prabisha.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000ewg50didvypfq',
    title: 'LMS Portal',
    url: 'https://www.geniusgurukul.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000hwg50v45iay16',
    title: 'UK Biz Network',
    url: 'https://ukbiznetwork.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000iwg50kd5762yp',
    title: 'Harrow Business',
    url: 'https://harrowbusiness.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000jwg50lhwvy1a5',
    title: 'AgenticAI',
    url: 'https://www.pratyushkumar.co.uk/agenticai/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000kwg50n5p1vat1',
    title: 'NDCHRC',
    url: 'https://www.pratyushkumar.co.uk/ndchrc/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000lwg50qiodylzh',
    title: 'Smartsend',
    url: 'https://smartsend.prabisha.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfwwayo4000nwg50mr5xp973',
    title: 'Prisha the Explorer',
    url: 'https://prishatheexplorer.com/',
    status: 'ACTIVE'
  },
  {
    id: 'cmfxj1mna0000gw040arq9f9s',
    title: 'SEO Software',
    url: 'https://seo.prabisha.com',
    status: 'ACTIVE'
  },
  {
    id: 'cmfxjidzn0000ju04yyu0on54',
    title: 'AI Software',
    url: 'https://ai.prabisha.com',
    status: 'ACTIVE'
  },
  {
    id: 'cmfxjjyis0001ju04sct4a0d3',
    title: 'HR Portal',
    url: 'https://hr.prabisha.com/',
    status: 'ACTIVE'
  }
];

// Filtered products from Prabisha Projects.xlsx (only unique ones not in products.csv)
const filteredNewProducts = [
  {
    title: 'Prabisha Intranet',
    description: 'Internal Portal for Prabisha Employees',
    url: 'https://intranet.prabisha.com/home'
  },
  {
    title: 'Prabish Projects',
    description: 'Projects & Task Management Portal',
    url: 'https://projects.prabisha.com/all-task'
  },
  {
    title: 'Prabisha Connect',
    description: 'Internal Chat Application',
    url: 'https://connect.prabisha.com/'
  },
  {
    title: 'Prabisha ATS Resume Writer',
    description: 'ATS Resume Writer Software',
    url: null
  },
  {
    title: 'Prabisha Accounting',
    description: 'Billing & Proposals Software',
    url: 'https://accounting.prabisha.com/'
  },
  {
    title: 'Prabisha Boiler Plate for Software Development',
    description: 'Standard Base Features for Software Development',
    url: null
  },
  {
    title: 'Prabisha Boiler Plate for Website Development',
    description: 'Standard Base Features for Website Development',
    url: null
  },
  {
    title: 'Prabisha CRM',
    description: null,
    url: null
  },
  {
    title: 'Prabisha Real Estate CRM',
    description: null,
    url: 'https://home.prabisha.com/'
  },
  {
    title: 'Prabisha Consulting - Global',
    description: null,
    url: null
  },
  {
    title: 'Prabisha Consulting - UK',
    description: null,
    url: null
  },
  {
    title: 'Better News World',
    description: 'Portal for Positive Global News',
    url: null
  },
  {
    title: 'Resume Database',
    description: null,
    url: null
  },
  {
    title: 'Cyber Security',
    description: null,
    url: null
  },
  {
    title: 'Prabisha Design',
    description: null,
    url: null
  },
  {
    title: 'Prabisha eDMS',
    description: null,
    url: null
  },
  {
    title: 'Prabisha Dental',
    description: 'Dental Clinic Management',
    url: null
  },
  {
    title: 'Wholistic Healthcare',
    description: 'Hospital Management',
    url: null
  },
  {
    title: 'Inventory Management',
    description: null,
    url: null
  },
  {
    title: 'Library Management',
    description: null,
    url: null
  },
  {
    title: 'Fintech',
    description: null,
    url: null
  },
  {
    title: 'ITSM',
    description: 'Ticket Management Solution for Service Desk',
    url: null
  },
  {
    title: 'Prabisha Chatbot',
    description: null,
    url: null
  },
  {
    title: 'Zoho Drive',
    description: 'Data Storage and Management',
    url: null
  },
  {
    title: 'AI Sensy',
    description: 'WhatsApp Marketing',
    url: null
  },
  {
    title: 'Canva',
    description: 'Design Portal',
    url: null
  },
  {
    title: 'Uber Suggest',
    description: 'SEO Management Portal',
    url: null
  },
  {
    title: 'IONOS',
    description: 'Domain Registration, Hosting, Email',
    url: null
  },
  {
    title: 'TVM Server',
    description: 'Domain Registration, Hosting, Email',
    url: null
  },
  {
    title: 'Prabisha VA Services',
    description: null,
    url: 'https://va.prabisha.com/'
  },
  {
    title: 'Website Monitor Tool',
    description: null,
    url: null
  },
  {
    title: 'Prabisha Vault',
    description: 'Password Storage',
    url: null
  }
];

async function importProducts() {
  console.log('Starting filtered product import process...');
  
  try {
    // First, verify the category exists
    const category = await prisma.categories.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      console.error(`Category with ID ${categoryId} not found!`);
      return;
    }
    
    console.log(`Found category: ${category.name}`);
    
    // Update existing products from products.csv
    console.log('Updating existing products from products.csv...');
    
    for (const productData of existingProducts) {
      const product = await prisma.products.upsert({
        where: { id: productData.id },
        update: {
          title: productData.title,
          url: productData.url,
          status: productData.status,
          categories: {
            connect: { id: categoryId }
          }
        },
        create: {
          id: productData.id,
          title: productData.title,
          url: productData.url,
          status: productData.status,
          categories: {
            connect: { id: categoryId }
          }
        }
      });
      
      console.log(`Processed product: ${product.title} (ID: ${product.id}, Status: ${product.status})`);
    }
    
    // Add new products from Prabisha Projects.xlsx
    console.log('Adding new products from Prabisha Projects.xlsx...');
    
    for (const productData of filteredNewProducts) {
      // Check if URL is available, otherwise set status to INACTIVE
      const status = productData.url ? 'ACTIVE' : 'INACTIVE';
      
      // First check if a product with this title already exists
      const existingProduct = await prisma.products.findFirst({
        where: { title: productData.title }
      });
      
      if (existingProduct) {
        // Update existing product
        const product = await prisma.products.update({
          where: { id: existingProduct.id },
          data: {
            url: productData.url || null,
            status: status,
            categories: {
              connect: { id: categoryId }
            }
          }
        });
        
        console.log(`Updated existing product: ${product.title} (ID: ${product.id}, Status: ${product.status})`);
      } else {
        // Create new product
        const product = await prisma.products.create({
          data: {
            title: productData.title,
            url: productData.url || null,
            status: status,
            categories: {
              connect: { id: categoryId }
            }
          }
        });
        
        console.log(`Created new product: ${product.title} (ID: ${product.id}, Status: ${product.status})`);
      }
    }
    
    console.log('Filtered product import process completed successfully!');
  } catch (error) {
    console.error('Error during product import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
importProducts();