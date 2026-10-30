// Setup Mode: skill list with per-category sorting, builder form,
// category datalist and chain-trigger dropdown population.
import { getSkills } from "./state.js";

let editingId = null;

export function populateChainOptions(selectEl, excludeId) {
  selectEl.innerHTML = '<option value="">— None —</option>';
  for (const s of getSkills()) {
    if (s.id === excludeId) continue;
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = `${s.name} (${s.category})`;
    selectEl.appendChild(o);
  }
}

export function populateCategories(datalistEl) {
  datalistEl.innerHTML = "";
  const defaults = ["Action", "Bonus Action", "Feature", "Feat"];
  const existing = new Set(getSkills().map((s) => s.category));
  for (const c of [...defaults, ...existing]) {
    if (!c) continue;
    const o = document.createElement("option");
    o.value = c;
    datalistEl.appendChild(o);
  }
}

export function renderSetup(listEl, handlers) {
  listEl.innerHTML = "";
  const skills = getSkills();
  const cats = [...new Set(skills.map((s) => s.category))];
  for (const cat of cats) {
    const group = skills
      .filter((s) => s.category === cat)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const wrap = document.createElement("div");
    wrap.className = "setup-group";
    const h = document.createElement("h3");
    h.textContent = cat;
    wrap.appendChild(h);
    group.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "setup-row";
      const sort = document.createElement("div");
      sort.className = "sort-btns";
      const up = document.createElement("button");
      up.textContent = "▲";
      up.title = "Move up";
      up.disabled = i === 0;
      up.addEventListener("click", () => handlers.onMove(s.id, -1));
      const down = document.createElement("button");
      down.textContent = "▼";
      down.title = "Move down";
      down.disabled = i === group.length - 1;
      down.addEventListener("click", () => handlers.onMove(s.id, +1));
      sort.append(up, down);
      const name = document.createElement("span");
      name.className = "row-name";
      name.textContent = s.name;
      const toHit = (s.toHit || s.diceFormula || "").trim();
      const meta = document.createElement("span");
      meta.className = "row-meta";
      meta.textContent = [
        s.maxUses > 0 ? `${s.currentUses}/${s.maxUses} uses` : "at-will",
        s.recoverOn,
        s.perTurn ? "per-turn" : null,
        toHit ? `hit:${toHit}` : null,
        s.damage ? `dmg:${s.damage}` : null,
        s.chainTrigger
          ? "chain→" +
            (getSkills().find((x) => x.id === s.chainTrigger)?.name || "?") +
            (s.chainRollMode && s.chainRollMode !== "none" ? ` (${s.chainRollMode === "advantage" ? "Adv" : "Dis"})` : "")
          : null,
        s.reminder ? "⚠reminder" : null
      ]
        .filter(Boolean)
        .join(" · ");
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const edit = document.createElement("button");
      edit.textContent = "Edit";
      edit.addEventListener("click", () => handlers.onEdit(s));
      const del = document.createElement("button");
      del.className = "del";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        if (confirm(`Delete skill "${s.name}"?`)) handlers.onDelete(s.id);
      });
      actions.append(edit, del);
      row.append(sort, name, meta, actions);
      wrap.appendChild(row);
    });
    listEl.appendChild(wrap);
  }
}

export function openBuilder(skill) {
  editingId = skill ? skill.id : null;
  document.getElementById("builderTitle").textContent = skill ? "Edit Skill" : "Add Skill";
  document.getElementById("f_name").value = skill?.name || "";
  document.getElementById("f_category").value = skill?.category || "Action";
  document.getElementById("f_maxUses").value = skill?.maxUses ?? 0;
  document.getElementById("f_recoverOn").value = skill?.recoverOn || "SRest";
  document.getElementById("f_perTurn").value = skill?.perTurn ? "true" : "false";
  document.getElementById("f_toHit").value = skill?.toHit || skill?.diceFormula || "";
  document.getElementById("f_damage").value = skill?.damage || "";
  document.getElementById("f_chainRollMode").value = skill?.chainRollMode || "none";
  document.getElementById("f_reminder").value = skill?.reminder || "";
  document.getElementById("f_description").value = skill?.description || "";
  populateChainOptions(document.getElementById("f_chainTrigger"), editingId);
  if (skill?.chainTrigger) document.getElementById("f_chainTrigger").value = skill.chainTrigger;
  const builder = document.getElementById("builder");
  builder.hidden = false;
  builder.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function closeBuilder() {
  document.getElementById("builder").hidden = true;
  editingId = null;
}

export function collectForm() {
  const maxUses = Math.max(0, parseInt(document.getElementById("f_maxUses").value || "0", 10));
  const toHit = document.getElementById("f_toHit").value.trim();
  const data = {
    name: document.getElementById("f_name").value.trim() || "Unnamed Skill",
    category: document.getElementById("f_category").value.trim() || "Action",
    maxUses,
    recoverOn: document.getElementById("f_recoverOn").value,
    perTurn: document.getElementById("f_perTurn").value === "true",
    toHit,
    damage: document.getElementById("f_damage").value.trim(),
    diceFormula: toHit, // deprecated alias for old readers
    chainTrigger: document.getElementById("f_chainTrigger").value || null,
    chainRollMode: document.getElementById("f_chainRollMode").value || "none",
    reminder: document.getElementById("f_reminder").value.trim(),
    description: document.getElementById("f_description").value
  };
  if (editingId) {
    data.id = editingId;
  } else {
    data.currentUses = maxUses;
  }
  return data;
}
