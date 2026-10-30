// Central state + undo/redo (max 3 history steps, local array only).
// Mutations snapshot state.skills BEFORE applying, so undo restores exactly.
import { loadState, saveState } from "./storage.js";
import { defaultState, newId } from "./defaultData.js";
import { resetChain } from "./chain.js";

const MAX_HISTORY = 3;

// Initialize with defaults immediately so state is NEVER null (prevents
// "Cannot read properties of null (reading 'skills')" during async init).
let state = defaultState();
let history = []; // snapshots before mutations (oldest first), capped at 3
let future = [];  // redo stack
const listeners = new Set();

const clone = (o) => JSON.parse(JSON.stringify(o));

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => fn(state));
}
function snapshot() {
  if (!state || !Array.isArray(state.skills)) return;
  history.push(clone(state.skills));
  if (history.length > MAX_HISTORY) history.shift();
  future = [];
}
function persist() {
  saveState(state).catch((err) => console.warn("[state] persist failed", err));
}

// Render immediately with defaults so the UI is interactive even if OBR hangs.
export function initDefaultSync() {
  if (!state) state = defaultState();
  emit();
}

// Migrate old schema (diceFormula) -> new schema (toHit / damage / chainRollMode / reminder).
function migrateState() {
  if (!state || !Array.isArray(state.skills)) return;
  state.skills.forEach((s) => {
    if (!s.toHit && s.diceFormula) s.toHit = s.diceFormula;
    if (!s.toHit) s.toHit = "";
    if (!s.damage) s.damage = "";
    if (!s.chainRollMode) s.chainRollMode = "none";
    if (!s.reminder) s.reminder = "";
  });
}

export async function init() {
  initDefaultSync();
  try {
    const loaded = await loadState();
    if (loaded && Array.isArray(loaded.skills)) state = loaded;
  } catch (err) {
    console.warn("[state] init load failed, using defaults:", err);
  }
  migrateState();
  emit();
}
export function getState() {
  return state;
}
export function getSkills() {
  return state ? state.skills : [];
}
export function canUndo() {
  return history.length > 0;
}
export function canRedo() {
  return future.length > 0;
}

export function undo() {
  if (!history.length) return;
  future.push(clone(state.skills));
  state.skills = history.pop();
  resetChain();
  persist();
  emit();
}
export function redo() {
  if (!future.length) return;
  history.push(clone(state.skills));
  state.skills = future.pop();
  resetChain();
  persist();
  emit();
}

// ---------- Play-mode actions ----------
export function useSkill(id) {
  const s = state.skills.find((x) => x.id === id);
  if (!s) return null;
  snapshot();
  if (s.maxUses > 0) s.currentUses = Math.max(0, s.currentUses - 1);
  s.usedThisTurn = true;
  persist();
  emit();
  return s;
}

export function shortRest() {
  snapshot();
  resetChain();
  state.skills.forEach((s) => {
    if (s.recoverOn === "SRest") s.currentUses = s.maxUses;
    s.usedThisTurn = false;
  });
  persist();
  emit();
}

export function longRest() {
  snapshot();
  resetChain();
  state.skills.forEach((s) => {
    if (s.recoverOn === "SRest" || s.recoverOn === "LRest") s.currentUses = s.maxUses;
    s.usedThisTurn = false;
  });
  persist();
  emit();
}

export function endTurn() {
  snapshot();
  resetChain();
  state.skills.forEach((s) => {
    s.usedThisTurn = false;
  });
  persist();
  emit();
}

// ---------- Setup-mode CRUD ----------
export function upsertSkill(data) {
  snapshot();
  if (data.id) {
    const i = state.skills.findIndex((s) => s.id === data.id);
    if (i >= 0) {
      // preserve currentUses unless explicitly provided
      const { currentUses, ...rest } = data;
      state.skills[i] = { ...state.skills[i], ...rest };
      if (currentUses !== undefined) state.skills[i].currentUses = currentUses;
    }
  } else {
    const maxOrder = state.skills.reduce((m, s) => Math.max(m, s.order || 0), -1);
    state.skills.push({
      id: newId(),
      usedThisTurn: false,
      order: maxOrder + 1,
      currentUses: data.maxUses || 0,
      ...data
    });
  }
  persist();
  emit();
}

export function deleteSkill(id) {
  snapshot();
  state.skills = state.skills.filter((s) => s.id !== id);
  state.skills.forEach((s) => {
    if (s.chainTrigger === id) s.chainTrigger = null;
  });
  persist();
  emit();
}

export function moveSkill(id, dir) {
  const s = state.skills.find((x) => x.id === id);
  if (!s) return;
  const group = state.skills
    .filter((x) => x.category === s.category)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = group.findIndex((x) => x.id === id);
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= group.length) return;
  snapshot();
  const a = group[idx];
  const b = group[swapIdx];
  [a.order, b.order] = [b.order, a.order];
  persist();
  emit();
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(json) {
  const parsed = typeof json === "string" ? JSON.parse(json) : json;
  if (!parsed || !Array.isArray(parsed.skills)) throw new Error("Invalid file: missing skills array");
  snapshot();
  state = { version: parsed.version || 1, skills: parsed.skills };
  resetChain();
  persist();
  emit();
}
