// Play Mode renderer. Uses a stable card-element cache so the fade-out /
// collapse CSS transition actually plays when a skill becomes unavailable.
import { getSkills } from "./state.js";

const cardCache = new Map(); // skill id -> card element

export function isCardHidden(s) {
  const exhausted = s.maxUses > 0 && s.currentUses <= 0;
  const usedThisTurn = s.usedThisTurn && (s.perTurn || s.maxUses === 0);
  return exhausted || usedThisTurn;
}

function buildCard(handlers) {
  const card = document.createElement("div");
  card.className = "skill-card";

  const head = document.createElement("div");
  head.className = "card-head";
  const name = document.createElement("span");
  name.className = "card-name";
  const uses = document.createElement("span");
  uses.className = "card-uses";
  const diceBtn = document.createElement("button");
  diceBtn.className = "card-dice";
  diceBtn.title = "Roll dice (does not consume a use)";
  diceBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    handlers.onRoll(card.dataset.id);
  });
  head.append(name, uses, diceBtn);

  const desc = document.createElement("div");
  desc.className = "card-desc";

  const meta = document.createElement("div");
  meta.className = "card-meta";

  card.append(head, desc, meta);
  card.addEventListener("click", () => handlers.onUse(card.dataset.id));
  return card;
}

function updateCard(card, s) {
  card.dataset.id = s.id;
  card.querySelector(".card-name").textContent = s.name;
  card.querySelector(".card-uses").textContent =
    s.maxUses > 0 ? `${s.currentUses}/${s.maxUses}` : "∞";
  const diceBtn = card.querySelector(".card-dice");
  if (s.diceFormula) {
    diceBtn.textContent = s.diceFormula;
    diceBtn.style.display = "";
  } else {
    diceBtn.style.display = "none";
  }
  card.querySelector(".card-desc").textContent = s.description || "";

  const meta = card.querySelector(".card-meta");
  meta.innerHTML = "";
  const rec = document.createElement("span");
  rec.textContent = `Recover: ${s.recoverOn}`;
  meta.appendChild(rec);
  if (s.perTurn) {
    const t = document.createElement("span");
    t.textContent = "Per Turn";
    meta.appendChild(t);
  }
  if (s.chainTrigger) {
    const target = getSkills().find((x) => x.id === s.chainTrigger);
    const t = document.createElement("span");
    t.textContent = `Chain: ${target?.name || "?"}`;
    meta.appendChild(t);
  }

  card.classList.toggle("exhausted", isCardHidden(s));
}

export function renderPlay(container, handlers) {
  const skills = getSkills();
  container.innerHTML = "";
  const cats = [...new Set(skills.map((s) => s.category))];
  const usedIds = new Set();

  for (const cat of cats) {
    const group = skills
      .filter((s) => s.category === cat)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (group.every(isCardHidden)) continue; // hide fully-exhausted categories

    const wrap = document.createElement("div");
    wrap.className = "category-group";
    const h = document.createElement("h3");
    h.textContent = cat;
    wrap.appendChild(h);

    const cards = document.createElement("div");
    cards.className = "category-cards";
    for (const s of group) {
      usedIds.add(s.id);
      let card = cardCache.get(s.id);
      if (!card) {
        card = buildCard(handlers);
        cardCache.set(s.id, card);
      }
      updateCard(card, s);
      cards.appendChild(card);
    }
    wrap.appendChild(cards);
    container.appendChild(wrap);
  }

  for (const id of [...cardCache.keys()]) {
    if (!usedIds.has(id)) cardCache.delete(id);
  }
}

export function highlightCard(id) {
  const card = cardCache.get(id);
  if (card) {
    card.classList.remove("chain-highlight");
    void card.offsetWidth; // restart animation
    card.classList.add("chain-highlight");
  }
}
