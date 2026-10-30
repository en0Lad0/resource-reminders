// Cloud storage layer: Owlbear Rodeo metadata with localStorage fallback.
// Uses OBR.player.setMetadata so each player's resources are their own
// (per-character). Swap to OBR.room.setMetadata if you want a shared pool.
import OBR from "@owlbear-rodeo/sdk";

export const STORAGE_NS = "com.resource-reminders/state";

// Never let an unresponsive Owlbear SDK hang the UI — fall back fast.
const OBR_TIMEOUT = 2500;
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms)
    )
  ]);
}

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
      const playerMeta = await withTimeout(OBR.player.getMetadata(), OBR_TIMEOUT, "OBR.player.getMetadata");
      if (playerMeta && playerMeta[STORAGE_NS]) return playerMeta[STORAGE_NS];
      const roomMeta = await withTimeout(OBR.room.getMetadata(), OBR_TIMEOUT, "OBR.room.getMetadata");
      if (roomMeta && roomMeta[STORAGE_NS]) return roomMeta[STORAGE_NS];
    } catch (err) {
      console.warn("[storage] OBR read failed, using localStorage:", err.message || err);
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_NS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveState(state) {
  // Always keep a local copy first — it is the instant source of truth for UI.
  try {
    localStorage.setItem(STORAGE_NS, JSON.stringify(state));
  } catch {}
  if (isObrAvailable()) {
    try {
      await withTimeout(OBR.player.setMetadata({ [STORAGE_NS]: state }), OBR_TIMEOUT, "OBR.player.setMetadata");
      return "obr";
    } catch (err) {
      console.warn("[storage] OBR write failed (local copy kept):", err.message || err);
      return "local";
    }
  }
  return "local";
}
