import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LiveStatus } from '@prisma/client';

// This is a simple regex to check if a string looks like a valid domain name.
// It checks for a basic structure like "example.com" or "sub.example.co.uk".
const isValidDomain = (domain: string) => {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

export async function checkSingleDomain(domainInput: string) {
  // 1. Stricter Validation: Check for a valid TLD (.com, .in, etc.)
  if (!isValidDomain(domainInput)) {
    console.error(`Invalid domain format, skipping check: ${domainInput}`);
    return { liveStatus: LiveStatus.INVALID_DOMAIN, lastChecked: new Date() };
  }

  let liveStatus: LiveStatus = LiveStatus.UNKNOWN;
  
  try {
    const headResponse = await fetch(`https://${domainInput}`, { 
        method: 'HEAD', 
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
    });
    
    if (headResponse.status === 405) {
      console.log(`HEAD not allowed for ${domainInput}. Falling back to GET.`);
      const getResponse = await fetch(`https://${domainInput}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      liveStatus = getResponse.ok ? LiveStatus.ONLINE : LiveStatus.OFFLINE;
    } else {
      liveStatus = headResponse.ok ? LiveStatus.ONLINE : LiveStatus.OFFLINE;
    }
    
  } catch (error) {
    console.error(`Failed to check domain ${domainInput}:`, error);

    const cause = (error as any)?.cause;

    // 2. Enhanced Error Handling for more accurate statuses
    if (cause?.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      liveStatus = LiveStatus.SSL_ERROR;
    } else if (cause?.code === 'ENOTFOUND') {
      liveStatus = LiveStatus.UNKNOWN; // Use a more specific status for DNS failures
    } else {
      liveStatus = LiveStatus.OFFLINE; // For timeouts and other network errors
    }
  }

  return { liveStatus, lastChecked: new Date() };
}

/**
 * API Route to check and update the live status of a domain asset.
 */
export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const asset = await db.asset.findUnique({ where: { id: id } });
    if (!asset || !asset.domainName) {
      return NextResponse.json({ error: 'Asset not found or is not a domain' }, { status: 403 });
    }

    console.log('Checking live status for domain:', asset.domainName);

    const { liveStatus, lastChecked } = await checkSingleDomain(asset.domainName);
    console.log('Live Status:', liveStatus, 'at', lastChecked);

    const updatedAsset = await db.asset.update({
      where: { id: id },
      data: { liveStatus, lastChecked },
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}