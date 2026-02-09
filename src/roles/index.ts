import { RoleName } from "../config";
import { runHarvester } from "./harvester";
import { runUpgrader } from "./upgrader";
import { runBuilder } from "./builder";
import { runMiner } from "./miner";
import { runMover } from "./mover";

export const roleRunners: Record<RoleName, (creep: Creep) => void> = {
  harvester: runHarvester,
  upgrader: runUpgrader,
  builder: runBuilder,
  miner: runMiner,
  mover: runMover,
};
