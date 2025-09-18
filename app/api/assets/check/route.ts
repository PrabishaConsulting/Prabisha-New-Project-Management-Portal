import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LiveStatus } from '@prisma/client';
import { checkSingleDomain } from '@/utils/domain-status-check';


// This is a simple regex to check if a string looks like a valid domain name.


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