import { SCOUT_MIN_RCL } from "../intel/constants";
import { getSourcesWithContainer } from "../utils/containersReady";
import { getRoomCreeps } from "../utils/roomCreeps";
import { getScoutTargetsForRoom } from "./targeting";

function hasCriticalCoverage(room: Room): boolean {
  const sourcesWithContainer = getSourcesWithContainer(room);
  const minerTarget = sourcesWithContainer.length;
  const moverTarget = Math.min(
    (room.controller?.level ?? 1) >= 3 ? 2 : 1,
    sourcesWithContainer.length,
  );

  const miners = getRoomCreeps(room, {
    role: "miner",
    includeRetiring: false,
  }).length;

  const movers = getRoomCreeps(room, {
    role: "mover",
    includeRetiring: false,
  }).length;

  return miners >= minerTarget && movers >= moverTarget;
}

function hasStableEconomy(room: Room): boolean {
  const minEnergy = Math.max(300, Math.floor(room.energyCapacityAvailable * 0.5));
  return room.energyAvailable >= minEnergy;
}

export type ScoutingReadiness = {
  enabled: boolean;
  rclOk: boolean;
  criticalCoverageOk: boolean;
  economyStable: boolean;
  hasTargets: boolean;
  targetCount: number;
  blockers: string[];
  ready: boolean;
};

export function getScoutingReadiness(room: Room): ScoutingReadiness {
  if (!room.controller?.my) {
    return {
      enabled: false,
      rclOk: false,
      criticalCoverageOk: false,
      economyStable: false,
      hasTargets: false,
      targetCount: 0,
      blockers: ["not-owned"],
      ready: false,
    };
  }

  const enabled = Memory.enableScouting === true;
  const rclOk = (room.controller.level ?? 0) >= SCOUT_MIN_RCL;
  const criticalCoverageOk = hasCriticalCoverage(room);
  const economyStable = hasStableEconomy(room);
  const targetCount = getScoutTargetsForRoom(room.name).length;
  const hasTargets = targetCount > 0;

  const blockers: string[] = [];
  if (!enabled) blockers.push("manual-gate-off");
  if (!rclOk) blockers.push(`rcl<${SCOUT_MIN_RCL}`);
  if (!criticalCoverageOk) blockers.push("critical-roles");
  if (!economyStable) blockers.push("economy");
  if (!hasTargets) blockers.push("no-stale-targets");

  return {
    enabled,
    rclOk,
    criticalCoverageOk,
    economyStable,
    hasTargets,
    targetCount,
    blockers,
    ready: blockers.length === 0,
  };
}

export function canSpawnScout(room: Room): boolean {
  return getScoutingReadiness(room).ready;
}
