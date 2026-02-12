import type { ActResult } from "./helpers/core";

export function moveOnto(creep: Creep, pos: RoomPosition): ActResult {
  if (creep.pos.isEqualTo(pos)) return "done";
  const res = creep.moveTo(pos, { reusePath: 20 });
  if (res === OK || res === ERR_TIRED) return "not_in_range";
  return "blocked";
}
