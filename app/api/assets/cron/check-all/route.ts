import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkSingleDomain } from '@/utils/domain-status-check';
export async function GET() {
  try {
    const assetsToCheck = await db.asset.findMany({
      where: {
        domainName: {
          not: null,
        },
      },
    });

    if (assetsToCheck.length === 0) {
      return NextResponse.json({ message: 'No assets with domain names to check.' });
    }

    console.log(`Found ${assetsToCheck.length} total assets to check.`);

    for (const asset of assetsToCheck) {
      // The logic here remains the same, but it now calls the improved check function
      const { liveStatus, lastChecked } = await checkSingleDomain(asset.domainName!);
      await db.asset.update({
        where: { id: asset.id },
        data: { liveStatus, lastChecked },
      });
      console.log(`Checked ${asset.domainName}: ${liveStatus}`);
    }

    return NextResponse.json({ success: true, checked: assetsToCheck.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}