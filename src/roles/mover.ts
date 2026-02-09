import { findBestEnergyDepositTarget } from "../behaviors/findBestEnergyDepositTarget";
import { findEnergyWithdrawTarget } from "../behaviors/findEnergyWithdrawTarget";
import { runAcquireEnergyWithCache } from "../behaviors/runAcquireEnergyWithCache";
import { runDeliverEnergyWithCache } from "../behaviors/runDeliverEnergyWithCache";
import { updateWorkingState } from "../behaviors/updateWorkingState";
import { sayState } from "../utils/sayState";

const ICONS: Record<string, string> = {
  withdraw: "📦",
  deliver: "🚚",
  idle: "😴",
};

export function runMover(creep: Creep): void {
  const phase = updateWorkingState(creep, {
    onStartWorking: () => {
      delete creep.memory._wId;
    },
    onStopWorking: () => {
      delete creep.memory._dId;
    },
  });

  const state =
    phase === "gather"
      ? runAcquireEnergyWithCache(creep, {
          cache: {
            getId: (mem) => mem._wId as Id<_HasId> | undefined,
            setId: (mem, id) => {
              mem._wId = id;
            },
            clearId: (mem) => {
              delete mem._wId;
            },
          },
          findTarget: findEnergyWithdrawTarget,
          move: { reusePath: 20, maxRooms: 1 },
        }) === "acquire"
        ? "withdraw"
        : "idle"
      : runDeliverEnergyWithCache(creep, {
          cache: {
            getId: (mem) => mem._dId,
            setId: (mem, id) => {
              mem._dId = id;
            },
            clearId: (mem) => {
              delete mem._dId;
            },
          },
          findTarget: findBestEnergyDepositTarget,
          move: { reusePath: 20, maxRooms: 1 },
          resource: RESOURCE_ENERGY,
        });
  sayState(creep, ICONS[state] ?? ICONS.idle);
}
