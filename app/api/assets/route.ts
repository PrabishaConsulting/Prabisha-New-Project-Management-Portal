// app/api/assets/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AssetStatus, LiveStatus } from '@/app/generated/client';
import whois from 'whois';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Assuming you have this
import { logActivity } from '@/services/activity-user/activity-user.service'; // Assuming this path
import { ACTIVITY_ACTIONS } from "@/services/activity-user/helper";
// You'll need to install these packages:
// npm install whois
// npm install @types/whois (if using TypeScript)

// Function to check domain registration status
async function checkDomainStatus(domainName: string): Promise<{
  isRegistered: boolean;
  registrationDate?: Date;
  expirationDate?: Date;
  registrar?: string;
}> {
  return new Promise((resolve) => {
    whois.lookup(domainName, (err: any, data: string) => {
      if (err) {
        console.error('WHOIS lookup error:', err);
        resolve({ isRegistered: false });
        return;
      }

      try {
        const isRegistered = !data.toLowerCase().includes('no match') && 
                           !data.toLowerCase().includes('not found') &&
                           !data.toLowerCase().includes('no entries found');

        // Extract registration date
        let registrationDate: Date | undefined;
        const regDateMatch = data.match(/creation date:?\s*(.+)|registered on:?\s*(.+)|created:?\s*(.+)/i);
        if (regDateMatch) {
          const dateStr = (regDateMatch[1] || regDateMatch[2] || regDateMatch[3]).trim();
          registrationDate = new Date(dateStr);
        }

        // Extract expiration date
        let expirationDate: Date | undefined;
        const expDateMatch = data.match(/expir(?:y|ation) date:?\s*(.+)|expires:?\s*(.+)|expiry:?\s*(.+)/i);
        if (expDateMatch) {
          const dateStr = (expDateMatch[1] || expDateMatch[2] || expDateMatch[3]).trim();
          expirationDate = new Date(dateStr);
        }

        // Extract registrar
        let registrar: string | undefined;
        const registrarMatch = data.match(/registrar:?\s*(.+)/i);
        if (registrarMatch) {
          registrar = registrarMatch[1].trim();
        }

        resolve({
          isRegistered,
          registrationDate: registrationDate && !isNaN(registrationDate.getTime()) ? registrationDate : undefined,
          expirationDate: expirationDate && !isNaN(expirationDate.getTime()) ? expirationDate : undefined,
          registrar
        });
      } catch (parseError) {
        console.error('WHOIS data parsing error:', parseError);
        resolve({ isRegistered: false });
      }
    });
  });
}

// Function to check if domain/website is live
async function checkLiveStatus(domainName: string): Promise<LiveStatus> {
  try {
    // Try both HTTP and HTTPS
    const urls = [
      `https://${domainName}`,
      `http://${domainName}`,
      `https://www.${domainName}`,
      `http://www.${domainName}`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
        });
        
        if (response.ok) {
          return LiveStatus.ONLINE;
        }
      } catch (error) {
        // Continue to next URL
        continue;
      }
    }
    
    return LiveStatus.OFFLINE;
  } catch (error) {
    console.error('Live status check error:', error);
    return LiveStatus.UNKNOWN;
  }
}

// Function to determine asset status based on expiry date
function determineAssetStatus(expiryDate: Date): AssetStatus {
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return AssetStatus.EXPIRED;
  } else if (daysUntilExpiry <= 30) {
    return AssetStatus.PENDING_RENEWAL;
  } else {
    return AssetStatus.ACTIVE;
  }
}

// GET handler to fetch all assets
const statusPriority: Record<AssetStatus, number> = {
  EXPIRED: 1,
  PENDING_RENEWAL: 2,
  ACTIVE: 3,
};

