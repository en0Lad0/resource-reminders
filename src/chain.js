// Chain Action (combo) system with anti-loop protection.
// MAX_DEPTH = 5: if a chain of prompts runs deeper than 5, force-stop and log.
// Cycle detection: if we revisit a skill id already in the chain, force-stop.

export const MAX_CHAIN_DEPTH = 5;

let chainDepth = 0;
let chainVisited = [];

export function resetChain() {
  chainDepth = 0;
  chainVisited = [];
}

// Returns the next skill to prompt for, or null if chain should stop.
// onWarn is called with a message when anti-loop protection triggers.
export function nextChainTarget(usedSkill, allSkills, onWarn) {
  if (!usedSkill || !usedSkill.chainTrigger) return null;
  if (chainDepth >= MAX_CHAIN_DEPTH) {
    onWarn?.(`Chain stopped: reached max depth ${MAX_CHAIN_DEPTH} (anti-loop protection).`);
    resetChain();
    return null;
  }
  if (chainVisited.includes(usedSkill.chainTrigger)) {
    onWarn?.(`Chain stopped: cycle detected (${usedSkill.chainTrigger} already visited).`);
    resetChain();
    return null;
  }
  const target = allSkills.find((s) => s.id === usedSkill.chainTrigger);
  if (!target) return null;
  chainVisited.push(usedSkill.id);
  chainDepth += 1;
  return target;
}

export function getChainDepth() {
  return chainDepth;
}
