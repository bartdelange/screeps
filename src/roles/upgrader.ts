import { getEnergyForAction } from "../behaviors/getEnergyForAction";
import { runUpgradeWork } from "../behaviors/runUpgradeWork";
import { updateWorkingState } from "../behaviors/updateWorkingState";
import { sayState } from "../utils/sayState";

const ICONS: Record<string, string> = {
  withdraw: "📦",
  harvest: "⛏️",
  upgrade: "⚡",
  idle: "😴",
};

export function runUpgrader(creep: Creep): void {
  const phase = updateWorkingState(creep);
  const state =
    phase === "gather"
      ? getEnergyForAction(creep, {
          preferPos: creep.room.controller?.pos ?? creep.pos,
        })
      : runUpgradeWork(creep);

  sayState(creep, ICONS[state] ?? ICONS.idle);
}
