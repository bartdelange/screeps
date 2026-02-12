import { findEnergyDepositTarget } from "../behaviors/policies/energyDepositPolicy";
import { getEnergyForRole } from "../behaviors/getEnergyForRole";
import { runDeliverEnergyWithCache } from "../behaviors/runDeliverEnergyWithCache";
import { sayState } from "../../utils/sayState";
import { runRoleStateMachine } from "../../fsm/runRoleStateMachine";

const ICONS: Record<string, string> = {
  withdraw: "📦",
  deliver: "🚚",
  idle: "😴",
};

type MoverState = "gather" | "deliver";

function isMoverState(value: unknown): value is MoverState {
  return value === "gather" || value === "deliver";
}

function switchMoverState(creep: Creep, current: MoverState): MoverState {
  if (current === "deliver" && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
    delete creep.memory._dId;
    return "gather";
  }

  if (current === "gather" && creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
    delete creep.memory._wId;
    return "deliver";
  }

  creep.memory.working = current === "deliver";
  return current;
}

function runMoverState(
  creep: Creep,
  state: MoverState,
): "withdraw" | "deliver" | "harvest" | "idle" {
  if (state === "deliver" && creep.memory._dId) {
    const bestNow =
      findEnergyDepositTarget(creep, { excludeTypes: [STRUCTURE_STORAGE] }) ??
      findEnergyDepositTarget(creep);
    const cached = Game.getObjectById(creep.memory._dId);
    if (
      cached &&
      cached.structureType === STRUCTURE_STORAGE &&
      bestNow &&
      bestNow.structureType !== STRUCTURE_STORAGE
    ) {
      delete creep.memory._dId;
    }
  }

  if (state === "gather") {
    return getEnergyForRole(creep, {
      move: { reusePath: 20, maxRooms: 1 },
    });
  }

  return runDeliverEnergyWithCache(creep, {
    cache: {
      getId: (mem) => mem._dId,
      setId: (mem, id) => {
        mem._dId = id;
      },
      clearId: (mem) => {
        delete mem._dId;
      },
    },
    findTarget: (c) => {
      return (
        findEnergyDepositTarget(c, { excludeTypes: [STRUCTURE_STORAGE] }) ??
        findEnergyDepositTarget(c)
      );
    },
    move: { reusePath: 20, maxRooms: 1 },
    resource: RESOURCE_ENERGY,
  });
}

export function runMover(creep: Creep): void {
  const state = runRoleStateMachine<MoverState, ReturnType<typeof runMoverState>>(
    creep,
    {
      memoryKey: "_state",
      isState: isMoverState,
      getInitialState: (c) =>
        c.store.getFreeCapacity() === 0 ? "deliver" : "gather",
      switchState: switchMoverState,
      runState: runMoverState,
    },
  );

  sayState(creep, ICONS[state] ?? ICONS.idle);
}
