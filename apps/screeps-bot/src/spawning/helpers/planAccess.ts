import { getRoomPlan, type RoomPlan } from "../roomPlanner";

export function getRoomPlanCached(room: Room): RoomPlan {
  const plan = room.memory._plan;
  if (plan && plan.t === Game.time) return plan;
  return getRoomPlan(room);
}
