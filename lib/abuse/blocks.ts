import { db } from "@/lib/db";

/**
 * Blocks (docs/abuse-handling.md#blocks).
 *
 * Semantics: if A blocked B, A and B are never admitted to the same room
 * (either direction — separation, not asymmetry), and each side's streams
 * are hidden from the other client-side as defense-in-depth for blocks
 * created mid-session.
 */

/** Every user id that `userId` has a block relationship with, either direction. */
export async function blockedCounterparties(userId: string): Promise<Set<string>> {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return ids;
}

/** True if any *active* participant of the room has a block relation with the user. */
export async function isBlockedFromRoom(
  userId: string,
  roomId: string,
): Promise<boolean> {
  const counterparties = await blockedCounterparties(userId);
  if (counterparties.size === 0) return false;
  const clash = await db.roomParticipant.findFirst({
    where: {
      roomId,
      leftAt: null,
      userId: { in: [...counterparties] },
    },
    select: { id: true },
  });
  return clash !== null;
}
