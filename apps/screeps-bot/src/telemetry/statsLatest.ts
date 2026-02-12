import { ROLE_CONFIG, RoleName } from '../config';
import { getRoomPlanCached } from '../spawning/helpers/planAccess';
import { isPlanningActive } from '../spawning/helpers/planning';
import { getRequestKeyForCreep, getTargetForRole } from '../spawning/policies/targets';
import { getUpgradeCandidates } from '../spawning/policies/upgradePlanner';
import { getScoutingReadiness } from '../scouting/scoutingPolicy';
import { getIntelMemory } from '../intel/memory';
import { INTEL_STALE_TICKS } from '../intel/constants';
import type { RoomPlan, PlannedSpawnIntent } from '../spawning/roomPlanner';

export type StatsLatestV1 = {
  v: 1;
  t: number;
  cpu: { used: number; limit: number; bucket: number };
  world: {
    scouting: {
      enabled: boolean;
      scouts: number;
      ownedReady: number;
      ownedTotal: number;
      targets: number;
      queued: number;
      blockers: Record<string, number>;
    };
    intel: {
      known: number;
      stale: number;
      danger: number;
      topStale?: Array<{ name: string; age: number }>;
      topDanger?: Array<{ name: string; dangerFor: number }>;
    };
  };
  rooms: Record<
    string,
    {
      energy: { available: number; capacity: number };
      economy: { storageEnergy: number | null; terminalEnergy: number | null };
      rcl: { level: number | null; pct: number | null };
      controller: {
        ticksToDowngrade: number | null;
        safeModeAvailable: number | null;
        safeModeCooldown: number | null;
        safeMode: number | null;
      };
      defense: {
        hostileCreeps: number;
        hostileStructures: number;
        towerCount: number;
        towerEnergy: number;
        towerEnergyCapacity: number;
      };
      spawns: Record<
        string,
        {
          state: 'spawning' | 'idle';
          spawningRemaining?: number;
          spawningName?: string;
          next?: {
            kind: 'request' | 'role';
            role: RoleName;
            keySuffix?: string;
            requiredEnergy?: number;
            blockedByEnergy?: boolean;
            reasonCode?: 'energy' | 'missing_prereq' | 'no_target' | 'policy' | 'unknown';
          } | null;
        }
      >;
      roles: Partial<Record<RoleName, { current: number; target: number }>>;
      spawnRequests: {
        total: number;
        pending: number;
        pendingByRole: Partial<Record<RoleName, number>>;
      };
      plan: {
        spawn?: {
          kind: 'request' | 'role';
          role: RoleName;
          requiredEnergy?: number;
          blockedByEnergy?: boolean;
          keySuffix?: string;
          reasonCode?: 'energy' | 'missing_prereq' | 'no_target' | 'policy' | 'unknown';
        } | null;
        upgrade?: {
          retireCreepName: string;
          requiredEnergy?: number;
          blockedByEnergy?: boolean;
          active: boolean;
        } | null;
      };
      upgrades: {
        candidates: Partial<Record<RoleName, number>>;
      };
    }
  >;
};

const TOP_INTEL = 3;

type StatsLatestMemory = StatsLatestV1 & {
  _planUpdatedAt?: Record<string, number>;
};

type ReasonCode = 'energy' | 'missing_prereq' | 'no_target' | 'policy' | 'unknown';

function emptyStatsLatest(): StatsLatestV1 {
  return {
    v: 1,
    t: Game.time,
    cpu: { used: 0, limit: Game.cpu.limit, bucket: Game.cpu.bucket },
    world: {
      scouting: {
        enabled: Memory.enableScouting === true,
        scouts: 0,
        ownedReady: 0,
        ownedTotal: 0,
        targets: 0,
        queued: 0,
        blockers: {},
      },
      intel: { known: 0, stale: 0, danger: 0 },
    },
    rooms: {},
  };
}

