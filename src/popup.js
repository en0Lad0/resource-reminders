// Popup layer: dice result (with Normal/Advantage/Disadvantage toggle and
// crit coloring) + chain combo prompt.
import { diceEngine } from "./dice.js";

const overlay = () => document.getElementById("overlay");
const popup = () => document.getElementById("popup");

export function closePopup() {
  overlay().hidden = true;
  popup().innerHTML = "";
}

// Dice popup. Auto-rolls once on open; user can switch mode and re-roll.
// onDone is called when the popup is closed.
export function showDicePopup(skill, onDone) {
  let mode = "normal";
  const ov = overlay();
  const p = popup();
  ov.hidden = false;
  p.innerHTML = "";

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
  ov.onclick = (e) => {
    if (e.target === ov) {
      closePopup();
      onDone?.();
    }
  };

  doRoll();
}

// Chain combo prompt: "You used A. Chain into B?"
export function showChainPrompt(fromSkill, toSkill, onYes, onNo) {
  const ov = overlay();
  const p = popup();
  ov.hidden = false;
  ov.onclick = null;
  p.innerHTML = "";

  const h = document.createElement("h3");
  h.textContent = "Combo Available";
  p.appendChild(h);

  const t = document.createElement("div");
  t.className = "chain-text";
  t.innerHTML = `You used <b>${fromSkill.name}</b>.<br/>You can chain into <b>${toSkill.name}</b>.<br/>Use it now?`;
  p.appendChild(t);

  const btns = document.createElement("div");
  btns.className = "popup-buttons";
  const yes = document.createElement("button");
  yes.className = "btn accent";
  yes.textContent = `Yes — use ${toSkill.name}`;
  const no = document.createElement("button");
  no.className = "btn";
  no.textContent = "Skip";
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
