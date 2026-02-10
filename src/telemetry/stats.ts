import { ROLE_CONFIG, ROLE_PRIORITY, RoleName } from '../config';
import { getRoomPlanCached } from '../spawning/helpers/planAccess';
import { getRequestKeyForCreep, getTargetForRole } from '../spawning/policies/targets';
import { getUpgradeCandidates } from '../spawning/policies/upgradePlanner';
import { getScoutingReadiness } from '../scouting/scoutingPolicy';
import { getIntelMemory } from '../intel/memory';
import { INTEL_STALE_TICKS } from '../intel/constants';
import { isPlanningActive } from '../spawning/helpers/planning';

const INDENT = '  ';

type StatsSnapshot = {
  t: number;
  cpu: { used: number; limit: number; bucket: number };
  scouting: {
    enabled: boolean;
    totalScouts: number;
    readyOwnedRooms: number;
    totalOwnedRooms: number;
    totalTargets: number;
    totalQueuedTargets: number;
    blockers: Record<string, number>;
  };
  intel: {
    knownRooms: number;
    knownDangerRooms: number;
    staleRooms: number;
    rooms: Array<{
      name: string;
      age: number;
      owner?: string;
      reserver?: string;
      hostileCreeps: number;
      hostileStructures: number;
      dangerFor: number;
      sources?: number;
      mineral?: MineralConstant;
    }>;
  };
  rooms: Array<{
    name: string;
    energy: { available: number; capacity: number };
    economy: { storageEnergy: number | null; terminalEnergy: number | null };
    rcl: {
      level: number | null;
      progress: number | null;
      progressTotal: number | null;
      pct: number | null;
    };
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
    spawns: Array<{
      name: string;
      state: 'spawning' | 'idle';
      spawning?: { name: string; remainingTime: number };
      next?: string | null;
    }>;
    spawnRequests: {
      total: number;
      pending: number;
      byRole: Record<string, { total: number; pending: number }>;
    };
    roles: Partial<Record<RoleName, { current: number; target: number }>>;
    plan: {
      spawn: null | {
        kind: 'request' | 'role';
        role: RoleName;
        keySuffix?: string;
        requiredEnergy?: number;
        blockedByEnergy?: boolean;
        reason?: string;
      };
      upgrade: null | {
        retireCreepName: string;
        requiredEnergy?: number;
        blockedByEnergy?: boolean;
      };
    };
    upgrades: {
      candidates: Partial<Record<RoleName, number>>;
    };
  }>;
};

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

function getPlan(room: Room) {
  return getRoomPlanCached(room);
}

function rclTelemetry(room: Room): StatsSnapshot['rooms'][number]['rcl'] {
  const ctrl = room.controller;
  if (!ctrl) return { level: null, progress: null, progressTotal: null, pct: null };

  const pct = ctrl.progressTotal > 0 ? (ctrl.progress / ctrl.progressTotal) * 100 : 0;
  return {
    level: ctrl.level,
    progress: ctrl.progress,
    progressTotal: ctrl.progressTotal,
    pct,
  };
}

