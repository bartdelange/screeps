import type { RoleName } from "../config";
import type { RoomPlan } from "../spawning/roomPlanner";

type StatsSnapshot = {
  t: number;
  cpu: { used: number; limit: number; bucket: number };
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

declare global {
  interface CreepMemory {
    role?: RoleName;
    working?: boolean;
    spawnCost?: number;

    retire?: boolean;
    retireReason?: string;
    retireMarkedAt?: number;

    sourceId?: Id<Source>;
    buildTargetId?: Id<ConstructionSite>;

    _wId?: Id<_HasId>;
    _dId?: Id<AnyStoreStructure>;
    _lp?: string;
    _stuck?: number;
    _lastState?: string;
  }

  interface RoomMemory {
    _plan?: RoomPlan;
  }

  interface Memory {
    stats?: StatsSnapshot;
  }
}

export {};
