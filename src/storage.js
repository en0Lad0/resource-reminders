// Cloud storage layer: Owlbear Rodeo metadata with localStorage fallback.
// Uses OBR.player.setMetadata so each player's resources are their own
// (per-character). Swap to OBR.room.setMetadata if you want a shared pool.
import OBR from "@owlbear-rodeo/sdk";

export const STORAGE_NS = "com.resource-reminders/state";

export function isObrAvailable() {
  try {
    return !!(OBR && OBR.isAvailable && OBR.isAvailable());
  } catch {
    return false;
  }
}

export async function loadState() {
  if (isObrAvailable()) {
    try {
      // Prefer player metadata (per user). Room metadata is also readable.
      const playerMeta = await OBR.player.getMetadata();
      if (playerMeta && playerMeta[STORAGE_NS]) {
        return playerMeta[STORAGE_NS];
      }
      const roomMeta = await OBR.room.getMetadata();
      if (roomMeta && roomMeta[STORAGE_NS]) {
        return roomMeta[STORAGE_NS];
      }
    } catch (err) {
      console.warn("[storage] OBR read failed, falling back to localStorage", err);
    }
  }
  const raw = localStorage.getItem(STORAGE_NS);
  return raw ? JSON.parse(raw) : null;
}

export async function saveState(state) {
  if (isObrAvailable()) {
    try {
      await OBR.player.setMetadata({ [STORAGE_NS]: state });
      return "obr";
    } catch (err) {
      console.warn("[storage] OBR write failed, falling back to localStorage", err);
    }
  }
  localStorage.setItem(STORAGE_NS, JSON.stringify(state));
  return "local";
}
