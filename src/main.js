import "./style.css";
import * as State from "./state.js";
import { renderPlay, highlightCard, isCardHidden } from "./playMode.js";
import {
  renderSetup,
  openBuilder,
  closeBuilder,
  collectForm,
  populateChainOptions,
  populateCategories
} from "./setupMode.js";
import { showAttackPopup, showChainPrompt, showReminderPrompt } from "./popup.js";
import { nextChainTarget, resetChain, getChainDepth } from "./chain.js";

const $ = (id) => document.getElementById(id);
let logEl;
// Global roll mode (one switch applies to all to-hit rolls until toggled off).
let globalRollMode = "normal"; // "normal" | "advantage" | "disadvantage"

function log(msg, cls) {
  if (!logEl) return;
  const d = document.createElement("div");
  if (cls) d.className = cls;
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.prepend(d);
  while (logEl.children.length > 6) logEl.lastChild.remove();
}

window.addEventListener("error", (e) => {
  log("JS error: " + (e.message || (e.error && e.error.message) || "unknown"), "warn");
});
window.addEventListener("unhandledrejection", (e) => {
  log("Promise error: " + (e.reason && e.reason.message ? e.reason.message : e.reason || "unknown"), "warn");
});

function hasDice(skill) {
  return !!(skill && ((skill.toHit || skill.diceFormula || "").trim() || (skill.damage || "").trim()));
}

function rollModeFor(skill) {
  // Chain roll mode (set on the triggerer) overrides global temporarily.
  if (skill && skill.chainRollMode && skill.chainRollMode !== "none") return skill.chainRollMode;
  return globalRollMode;
}

// ---------- Chain flow (recursive, depth-guarded) ----------
function afterUse(usedSkill) {
  const target = nextChainTarget(usedSkill, State.getSkills(), (w) => log(w, "warn"));
  if (!target) {
    resetChain();
    return;
  }
  // Only prompt if the chained skill is actually usable right now.
  if (isCardHidden(target)) {
    log(`Chain skipped: ${target.name} is unavailable (needs rest / used this turn).`, "warn");
    resetChain();
    return;
  }
  highlightCard(target.id);
  showChainPrompt(
    usedSkill,
    target,
    () => {
      const used = State.useSkill(target.id);
      if (!used) {
        resetChain();
        return;
      }
      log(`Chain used: ${used.name} (depth ${getChainDepth()})`, "ok");
      if (hasDice(used)) {
        showAttackPopup(used, rollModeFor(usedSkill), () => afterUse(used));
      } else {
        afterUse(used);
      }
    },
    () => resetChain()
  );
}

function consumeAndRoll(skill, rollMode) {
  const used = State.useSkill(skill.id);
  if (!used) return;
  log(
    `Used: ${used.name}${used.maxUses > 0 ? ` — ${used.currentUses}/${used.maxUses} left` : ""}${
      rollMode !== "normal" ? ` [${rollMode}]` : ""
    }`,
    "ok"
  );
  if (hasDice(used)) {
    showAttackPopup(used, rollMode, () => afterUse(used));
  } else {
    afterUse(used);
  }
}

function handleUse(id, e) {
  try {
    const skill = State.getSkills().find((s) => s.id === id);
    if (!skill) return;
    const shiftAdv = e && e.shiftKey;
    const rollMode = shiftAdv ? "advantage" : globalRollMode;
    if (shiftAdv) log("Shift+Click: forcing Advantage", "ok");
    if (skill.reminder && skill.reminder.trim()) {
      showReminderPrompt(
        skill.reminder,
        () => consumeAndRoll(skill, rollMode),
        () => log(`Cancelled: ${skill.name} (reminder)`, "warn")
      );
    } else {
      consumeAndRoll(skill, rollMode);
    }
  } catch (err) {
    log("Use skill failed: " + (err.message || err), "warn");
  }
}

function handleRollOnly(id) {
  const skill = State.getSkills().find((s) => s.id === id);
  if (skill && hasDice(skill)) showAttackPopup(skill, globalRollMode, () => {});
}

// ---------- Render on every state change ----------
function renderAll() {
  renderPlay($("skillContainer"), { onUse: handleUse, onRoll: handleRollOnly });
  renderSetup($("setupList"), {
    onEdit: (s) => openBuilder(s),
    onDelete: (id) => State.deleteSkill(id),
    onMove: (id, dir) => State.moveSkill(id, dir)
  });
  populateCategories($("categoryList"));
  $("undoBtn").disabled = !State.canUndo();
  $("redoBtn").disabled = !State.canRedo();
  $("emptyHint").hidden = State.getSkills().length > 0;
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $("playMode").classList.toggle("active", name === "play");
  $("setupMode").classList.toggle("active", name === "setup");
}

function updateModeButtons() {
  $("advBtn").classList.toggle("active", globalRollMode === "advantage");
  $("disBtn").classList.toggle("active", globalRollMode === "disadvantage");
}

function doExport() {
  const blob = new Blob([State.exportData()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resource-reminders.json";
  a.click();
  URL.revokeObjectURL(url);
  log("Exported settings to resource-reminders.json", "ok");
}

function doImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      State.importData(reader.result);
      log("Imported settings successfully", "ok");
    } catch (err) {
      log("Import failed: " + err.message, "warn");
    }
  };
  reader.readAsText(file);
}

async function main() {
  logEl = $("log");

  document.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => switchTab(b.dataset.tab))
  );
  $("srestBtn").addEventListener("click", () => {
    State.shortRest();
    log("Short Rest — SRest skills refilled, per-turn actions reset", "ok");
  });
  $("lrestBtn").addEventListener("click", () => {
    State.longRest();
    log("Long Rest — all skills refilled", "ok");
  });
  $("endTurnBtn").addEventListener("click", () => {
    State.endTurn();
    log("End Turn — per-turn cards restored", "ok");
  });
  // Global Advantage / Disadvantage switches (mutually exclusive, toggle off on re-click)
  $("advBtn").addEventListener("click", () => {
    globalRollMode = globalRollMode === "advantage" ? "normal" : "advantage";
    updateModeButtons();
    log(globalRollMode === "advantage" ? "Global Advantage ON" : "Global Advantage OFF", "ok");
  });
  $("disBtn").addEventListener("click", () => {
    globalRollMode = globalRollMode === "disadvantage" ? "normal" : "disadvantage";
    updateModeButtons();
    log(globalRollMode === "disadvantage" ? "Global Disadvantage ON" : "Global Disadvantage OFF", "ok");
  });
  $("undoBtn").addEventListener("click", () => State.undo());
  $("redoBtn").addEventListener("click", () => State.redo());
  $("exportBtn").addEventListener("click", doExport);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) doImport(f);
    e.target.value = "";
  });
  $("addSkillBtn").addEventListener("click", () => {
    populateChainOptions($("f_chainTrigger"), null);
    openBuilder(null);
  });
  $("saveSkillBtn").addEventListener("click", () => {
    State.upsertSkill(collectForm());
    closeBuilder();
  });
  $("cancelSkillBtn").addEventListener("click", () => closeBuilder());

  State.subscribe(renderAll);
  State.initDefaultSync();
  updateModeButtons();
  State.init()
    .then(() => log("Ready. Cloud + local save active. Shift+Click = force Advantage.", "ok"))
    .catch((err) => log("Init warning: " + (err.message || err), "warn"));
}

main().catch((err) => {
  if (logEl) log("Fatal: " + (err.message || err), "warn");
});
