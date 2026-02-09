import { ROLE_CONFIG, RoleName, ROLE_PRIORITY } from "../config";
import { getTargetForRole } from "../spawning/targets";
import { getRoomPlan } from "../spawning/roomPlanner";
import {
  getNextUpgradeRole,
  getUpgradeCandidates,
} from "../spawning/upgradePlanner";

const INDENT = "  ";

type StatsSnapshot = NonNullable<Memory["stats"]>;

function ownedRooms(): Room[] {
  return Object.values(Game.rooms)
    .filter((r) => r.controller?.my)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function roomRoleCounts(room: Room): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    const role = c.memory.role ?? "unknown";
    counts[role] = (counts[role] ?? 0) + 1;
  }
  return counts;
}

function getPlan(room: Room) {
  const mem = room.memory._plan;
  if (mem && mem.t === Game.time) return mem;
  return getRoomPlan(room);
}

function rclTelemetry(room: Room): StatsSnapshot["rooms"][number]["rcl"] {
  const ctrl = room.controller;
  if (!ctrl)
    return { level: null, progress: null, progressTotal: null, pct: null };

  const pct =
    ctrl.progressTotal > 0 ? (ctrl.progress / ctrl.progressTotal) * 100 : 0;
  return {
    level: ctrl.level,
    progress: ctrl.progress,
    progressTotal: ctrl.progressTotal,
    pct,
  };
}

function rolesTelemetry(room: Room): StatsSnapshot["rooms"][number]["roles"] {
  const counts = roomRoleCounts(room);
  const out: Record<string, { current: number; target: number }> = {};

  for (const role of Object.keys(ROLE_CONFIG) as RoleName[]) {
    out[role] = {
      current: counts[role] ?? 0,
      target: getTargetForRole(room, role),
    };
  }

  return out;
}

function planToTelemetry(room: Room): StatsSnapshot["rooms"][number]["plan"] {
  const plan = getPlan(room);
  const s = plan.spawn;
  const u = plan.upgrade;

  const spawn = !s
    ? null
    : s.kind === "request"
      ? {
          kind: "request" as const,
          role: s.role,
          keySuffix: s.key.slice(-4),
          requiredEnergy: s.requiredEnergy,
          blockedByEnergy: s.blockedByEnergy,
        }
      : {
          kind: "role" as const,
          role: s.role,
          requiredEnergy: s.requiredEnergy,
          blockedByEnergy: s.blockedByEnergy,
          reason: s.reason,
        };

  const upgrade = !u
    ? null
    : {
        retireCreepName: u.retireCreepName,
        requiredEnergy: u.requiredEnergy,
        blockedByEnergy: u.blockedByEnergy,
      };

  return { spawn, upgrade };
}

