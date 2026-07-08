import { db } from "@/lib/db";

/**
 * Get the player record by ID, or fallback to findFirst for backward compatibility.
 * Returns null if no player exists.
 */
export async function getPlayer(playerId?: string) {
  if (playerId) {
    return db.player.findUnique({ where: { id: playerId } });
  }
  // Fallback for backward compatibility (will be removed later)
  return db.player.findFirst();
}

/**
 * Get the player by ID or throw 404.
 */
export async function requirePlayer(playerId?: string) {
  const player = playerId
    ? await db.player.findUnique({ where: { id: playerId } })
    : await db.player.findFirst();
  if (!player) {
    throw new Error("NO_PLAYER");
  }
  return player;
}