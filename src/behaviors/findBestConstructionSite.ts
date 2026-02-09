type SiteScoreOpts = {
  preferJoinWithin?: number;
  desiredMaxJoiners?: number;
};

function countAssignedBuilders(room: Room, siteId: Id<ConstructionSite>): number {
  let n = 0;
  for (const c of Object.values(Game.creeps)) {
    if (c.room.name !== room.name) continue;
    if (c.memory.role !== "builder") continue;
    if (!c.memory.working) continue;
    if (c.memory.buildTargetId !== siteId) continue;
    n++;
  }
  return n;
}

export function basePriority(site: ConstructionSite): number {
  switch (site.structureType) {
    case STRUCTURE_CONTAINER:
      return 1000;
    case STRUCTURE_SPAWN:
      return 900;
    case STRUCTURE_EXTENSION:
      return 750;
    case STRUCTURE_TOWER:
      return 700;
    case STRUCTURE_STORAGE:
      return 650;
    case STRUCTURE_ROAD:
      return 150;
    case STRUCTURE_RAMPART:
      return 80;
    case STRUCTURE_WALL:
      return 50;
    default:
      return 250;
  }
}

function isNearSource(site: ConstructionSite, room: Room, range: number): boolean {
  for (const s of room.find(FIND_SOURCES)) {
    if (site.pos.inRangeTo(s.pos, range)) return true;
  }
  return false;
}

function scoreSite(creep: Creep, site: ConstructionSite, o: Required<SiteScoreOpts>): number {
  const range = creep.pos.getRangeTo(site.pos);

  let score = basePriority(site);

  if (site.structureType === STRUCTURE_CONTAINER && isNearSource(site, creep.room, 2)) {
    score += 600;
  }

  const remaining = site.progressTotal - site.progress;
  if (remaining <= 200) score += 250;
  else if (remaining <= 500) score += 100;

  const assigned = countAssignedBuilders(creep.room, site.id);

  if (assigned > 0 && range <= o.preferJoinWithin) {
    score += 250;
    score += Math.min(assigned, 2) * 75;
  }

  if (assigned >= o.desiredMaxJoiners) {
    score -= (assigned - (o.desiredMaxJoiners - 1)) * 400;
  }

  score -= range * 10;

  return score;
}

export function findBestConstructionSite(creep: Creep, opts?: SiteScoreOpts): ConstructionSite | null {
  const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
  if (sites.length === 0) return null;

  const o: Required<SiteScoreOpts> = {
    preferJoinWithin: opts?.preferJoinWithin ?? 20,
    desiredMaxJoiners: opts?.desiredMaxJoiners ?? 2,
  };

  const currentId = creep.memory.buildTargetId;
  const current = currentId ? Game.getObjectById<ConstructionSite>(currentId) : null;

  let best: ConstructionSite | null = null;
  let bestScore = -Infinity;

  for (const s of sites) {
    const sc = scoreSite(creep, s, o);
    if (sc > bestScore) {
      bestScore = sc;
      best = s;
    }
  }

  if (current && current.pos.roomName === creep.room.name) {
    const curScore = scoreSite(creep, current, o);
    if (curScore >= bestScore - 150) {
      creep.memory.buildTargetId = current.id;
      return current;
    }
  }

  if (best) creep.memory.buildTargetId = best.id;
  return best;
}
