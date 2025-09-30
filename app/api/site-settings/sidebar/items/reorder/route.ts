import { NextResponse } from 'next/server';
import {db} from '@/lib/db';

export async function PATCH(req: Request) {
  try {
    const { itemIds, groupId } = await req.json();

    if (!Array.isArray(itemIds) || typeof groupId !== 'string') {
      return NextResponse.json({ error: 'Invalid request body. itemIds must be an array and groupId a string.' }, { status: 400 });
    }

    const updateOperations = itemIds.map((id, index) =>
      db.sidebarItem.update({
        where: { id, sidebarGroupId: groupId },
        data: { position: index },
      })
    );

    await db.$transaction(updateOperations);

    return NextResponse.json({ message: 'Items reordered successfully.' });
  } catch (error) {
    console.error('Error reordering items:', error);
    return NextResponse.json({ error: 'Failed to reorder items.' }, { status: 500 });
  }
}
