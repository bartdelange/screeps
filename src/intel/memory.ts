export type IntelRoomRecord = {
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

export type IntelMemory = {
  t: number;
  rooms: Record<string, IntelRoomRecord>;
  scoutQueues: Record<string, string[]>;
};

export function getIntelMemory(): IntelMemory {
  const intel = Memory.intel;
  if (intel) {
    intel.t = Game.time;
    return intel;
  }

  Memory.intel = {
    t: Game.time,
    rooms: {},
    scoutQueues: {},
  };

  return Memory.intel;
}
