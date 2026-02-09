type RepairNeedOpts = {
  containerBelow?: number; // e.g. 0.9 means repair if < 90%
  roadBelow?: number; // e.g. 0.4 means repair if < 40%
  minMissingHits?: number; // total missing hits needed before we care
  minTargets?: number; // minimum number of damaged targets
};

export function repairsNeeded(room: Room, opts: RepairNeedOpts = {}): boolean {
  const containerBelow = opts.containerBelow ?? 0.9;
  const roadBelow = opts.roadBelow ?? 0.4;
  const minMissingHits = opts.minMissingHits ?? 5000;
  const minTargets = opts.minTargets ?? 1;

  let missingHits = 0;
  let targets = 0;

  const addIfDamaged = (s: Structure, below: number) => {
    if (s.hits <= 0) return;
    const ratio = s.hits / s.hitsMax;
    if (ratio >= below) return;

    targets++;
    missingHits += s.hitsMax - s.hits;
  };

  for (const s of room.find(FIND_STRUCTURES)) {
    if (s.structureType === STRUCTURE_CONTAINER)
      addIfDamaged(s, containerBelow);
    else if (s.structureType === STRUCTURE_ROAD) addIfDamaged(s, roadBelow);

    if (targets >= minTargets && missingHits >= minMissingHits) return true;
  }

  return targets >= minTargets && missingHits >= minMissingHits;
}
