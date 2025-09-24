// app/actions.ts (Create this new file)

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// This is a generic type for the data you might update
interface UpdateData {
  name?: string;
  email?: string;
  industry?: string;
  location?: string;
}

export async function updateAccount(
  id: string,
  type: 'CLIENT' | 'INTERNAL_PRODUCT',
  data: UpdateData
) {
  try {
    // Step 1: Update the correct table in the database
    if (type === 'CLIENT') {
      await db.user.update({ where: { id }, data });
    } else if (type === 'INTERNAL_PRODUCT') {
      await db.internalProduct.update({ where: { id }, data });
    } else {
      throw new Error("Invalid account type");
    }

    // Step 2: Invalidate the cache for the clients page
    revalidatePath('/workspaces/clients');

    return { success: true };
    
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false, error: "Failed to update account." };
  }
}