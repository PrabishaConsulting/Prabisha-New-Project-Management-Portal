"use server"


import { db } from "@/lib/db";

export async function getAllCategories() {
  try {
    const categories = await db.categories.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return categories;
  } catch (error) {
    console.log(error);
  }
}
