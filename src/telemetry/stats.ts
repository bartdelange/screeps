import { ROLE_CONFIG, RoleName, ROLE_PRIORITY } from "../config";
import { getRoomPlanCached } from "../spawning/helpers/planAccess";
import { getTargetForRole } from "../spawning/policies/targets";
import { getUpgradeCandidates } from "../spawning/policies/upgradePlanner";
import { getScoutingReadiness } from "../scouting/scoutingPolicy";
import { getIntelMemory } from "../intel/memory";
import { INTEL_STALE_TICKS } from "../intel/constants";

const INDENT = "  ";
const REMOTE_REPORT_LIMIT = 10;

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
  return getRoomPlanCached(room);
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

function scoutingTelemetry(rooms: Room[]): StatsSnapshot["scouting"] {
  const totalScouts = Object.values(Game.creeps).filter(
    (c) => c.memory.role === "scout" && !c.spawning,
  ).length;

  const blockers: Record<string, number> = {};
  let readyOwnedRooms = 0;
  let totalTargets = 0;

  for (const room of rooms) {
    const readiness = getScoutingReadiness(room);
    totalTargets += readiness.targetCount;
    if (readiness.ready) readyOwnedRooms++;

    for (const blocker of readiness.blockers) {
      blockers[blocker] = (blockers[blocker] ?? 0) + 1;
    }
  }

  const intel = getIntelMemory();
  const totalQueuedTargets = Object.values(intel.scoutQueues).reduce(
    (sum, queue) => sum + queue.length,
    0,
  );

  return {
    enabled: Memory.enableScouting === true,
    totalScouts,
    readyOwnedRooms,
    totalOwnedRooms: rooms.length,
    totalTargets,
    totalQueuedTargets,
    blockers,
  };
}

function intelTelemetry(): StatsSnapshot["intel"] {
  const intel = getIntelMemory();
  const rooms = Object.entries(intel.rooms).map(([name, room]) => ({
    name,
    age: Math.max(0, Game.time - room.lastSeen),
    owner: room.owner,
    reserver: room.reserver,
    hostileCreeps: room.hostileCreeps,
    hostileStructures: room.hostileStructures,
    dangerFor: Math.max(0, room.dangerUntil - Game.time),
    sources: room.sources,
    mineral: room.mineral,
  }));

  rooms.sort((a, b) => b.age - a.age || a.name.localeCompare(b.name));

  const knownDangerRooms = rooms.filter((r) => r.dangerFor > 0).length;
  const staleRooms = rooms.filter((r) => r.age >= INTEL_STALE_TICKS).length;

  return {
    knownRooms: rooms.length,
    knownDangerRooms,
    staleRooms,
    rooms,
  };
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

function scoutingToLine(scouting: StatsSnapshot["scouting"]): string {
  const blockers = Object.entries(scouting.blockers)
    .map(([k, n]) => `${k}:${n}`)
    .join(", ");
  return `scouting: enabled=${scouting.enabled} scouts=${scouting.totalScouts} readyRooms=${scouting.readyOwnedRooms}/${scouting.totalOwnedRooms} targets=${scouting.totalTargets} queued=${scouting.totalQueuedTargets} blockers=${blockers || "none"}`;
}

function intelSummaryToLine(intel: StatsSnapshot["intel"]): string {
  return `intel: known=${intel.knownRooms} stale=${intel.staleRooms} danger=${intel.knownDangerRooms}`;
}

function intelRoomsToLine(intel: StatsSnapshot["intel"]): string {
  if (intel.rooms.length === 0) return "intelRooms: none";

  const top = intel.rooms.slice(0, 8);
  const parts = top.map((r) => {
    const danger = r.dangerFor > 0 ? ` danger:${r.dangerFor}` : "";
    return `${r.name}(age:${r.age}${danger})`;
  });
  return `intelRooms: ${parts.join(", ")}`;
}

function ownedRoomHeader(room: StatsSnapshot["rooms"][number]): string {
  const pct = room.rcl.pct == null ? "?" : room.rcl.pct.toFixed(1);
  const lvl = room.rcl.level == null ? "?" : room.rcl.level;
  return `owned ${room.name}: energy=${room.energy.available}/${room.energy.capacity} rcl=${lvl}(${pct}%)`;
}

function remoteCandidates(intel: StatsSnapshot["intel"]): StatsSnapshot["intel"]["rooms"] {
  return intel.rooms
    .filter((room) => {
      if (room.owner) return false;
      if (room.reserver) return false;
      if (room.dangerFor > 0) return false;
      return (room.sources ?? 0) >= 2;
    })
    .sort((a, b) => a.age - b.age || a.name.localeCompare(b.name))
    .slice(0, REMOTE_REPORT_LIMIT);
}

function remoteCandidatesToLine(intel: StatsSnapshot["intel"]): string {
  const candidates = remoteCandidates(intel);
  if (candidates.length === 0) return "remoteCandidates: none";

  const parts = candidates.map((room) => {
    const mineral = room.mineral ? ` mineral:${room.mineral}` : "";
    return `${room.name}(age:${room.age} src:${room.sources ?? "?"}${mineral})`;
  });
  return `remoteCandidates: ${parts.join(", ")}`;
}

function intelRoomLine(room: StatsSnapshot["intel"]["rooms"][number]): string {
  const owner = room.owner ? ` owner:${room.owner}` : "";
  const reserver = room.reserver ? ` reserver:${room.reserver}` : "";
  const danger = room.dangerFor > 0 ? ` danger:${room.dangerFor}` : "";
  const mineral = room.mineral ? ` mineral:${room.mineral}` : "";
  return `${room.name} age:${room.age} hostiles:${room.hostileCreeps}/${room.hostileStructures} src:${room.sources ?? "?"}${danger}${owner}${reserver}${mineral}`;
}

function parseRoomCoord(roomName: string): { x: number; y: number } | null {
  const m = /^([WE])(\d+)([NS])(\d+)$/.exec(roomName);
  if (!m) return null;

  const xDir = m[1];
  const xNum = Number(m[2]);
  const yDir = m[3];
  const yNum = Number(m[4]);

  if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) return null;

  const x = xDir === "E" ? xNum : -xNum - 1;
  const y = yDir === "S" ? yNum : -yNum - 1;
  return { x, y };
}

