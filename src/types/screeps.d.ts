import type { RoleName } from "../config";
import type { RoomPlan } from "../spawning/roomPlanner";

type StatsSnapshot = {
  t: number;
  cpu: { used: number; limit: number; bucket: number };
  scouting: {
    enabled: boolean;
    totalScouts: number;
    readyOwnedRooms: number;
    totalOwnedRooms: number;
    totalTargets: number;
    totalQueuedTargets: number;
    blockers: Record<string, number>;
  };
  intel: {
    knownRooms: number;
    knownDangerRooms: number;
    staleRooms: number;
    rooms: Array<{
      name: string;
      age: number;
      owner?: string;
      reserver?: string;
      hostileCreeps: number;
      hostileStructures: number;
      dangerFor: number;
      sources?: number;
      mineral?: MineralConstant;
    }>;
  };
  rooms: Array<{
    name: string;
    energy: { available: number; capacity: number };
    rcl: {
      level: number | null;
      progress: number | null;
      progressTotal: number | null;
      pct: number | null;
    };
    spawns: Array<{
      name: string;
      state: "spawning" | "idle";
      spawning?: { name: string; remainingTime: number };
      next?: string | null;
    }>;
    roles: Partial<Record<RoleName, { current: number; target: number }>>;
    plan: {
      spawn: null | {
        kind: "request" | "role";
        role: RoleName;
        keySuffix?: string;
        requiredEnergy?: number;
        blockedByEnergy?: boolean;
        reason?: string;
      };
      upgrade: null | {
        retireCreepName: string;
        requiredEnergy?: number;
        blockedByEnergy?: boolean;
      };
    };
    upgrades: {
      candidates: Partial<Record<RoleName, number>>;
    };
  }>;
};

type IntelRoomMemory = {
  lastSeen: number;
  owner?: string;
  reserver?: string;
  hostileCreeps: number;
  hostileStructures: number;
  dangerUntil: number;
  staticSeen?: number;
  sources?: number;
  mineral?: MineralConstant;
  controllerId?: string;
};

type IntelMemory = {
  rooms: Record<string, IntelRoomMemory>;
  scoutQueues: Record<string, string[]>;
};

declare global {
  interface CreepMemory {
    role?: RoleName;
    working?: boolean;
    spawnCost?: number;

    retire?: boolean;
    retireReason?: string;
    retireMarkedAt?: number;

    sourceId?: Id<Source>;
    moverSourceId?: Id<Source>;
    moverRequestKey?: string;
    buildTargetId?: Id<ConstructionSite>;

    _wId?: Id<_HasId>;
    _dId?: Id<AnyStoreStructure>;
    _state?: string;
    _lp?: string;
    _stuck?: number;
    _lastState?: string;

    homeRoom?: string;
    scoutQueue?: string[];
    scoutTarget?: string;
    scoutRequestKey?: string;
  }

  interface RoomMemory {
    _plan?: RoomPlan;
  }

  interface Memory {
    stats?: StatsSnapshot;
    enableScouting?: boolean;
    intel?: IntelMemory;
  }
}

export {};
