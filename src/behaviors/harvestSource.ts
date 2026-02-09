import type { ActResult } from "./helpers/core";
import { getReservedSourceIds } from "../utils/reservedSources";

export function harvestSource(creep: Creep, source: Source): ActResult {
  if (creep.memory.role !== "miner") {
    const reserved = getReservedSourceIds(creep.room);
    if (reserved.has(source.id)) return "blocked";
  }

  const res = creep.harvest(source);

  if (res === OK) return "done";

  if (res === ERR_NOT_IN_RANGE) {
    creep.moveTo(source, { reusePath: 20 });
    return "not_in_range";
  }

  return "blocked";
}
