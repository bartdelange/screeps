import {
  getEnergyForAction,
  type GetEnergyResult,
} from "./helpers/getEnergyForAction";
import { runAcquireEnergyWithCache } from "./helpers/runAcquireEnergyWithCache";
import { findEnergyWithdrawTarget } from "./policies/energyAcquirePolicy";
import { findEnergyDepositTarget } from "./policies/energyDepositPolicy";
import { getEnergyAcquirePolicyForRole } from "./policies/roleEnergyPolicy";
import { findSourceStorageUnit } from "./findSourceStorageUnit";
import { getSourcesWithContainer } from "../utils/containersReady";
import { getRoomCreeps } from "../utils/roomCreeps";

type GetEnergyForRoleOpts = {
  preferPos?: RoomPosition;
  move?: MoveToOpts;
};

export function getEnergyForRole(
  creep: Creep,
  opts: GetEnergyForRoleOpts = {},
): GetEnergyResult {
  if (creep.memory.role === "mover") {
    const demandTarget = findEnergyDepositTarget(creep);
    if (!demandTarget) {
      delete creep.memory._wId;
      return "idle";
    }

    const state = runAcquireEnergyWithCache(creep, {
      cache: {
        getId: (mem) => mem._wId as Id<_HasId> | undefined,
        setId: (mem, id) => {
          mem._wId = id;
        },
        clearId: (mem) => {
          delete mem._wId;
        },
      },
      findTarget: (c) => {
        const sourcesWithContainer = getSourcesWithContainer(c.room);
        const sourceIdsInOrder = sourcesWithContainer.map((s) => s.id);
        const activeMinerSourceIds = new Set(
          getRoomCreeps(c.room, {
            role: "miner",
            includeRetiring: false,
            predicate: (m) => typeof m.memory.sourceId === "string",
          }).map((m) => m.memory.sourceId as Id<Source>),
        );
        const preferredSourceId = c.memory.moverSourceId as Id<Source> | undefined;

        const getSourceStorage = (sourceId: Id<Source> | undefined) => {
          if (!sourceId) return null;
          const source = Game.getObjectById(sourceId);
          if (!source) return null;
          return findSourceStorageUnit(source, c);
        };

        const trySourceId = (
          sourceId: Id<Source> | undefined,
        ): { sourceId: Id<Source>; target: StructureContainer | StructureLink } | null => {
          const storage = getSourceStorage(sourceId);
          if (!storage) return null;
          if (storage.store.getUsedCapacity(RESOURCE_ENERGY) <= 0) return null;
          return { sourceId: sourceId as Id<Source>, target: storage };
        };

        const preferred = trySourceId(preferredSourceId);
        if (preferred) return preferred.target;

        // Preferred pipeline is dry. If we're already at its storage and miner is active, wait.
        if (preferredSourceId && activeMinerSourceIds.has(preferredSourceId)) {
          const preferredStorage = getSourceStorage(preferredSourceId);
          if (preferredStorage && c.pos.getRangeTo(preferredStorage.pos) <= 1) {
            return null;
          }
        }

        const fallbackActive = sourceIdsInOrder
          .filter((id) => id !== preferredSourceId)
          .filter((id) => activeMinerSourceIds.has(id))
          .map((id) => trySourceId(id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .sort((a, b) => c.pos.getRangeTo(a.target.pos) - c.pos.getRangeTo(b.target.pos))[0];
        if (fallbackActive) return fallbackActive.target;

        const fallbackAny = sourceIdsInOrder
          .filter((id) => id !== preferredSourceId)
          .map((id) => trySourceId(id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .sort((a, b) => c.pos.getRangeTo(a.target.pos) - c.pos.getRangeTo(b.target.pos))[0];
        if (fallbackAny) return fallbackAny.target;

        return findEnergyWithdrawTarget(
          c,
          getEnergyAcquirePolicyForRole(c).withdrawPolicy,
        );
      },
      move: opts.move,
    });
    return state === "acquire" ? "withdraw" : "idle";
  }

  return getEnergyForAction(creep, {
    preferPos: opts.preferPos ?? creep.pos,
  });
}
