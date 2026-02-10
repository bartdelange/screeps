import { INTEL_DANGER_TICKS, INTEL_STATIC_CADENCE } from "./constants";
import { getIntelMemory } from "./memory";

export function runIntelManager(room: Room): void {
  const intel = getIntelMemory();
  const prior = intel.rooms[room.name];

  const hostileCreeps = room.find(FIND_HOSTILE_CREEPS).length;
  const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES).length;
  const hadHostiles = hostileCreeps > 0 || hostileStructures > 0;

  const nextDangerUntil = hadHostiles
    ? Game.time + INTEL_DANGER_TICKS
    : Math.max(prior?.dangerUntil ?? 0, Game.time);

  const next = {
    lastSeen: Game.time,
    owner: room.controller?.owner?.username,
    reserver: room.controller?.reservation?.username,
    hostileCreeps,
    hostileStructures,
    dangerUntil: nextDangerUntil,
    staticSeen: prior?.staticSeen,
    sources: prior?.sources,
    mineral: prior?.mineral,
    controllerId: prior?.controllerId,
  };

  if (!prior || !prior.staticSeen || Game.time - prior.staticSeen >= INTEL_STATIC_CADENCE) {
    next.staticSeen = Game.time;
    next.sources = room.find(FIND_SOURCES).length;

    const mineral = room.find(FIND_MINERALS)[0];
    next.mineral = mineral?.mineralType;

    next.controllerId = room.controller?.id;
  }

  intel.rooms[room.name] = next;
}

export function isRoomDangerous(roomName: string): boolean {
  const intel = getIntelMemory();
  const room = intel.rooms[roomName];
  if (!room) return false;
  return room.dangerUntil > Game.time;
}
