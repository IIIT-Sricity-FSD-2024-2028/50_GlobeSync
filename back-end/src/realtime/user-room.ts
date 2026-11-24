/**
 * Private socket room for one person. Profile ids are only unique within a role
 * (traveler 1 and guide 1 are different people), so the room includes the role.
 */
export function userRoom(role: string, userId: number | string): string {
  return `user:${String(role).toLowerCase()}:${userId}`;
}
