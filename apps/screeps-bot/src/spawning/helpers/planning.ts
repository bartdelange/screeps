export function isPlanningActive(creep: Creep): boolean {
  if (!creep.memory.retire) return true;
  return creep.memory.retireReason === "near-death";
}
