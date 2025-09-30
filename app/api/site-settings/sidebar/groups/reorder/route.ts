import { NextResponse } from 'next/server';
import {db} from '@/lib/db';

export async function PATCH(req: Request) {
  try {
    const { groupIds } = await req.json();

    if (!Array.isArray(groupIds)) {
      return NextResponse.json({ error: 'Invalid request body. groupIds must be an array.' }, { status: 400 });
    }

    const updateOperations = groupIds.map((id, index) =>
      db.sidebarGroup.update({
        where: { id },
        data: { position: index },
      })
    );

    await db.$transaction(updateOperations);

    return NextResponse.json({ message: 'Groups reordered successfully.' });
  } catch (error) {
    console.error('Error reordering groups:', error);
    return NextResponse.json({ error: 'Failed to reorder groups.' }, { status: 500 });
  }
}
