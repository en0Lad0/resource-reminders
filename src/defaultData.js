// Sample character (Rogue lvl 3) so Play Mode is usable out of the box.
// Replace with your own via Setup Mode or JSON import.

let idCounter = 0;
export function newId() {
  idCounter += 1;
  return `skill_${Date.now().toString(36)}_${idCounter}`;
}

export function defaultState() {
  const sneakAttack = {
    id: "sneak_attack",
    name: "Sneak Attack",
    category: "Feature",
    description: "Once per turn, when you hit with advantage or an ally is within 5ft. +2d6 damage.",
    maxUses: 0,
    currentUses: 0,
    recoverOn: "None",
    perTurn: true,
    diceFormula: "2d6",
    chainTrigger: null,
    order: 0,
    usedThisTurn: false
  };
  const attack = {
    id: "shortsword_attack",
    name: "Shortsword Attack",
    category: "Action",
    description: "Melee weapon attack. Finesse, light. On hit: 1d6+3 piercing.",
    maxUses: 0,
    currentUses: 0,
    recoverOn: "None",
    perTurn: true,
    diceFormula: "1d20+5",
    chainTrigger: "sneak_attack", // hit -> prompt Sneak Attack combo
    order: 0,
    usedThisTurn: false
  };
  return {
    version: 1,
    skills: [
      attack,
      {
        id: "offhand",
        name: "Two-Weapon Strike (Off-Hand)",
        category: "Bonus Action",
        description: "Bonus action attack with your other weapon. No ability modifier to damage.",
        maxUses: 0,
        currentUses: 0,
        recoverOn: "None",
        perTurn: true,
        diceFormula: "1d20+5",
        chainTrigger: "sneak_attack",
        order: 1,
        usedThisTurn: false
      },
      sneakAttack,
      {
        id: "cunning_action",
        name: "Cunning Action (Dash/Disengage/Hide)",
        category: "Bonus Action",
        description: "Use a bonus action to Dash, Disengage, or Hide.",
        maxUses: 0,
        currentUses: 0,
        recoverOn: "None",
        perTurn: true,
        diceFormula: "",
        chainTrigger: null,
        order: 2,
        usedThisTurn: false
      },
      {
        id: "second_wind",
        name: "Second Wind",
        category: "Feature",
        description: "Bonus action: regain 1d10+3 HP.",
        maxUses: 1,
        currentUses: 1,
        recoverOn: "SRest",
        perTurn: false,
        diceFormula: "1d10+3",
        chainTrigger: null,
        order: 3,
        usedThisTurn: false
      },
      {
        id: "lucky",
        name: "Lucky (Feat)",
        category: "Feat",
        description: "Spend a luck point to roll an extra d20 on an attack roll, saving throw, or ability check.",
        maxUses: 3,
        currentUses: 3,
        recoverOn: "LRest",
        perTurn: false,
        diceFormula: "1d20",
        chainTrigger: null,
        order: 4,
        usedThisTurn: false
      }
    ]
  };
}
