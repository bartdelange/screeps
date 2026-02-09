import { getRoomPlan } from "./roomPlanner";

export type SpawnIntent =
  | {
      kind: "request";
      role: RoleName;
      key: string;
      nameHint?: string;
      memory: Partial<CreepMemory>;
      blockedByEnergy: boolean;
      requiredEnergy: number;
    }
  | {
      kind: "count";
      role: RoleName;
      blockedByEnergy: boolean;
      requiredEnergy: number;
    }
  | null;

import { RoleName } from "../config";

export function getNextSpawnIntent(room: Room): SpawnIntent {
  const plan = getRoomPlan(room);
  const s = plan.spawn;
  if (!s) return null;

  if (s.kind === "request") {
    return {
      kind: "request",
      role: s.role,
      key: s.key,
      nameHint: s.nameHint,
      memory: s.memory,
      blockedByEnergy: s.blockedByEnergy,
      requiredEnergy: s.requiredEnergy,
    };
  }

  return {
    kind: "count",
    role: s.role,
    blockedByEnergy: s.blockedByEnergy,
    requiredEnergy: s.requiredEnergy,
  };
}
