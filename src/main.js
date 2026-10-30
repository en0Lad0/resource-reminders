import "./style.css";
import * as State from "./state.js";
import { renderPlay, highlightCard } from "./playMode.js";
import {
  renderSetup,
  openBuilder,
  closeBuilder,
  collectForm,
  populateChainOptions,
  populateCategories
} from "./setupMode.js";
import { showDicePopup, showChainPrompt } from "./popup.js";
import { nextChainTarget, resetChain, getChainDepth } from "./chain.js";

const $ = (id) => document.getElementById(id);
let logEl;

function log(msg, cls) {
  if (!logEl) return;
  const d = document.createElement("div");
  if (cls) d.className = cls;
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.prepend(d);
  while (logEl.children.length > 6) logEl.lastChild.remove();
}

// ---------- Chain flow (recursive, depth-guarded) ----------
function afterUse(usedSkill) {
  const target = nextChainTarget(usedSkill, State.getSkills(), (w) => log(w, "warn"));
  if (!target) {
    resetChain();
    return;
  }
  highlightCard(target.id);
  showChainPrompt(
    usedSkill,
    target,
    () => {
      // Yes: consume the chained skill
      const used = State.useSkill(target.id);
      if (!used) {
        resetChain();
        return;
      }
      log(`Chain used: ${used.name} (depth ${getChainDepth()})`, "ok");
      if (used.diceFormula) {
        showDicePopup(used, () => afterUse(used));
      } else {
        afterUse(used);
      }
    },
    () => resetChain()
  );
}

function handleUse(id) {
  const skill = State.getSkills().find((s) => s.id === id);
  if (!skill) return;
  const used = State.useSkill(id);
  log(
    `Used: ${used.name}${used.maxUses > 0 ? ` — ${used.currentUses}/${used.maxUses} left` : ""}`,
    "ok"
  );
  if (used.diceFormula) {
    showDicePopup(used, () => afterUse(used));
  } else {
    afterUse(used);
  }
}

function handleRollOnly(id) {
  const skill = State.getSkills().find((s) => s.id === id);
  if (skill && skill.diceFormula) showDicePopup(skill, () => {});
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

// ---------- Tab switching ----------
function switchTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $("playMode").classList.toggle("active", name === "play");
  $("setupMode").classList.toggle("active", name === "setup");
}

// ---------- Export / Import ----------
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

// ---------- Wire up ----------
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

  await State.init();
  log("Ready. Data saves to Owlbear player metadata (or localStorage outside OBR).", "ok");
}

main();
