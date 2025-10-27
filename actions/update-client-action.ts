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

export async function deleteAccount(
  id: string,
  type: 'CLIENT' | 'INTERNAL_PRODUCT'
) {
  try {
    if (type === 'CLIENT') {
      await db.user.delete({ where: { id } });
    } else if (type === 'INTERNAL_PRODUCT') {
      // Add a check here if products can't be deleted if they have relations
      await db.internalProduct.delete({ where: { id } });
    } else {
      throw new Error("Invalid account type");
    }

    revalidatePath('/workspaces/clients');
    return { success: true };

  } catch (error) {
    console.error("Delete failed:", error);
    return { success: false, error: "Failed to delete account." };
  }
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


// actions/client-actions.ts

import { UserType } from "@/app/generated/client";

interface AccountData {
  name: string;
  email?: string;
  industry?: string;
  location?: string;
}

export async function createAccount(
  type: 'CLIENT' | 'INTERNAL_PRODUCT',
  data: AccountData
) {
  try {
    if (!data.name) {
      throw new Error("Name is required.");
    }

    if (type === 'CLIENT') {
      // NOTE: Ensure all required fields for the 'user' table are provided.
      // You may need to add a default password, avatar, etc.
      await db.user.create({
        data: {
          name: data.name,
          email: data.email || "", // Assuming email is required for User
          userType: UserType.CLIENT,
          location: data.location || "",
          industry: data.industry || "",
        },
      });
    } else if (type === 'INTERNAL_PRODUCT') {
      await db.internalProduct.create({
        data: {
          name: data.name,
          email: data.email || null,
          industry: data.industry || null,
          location: data.location || null,
        },
      });
    } else {
      throw new Error("Invalid account type");
    }

    // Invalidate the cache for the clients page so the new data appears
    revalidatePath('/workspaces/clients');

    return { success: true };
    
  } catch (error) {
    console.error("Create failed:", error);
    return { success: false, error: (error as Error).message };
  }
}