function getStatsLatest(): StatsLatestMemory {
  if (!Memory.stats || typeof Memory.stats !== 'object') {
    const stats = emptyStatsLatest() as StatsLatestMemory;
    stats._planUpdatedAt = {};
    Memory.stats = stats;
  }
  const stats = Memory.stats as StatsLatestMemory;
  if (!stats.rooms || typeof stats.rooms !== 'object' || Array.isArray(stats.rooms)) {
    stats.rooms = emptyStatsLatest().rooms;
  }
  if (!stats.world || typeof stats.world !== 'object') {
    stats.world = emptyStatsLatest().world;
  } else {
    if (!stats.world.scouting || typeof stats.world.scouting !== 'object') {
      stats.world.scouting = emptyStatsLatest().world.scouting;
    }
    if (!stats.world.intel || typeof stats.world.intel !== 'object') {
      stats.world.intel = emptyStatsLatest().world.intel;
    }
  }
  stats._planUpdatedAt =
    stats._planUpdatedAt && typeof stats._planUpdatedAt === 'object' ? stats._planUpdatedAt : {};
  return stats;
}

function ensureRoomStats(stats: StatsLatestV1, roomName: string): StatsLatestV1['rooms'][string] {
  if (stats.rooms[roomName]) return stats.rooms[roomName];
  const empty: StatsLatestV1['rooms'][string] = {
    energy: { available: 0, capacity: 0 },
    economy: { storageEnergy: null, terminalEnergy: null },
    rcl: { level: null, pct: null },
    controller: {
      ticksToDowngrade: null,
      safeModeAvailable: null,
      safeModeCooldown: null,
      safeMode: null,
    },
    defense: {
      hostileCreeps: 0,
      hostileStructures: 0,
      towerCount: 0,
      towerEnergy: 0,
      towerEnergyCapacity: 0,
    },
    spawns: {},
    roles: {},
    spawnRequests: { total: 0, pending: 0, pendingByRole: {} },
    plan: {},
    upgrades: { candidates: {} },
  };
  stats.rooms[roomName] = empty;
  return empty;
}

function ownedRooms(): Room[] {
  return Object.values(Game.rooms)
    .filter((r) => r.controller?.my)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function roomRoleCounts(room: Room): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    const role = c.memory.role ?? 'unknown';
    counts[role] = (counts[role] ?? 0) + 1;
  }
  return counts;
}

function hasRequestedCreep(room: Room, role: RoleName, key: string): boolean {
  for (const c of Object.values(Game.creeps)) {
    if (c.memory.role !== role) continue;
    if (!isPlanningActive(c)) continue;

    if (role === 'scout') {
      const homeRoom = c.memory.homeRoom as string | undefined;
      if (homeRoom !== room.name) continue;
    } else if (c.room.name !== room.name) {
      continue;
    }

    const creepKey = getRequestKeyForCreep(role, c);
    if (creepKey === key) return true;
  }
  return false;
}

function spawnRequestsTelemetry(room: Room): StatsLatestV1['rooms'][string]['spawnRequests'] {
  const pendingByRole: Partial<Record<RoleName, number>> = {};
  let total = 0;
  let pending = 0;

  for (const role of Object.keys(ROLE_CONFIG) as RoleName[]) {
    const reqs = ROLE_CONFIG[role].spawn.requests?.(room) ?? [];
    const roleTotal = reqs.length;
    if (roleTotal === 0) continue;

    total += roleTotal;
    let rolePending = 0;

    for (const req of reqs) {
      if (!hasRequestedCreep(room, role, req.key)) {
        rolePending++;
      }
    }

    pending += rolePending;
    if (rolePending > 0) pendingByRole[role] = rolePending;
  }

  return { total, pending, pendingByRole };
}

