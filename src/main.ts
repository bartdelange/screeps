import { cleanupCreepMemory } from './utils/memory';
import { refreshStatsLatestEvery } from './telemetry/statsLatest';

import { runPlanManager } from './spawning/planManager';
import { runSpawnManager } from './spawning/spawnManager';
import { runRetireManager } from './spawning/retireManager';
import { runLinks } from './links/linkManager';
import { runTowers } from './towers/towerManager';
import { runCreepManager } from './creeps/creepManager';
import { runIntelManager } from './intel/intelManager';

function runRoom(room: Room): void {
  runIntelManager(room);
  runPlanManager(room);
  runRetireManager(room);
  runSpawnManager(room);
  runLinks(room);
  runTowers(room);
  runCreepManager(room);
}

const BOOT_START = Date.now();
console.log(`[boot] start t=${Game.time}`);
(globalThis as any).__bootStart = BOOT_START;

export const loop = (): void => {
  cleanupCreepMemory();

  const rooms = Object.values(Game.rooms);
  for (const room of rooms) {
    runRoom(room);
  }

  refreshStatsLatestEvery(25);

  if ((globalThis as any).__bootStart) {
    const ms = Date.now() - (globalThis as any).__bootStart;
    console.log(`[boot] finished in ${ms}ms at t=${Game.time}`);
    delete (globalThis as any).__bootStart;
  }
};
