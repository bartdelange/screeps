import { basePriority } from "./behaviors/policies/constructionSitePolicy";
import { containersReady } from "./utils/containersReady";
import { repairsNeeded } from "./utils/repairsNeeded";

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

export const ROLE_CONFIG: Record<RoleName, RoleSpec> = {
  harvester: {
    minEnergy: 200,
    makeBody: () => {
      return [WORK, CARRY, MOVE];
    },
    memory: (role) => ({ role, working: false, retire: false }),
    spawn: {
      desired: (room) => {
        const miners = Object.values(Game.creeps).filter(
          (c) =>
            c.room.name === room.name &&
            c.memory.role === "miner" &&
            !c.memory.retire,
        ).length;

        const sources = room.find(FIND_SOURCES);
        const containersReady = sources.every(
          (s) =>
            s.pos.findInRange(FIND_STRUCTURES, 1, {
              filter: (st) => st.structureType === STRUCTURE_CONTAINER,
            }).length > 0,
        );

        if (!containersReady || miners === 0) return 2;

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

        if (ctrl.level >= 6) return 2;

        const sites = room.find(FIND_CONSTRUCTION_SITES).length;
        const hasUrgentWork =
          sites > 0 ||
          repairsNeeded(room, {
            containerBelow: 0.9,
            roadBelow: 0.4,
            minMissingHits: 5000,
            minTargets: 1,
          });

        const cap = room.energyCapacityAvailable;

        if (hasUrgentWork) {
          if (cap >= 800) return 3;
          if (cap >= 550) return 2;
          return 1;
        }

        if (cap >= 800) return 6;
        if (cap >= 550) return 4;
        return 3;
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
      desired: (room) => {
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

        if (valuableSites > 10) return 6;
        if (valuableSites > 5) return 4;
        if (valuableSites > 0) return 2;
        if (needsContainers) return 1;
        if (needsRepairs) return 1;
        return 0;
      },
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
        const sources = room.find(FIND_SOURCES);
        const eligible = sources.filter((s) => {
          const c = s.pos.findInRange(FIND_STRUCTURES, 1, {
            filter: (st) => st.structureType === STRUCTURE_CONTAINER,
          })[0];
          return !!c;
        });

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
      desired: (room) => {
        const sourcesWithContainer = room.find(FIND_SOURCES).filter((s) => {
          const hasContainer =
            s.pos.findInRange(FIND_STRUCTURES, 1, {
              filter: (st) => st.structureType === STRUCTURE_CONTAINER,
            }).length > 0;
          return hasContainer;
        });

        if (sourcesWithContainer.length === 0) return 0;

        const activeMiners = Object.values(Game.creeps).filter(
          (c) =>
            c.room.name === room.name &&
            c.memory.role === "miner" &&
            !c.memory.retire &&
            typeof c.memory.sourceId === "string",
        );

        const activeMinerSourceIds = new Set(
          activeMiners.map((m) => m.memory.sourceId),
        );
        const activePipelines = sourcesWithContainer.filter((s) =>
          activeMinerSourceIds.has(s.id),
        ).length;

        if (activePipelines === 0) return 0;

        const maxMovers = (room.controller?.level ?? 1) >= 3 ? 2 : 1;
        return Math.min(maxMovers, activePipelines);
      },
    },
  },
};
