import { findSourceStorageUnit } from "../behaviors/findSourceStorageUnit";
import { moveOnto } from "../behaviors/moveOnto";
import { harvestSource } from "../behaviors/harvestSource";
import { sayState } from "../../utils/sayState";
import { markRetire } from "../../utils/markRetire";
import { runRoleStateMachine } from "../../fsm/runRoleStateMachine";

const ICONS = {
  mining: "⛏️",
  moving: "➡️",
  noContainer: "⛔",
  noSourceId: "❓",
  badSource: "💀",
  idle: "😴",
};

type MinerState =
  | "missing_source_id"
  | "bad_source"
  | "missing_storage"
  | "move_to_storage"
  | "mine";

function isMinerState(value: unknown): value is MinerState {
  return (
    value === "missing_source_id" ||
    value === "bad_source" ||
    value === "missing_storage" ||
    value === "move_to_storage" ||
    value === "mine"
  );
}

function switchMinerState(creep: Creep): MinerState {
  const sourceId = creep.memory.sourceId as Id<Source> | undefined;
  if (!sourceId) return "missing_source_id";

  const source = Game.getObjectById(sourceId);
  if (!source) return "bad_source";

  const storageUnit = findSourceStorageUnit(source, creep);
  if (!storageUnit) return "missing_storage";

  if (creep.pos.isEqualTo(storageUnit.pos)) return "mine";
  return "move_to_storage";
}

function runMinerState(creep: Creep, state: MinerState): MinerState {
  if (state === "missing_source_id") return state;

  if (state === "bad_source") {
    markRetire(creep, "bad-source");
    return state;
  }

  const sourceId = creep.memory.sourceId as Id<Source> | undefined;
  if (!sourceId) return "missing_source_id";

  const source = Game.getObjectById(sourceId);
  if (!source) return "bad_source";

  const storageUnit = findSourceStorageUnit(source, creep);
  if (!storageUnit) return "missing_storage";

  if (state === "move_to_storage") {
    const moveRes = moveOnto(creep, storageUnit.pos);
    if (moveRes !== "done") return "move_to_storage";

    harvestSource(creep, source);
    return "mine";
  }

  harvestSource(creep, source);
  return "mine";
}

export function runMiner(creep: Creep): void {
  const state = runRoleStateMachine<MinerState, ReturnType<typeof runMinerState>>(
    creep,
    {
      memoryKey: "_state",
      isState: isMinerState,
      getInitialState: (c) => switchMinerState(c),
      switchState: (c) => switchMinerState(c),
      runState: runMinerState,
    },
  );

  if (state === "missing_source_id") {
    sayState(creep, ICONS.noSourceId);
    return;
  }
  if (state === "bad_source") {
    sayState(creep, ICONS.badSource);
    return;
  }
  if (state === "missing_storage") {
    sayState(creep, ICONS.noContainer);
    return;
  }
  if (state === "move_to_storage") {
    sayState(creep, ICONS.moving);
    return;
  }
  sayState(creep, ICONS.mining);
}