function intelCellChar(
  room: StatsSnapshot["intel"]["rooms"][number],
  owned: Set<string>,
): string {
  if (owned.has(room.name)) return "O";
  if (room.owner || room.reserver) return "X";
  if (room.dangerFor > 0) return "!";
  if (room.age >= INTEL_STALE_TICKS) return "s";
  return "o";
}

function intelGridLines(stats: StatsSnapshot): string[] {
  const rows = stats.intel.rooms
    .map((room) => {
      const coord = parseRoomCoord(room.name);
      if (!coord) return null;
      return { room, ...coord };
    })
    .filter((v): v is { room: StatsSnapshot["intel"]["rooms"][number]; x: number; y: number } => v !== null);

  if (rows.length === 0) return ["map: none"];

  let minX = rows[0].x;
  let maxX = rows[0].x;
  let minY = rows[0].y;
  let maxY = rows[0].y;

  for (const r of rows) {
    if (r.x < minX) minX = r.x;
    if (r.x > maxX) maxX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.y > maxY) maxY = r.y;
  }

  const owned = new Set(stats.rooms.map((r) => r.name));
  const byCoord = new Map<string, string>();
  for (const r of rows) {
    byCoord.set(`${r.x},${r.y}`, intelCellChar(r.room, owned));
  }

  const out: string[] = [];
  out.push("map legend: O=owned X=other-claimed/reserved !=danger s=stale o=fresh .=unknown");

  for (let y = minY; y <= maxY; y++) {
    let line = "";
    for (let x = minX; x <= maxX; x++) {
      line += byCoord.get(`${x},${y}`) ?? ".";
    }
    out.push(line);
  }

  return out;
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
    scouting: scoutingTelemetry(rooms),
    intel: intelTelemetry(),
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
  console.log(`WORLD`);
  console.log(`${INDENT}${scoutingToLine(stats.scouting)}`);
  console.log(`${INDENT}${intelSummaryToLine(stats.intel)}`);

  console.log(`ROOMS`);
  if (stats.rooms.length === 0) {
    console.log(`${INDENT}owned: none`);
  } else {
    for (const room of stats.rooms) {
      console.log(`${INDENT}${ownedRoomHeader(room)}`);
      console.log(`${INDENT}${INDENT}${spawnsToLine(room.spawns)}`);

      const rolesLine = orderedRoleEntries(room.roles)
        .map(([role, v]) => `${role}:${v.current}/${v.target}`)
        .join(", ");
      console.log(`${INDENT}${INDENT}roles: ${rolesLine}`);
      console.log(`${INDENT}${INDENT}${planToLine(room.plan)}`);
      console.log(`${INDENT}${INDENT}${upgradesToLine(room.upgrades)}`);
    }
  }
  console.log(`${INDENT}${remoteCandidatesToLine(stats.intel)}`);

  console.log(`INTEL`);
  if (stats.intel.rooms.length === 0) {
    console.log(`${INDENT}none`);
  } else {
    for (const line of intelGridLines(stats)) {
      console.log(`${INDENT}${line}`);
    }
    for (const room of stats.intel.rooms) {
      console.log(`${INDENT}${intelRoomLine(room)}`);
    }
  }

  console.log(`-------------------------------`);
}
