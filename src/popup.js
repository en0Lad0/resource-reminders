// Popup layer: two-stage attack roll (To Hit -> Damage, crit auto-double),
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

// Two-stage attack roll: roll To Hit (with mode), then roll Damage.
// Nat 20 -> damage dice doubled automatically. Nat 1 -> no damage roll.
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

  const toHitTotal = document.createElement("div");
  toHitTotal.className = "dice-total";
  const toHitDetail = document.createElement("div");
  toHitDetail.className = "dice-detail";
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
    lbl.textContent = "Damage";
    p.append(lbl, dmgTotal, dmgDetail);
  }

  const btns = document.createElement("div");
  btns.className = "popup-buttons";
  const rollBtn = document.createElement("button");
  rollBtn.className = "btn primary";
  rollBtn.textContent = toHit ? "Re-roll Attack" : "Re-roll";
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn";
  closeBtn.textContent = "Done";
  btns.append(rollBtn, closeBtn);
  p.appendChild(btns);

  async function doRoll() {
    try {
      if (toHit) {
        const res = await diceEngine.roll(toHit, rollMode);
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

        if (damage) {
          if (res.crit === "hit") {
            const critFormula = doubleDiceCount(damage);
            const dmg = await diceEngine.roll(critFormula, "normal");
            dmgTotal.hidden = false;
            dmgDetail.hidden = false;
            dmgTotal.textContent = dmg.total + "  (×2 dice)";
            dmgTotal.className = "dice-total damage-total crit-hit";
            dmgDetail.textContent = "CRITICAL! " + critFormula + "  →  " + dmg.detailString();
          } else if (res.crit === "fail") {
            dmgTotal.hidden = false;
            dmgDetail.hidden = false;
            dmgTotal.textContent = "—";
            dmgTotal.className = "dice-total damage-total crit-fail";
            dmgDetail.textContent = "Critical miss — no damage roll.";
          } else {
            const dmg = await diceEngine.roll(damage, "normal");
            dmgTotal.hidden = false;
            dmgDetail.hidden = false;
            dmgTotal.textContent = dmg.total;
            dmgTotal.className = "dice-total damage-total";
            dmgDetail.textContent = damage + "  →  " + dmg.detailString();
          }
        }
      } else {
        const dmg = await diceEngine.roll(damage, "normal");
        toHitTotal.textContent = dmg.total;
        toHitTotal.className = "dice-total damage-total";
        toHitDetail.textContent = damage + "  →  " + dmg.detailString();
      }
    } catch (err) {
      toHitDetail.textContent = "Roll error: " + err.message;
    }
  }

  rollBtn.addEventListener("click", doRoll);
  closeBtn.addEventListener("click", () => {
    closePopup();
    onDone?.();
  });

  doRoll();
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
