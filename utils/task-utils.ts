// src/lib/utils.ts

/**
 * Generates a consistent 4-digit number from a UUID
 * @param uuid The UUID to convert
 * @returns A 4-digit string (0000-9999)
 */
export function generateCustomId(uuid: string): string {
  // Use a more robust hash function
  let hash = 0;
  
  // Simple but effective hash function
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and get last 4 digits
  const positiveHash = Math.abs(hash);
  const fourDigitNumber = positiveHash % 10000;
  
  // Format as 4-digit string with leading zeros
  return fourDigitNumber.toString().padStart(4, '0');
}

/**
 * Generates a PTI ID from a UUID
 * @param uuid The UUID to convert
 * @returns PTI-XXXX where XXXX is a 4-digit number
 */
export function generatePtiId(uuid: string): string {
  const customId = generateCustomId(uuid);
  return `PTI-${customId}`;
}
export function generatePcId(uuid: string): string {
  const customId = generateCustomId(uuid);
  return `PC-${customId}`;
}