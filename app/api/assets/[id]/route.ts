import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Assuming your prisma client is exported as 'db'
import { z } from 'zod';
import { AssetType, RenewalPeriod, AssetStatus, LiveStatus } from '@/app/generated/client';

// A base schema using z.nativeEnum to ensure correct TypeScript types.
const baseAssetSchema = z.object({
  // FIX: Use z.nativeEnum for all Prisma enums
  assetType: z.nativeEnum(AssetType),
  provider: z.string().min(1, { message: 'Provider is required.' }),
  name: z.string().min(2, { message: 'Asset name is required.' }),
  serviceId: z.string().nullish().optional(),
  description: z.string().nullish().optional(),
  domainName: z.string().nullish().optional(),
  ipAddress: z.string().nullish().optional(),
  hostingPlan: z.string().nullish().optional(),
  serverLocation: z.string().nullish().optional(),
  // Use z.coerce.date() to handle date strings from the JSON body
  purchaseDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  autoRenew: z.boolean(),
  renewalPeriod: z.nativeEnum(RenewalPeriod),
  status: z.nativeEnum(AssetStatus),
  liveStatus: z.nativeEnum(LiveStatus),
  controlPanelUrl: z.string().url().nullish().optional().or(z.literal('')),
  username: z.string().nullish().optional(),
  password: z.string().nullish().optional(),
  notes: z.string().nullish().optional(),
});

// FIX: Create a partial schema for PATCH requests. This makes all fields optional.
const assetUpdateSchema = baseAssetSchema.partial();

// GET handler
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;
    const asset = await db.asset.findUnique({ where: { id: id } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (error) {
    console.error('API_ASSET_GET_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

// PATCH handler - THIS IS THE CORRECTED PART
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate the incoming data against the flexible update schema
    const validatedData = assetUpdateSchema.parse(body);

    // The validatedData now has the correct types and can be passed to Prisma
    const updatedAsset = await db.asset.update({
      where: { id },
      data: validatedData, // This will no longer cause a type error
    });

    return NextResponse.json(updatedAsset);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.flatten() // Use flatten for cleaner error messages
      }, { status: 400 });
    }
    console.error('API_ASSET_UPDATE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to update asset.' }, { status: 500 });
  }
}

// DELETE handler
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Ensure the asset exists before deleting
    const existingAsset = await db.asset.findUnique({ where: { id } });
    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    await db.asset.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('API_ASSET_DELETE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}