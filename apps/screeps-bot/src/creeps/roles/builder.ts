import { actAtRange } from "../behaviors/actAtRange";
import { findBestConstructionSite } from "../behaviors/findBestConstructionSite";
import { getEnergyForRole } from "../behaviors/getEnergyForRole";
import { runUpgradeWork } from "../behaviors/runUpgradeWork";
import { sayState } from "../../utils/sayState";
import { runRoleStateMachine } from "../../fsm/runRoleStateMachine";

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

type BuilderState = "gather" | "repair" | "build" | "upgrade" | "idle";

function isBuilderState(value: unknown): value is BuilderState {
  return (
    value === "gather" ||
    value === "repair" ||
    value === "build" ||
    value === "upgrade" ||
    value === "idle"
  );
}

function mapTaskToBuilderState(task: BuilderTask): Exclude<BuilderState, "gather"> {
  if (task.kind === "repair") return "repair";
  if (task.kind === "build") return "build";
  if (task.kind === "upgrade") return "upgrade";
  return "idle";
}

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

function switchBuilderState(creep: Creep, current: BuilderState): BuilderState {
  const used = creep.store.getUsedCapacity(RESOURCE_ENERGY);
  const free = creep.store.getFreeCapacity();

  if (current !== "gather" && used === 0) {
    creep.memory.working = false;
    return "gather";
  }

  if (current === "gather") {
    if (free === 0) {
      creep.memory.working = true;
      return mapTaskToBuilderState(selectBuilderTask(creep));
    }
    creep.memory.working = false;
    return "gather";
  }

  creep.memory.working = true;
  return mapTaskToBuilderState(selectBuilderTask(creep));
}

function runBuilderState(
  creep: Creep,
  state: BuilderState,
): "repair" | "build" | "upgrade" | "withdraw" | "harvest" | "idle" {
  if (state === "gather") {
    const task = selectBuilderTask(creep);
    return getEnergyForRole(creep, { preferPos: getBuilderPreferPos(task, creep) });
  }

  const task = selectBuilderTask(creep);
  return runBuilderWork(creep, task);
}

export function runBuilder(creep: Creep): void {
  const state = runRoleStateMachine<BuilderState, ReturnType<typeof runBuilderState>>(
    creep,
    {
      memoryKey: "_state",
      isState: isBuilderState,
      getInitialState: (c) => (c.store.getFreeCapacity() === 0 ? "idle" : "gather"),
      switchState: switchBuilderState,
      runState: runBuilderState,
    },
  );

  sayState(creep, ICONS[state] ?? ICONS.idle);
}
