// lib/project-code.ts
import { db } from "@/lib/db";

export async function generateNextProjectCode(): Promise<string> {
  try {
    // Find the project with the highest projectCode
    const lastProject = await db.project.findFirst({
      orderBy: {
        projectCode: 'desc',
      },
      select: {
        projectCode: true,
      },
    });

    if (!lastProject || !lastProject.projectCode) {
      // If no project exists, start with PCP-0001
      return "PCP-0001";
    }

    // Extract the numeric part from the projectCode (e.g., "PCP-0055" -> 55)
    const numericPart = lastProject.projectCode.split('-')[1];
    const lastNumber = parseInt(numericPart, 10);
    
    if (isNaN(lastNumber)) {
      // If parsing fails, start with PCP-0001
      return "PCP-0001";
    }
    
    // Increment the number and format with leading zeros
    const nextNumber = lastNumber + 1;
    const nextNumericPart = nextNumber.toString().padStart(4, '0');
    
    return `PCP-${nextNumericPart}`;
  } catch (error) {
    console.error("Error generating project code:", error);
    // Fallback to PCP-0001 if there's an error
    return "PCP-6691";
  }
}