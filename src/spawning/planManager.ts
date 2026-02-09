import { getRoomPlan } from "./roomPlanner";

export function runPlanManager(): void {
  for (const room of Object.values(Game.rooms)) {
    if (!room.controller?.my) continue;
    room.memory._plan = getRoomPlan(room);
  }
}
