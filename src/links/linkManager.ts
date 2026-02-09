import { getRoomLinks } from "./helpers/getRoomLinks";

export function runLinks(): void {
  for (const room of Object.values(Game.rooms)) {
    if (!room.controller?.my) continue;
    const { source, hub, controller, storage } = getRoomLinks(room);

    const sinks = [...controller, ...storage].filter(
      (l) => l.store.getFreeCapacity(RESOURCE_ENERGY) > 0,
    );

    if (sinks.length === 0) return;

    const sources = [...source, ...hub].filter(
      (l) => l.store.getUsedCapacity(RESOURCE_ENERGY) >= 200,
    );

    for (const src of sources) {
      if (src.cooldown > 0) continue;

      const target = sinks[0];
      if (!target) break;

      src.transferEnergy(target);
    }
  }
}
