import { cleanupCreepMemory } from "./utils/memory";
import { reportStatsEvery, updateTelemetry } from "./telemetry/stats";

import { runPlanManager } from "./spawning/planManager";
import { runSpawnManager } from "./spawning/spawnManager";
import { runRetireManager } from "./spawning/retireManager";
import { runLinks } from "./links/linkManager";
import { runTowers } from "./towers/towerManager";
import { runCreepManager } from "./creeps/creepManager";
import { runIntelManager } from "./intel/intelManager";

function runRoom(room: Room): void {
  runIntelManager(room);
  runPlanManager(room);
  runRetireManager(room);
  runSpawnManager(room);
  runLinks(room);
  runTowers(room);
  runCreepManager(room);
}

export const loop = (): void => {
  cleanupCreepMemory();

  const rooms = Object.values(Game.rooms);
  for (const room of rooms) {
    runRoom(room);
  }

  updateTelemetry();
  reportStatsEvery(25);
};
