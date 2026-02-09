import { findSourceContainer } from "../behaviors/findSourceContainer";
import { moveOnto } from "../behaviors/moveOnto";
import { harvestSource } from "../behaviors/harvestSource";
import { sayState } from "../utils/sayState";
import { markRetire } from "../utils/markRetire";

const ICONS = {
  mining: "⛏️",
  moving: "➡️",
  noContainer: "⛔",
  noSourceId: "❓",
  badSource: "💀",
  idle: "😴",
};

export function runMiner(creep: Creep): void {
  const sourceId = creep.memory.sourceId as Id<Source> | undefined;
  if (!sourceId) {
    sayState(creep, ICONS.noSourceId);
    return;
  }

  const source = Game.getObjectById(sourceId);
  if (!source) {
    sayState(creep, ICONS.badSource);
    markRetire(creep, "bad-source");
    return;
  }

  const container = findSourceContainer(source, creep);
  if (!container) {
    sayState(creep, ICONS.noContainer);
    return;
  }

  const moveRes = moveOnto(creep, container.pos);
  if (moveRes !== "done") {
    sayState(creep, ICONS.moving);
    return;
  }

  sayState(creep, ICONS.mining);
  harvestSource(creep, source);
}
