import type { ActResult } from "./helpers/types";

type ActionTarget = {
  pos: RoomPosition;
};

type ActAtRangeOpts = {
  move?: MoveToOpts;
};

export function actAtRange(
  creep: Creep,
  target: ActionTarget,
  act: () => ScreepsReturnCode,
  opts?: ActAtRangeOpts,
): ActResult {
  const res = act();

  if (res === OK) return "done";

  if (res === ERR_NOT_IN_RANGE) {
    creep.moveTo(target, opts?.move ?? { reusePath: 20 });
    return "not_in_range";
  }

  return "blocked";
}