function rolesTelemetry(room: Room): StatsLatestV1['rooms'][string]['roles'] {
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

function mapReasonCode(intent: PlannedSpawnIntent | undefined): ReasonCode | undefined {
  if (!intent) return undefined;
  if (intent.blockedByEnergy) return 'energy';
  if (intent.reason === 'missing') return 'missing_prereq';
  if (intent.reason === 'upgrade') return 'policy';
  return 'policy';
}

function planToLatest(plan?: RoomPlan): StatsLatestV1['rooms'][string]['plan'] {
  if (!plan) return {};

  const s = plan.spawn;
  const u = plan.upgrade;

  const spawn = !s
    ? null
    : s.kind === 'request'
      ? {
          kind: 'request' as const,
          role: s.role,
          keySuffix: s.key.slice(-4),
          requiredEnergy: s.requiredEnergy,
          blockedByEnergy: s.blockedByEnergy,
          reasonCode: mapReasonCode(s),
        }
      : {
          kind: 'role' as const,
          role: s.role,
          requiredEnergy: s.requiredEnergy,
          blockedByEnergy: s.blockedByEnergy,
          reasonCode: mapReasonCode(s),
        };

  const upgrade = !u
    ? null
    : {
        retireCreepName: u.retireCreepName,
        requiredEnergy: u.requiredEnergy,
        blockedByEnergy: u.blockedByEnergy,
        active: !u.blockedByEnergy,
      };

  return { spawn, upgrade };
}

function formatNextSpawn(
  plan: StatsLatestV1['rooms'][string]['plan'] | undefined,
): StatsLatestV1['rooms'][string]['spawns'][string]['next'] {
  return plan?.spawn ?? null;
}

function spawnTelemetry(
  room: Room,
  plan: StatsLatestV1['rooms'][string]['plan'] | undefined,
): StatsLatestV1['rooms'][string]['spawns'] {
  const spawns = Object.values(Game.spawns).filter((s) => s.my && s.room.name === room.name);

  const out: StatsLatestV1['rooms'][string]['spawns'] = {};
  for (const s of spawns) {
    if (s.spawning) {
      out[s.name] = {
        state: 'spawning',
        spawningRemaining: s.spawning.remainingTime,
        spawningName: s.spawning.name,
        next: null,
      };
    } else {
      out[s.name] = {
        state: 'idle',
        next: formatNextSpawn(plan),
      };
    }
  }

  return out;
}

function economyTelemetry(room: Room): StatsLatestV1['rooms'][string]['economy'] {
  const storageEnergy = room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? null;
  const terminalEnergy = room.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? null;
  return { storageEnergy, terminalEnergy };
}

function rclTelemetry(room: Room): StatsLatestV1['rooms'][string]['rcl'] {
  const ctrl = room.controller;
  if (!ctrl) return { level: null, pct: null };
  const pct = ctrl.progressTotal > 0 ? (ctrl.progress / ctrl.progressTotal) * 100 : 0;
  return { level: ctrl.level, pct };
}

function controllerTelemetry(room: Room): StatsLatestV1['rooms'][string]['controller'] {
  const ctrl = room.controller;
  if (!ctrl) {
    return {
      ticksToDowngrade: null,
      safeModeAvailable: null,
      safeModeCooldown: null,
      safeMode: null,
    };
  }

  return {
    ticksToDowngrade: ctrl.ticksToDowngrade ?? null,
    safeModeAvailable: ctrl.safeModeAvailable ?? null,
    safeModeCooldown: ctrl.safeModeCooldown ?? null,
    safeMode: ctrl.safeMode ?? null,
  };
}

function defenseTelemetry(room: Room): StatsLatestV1['rooms'][string]['defense'] {
  const hostileCreeps = room.find(FIND_HOSTILE_CREEPS).length;
  const hostileStructures = room.find(FIND_HOSTILE_STRUCTURES).length;
  const towers = room.find(FIND_MY_STRUCTURES, {
    filter: (s) => s.structureType === STRUCTURE_TOWER,
  }) as StructureTower[];
  const towerEnergy = towers.reduce(
    (sum, tower) => sum + tower.store.getUsedCapacity(RESOURCE_ENERGY),
    0,
  );
  const towerEnergyCapacity = towers.reduce(
    (sum, tower) => sum + tower.store.getCapacity(RESOURCE_ENERGY),
    0,
  );

  return {
    hostileCreeps,
    hostileStructures,
    towerCount: towers.length,
    towerEnergy,
    towerEnergyCapacity,
  };
}

function intelSummary(): StatsLatestV1['world']['intel'] {
  const intel = getIntelMemory();
  const rooms = Object.entries(intel.rooms).map(([name, room]) => ({
    name,
    age: Math.max(0, Game.time - room.lastSeen),
    dangerFor: Math.max(0, room.dangerUntil - Game.time),
  }));

  const known = rooms.length;
  const danger = rooms.filter((r) => r.dangerFor > 0).length;
  const stale = rooms.filter((r) => r.age >= INTEL_STALE_TICKS).length;

  const topStale = rooms
    .filter((r) => r.age > 0)
    .sort((a, b) => b.age - a.age || a.name.localeCompare(b.name))
    .slice(0, TOP_INTEL)
    .map((r) => ({ name: r.name, age: r.age }));

  const topDanger = rooms
    .filter((r) => r.dangerFor > 0)
    .sort((a, b) => b.dangerFor - a.dangerFor || a.name.localeCompare(b.name))
    .slice(0, TOP_INTEL)
    .map((r) => ({ name: r.name, dangerFor: r.dangerFor }));

  return {
    known,
    stale,
    danger,
    topStale: topStale.length > 0 ? topStale : undefined,
    topDanger: topDanger.length > 0 ? topDanger : undefined,
  };
}

function scoutingTelemetry(rooms: Room[]): StatsLatestV1['world']['scouting'] {
  const totalScouts = Object.values(Game.creeps).filter(
    (c) => c.memory.role === 'scout' && !c.spawning,
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
    scouts: totalScouts,
    ownedReady: readyOwnedRooms,
    ownedTotal: rooms.length,
    targets: totalTargets,
    queued: totalQueuedTargets,
    blockers,
  };
}

export function updateStatsLatestPlan(room: Room, plan: RoomPlan): void {
  const stats = getStatsLatest();
  const entry = ensureRoomStats(stats, room.name);
  entry.plan = planToLatest(plan);
  stats._planUpdatedAt = stats._planUpdatedAt ?? {};
  stats._planUpdatedAt[room.name] = Game.time;
}

export function updateStatsLatestAfterSpawn(
  spawn: StructureSpawn,
  intent?: PlannedSpawnIntent,
): void {
  const stats = getStatsLatest();
  const entry = ensureRoomStats(stats, spawn.room.name);
  const next = intent ? (planToLatest({ t: Game.time, spawn: intent }).spawn ?? null) : null;
  entry.spawns[spawn.name] = {
    state: spawn.spawning ? 'spawning' : 'idle',
    spawningRemaining: spawn.spawning?.remainingTime,
    spawningName: spawn.spawning?.name,
    next,
  };
}

export function refreshStatsLatestEvery(ticks: number = 25): void {
  if (Game.time % ticks !== 0) return;

  const stats = getStatsLatest();
  const rooms = ownedRooms();

  stats.t = Game.time;
  stats.cpu = {
    used: Game.cpu.getUsed(),
    limit: Game.cpu.limit,
    bucket: Game.cpu.bucket,
  };
  stats.world.intel = intelSummary();
  stats.world.scouting = scoutingTelemetry(rooms);

  for (const room of rooms) {
    const entry = ensureRoomStats(stats, room.name);
    entry.energy = {
      available: room.energyAvailable,
      capacity: room.energyCapacityAvailable,
    };
    entry.economy = economyTelemetry(room);
    entry.rcl = rclTelemetry(room);
    entry.controller = controllerTelemetry(room);
    entry.defense = defenseTelemetry(room);
    if ((stats._planUpdatedAt?.[room.name] ?? -1) !== Game.time) {
      entry.plan = planToLatest(getRoomPlanCached(room));
    }
    entry.spawns = spawnTelemetry(room, entry.plan);
    entry.spawnRequests = spawnRequestsTelemetry(room);
    entry.roles = rolesTelemetry(room);
    entry.upgrades = { candidates: getUpgradeCandidates(room) };
  }
}
