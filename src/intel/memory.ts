export type IntelRoomRecord = {
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

export type IntelMemory = {
  rooms: Record<string, IntelRoomRecord>;
  scoutQueues: Record<string, string[]>;
};

export function getIntelMemory(): IntelMemory {
  const intel = Memory.intel;
  if (intel) return intel;

  Memory.intel = {
    rooms: {},
    scoutQueues: {},
  };

  return Memory.intel;
}
