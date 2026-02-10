import { getRoomLinks } from "./helpers/getRoomLinks";

export function runLinks(room: Room): void {
  if (!room.controller?.my) return;
  const { source, hub, controller, storage } = getRoomLinks(room);

  // console.log(
  //   `Room ${room.name} has ${source.length} source links, ${hub.length} hub links, ${controller.length} controller links, and ${storage.length} storage links.`,
  // );

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
