import { sayState } from "../../utils/sayState";
import { getScoutTargetsForRoom } from "../../scouting/targeting";

const ICONS = {
  scout: "👁️",
  idle: "😴",
};

function refreshQueue(creep: Creep): void {
  const homeRoom = creep.memory.homeRoom;
  if (!homeRoom) return;

  const queue = getScoutTargetsForRoom(homeRoom);
  creep.memory.scoutQueue = queue;
}

function isOnRoomEdge(pos: RoomPosition): boolean {
  return pos.x === 0 || pos.x === 49 || pos.y === 0 || pos.y === 49;
}

function moveOffEdge(creep: Creep): boolean {
  if (!isOnRoomEdge(creep.pos)) return false;

  const x = creep.pos.x === 0 ? 1 : creep.pos.x === 49 ? 48 : creep.pos.x;
  const y = creep.pos.y === 0 ? 1 : creep.pos.y === 49 ? 48 : creep.pos.y;
  creep.moveTo(new RoomPosition(x, y, creep.room.name), { reusePath: 0 });
  return true;
}

export function runScout(creep: Creep): void {
  if (!creep.memory.homeRoom) creep.memory.homeRoom = creep.room.name;

  if (!creep.memory.scoutQueue || creep.memory.scoutQueue.length === 0) {
    refreshQueue(creep);
  }

  const queue = creep.memory.scoutQueue ?? [];
  const targetRoom = queue[0];

  if (!targetRoom) {
    delete creep.memory.scoutTarget;

    if (moveOffEdge(creep)) {
      sayState(creep, ICONS.scout);
      return;
    }

    const homeRoom = creep.memory.homeRoom;
    if (homeRoom && creep.room.name !== homeRoom) {
      creep.moveTo(new RoomPosition(25, 25, homeRoom), { reusePath: 20 });
      sayState(creep, ICONS.scout);
      return;
    }

    creep.moveTo(new RoomPosition(25, 25, creep.room.name), { reusePath: 20 });
    sayState(creep, ICONS.idle);
    return;
  }

  creep.memory.scoutTarget = targetRoom;

  if (creep.room.name === targetRoom) {
    queue.shift();
    creep.memory.scoutQueue = queue;
    delete creep.memory.scoutTarget;
    sayState(creep, ICONS.scout);
    return;
  }

  creep.moveTo(new RoomPosition(25, 25, targetRoom), {
    reusePath: 20,
  });
  sayState(creep, ICONS.scout);
}
