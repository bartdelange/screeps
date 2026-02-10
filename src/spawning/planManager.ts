import { getRoomPlan } from "./roomPlanner";
import { updateStatsLatestPlan } from "../telemetry/statsLatest";

export function runPlanManager(room: Room): void {
  if (!room.controller?.my) return;
  room.memory._plan = getRoomPlan(room);
  updateStatsLatestPlan(room, room.memory._plan);
}
