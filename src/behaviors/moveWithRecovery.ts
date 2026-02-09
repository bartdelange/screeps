type MoveResult = "moving" | "invalid";

type StuckMemory = Pick<CreepMemory, "_lp" | "_stuck">;

function posKey(pos: RoomPosition): string {
  return `${pos.x}:${pos.y}:${pos.roomName}`;
}

function noteAndHandleStuck(
  creep: Creep,
  mem: StuckMemory,
  target: RoomPosition,
): void {
  const key = posKey(creep.pos);
  if (mem._lp === key) mem._stuck = (mem._stuck ?? 0) + 1;
  else mem._stuck = 0;
  mem._lp = key;

  if ((mem._stuck ?? 0) < 3) return;

  creep.moveTo(target, { reusePath: 0, maxRooms: 1 });

  if ((mem._stuck ?? 0) >= 5) {
    const dir = (1 + (Game.time % 8)) as DirectionConstant;
    creep.move(dir);
  }
}

export function moveWithRecovery(
  creep: Creep,
  target: RoomPosition,
  opts?: MoveToOpts,
): MoveResult {
  const res = creep.moveTo(target, opts ?? { reusePath: 20, maxRooms: 1 });
  const mem = creep.memory as StuckMemory;
  noteAndHandleStuck(creep, mem, target);

  if (res === ERR_NO_PATH || res === ERR_INVALID_TARGET) return "invalid";
  return "moving";
}
