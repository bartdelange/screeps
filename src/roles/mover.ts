import { findEnergyDepositTarget } from "../behaviors/policies/energyDepositPolicy";
import { getEnergyForRole } from "../behaviors/getEnergyForRole";
import { runDeliverEnergyWithCache } from "../behaviors/runDeliverEnergyWithCache";
import { updateWorkingState } from "../behaviors/updateWorkingState";
import { sayState } from "../utils/sayState";
import { getRoomCreeps } from "../utils/roomCreeps";
import { getSourcesWithContainer } from "../utils/containersReady";

const ICONS: Record<string, string> = {
  withdraw: "📦",
  deliver: "🚚",
  idle: "😴",
};

function getSlotIndexFromKey(key: string | undefined): number | null {
  if (!key) return null;

  if (key.startsWith("slot:")) {
    const n = Number(key.slice("slot:".length));
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }

  const splitAt = key.lastIndexOf(":");
  if (splitAt < 0) return null;
  const n = Number(key.slice(splitAt + 1));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function getMoverSlotIndex(creep: Creep): number {
  const fromKey = getSlotIndexFromKey(creep.memory.moverRequestKey);
  if (fromKey !== null) return fromKey;

  const activeMovers = getRoomCreeps(creep.room, {
    role: "mover",
    includeRetiring: false,
  })
    .filter((c) => !c.spawning)
    .sort((a, b) => a.name.localeCompare(b.name));

  const derived = activeMovers.findIndex((c) => c.name === creep.name);
  const slot = derived >= 0 ? derived : 0;

  creep.memory.moverRequestKey = `slot:${slot}`;
  return slot;
}

function getActiveMinerSourceIdsInSourceOrder(room: Room): Id<Source>[] {
  const sourcesWithContainer = getSourcesWithContainer(room);
  if (sourcesWithContainer.length === 0) return [];

  const activeMinerSourceIdSet = new Set(
    getRoomCreeps(room, {
      role: "miner",
      includeRetiring: false,
      predicate: (c) => typeof c.memory.sourceId === "string",
    }).map((c) => c.memory.sourceId as Id<Source>),
  );

  return sourcesWithContainer
    .map((s) => s.id)
    .filter((id) => activeMinerSourceIdSet.has(id));
}

function updateMoverBinding(creep: Creep): void {
  const sourcesWithContainer = getSourcesWithContainer(creep.room);
  if (sourcesWithContainer.length === 0) {
    delete creep.memory.moverSourceId;
    return;
  }

  const activeMinerSourceIds = getActiveMinerSourceIdsInSourceOrder(creep.room);
  const assignmentPool =
    activeMinerSourceIds.length > 0
      ? activeMinerSourceIds
      : sourcesWithContainer.map((s) => s.id);
  if (assignmentPool.length === 0) {
    delete creep.memory.moverSourceId;
    return;
  }

  const slotIndex = getMoverSlotIndex(creep);
  const targetSourceId = assignmentPool[slotIndex % assignmentPool.length];
  creep.memory.moverSourceId = targetSourceId;
}

export function runMover(creep: Creep): void {
  updateMoverBinding(creep);

  const phase = updateWorkingState(creep, {
    onStartWorking: () => {
      delete creep.memory._wId;
    },
    onStopWorking: () => {
      delete creep.memory._dId;
    },
  });

  if (phase === "work" && creep.memory._dId) {
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

  const state =
    phase === "gather"
      ? getEnergyForRole(creep, {
          move: { reusePath: 20, maxRooms: 1 },
        })
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
          findTarget: (c) => {
            return (
              findEnergyDepositTarget(c, { excludeTypes: [STRUCTURE_STORAGE] }) ??
              findEnergyDepositTarget(c)
            );
          },
          move: { reusePath: 20, maxRooms: 1 },
          resource: RESOURCE_ENERGY,
        });
  sayState(creep, ICONS[state] ?? ICONS.idle);
}
