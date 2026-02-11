import type { RoleName } from '../config';
import type { RoomPlan } from '../spawning/roomPlanner';
import type { StatsLatestV1 } from '../telemetry/statsLatest';

type IntelRoomMemory = {
  roomName: string;
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
  t: number;
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
    enableScouting?: boolean;
    intel?: IntelMemory;
    stats?: StatsLatestV1;
  }
}

export {};
