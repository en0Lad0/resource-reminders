// Popup layer: dice result + chain combo prompt.
// FIX: every popup now has a permanent close (X) button, backdrop-click closes,
// and Escape closes. Chain prompt no longer disables backdrop click. This prevents
// a stuck empty popup from blocking the whole UI.
import { diceEngine } from "./dice.js";

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

// Shared chrome: shows overlay, adds a permanent close button, backdrop + Escape.
// onClose is called when the user dismisses via X / backdrop / Escape.
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

// Dice popup. Auto-rolls once on open; user can switch mode and re-roll.
export function showDicePopup(skill, onDone) {
  if (!skill || !skill.diceFormula) {
    closePopup();
    onDone?.();
    return;
  }
  openPopupChrome(onDone);
  const p = popup();
  let mode = "normal";

  const h = document.createElement("h3");
  h.textContent = `${skill.name} — ${skill.diceFormula}`;
  p.appendChild(h);

  const toggle = document.createElement("div");
  toggle.className = "mode-toggle";
  const modes = [
    ["normal", "Normal"],
    ["advantage", "Advantage"],
    ["disadvantage", "Disadvantage"]
  ];
  modes.forEach(([val, label]) => {
    const b = document.createElement("button");
    b.textContent = label;
    if (val === mode) b.classList.add("active");
    b.addEventListener("click", () => {
      mode = val;
      [...toggle.children].forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      doRoll();
    });
    toggle.appendChild(b);
  });
  p.appendChild(toggle);

  const totalEl = document.createElement("div");
  totalEl.className = "dice-total";
  totalEl.textContent = "…";
  p.appendChild(totalEl);

  const detailEl = document.createElement("div");
  detailEl.className = "dice-detail";
  p.appendChild(detailEl);

  const btns = document.createElement("div");
  btns.className = "popup-buttons";
  const rollBtn = document.createElement("button");
  rollBtn.className = "btn primary";
  rollBtn.textContent = "Re-roll";
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn";
  closeBtn.textContent = "Done";
  btns.append(rollBtn, closeBtn);
  p.appendChild(btns);

  async function doRoll() {
    try {
      const res = await diceEngine.roll(skill.diceFormula, mode);
      totalEl.textContent = res.total;
      totalEl.className =
        "dice-total " +
        (res.crit === "hit" ? "crit-hit" : res.crit === "fail" ? "crit-fail" : "");
      let detail = res.detailString();
      if (res.advInfo) {
        detail += `  |  ${res.mode}: [${res.advInfo.first.join(",")}] vs [${res.advInfo.second.join(",")}] → kept [${res.advInfo.kept.join(",")}]`;
      }
      if (res.crit === "hit") detail += "   — CRITICAL HIT!";
      if (res.crit === "fail") detail += "   — CRITICAL FAIL!";
      detailEl.textContent = detail;
    } catch (err) {
      detailEl.textContent = "Roll error: " + err.message;
    }
  }

  rollBtn.addEventListener("click", doRoll);
  closeBtn.addEventListener("click", () => {
    closePopup();
    onDone?.();
  });

  doRoll();
}

// Chain combo prompt: "You used A. Chain into B?"
// Dismissing via X / backdrop / Escape = Skip (onNo).
export function showChainPrompt(fromSkill, toSkill, onYes, onNo) {
  openPopupChrome(onNo);
  const p = popup();

  const h = document.createElement("h3");
  h.textContent = "Combo Available";
  p.appendChild(h);

  const t = document.createElement("div");
  t.className = "chain-text";
  if (fromSkill && toSkill) {
    t.innerHTML = `You used <b>${fromSkill.name}</b>.<br/>You can chain into <b>${toSkill.name}</b>.<br/>Use it now?`;
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
