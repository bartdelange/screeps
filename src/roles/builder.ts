import { actAtRange } from "../behaviors/actAtRange";
import { findBestConstructionSite } from "../behaviors/findBestConstructionSite";
import { getEnergyForAction } from "../behaviors/getEnergyForAction";
import { runUpgradeWork } from "../behaviors/runUpgradeWork";
import { updateWorkingState } from "../behaviors/updateWorkingState";
import { sayState } from "../utils/sayState";

const ICONS: Record<string, string> = {
  withdraw: "📦",
  harvest: "⛏️",
  build: "🏗️",
  repair: "🛠️",
  upgrade: "⚡",
  idle: "😴",
};

function findDamagedContainer(creep: Creep): StructureContainer | null {
  return creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s): s is StructureContainer =>
      s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax * 0.9,
  });
}

function findDamagedRoad(creep: Creep): StructureRoad | null {
  return creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s): s is StructureRoad =>
      s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax * 0.4,
  });
}

function findSite(creep: Creep): ConstructionSite | null {
  return findBestConstructionSite(creep, {
    preferJoinWithin: 20,
    desiredMaxJoiners: 2,
  });
}

function getBuilderPreferPos(creep: Creep): RoomPosition {
  const container = findDamagedContainer(creep);
  if (container) return container.pos;

  const road = findDamagedRoad(creep);
  if (road) return road.pos;

  const site = findSite(creep);
  if (site) return site.pos;

  return creep.room.controller?.pos ?? creep.pos;
}

function runBuilderWork(creep: Creep): "repair" | "build" | "upgrade" | "idle" {
  const container = findDamagedContainer(creep);
  if (container) {
    actAtRange(creep, container, () => creep.repair(container), {
      move: { reusePath: 25 },
    });
    return "repair";
  }

  const road = findDamagedRoad(creep);
  if (road) {
    actAtRange(creep, road, () => creep.repair(road), {
      move: { reusePath: 25 },
    });
    return "repair";
  }

  const site = findSite(creep);
  if (site) {
    actAtRange(creep, site, () => creep.build(site), {
      move: { reusePath: 25 },
    });
    return "build";
  }

  return runUpgradeWork(creep);
}

export function runBuilder(creep: Creep): void {
  const phase = updateWorkingState(creep);
  const state =
    phase === "gather"
      ? getEnergyForAction(creep, { preferPos: getBuilderPreferPos(creep) })
      : runBuilderWork(creep);

  sayState(creep, ICONS[state] ?? ICONS.idle);
}
