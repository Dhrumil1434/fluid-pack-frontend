/**
 * Utility functions for working with MongoDB ObjectIds
 */

/**
 * Generate a valid MongoDB ObjectId string for testing purposes
 * @returns A valid 24-character hexadecimal string
 */
export function generateObjectId(): string {
  // Generate a random 24-character hex string
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate if a string is a valid MongoDB ObjectId format
 * @param id The string to validate
 * @returns True if valid ObjectId format, false otherwise
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Generate multiple ObjectIds for testing
 * @param count Number of ObjectIds to generate
 * @returns Array of valid ObjectId strings
 */
export function generateObjectIds(count: number): string[] {
  return Array.from({ length: count }, () => generateObjectId());
}
