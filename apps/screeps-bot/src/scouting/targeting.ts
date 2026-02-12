import {
  INTEL_STALE_TICKS,
  SCOUT_MAX_TARGET_ROOMS,
  SCOUT_SEARCH_DEPTH,
} from "../intel/constants";
import { isRoomDangerous } from "../intel/intelManager";
import { getIntelMemory } from "../intel/memory";

function getNearbyRooms(origin: string, depth: number): string[] {
  const seen = new Set<string>([origin]);
  const queue: Array<{ room: string; d: number }> = [{ room: origin, d: 0 }];
  const out: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (current.d >= depth) continue;

    const exits = Game.map.describeExits(current.room);
    if (!exits) continue;

    for (const roomName of Object.values(exits)) {
      if (seen.has(roomName)) continue;
      seen.add(roomName);
      out.push(roomName);
      queue.push({ room: roomName, d: current.d + 1 });
    }
  }

  return out;
}

export function getScoutTargetsForRoom(homeRoomName: string): string[] {
  const intel = getIntelMemory();
  const nearby = getNearbyRooms(homeRoomName, SCOUT_SEARCH_DEPTH);

  const staleCandidates = nearby
    .filter((roomName) => !isRoomDangerous(roomName))
    .map((roomName) => {
      const seen = intel.rooms[roomName]?.lastSeen;
      const stale = !seen || Game.time - seen >= INTEL_STALE_TICKS;
      return { roomName, seen, stale };
    })
    .filter((entry) => entry.stale)
    .sort((a, b) => (a.seen ?? 0) - (b.seen ?? 0))
    .slice(0, SCOUT_MAX_TARGET_ROOMS)
    .map((entry) => entry.roomName);

  intel.scoutQueues[homeRoomName] = staleCandidates;
  return staleCandidates;
}
