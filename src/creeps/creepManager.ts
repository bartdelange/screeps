import { RoleName } from "../config";
import { runInvalidCreep } from "./behaviors/invalid";
import { runRetire } from "./behaviors/retire";
import { roleRunners } from "./roles";

export function runCreepManager(room: Room): void {
  const creeps = room.find(FIND_MY_CREEPS);

  for (const creep of creeps) {
    if (runInvalidCreep(creep)) continue;
    if (runRetire(creep)) continue;

    const role = creep.memory.role as RoleName | undefined;
    const runner = role ? roleRunners[role] : undefined;
    if (runner) runner(creep);
  }
}