function spawnTelemetry(room: Room): StatsSnapshot["rooms"][number]["spawns"] {
  const spawns = Object.values(Game.spawns)
    .filter((s) => s.my && s.room.name === room.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const plan = getPlan(room);
  const next =
    plan.spawn &&
    (plan.spawn.kind === "request"
      ? `${plan.spawn.role}[${plan.spawn.key.slice(-4)}] ${plan.spawn.requiredEnergy}e${
          plan.spawn.blockedByEnergy ? " ⛔" : ""
        }`
      : `${plan.spawn.role} ${plan.spawn.requiredEnergy}e${
          plan.spawn.blockedByEnergy ? " ⛔" : ""
        }${plan.spawn.reason === "upgrade" ? " (upgrade)" : ""}`);

  return spawns.map((s) => {
    if (s.spawning) {
      return {
        name: s.name,
        state: "spawning" as const,
        spawning: {
          name: s.spawning.name,
          remainingTime: s.spawning.remainingTime,
        },
        next: null,
      };
    }
    return { name: s.name, state: "idle" as const, next: next ?? null };
  });
}

function upgradesTelemetry(
  room: Room,
): StatsSnapshot["rooms"][number]["upgrades"] {
  return { candidates: getUpgradeCandidates(room) };
}

function orderedRoleEntries(
  roles: StatsSnapshot["rooms"][number]["roles"],
): Array<[string, { current: number; target: number }]> {
  const entries: Array<[string, { current: number; target: number }]> = [];

  for (const role of ROLE_PRIORITY as readonly RoleName[]) {
    const v = roles[role];
    if (v) entries.push([role, v]);
  }

  for (const [k, v] of Object.entries(roles)) {
    if ((ROLE_PRIORITY as readonly string[]).includes(k)) continue;
    entries.push([k, v]);
  }

  return entries;
}

function planToLine(plan: StatsSnapshot["rooms"][number]["plan"]): string {
  const s = plan.spawn;
  const u = plan.upgrade;

  const spawnPart = !s
    ? "spawn=none"
    : s.kind === "request"
      ? `spawn=${s.role}[${s.keySuffix}]${s.blockedByEnergy ? " ⛔" : ""}`
      : `spawn=${s.role}${s.reason === "upgrade" ? "(upgrade)" : ""}${s.blockedByEnergy ? " ⛔" : ""}`;

  const upgPart = !u
    ? "upgrade=none"
    : `upgrade=${u.retireCreepName} (energy required: ${u.requiredEnergy ?? "?"})${
        u.blockedByEnergy ? " ⛔" : ""
      }`;

  return `plan: ${spawnPart} ${upgPart}`;
}

function upgradesToLine(
  upg: StatsSnapshot["rooms"][number]["upgrades"],
): string {
  const entries = Object.entries(upg.candidates ?? {});
  if (entries.length === 0) return "upgrades: none";

  const parts = entries.map(([role, n]) => `${role}:${n}`).join(", ");
  return `upgrades: ${parts}`;
}

function spawnsToLine(
  spawns: StatsSnapshot["rooms"][number]["spawns"],
): string {
  if (!spawns || spawns.length === 0) return "spawns: none";

  const parts = spawns.map((s) => {
    if (s.state === "spawning" && s.spawning) {
      return `${s.name}:spawning ${s.spawning.name} (${s.spawning.remainingTime}t)`;
    }
    return s.next ? `${s.name}:idle (next: ${s.next})` : `${s.name}:idle`;
  });

  return `spawns: ${parts.join(" | ")}`;
}

export function updateTelemetry(): void {
  const rooms = ownedRooms();

  const snapshot: StatsSnapshot = {
    t: Game.time,
    cpu: {
      used: Game.cpu.getUsed(),
      limit: Game.cpu.limit,
      bucket: Game.cpu.bucket,
    },
    rooms: rooms.map((room) => ({
      name: room.name,
      energy: {
        available: room.energyAvailable,
        capacity: room.energyCapacityAvailable,
      },
      rcl: rclTelemetry(room),
      spawns: spawnTelemetry(room),
      roles: rolesTelemetry(room),
      plan: planToTelemetry(room),
      upgrades: upgradesTelemetry(room),
    })),
  };

  Memory.stats = snapshot;
}

export function reportStatsEvery(ticks: number = 50): void {
  if (Game.time % ticks !== 0) return;

  const stats = Memory.stats;
  if (!stats) return;

  console.log(`-------------------------------`);
  console.log(
    `[STATS t=${stats.t}] - CPU:${stats.cpu.used.toFixed(2)}/${stats.cpu.limit} bucket:${stats.cpu.bucket}`,
  );

  if (!stats.rooms || stats.rooms.length === 0) {
    console.log(`rooms: none`);
    console.log(`-------------------------------`);
    return;
  }

  for (const room of stats.rooms) {
    const pct = room.rcl.pct == null ? "?" : room.rcl.pct.toFixed(1);
    const lvl = room.rcl.level == null ? "?" : room.rcl.level;

    console.log(
      `room ${room.name}: energy=${room.energy.available}/${room.energy.capacity} rcl=${lvl}(${pct}%)`,
    );

    console.log(`${INDENT}${spawnsToLine(room.spawns)}`);

    const rolesLine = orderedRoleEntries(room.roles)
      .map(([role, v]) => `${role}:${v.current}/${v.target}`)
      .join(", ");
    console.log(`${INDENT}roles: ${rolesLine}`);

    console.log(`${INDENT}${planToLine(room.plan)}`);
    console.log(`${INDENT}${upgradesToLine(room.upgrades)}`);
  }

  console.log(`-------------------------------`);
}
