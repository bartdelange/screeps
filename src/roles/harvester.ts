import { findBestEnergyDepositTarget } from "../behaviors/policies/energyDepositPolicy";
import { harvestSource } from "../behaviors/harvestSource";
import { runUpgradeWork } from "../behaviors/runUpgradeWork";
import { transferEnergy } from "../behaviors/transferEnergy";
import { sayState } from "../utils/sayState";

const ICONS: Record<string, string> = {
  harvest: "⛏️",
  deliver: "🚚",
  upgrade: "⚡",
  idle: "😴",
};

export function runHarvester(creep: Creep): void {
  if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    const state: "harvest" | "idle" = source ? "harvest" : "idle";
    if (source) harvestSource(creep, source);
    sayState(creep, ICONS[state] ?? ICONS.idle);
    return;
  }

  const target = findBestEnergyDepositTarget(creep);
  const deliverState: "deliver" | "idle" = target ? "deliver" : "idle";
  if (target) transferEnergy(creep, target);
  if (deliverState === "deliver") {
    sayState(creep, ICONS.deliver);
    return;
  }

  const fallback = runUpgradeWork(creep);
  sayState(creep, ICONS[fallback] ?? ICONS.idle);
}
