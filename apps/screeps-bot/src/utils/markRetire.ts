export type RetireReason =
  | "excess"
  | "request-mismatch"
  | "request-duplicate"
  | "planned-upgrade"
  | "invalid"
  | "bad-source"
  | "near-death";

export function markRetire(creep: Creep, reason: RetireReason): void {
  if (creep.memory.retire) return;
  console.log(`Creep ${creep.name} retiring: ${reason}`);

  creep.memory.retire = true;
  creep.memory.retireReason = reason;
  creep.memory.retireMarkedAt = Game.time;
}