function controllerTelemetry(room: Room): StatsSnapshot['rooms'][number]['controller'] {
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

function economyTelemetry(room: Room): StatsSnapshot['rooms'][number]['economy'] {
  const storageEnergy = room.storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? null;
  const terminalEnergy = room.terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? null;
  return { storageEnergy, terminalEnergy };
}

function defenseTelemetry(room: Room): StatsSnapshot['rooms'][number]['defense'] {
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

function spawnRequestsTelemetry(room: Room): StatsSnapshot['rooms'][number]['spawnRequests'] {
  const byRole: StatsSnapshot['rooms'][number]['spawnRequests']['byRole'] = {};
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
    byRole[role] = { total: roleTotal, pending: rolePending };
  }

  return { total, pending, byRole };
}

function rolesTelemetry(room: Room): StatsSnapshot['rooms'][number]['roles'] {
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

function planToTelemetry(room: Room): StatsSnapshot['rooms'][number]['plan'] {
  const plan = getPlan(room);
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
        }
      : {
          kind: 'role' as const,
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

function spawnTelemetry(room: Room): StatsSnapshot['rooms'][number]['spawns'] {
  const spawns = Object.values(Game.spawns)
    .filter((s) => s.my && s.room.name === room.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const plan = getPlan(room);
  const next =
    plan.spawn &&
    (plan.spawn.kind === 'request'
      ? `${plan.spawn.role}[${plan.spawn.key.slice(-4)}] ${plan.spawn.requiredEnergy}e${
          plan.spawn.blockedByEnergy ? ' ⛔' : ''
        }`
      : `${plan.spawn.role} ${plan.spawn.requiredEnergy}e${
          plan.spawn.blockedByEnergy ? ' ⛔' : ''
        }${plan.spawn.reason === 'upgrade' ? ' (upgrade)' : ''}`);

  return spawns.map((s) => {
    if (s.spawning) {
      return {
        name: s.name,
        state: 'spawning' as const,
        spawning: {
          name: s.spawning.name,
          remainingTime: s.spawning.remainingTime,
        },
        next: null,
      };
    }
    return { name: s.name, state: 'idle' as const, next: next ?? null };
  });
}

function upgradesTelemetry(room: Room): StatsSnapshot['rooms'][number]['upgrades'] {
  return { candidates: getUpgradeCandidates(room) };
}

function scoutingTelemetry(rooms: Room[]): StatsSnapshot['scouting'] {
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
    totalScouts,
    readyOwnedRooms,
    totalOwnedRooms: rooms.length,
    totalTargets,
    totalQueuedTargets,
    blockers,
  };
}

function intelTelemetry(): StatsSnapshot['intel'] {
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
  roles: StatsSnapshot['rooms'][number]['roles'],
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

function planToLine(plan: StatsSnapshot['rooms'][number]['plan']): string {
  const s = plan.spawn;
  const u = plan.upgrade;

  const spawnPart = !s
    ? 'spawn=none'
    : s.kind === 'request'
      ? `spawn=${s.role}[${s.keySuffix}]${s.blockedByEnergy ? ' ⛔' : ''}`
      : `spawn=${s.role}${s.reason === 'upgrade' ? '(upgrade)' : ''}${s.blockedByEnergy ? ' ⛔' : ''}`;

  const upgPart = !u
    ? 'upgrade=none'
    : `upgrade=${u.retireCreepName} (energy required: ${u.requiredEnergy ?? '?'})${
        u.blockedByEnergy ? ' ⛔' : ''
      }`;

  return `plan: ${spawnPart} ${upgPart}`;
}

function upgradesToLine(upg: StatsSnapshot['rooms'][number]['upgrades']): string {
  const entries = Object.entries(upg.candidates ?? {});
  if (entries.length === 0) return 'upgrades: none';

  const parts = entries.map(([role, n]) => `${role}:${n}`).join(', ');
  return `upgrades: ${parts}`;
}

function spawnsToLine(spawns: StatsSnapshot['rooms'][number]['spawns']): string {
  if (!spawns || spawns.length === 0) return 'spawns: none';

  const parts = spawns.map((s) => {
    if (s.state === 'spawning' && s.spawning) {
      return `${s.name}:spawning ${s.spawning.name} (${s.spawning.remainingTime}t)`;
    }
    return s.next ? `${s.name}:idle (next: ${s.next})` : `${s.name}:idle`;
  });

  return `spawns: ${parts.join(' | ')}`;
}

function scoutingToLine(scouting: StatsSnapshot['scouting']): string {
  const blockers = Object.entries(scouting.blockers)
    .map(([k, n]) => `${k}:${n}`)
    .join(', ');
  return `scouting: enabled=${scouting.enabled} scouts=${scouting.totalScouts} readyRooms=${scouting.readyOwnedRooms}/${scouting.totalOwnedRooms} targets=${scouting.totalTargets} queued=${scouting.totalQueuedTargets} blockers=${blockers || 'none'}`;
}

function intelSummaryToLine(intel: StatsSnapshot['intel']): string {
  return `intel: known=${intel.knownRooms} stale=${intel.staleRooms} danger=${intel.knownDangerRooms}`;
}

function ownedRoomHeader(room: StatsSnapshot['rooms'][number]): string {
  const pct = room.rcl.pct == null ? '?' : room.rcl.pct.toFixed(1);
  const lvl = room.rcl.level == null ? '?' : room.rcl.level;
  return `owned ${room.name}: energy=${room.energy.available}/${room.energy.capacity} rcl=${lvl}(${pct}%)`;
}

function economyToLine(economy: StatsSnapshot['rooms'][number]['economy']): string {
  const storage = economy.storageEnergy == null ? 'none' : economy.storageEnergy;
  const terminal = economy.terminalEnergy == null ? 'none' : economy.terminalEnergy;
  return `economy: storage=${storage} terminal=${terminal}`;
}

function controllerToLine(controller: StatsSnapshot['rooms'][number]['controller']): string {
  const downgrade = controller.ticksToDowngrade == null ? '?' : controller.ticksToDowngrade;
  const safeMode =
    controller.safeMode == null || controller.safeMode <= 0
      ? 'inactive'
      : `active:${controller.safeMode}`;
  const cooldown =
    controller.safeModeCooldown == null || controller.safeModeCooldown <= 0
      ? 'none'
      : controller.safeModeCooldown;
  const available = controller.safeModeAvailable == null ? '?' : controller.safeModeAvailable;

  return `controller: downgrade=${downgrade} safeMode=${safeMode} cooldown=${cooldown} available=${available}`;
}

function defenseToLine(defense: StatsSnapshot['rooms'][number]['defense']): string {
  return `defense: hostiles=${defense.hostileCreeps}/${defense.hostileStructures} towers=${defense.towerCount} energy=${defense.towerEnergy}/${defense.towerEnergyCapacity}`;
}

function spawnRequestsToLine(reqs: StatsSnapshot['rooms'][number]['spawnRequests']): string {
  if (reqs.total === 0) return 'requests: none';

  const perRole = Object.entries(reqs.byRole)
    .filter(([, v]) => v.pending > 0)
    .map(([role, v]) => `${role}:${v.pending}/${v.total}`)
    .join(', ');

  const summary = `requests: pending=${reqs.pending}/${reqs.total}`;
  return perRole.length > 0 ? `${summary} (${perRole})` : summary;
}

function remoteCandidates(intel: StatsSnapshot['intel']): StatsSnapshot['intel']['rooms'] {
  return intel.rooms
    .filter((room) => {
      if (room.owner) return false;
      if (room.reserver) return false;
      if (room.dangerFor > 0) return false;
      return (room.sources ?? 0) >= 2;
    })
    .sort((a, b) => a.age - b.age || a.name.localeCompare(b.name));
}

function remoteCandidatesToLine(intel: StatsSnapshot['intel']): string {
  const candidates = remoteCandidates(intel);
  if (candidates.length === 0) return 'remoteCandidates: none';

  const parts = candidates.map((room) => {
    const mineral = room.mineral ? ` mineral:${room.mineral}` : '';
    return `${room.name}(age:${room.age} src:${room.sources ?? '?'}${mineral})`;
  });
  return `remoteCandidates: ${parts.join(', ')}`;
}

function intelRoomLine(room: StatsSnapshot['intel']['rooms'][number]): string {
  const owner = room.owner ? ` owner:${room.owner}` : '';
  const reserver = room.reserver ? ` reserver:${room.reserver}` : '';
  const danger = room.dangerFor > 0 ? ` danger:${room.dangerFor}` : '';
  const mineral = room.mineral ? ` mineral:${room.mineral}` : '';
  return `${room.name} age:${room.age} hostiles:${room.hostileCreeps}/${room.hostileStructures} src:${room.sources ?? '?'}${danger}${owner}${reserver}${mineral}`;
}

function buildSnapshot(): StatsSnapshot {
  const rooms = ownedRooms();

  return {
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
      controller: controllerTelemetry(room),
      economy: economyTelemetry(room),
      defense: defenseTelemetry(room),
      spawns: spawnTelemetry(room),
      spawnRequests: spawnRequestsTelemetry(room),
      roles: rolesTelemetry(room),
      plan: planToTelemetry(room),
      upgrades: upgradesTelemetry(room),
    })),
  };
}

export function reportStatsEvery(ticks: number = 50): void {
  if (Game.time % ticks !== 0) return;

  const stats = buildSnapshot();

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
      console.log(`${INDENT}${INDENT}${economyToLine(room.economy)}`);
      console.log(`${INDENT}${INDENT}${controllerToLine(room.controller)}`);
      console.log(`${INDENT}${INDENT}${defenseToLine(room.defense)}`);
      console.log(`${INDENT}${INDENT}${spawnsToLine(room.spawns)}`);

      const rolesLine = orderedRoleEntries(room.roles)
        .map(([role, v]) => `${role}:${v.current}/${v.target}`)
        .join(', ');
      console.log(`${INDENT}${INDENT}roles: ${rolesLine}`);
      console.log(`${INDENT}${INDENT}${spawnRequestsToLine(room.spawnRequests)}`);
      console.log(`${INDENT}${INDENT}${planToLine(room.plan)}`);
      console.log(`${INDENT}${INDENT}${upgradesToLine(room.upgrades)}`);
    }
  }
  console.log(`${INDENT}${remoteCandidatesToLine(stats.intel)}`);

  console.log(`INTEL`);
  if (stats.intel.rooms.length === 0) {
    console.log(`${INDENT}none`);
  } else {
    for (const room of stats.intel.rooms) {
      console.log(`${INDENT}${intelRoomLine(room)}`);
    }
  }

  console.log(`-------------------------------`);
}