export async function GET() {
  try {
    const assets = await db.asset.findMany({});

    // --- FIX IS HERE: Updated, safer sorting logic ---
    assets.sort((a, b) => {
      // 1. Safely handle status sorting with a fallback for unknown statuses
      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;

      if (priorityA < priorityB) return -1;
      if (priorityA > priorityB) return 1;

      // 2. Safely handle null expiry dates by treating them as infinitely far in the future
      const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      
      return dateA - dateB;
    });

    return NextResponse.json(assets);
  } catch (error) {
    // It's helpful to log the actual error to the console for debugging
    console.error("Failed to fetch or sort assets:", error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}


// POST handler to add a new asset
export async function POST(request: Request) {
  try {
    const data = await request.json();

    let domainInfo = null;
    let liveStatus = "UNKNOWN";
    let assetStatus = "ACTIVE";
    let actualExpiryDate = new Date(data.expiryDate);

    // Check domain status if it's a domain-related asset and domainName is provided
    if (data.domainName && (data.assetType === 'DOMAIN' || data.assetType === 'HOSTING' || data.assetType === 'SSL')) {
      console.log(`Checking status for domain: ${data.domainName}`);
      
      try {
        // Check domain registration info
        domainInfo = await checkDomainStatus(data.domainName);
        console.log('Domain info:', domainInfo);

        // Update expiry date if we found a more accurate one from WHOIS
        if (domainInfo.expirationDate && domainInfo.expirationDate > new Date()) {
          actualExpiryDate = domainInfo.expirationDate;
          console.log(`Updated expiry date from WHOIS: ${actualExpiryDate}`);
        }

        // Check live status
        liveStatus = await checkLiveStatus(data.domainName);
        console.log(`Live status: ${liveStatus}`);

      } catch (error) {
        console.error('Domain status check error:', error);
        // Continue with the original data if checks fail
      }
    }

    // Determine asset status based on expiry date
    assetStatus = determineAssetStatus(actualExpiryDate);

    // Override status if user explicitly set it
    if (data.status) {
      assetStatus = data.status;
    }

    // Override live status if user explicitly set it
    if (data.liveStatus) {
      liveStatus = data.liveStatus;
    }

    console.log('Final asset status:', assetStatus);
    console.log('Final live status:', liveStatus);

    // IMPORTANT: You would add password encryption logic here before saving
    // const encryptedPassword = encrypt(data.password);

    const newAsset = await db.asset.create({
      data: {
        // --- Core Fields ---
        name: data.name,
        assetType: data.assetType,
        purchaseDate: new Date(data.purchaseDate),
        expiryDate: actualExpiryDate,

        // --- Technical Details ---
        domainName: data.domainName || null,
        ipAddress: data.ipAddress || null,
        hostingPlan: data.hostingPlan || null,
        serverLocation: data.serverLocation || null,

        // --- Provider & Billing ---
        provider: data.provider,
        autoRenew: data.autoRenew,
        renewalPeriod: data.renewalPeriod,

        // --- Status ---
        status: "ACTIVE" ,
        liveStatus: "OFFLINE",
        lastChecked: new Date(),

        // --- Access & Credentials ---
        controlPanelUrl: data.controlPanelUrl || null,
        username: data.username || null,
        password: data.password || null, // Should be encrypted in production

        // --- General Info ---
        notes: data.notes || null,
      },
    });

    console.log('Asset created successfully:', newAsset.id);

    // Include domain info in response for frontend feedback
    const response = {
      ...newAsset,
      domainInfo: domainInfo ? {
        isRegistered: domainInfo.isRegistered,
        registrar: domainInfo.registrar,
        whoisExpiryDate: domainInfo.expirationDate,
        whoisRegistrationDate: domainInfo.registrationDate,
      } : null
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create asset:', error);
    return NextResponse.json({ 
      error: 'Failed to create asset',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT handler to update an existing asset
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const updatedAsset = await db.asset.update({
      where: { id: id },
      data: {
        ...updateData,
        updatedAt: new Date(),
        lastChecked: new Date(),
      },
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error('Failed to update asset:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

// DELETE handler to remove an asset
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    await db.asset.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}