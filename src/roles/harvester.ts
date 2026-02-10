import { findEnergyDepositTarget } from "../behaviors/policies/energyDepositPolicy";
import { harvestSource } from "../behaviors/harvestSource";
import { runUpgradeWork } from "../behaviors/runUpgradeWork";
import { transferEnergy } from "../behaviors/transferEnergy";
import { sayState } from "../utils/sayState";
import { runRoleStateMachine } from "../fsm/runRoleStateMachine";

const ICONS: Record<string, string> = {
  harvest: "⛏️",
  deliver: "🚚",
  upgrade: "⚡",
  idle: "😴",
};

type HarvesterState = "harvest" | "deliver" | "upgrade" | "idle";

function isHarvesterState(value: unknown): value is HarvesterState {
  return (
    value === "harvest" ||
    value === "deliver" ||
    value === "upgrade" ||
    value === "idle"
  );
}

function switchHarvesterState(creep: Creep): HarvesterState {
  if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) return "harvest";

  if (findEnergyDepositTarget(creep)) return "deliver";
  if (creep.room.controller) return "upgrade";
  return "idle";
}

function runHarvesterState(
  creep: Creep,
  state: HarvesterState,
): HarvesterState {
  if (state === "harvest") {
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (!source) return "idle";
    harvestSource(creep, source);
    return "harvest";
  }

  if (state === "deliver") {
    const target = findEnergyDepositTarget(creep);
    if (!target) return "idle";
    transferEnergy(creep, target);
    return "deliver";
  }

  if (state === "upgrade") {
    const result = runUpgradeWork(creep);
    return result === "upgrade" ? "upgrade" : "idle";
  }

  return "idle";
}

export function runHarvester(creep: Creep): void {
  const state = runRoleStateMachine<
    HarvesterState,
    ReturnType<typeof runHarvesterState>
  >(creep, {
    memoryKey: "_state",
    isState: isHarvesterState,
    getInitialState: (c) => switchHarvesterState(c),
    switchState: (c) => switchHarvesterState(c),
    runState: runHarvesterState,
  });

  sayState(creep, ICONS[state] ?? ICONS.idle);
}
