import { db } from "@/lib/db";

export async function getAllDepartment(){

    const data = await db.department.findMany({})

    if (!data) return null

    return data

}