import { actAtRange } from "../behaviors/actAtRange";
import { findBestConstructionSite } from "../behaviors/findBestConstructionSite";
import { getEnergyForRole } from "../behaviors/getEnergyForRole";
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

type BuilderTask =
  | { kind: "repair"; target: StructureContainer | StructureRoad }
  | { kind: "build"; target: ConstructionSite }
  | { kind: "upgrade"; target: StructureController }
  | { kind: "idle" };

function selectBuilderTask(creep: Creep): BuilderTask {
  const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s): s is StructureContainer =>
      s.structureType === STRUCTURE_CONTAINER && s.hits < s.hitsMax * 0.9,
  });
  if (container) return { kind: "repair", target: container };

  const road = creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: (s): s is StructureRoad =>
      s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax * 0.4,
  });
  if (road) return { kind: "repair", target: road };

  const site = findBestConstructionSite(creep, {
    preferJoinWithin: 20,
    desiredMaxJoiners: 2,
  });
  if (site) return { kind: "build", target: site };

  const controller = creep.room.controller;
  if (controller) return { kind: "upgrade", target: controller };

  return { kind: "idle" };
}

function getBuilderPreferPos(task: BuilderTask, creep: Creep): RoomPosition {
  if (task.kind === "idle") return creep.pos;
  return task.target.pos;
}

function runBuilderWork(
  creep: Creep,
  task: BuilderTask,
): "repair" | "build" | "upgrade" | "idle" {
  if (task.kind === "repair") {
    const structure = task.target;
    actAtRange(creep, structure, () => creep.repair(structure), {
      move: { reusePath: 25 },
    });
    return "repair";
  }

  if (task.kind === "build") {
    const site = task.target;
    actAtRange(creep, site, () => creep.build(site), {
      move: { reusePath: 25 },
    });
    return "build";
  }

  if (task.kind === "upgrade") {
    return runUpgradeWork(creep, { controller: task.target });
  }

  return "idle";
}

export function runBuilder(creep: Creep): void {
  const phase = updateWorkingState(creep);
  const task = selectBuilderTask(creep);
  const state =
    phase === "gather"
      ? getEnergyForRole(creep, { preferPos: getBuilderPreferPos(task, creep) })
      : runBuilderWork(creep, task);

  sayState(creep, ICONS[state] ?? ICONS.idle);
}
