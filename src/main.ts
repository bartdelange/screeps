import { cleanupCreepMemory } from "./utils/memory";
import { roleRunners } from "./roles";
import { RoleName } from "./config";
import { runInvalidCreep } from "./behaviors/invalid";
import { reportStatsEvery, updateTelemetry } from "./telemetry/stats";

import { runPlanManager } from "./spawning/planManager";
import { runSpawnManager } from "./spawning/spawnManager";
import { runRetireManager } from "./spawning/retireManager";
import { runRetire } from "./behaviors/retire";
import { runLinks } from "./links/linkManager";
import { runTowers } from "./towers/towerManager";

export const loop = (): void => {
  cleanupCreepMemory();

  runPlanManager();
  runRetireManager();
  runSpawnManager();

  updateTelemetry();
  reportStatsEvery(25);

  runLinks();
  runTowers();

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (runInvalidCreep(creep)) continue;
    if (runRetire(creep)) continue;

    const role = creep.memory.role as RoleName | undefined;
    const runner = role ? roleRunners[role] : undefined;
    if (runner) runner(creep);
  }
};
