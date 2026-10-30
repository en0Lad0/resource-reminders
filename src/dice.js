// Dice Engine — Adapter Pattern.
// Default: TextDiceAdapter (pure math, renders result in our popup).
// Future: register an ExternalDiceAdapter (dice+, OBR built-in 3D dice API)
// BEFORE the text adapter in DiceEngine.adapters and it will be picked up
// automatically — no changes to calling code required.

export class DiceRollResult {
  constructor({ formula, total, tokens, crit, mode, advInfo }) {
    this.formula = formula;
    this.total = total;
    this.tokens = tokens;       // parsed terms, for display
    this.crit = crit;           // "hit" | "fail" | "none"
    this.mode = mode;           // "normal" | "advantage" | "disadvantage"
    this.advInfo = advInfo;     // { first, second, kept } when adv/dis was applied
  }
  detailString() {
    const parts = this.tokens.map((t) => {
      if (t.flat !== undefined) return `${t.sign < 0 ? "-" : "+"}${Math.abs(t.flat)}`;
      const rolls = t.rolls.join(",");
      return `${t.sign < 0 ? "-" : "+"}${t.count}d${t.sides}[${rolls}]`;
    });
    return parts.join(" ").replace(/^\+ /, "");
  }
}

function rollOne(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

// Parse formulas like: "1d20+5", "2d6+3", "1d10-1d4+2", "+4", "3"
export function parseAndRoll(formula, mode = "normal") {
  const tokens = [];
  const re = /([+-]?)\s*(\d*)d(\d+)|([+-]?\s*\d+)/gi;
  let m;
  let d20Index = -1;
  while ((m = re.exec(formula)) !== null) {
    if (m[3] !== undefined) {
      const sign = m[1] === "-" ? -1 : 1;
      const count = parseInt(m[2] || "1", 10);
      const sides = parseInt(m[3], 10);
      const rolls = Array.from({ length: count }, () => rollOne(sides));
      tokens.push({ sign, count, sides, rolls });
      if (sides === 20 && d20Index === -1) d20Index = tokens.length - 1;
    } else if (m[4] !== undefined) {
      const cleaned = m[4].replace(/\s+/g, "");
      const sign = cleaned.startsWith("-") ? -1 : 1;
      const val = parseInt(cleaned.replace(/[+]/g, ""), 10);
      if (!Number.isNaN(val)) tokens.push({ sign, flat: val });
    }
  }

  let crit = "none";
  let advInfo = null;

  if (mode !== "normal" && d20Index !== -1) {
    const term = tokens[d20Index];
    const second = Array.from({ length: term.count }, () => rollOne(20));
    const kept =
      mode === "advantage"
        ? term.rolls.map((r, i) => Math.max(r, second[i]))
        : term.rolls.map((r, i) => Math.min(r, second[i]));
    advInfo = { first: [...term.rolls], second, kept: [...kept] };
    term.rolls = kept;
    const nat = kept[0];
    if (nat === 20) crit = "hit";
    else if (nat === 1) crit = "fail";
  } else if (d20Index !== -1) {
    const nat = tokens[d20Index].rolls[0];
    if (nat === 20) crit = "hit";
    else if (nat === 1) crit = "fail";
  }

  const total = tokens.reduce((sum, t) => {
    if (t.flat !== undefined) return sum + t.sign * t.flat;
    return sum + t.sign * t.rolls.reduce((a, b) => a + b, 0);
  }, 0);

  return new DiceRollResult({ formula, total, tokens, crit, mode, advInfo });
}

// ---------- Adapters ----------
export class TextDiceAdapter {
  supports() {
    return true; // always available
  }
  async roll(formula, mode) {
    return parseAndRoll(formula, mode);
  }
}

// Stub for a future 3D dice API (dice+, Owlbear built-in dice, etc.).
// To enable: implement roll() to call the external API and return a
// DiceRollResult-shaped object, then return true from supports().
export class ExternalDiceAdapter {
  supports() {
    return false; // set to true once a 3D dice API is wired in
  }
  async roll(/* formula, mode */) {
    throw new Error("ExternalDiceAdapter is not implemented yet");
  }
}

export class DiceEngine {
  constructor(adapters) {
    this.adapters = adapters || [];
  }
  async roll(formula, mode = "normal") {
    for (const adapter of this.adapters) {
      if (adapter.supports()) return adapter.roll(formula, mode);
    }
    throw new Error("No dice adapter available");
  }
}

// Singleton — external adapter registered first so it takes precedence when enabled.
export const diceEngine = new DiceEngine([new ExternalDiceAdapter(), new TextDiceAdapter()]);
