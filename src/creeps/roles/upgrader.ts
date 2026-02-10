import { getEnergyForRole } from "../behaviors/getEnergyForRole";
import { runUpgradeWork } from "../behaviors/runUpgradeWork";
import { sayState } from "../../utils/sayState";
import { runRoleStateMachine } from "../../fsm/runRoleStateMachine";

const ICONS: Record<string, string> = {
  withdraw: "📦",
  harvest: "⛏️",
  upgrade: "⚡",
  idle: "😴",
};

type UpgraderState = "gather" | "work";

function isUpgraderState(value: unknown): value is UpgraderState {
  return value === "gather" || value === "work";
}

function switchUpgraderState(creep: Creep, current: UpgraderState): UpgraderState {
  if (current === "work" && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
    return "gather";
  }

  if (current === "gather" && creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
    return "work";
  }

  creep.memory.working = current === "work";
  return current;
}

function runUpgraderState(
  creep: Creep,
  state: UpgraderState,
): "withdraw" | "harvest" | "upgrade" | "idle" {
  if (state === "gather") {
    return getEnergyForRole(creep, {
      preferPos: creep.room.controller?.pos ?? creep.pos,
    });
  }

  return runUpgradeWork(creep);
}

export function runUpgrader(creep: Creep): void {
  const state = runRoleStateMachine<UpgraderState, ReturnType<typeof runUpgraderState>>(
    creep,
    {
      memoryKey: "_state",
      isState: isUpgraderState,
      getInitialState: (c) =>
        c.store.getFreeCapacity() === 0 ? "work" : "gather",
      switchState: switchUpgraderState,
      runState: runUpgraderState,
    },
  );

  sayState(creep, ICONS[state] ?? ICONS.idle);
}
