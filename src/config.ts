import { basePriority } from "./creeps/behaviors/policies/constructionSitePolicy";
import {
  containersReady,
  getSourcesWithContainer,
} from "./utils/containersReady";
import { repairsNeeded } from "./utils/repairsNeeded";
import { getRoomCreeps } from "./utils/roomCreeps";

export const ROLE_PRIORITY = [
  "harvester",
  "miner",
  "mover",
  "builder",
  "upgrader",
] as const;
export type RoleName = (typeof ROLE_PRIORITY)[number];

export type SpawnPlan = {
  desired: (room: Room) => number;
  requests?: (room: Room) => Array<{
    key: string;
    memory: Partial<CreepMemory>;
    nameHint?: string;
  }>;
};

export type RoleSpec = {
  minEnergy: number;
  makeBody: (opts: {
    available: number;
    capacity: number;
    room: Room;
  }) => BodyPartConstant[];

  memory?: (role: RoleName) => CreepMemory;

  spawn: SpawnPlan;
};

function getBuilderUpgraderTargets(room: Room): {
  builder: number;
  upgrader: number;
} {
  const cap = room.energyCapacityAvailable;
  const valuableSites = room
    .find(FIND_CONSTRUCTION_SITES)
    .filter((site) => basePriority(site) >= 250).length;
  const needsContainers = !containersReady(room);
  const needsRepairs = repairsNeeded(room, {
    containerBelow: 0.9,
    roadBelow: 0.4,
    minMissingHits: 5000,
    minTargets: 1,
  });

  type WorkTier = "none" | "light" | "medium" | "high";
  const workTier: WorkTier =
    valuableSites > 10
      ? "high"
      : valuableSites > 5
        ? "medium"
        : valuableSites > 0 || needsContainers || needsRepairs
          ? "light"
          : "none";

  if (cap >= 800) {
    if (workTier === "high") return { builder: 5, upgrader: 1 };
    if (workTier === "medium") return { builder: 4, upgrader: 2 };
    if (workTier === "light") return { builder: 3, upgrader: 3 };
    return { builder: 1, upgrader: 6 };
  }

  if (cap >= 550) {
    if (workTier === "high") return { builder: 4, upgrader: 1 };
    if (workTier === "medium") return { builder: 3, upgrader: 2 };
    if (workTier === "light") return { builder: 2, upgrader: 2 };
    return { builder: 1, upgrader: 4 };
  }

  if (workTier === "high") return { builder: 3, upgrader: 1 };
  if (workTier === "medium") return { builder: 2, upgrader: 1 };
  if (workTier === "light") return { builder: 2, upgrader: 1 };
  return { builder: 1, upgrader: 3 };
}

export const ROLE_CONFIG: Record<RoleName, RoleSpec> = {
  harvester: {
    minEnergy: 200,
    makeBody: () => {
      return [WORK, CARRY, MOVE];
    },
    memory: (role) => ({ role, working: false, retire: false }),
    spawn: {
      desired: (room) => {
        const miners = getRoomCreeps(room, {
          role: "miner",
          includeRetiring: false,
        }).length;
        const roomContainersReady = containersReady(room);

        if (!roomContainersReady || miners === 0) return 2;

        return 0;
      },
    },
  },

  upgrader: {
    minEnergy: 200,
    makeBody: ({ available, capacity }) => {
      const energy = Math.min(available, capacity);

      if (energy >= 800)
        return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];

      if (energy >= 550) return [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
      if (energy >= 400) return [WORK, WORK, CARRY, MOVE];
      return [WORK, CARRY, MOVE];
    },
    memory: (role) => ({ role, working: false, retire: false }),
    spawn: {
      desired: (room) => {
        const ctrl = room.controller;
        if (!ctrl) return 0;
        return getBuilderUpgraderTargets(room).upgrader;
      },
    },
  },

  builder: {
    minEnergy: 200,
    makeBody: ({ available, capacity }) => {
      const energy = Math.min(available, capacity);

      if (energy >= 800)
        return [
          WORK,
          WORK,
          WORK,
          WORK,
          WORK,
          CARRY,
          CARRY,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
        ];

      if (energy >= 550)
        return [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
      if (energy >= 450) return [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
      if (energy >= 300) return [WORK, WORK, CARRY, MOVE];
      return [WORK, CARRY, MOVE];
    },
    memory: (role) => ({ role, working: false, retire: false }),
    spawn: {
      desired: (room) => getBuilderUpgraderTargets(room).builder,
    },
  },

  miner: {
    minEnergy: 300,
    makeBody: ({ available, capacity }) => {
      const energy = Math.min(available, capacity);
      if (energy >= 600) return [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE];
      if (energy >= 550) return [WORK, WORK, WORK, WORK, WORK, MOVE];
      if (energy >= 400) return [WORK, WORK, WORK, MOVE];
      return [WORK, WORK, MOVE];
    },
    memory: (role) => ({ role, working: false, retire: false }),
    spawn: {
      desired: (_room) => 0,

      requests: (room) => {
        const eligible = getSourcesWithContainer(room);

        return eligible.map((s, i) => ({
          key: s.id,
          nameHint: `src${i}`,
          memory: { sourceId: s.id },
        }));
      },
    },
  },

  mover: {
    minEnergy: 250,

    makeBody: ({ available, capacity }) => {
      const energy = Math.min(available, capacity);

      if (energy >= 800)
        return [
          CARRY,
          CARRY,
          CARRY,
          CARRY,
          CARRY,
          CARRY,
          CARRY,
          CARRY,
          CARRY,
          CARRY,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
          MOVE,
        ];

      if (energy >= 500)
        return [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
      if (energy >= 450)
        return [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
      if (energy >= 300) return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
      return [CARRY, CARRY, MOVE];
    },
    memory: (role) => ({ role, working: false, retire: false }),
    spawn: {
      desired: (_room) => 0,
      requests: (room) => {
        const sourcesWithContainer = getSourcesWithContainer(room);
        if (sourcesWithContainer.length === 0) return [];

        const maxMovers = (room.controller?.level ?? 1) >= 3 ? 2 : 1;
        const desiredMovers = Math.min(maxMovers, sourcesWithContainer.length);

        return sourcesWithContainer.slice(0, desiredMovers).map((s, i) => ({
          key: s.id,
          nameHint: `src${i}`,
          memory: {
            moverSourceId: s.id,
            moverRequestKey: s.id,
          },
        }));
      },
    },
  },
};
