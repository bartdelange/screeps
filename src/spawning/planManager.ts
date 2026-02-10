import { getRoomPlan } from "./roomPlanner";

export function runPlanManager(room: Room): void {
  if (!room.controller?.my) return;
  room.memory._plan = getRoomPlan(room);
}
