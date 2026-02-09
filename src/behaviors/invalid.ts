import { isSupportedRole } from "src/utils/isSupportedRole";
import { markRetire } from "src/utils/markRetire";
import { runRetire } from "./retire";

export function runInvalidCreep(creep: Creep): boolean {
  const mem = creep.memory;

  if (!mem || !mem.role) {
    markRetire(creep, "invalid");
    return runRetire(creep);
  }

  if (!isSupportedRole(mem.role)) {
    markRetire(creep, "invalid");
    return runRetire(creep);
  }

  return false;
}
