// Popup layer: two-stage attack roll (To Hit -> manual Damage button),
// chain combo prompt, and reminder prompt. Every popup has X / backdrop / Escape.
import { diceEngine, doubleDiceCount } from "./dice.js";

const overlay = () => document.getElementById("overlay");
const popup = () => document.getElementById("popup");
let escapeHandler = null;

export function closePopup() {
  overlay().hidden = true;
  popup().innerHTML = "";
  if (escapeHandler) {
    document.removeEventListener("keydown", escapeHandler);
    escapeHandler = null;
  }
}

function openPopupChrome(onClose) {
  const ov = overlay();
  const p = popup();
  ov.hidden = false;
  p.innerHTML = "";
  p.style.position = "relative";

  const x = document.createElement("button");
  x.className = "popup-close";
  x.textContent = "✕";
  x.title = "Close";
  x.addEventListener("click", () => {
    closePopup();
    onClose?.();
  });
  p.appendChild(x);

  ov.onclick = (e) => {
    if (e.target === ov) {
      closePopup();
      onClose?.();
    }
  };

  if (escapeHandler) document.removeEventListener("keydown", escapeHandler);
  escapeHandler = (e) => {
    if (e.key === "Escape") {
      closePopup();
      onClose?.();
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

const MODE_LABEL = { normal: "", advantage: " (Advantage)", disadvantage: " (Disadvantage)" };

// Two-stage attack roll: auto-roll To Hit on open, then a manual
// "Roll Damage" button appears (label changes on crit / critical miss).
export function showAttackPopup(skill, rollMode, onDone) {
  const toHit = (skill.toHit || skill.diceFormula || "").trim();
  const damage = (skill.damage || "").trim();
  if (!toHit && !damage) {
    closePopup();
    onDone?.();
    return;
  }
  openPopupChrome(onDone);
  const p = popup();

  const h = document.createElement("h3");
  h.textContent = skill.name + (MODE_LABEL[rollMode] || "");
  p.appendChild(h);

  let critState = "none"; // "hit" | "fail" | "none"

  const toHitTotal = document.createElement("div");
  toHitTotal.className = "dice-total";
  const toHitDetail = document.createElement("div");
  toHitDetail.className = "dice-detail";

  let dmgBtn = null;
  const dmgTotal = document.createElement("div");
  dmgTotal.className = "dice-total damage-total";
  dmgTotal.hidden = true;
  const dmgDetail = document.createElement("div");
  dmgDetail.className = "dice-detail";
  dmgDetail.hidden = true;

  if (toHit) {
    const lbl = document.createElement("div");
    lbl.className = "roll-label";
    lbl.textContent = "To Hit (" + toHit + ")";
    p.append(lbl, toHitTotal, toHitDetail);
  }
  if (damage) {
    const lbl = document.createElement("div");
    lbl.className = "roll-label";
    lbl.textContent = "Damage (" + damage + ")";
    p.appendChild(lbl);
    if (toHit) {
      // Two-stage: damage rolls only after the player sees the to-hit result.
      dmgBtn = document.createElement("button");
      dmgBtn.className = "btn primary";
      dmgBtn.textContent = "Roll Damage";
      dmgBtn.hidden = true;
      p.appendChild(dmgBtn);
    }
    p.append(dmgTotal, dmgDetail);
  }

  const btns = document.createElement("div");
  btns.className = "popup-buttons";
  const rollBtn = document.createElement("button");
  rollBtn.className = "btn";
  rollBtn.textContent = toHit ? "Re-roll Attack" : "Re-roll";
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn primary";
  closeBtn.textContent = "Done";
  btns.append(rollBtn, closeBtn);
  p.appendChild(btns);

  async function rollToHit() {
    if (!toHit) return;
    // Reset damage section when re-rolling the attack.
    dmgTotal.hidden = true;
    dmgDetail.hidden = true;
    try {
      const res = await diceEngine.roll(toHit, rollMode);
      critState = res.crit;
      toHitTotal.textContent = res.total;
      toHitTotal.className =
        "dice-total " + (res.crit === "hit" ? "crit-hit" : res.crit === "fail" ? "crit-fail" : "");
      let detail = res.detailString();
      if (res.advInfo) {
        detail += `  |  ${res.mode}: [${res.advInfo.first.join(",")}] vs [${res.advInfo.second.join(",")}] → kept [${res.advInfo.kept.join(",")}]`;
      }
      if (res.crit === "hit") detail += "   — CRITICAL HIT!";
      if (res.crit === "fail") detail += "   — CRITICAL MISS!";
      toHitDetail.textContent = detail;

      if (dmgBtn) {
        dmgBtn.hidden = false;
        if (res.crit === "hit") {
          dmgBtn.textContent = "Roll Damage (×2 CRIT!)";
          dmgBtn.className = "btn accent";
          dmgBtn.disabled = false;
        } else if (res.crit === "fail") {
          dmgBtn.textContent = "Critical Miss — no damage";
          dmgBtn.className = "btn";
          dmgBtn.disabled = true;
        } else {
          dmgBtn.textContent = "Roll Damage";
          dmgBtn.className = "btn primary";
          dmgBtn.disabled = false;
        }
      }
    } catch (err) {
      toHitDetail.textContent = "Roll error: " + err.message;
    }
  }

  async function rollDamage() {
    if (!damage) return;
    try {
      const formula = critState === "hit" ? doubleDiceCount(damage) : damage;
      const dmg = await diceEngine.roll(formula, "normal");
      dmgTotal.hidden = false;
      dmgDetail.hidden = false;
      dmgTotal.textContent = critState === "hit" ? dmg.total + "  (×2 dice)" : dmg.total;
      dmgTotal.className = "dice-total damage-total " + (critState === "hit" ? "crit-hit" : "");
      dmgDetail.textContent =
        (critState === "hit" ? "CRITICAL! " + formula : formula) + "  →  " + dmg.detailString();
      if (dmgBtn) dmgBtn.disabled = true; // rolled once; re-roll attack to roll damage again
    } catch (err) {
      dmgDetail.hidden = false;
      dmgDetail.textContent = "Roll error: " + err.message;
    }
  }

  async function rollDamageOnly() {
    try {
      const dmg = await diceEngine.roll(damage, "normal");
      toHitTotal.textContent = dmg.total;
      toHitTotal.className = "dice-total damage-total";
      toHitDetail.textContent = damage + "  →  " + dmg.detailString();
    } catch (err) {
      toHitDetail.textContent = "Roll error: " + err.message;
    }
  }

  rollBtn.addEventListener("click", () => {
    if (toHit) rollToHit();
    else rollDamageOnly();
  });
  if (dmgBtn) dmgBtn.addEventListener("click", rollDamage);
  closeBtn.addEventListener("click", () => {
    closePopup();
    onDone?.();
  });

  // Auto-roll on open: to-hit if present, otherwise damage.
  if (toHit) rollToHit();
  else {
    const lbl = document.createElement("div");
    lbl.className = "roll-label";
    lbl.textContent = "Roll";
    p.insertBefore(lbl, toHitTotal);
    rollDamageOnly();
  }
}

// Reminder prompt: shows a warning before a skill is consumed.
export function showReminderPrompt(text, onYes, onNo) {
  openPopupChrome(onNo);
  const p = popup();
  const h = document.createElement("h3");
  h.textContent = "Reminder";
  p.appendChild(h);
  const t = document.createElement("div");
  t.className = "chain-text reminder-text";
  t.textContent = text;
  p.appendChild(t);
  const btns = document.createElement("div");
  btns.className = "popup-buttons";
  const yes = document.createElement("button");
  yes.className = "btn accent";
  yes.textContent = "Continue";
  const no = document.createElement("button");
  no.className = "btn";
  no.textContent = "Cancel";
  btns.append(yes, no);
  p.appendChild(btns);
  yes.addEventListener("click", () => {
    closePopup();
    onYes();
  });
  no.addEventListener("click", () => {
    closePopup();
    onNo();
  });
}

// Chain combo prompt: "You used A. Chain into B?"
export function showChainPrompt(fromSkill, toSkill, onYes, onNo) {
  openPopupChrome(onNo);
  const p = popup();
  const h = document.createElement("h3");
  h.textContent = "Combo Available";
  p.appendChild(h);
  const t = document.createElement("div");
  t.className = "chain-text";
  if (fromSkill && toSkill) {
    const modeNote =
      fromSkill.chainRollMode && fromSkill.chainRollMode !== "none"
        ? `<br/><i>(${fromSkill.chainRollMode === "advantage" ? "with Advantage" : "with Disadvantage"})</i>`
        : "";
    t.innerHTML = `You used <b>${fromSkill.name}</b>.<br/>You can chain into <b>${toSkill.name}</b>.${modeNote}<br/>Use it now?`;
  } else {
    t.textContent = "Combo target unavailable.";
  }
  p.appendChild(t);
  const btns = document.createElement("div");
  btns.className = "popup-buttons";
  if (fromSkill && toSkill) {
    const yes = document.createElement("button");
    yes.className = "btn accent";
    yes.textContent = `Yes — use ${toSkill.name}`;
    yes.addEventListener("click", () => {
      closePopup();
      onYes();
    });
    btns.appendChild(yes);
  }
  const no = document.createElement("button");
  no.className = "btn";
  no.textContent = "Skip";
  no.addEventListener("click", () => {
    closePopup();
    onNo();
  });
  btns.appendChild(no);
  p.appendChild(btns);
}
