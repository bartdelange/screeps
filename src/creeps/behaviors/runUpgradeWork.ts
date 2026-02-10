import { actAtRange } from "./actAtRange";

export type UpgradeWorkState = "upgrade" | "idle";

type RunUpgradeWorkOpts = {
  controller?: StructureController | null;
  move?: MoveToOpts;
};

export function runUpgradeWork(
  creep: Creep,
  opts?: RunUpgradeWorkOpts,
): UpgradeWorkState {
  const controller = opts?.controller ?? creep.room.controller;
  if (!controller) return "idle";

  actAtRange(creep, controller, () => creep.upgradeController(controller), {
    move: opts?.move,
  });
  return "upgrade";
}
