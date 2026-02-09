import { getRoomCreeps } from "../../utils/roomCreeps";
import type { EnergyWithdrawPolicy } from "./energyAcquirePolicy";
import type { EnergyDepositPolicy } from "./energyDepositPolicy";

type RoleEnergyAcquirePolicy = {
  withdrawPolicy: EnergyWithdrawPolicy;
  allowHarvest: boolean;
  harvestOnlyWhenNoMiners?: boolean;
};

const DEFAULT_WITHDRAW_POLICY: EnergyWithdrawPolicy = {
  excludeLinkRoles: ["source"],
  includeDropped: false,
};

const MOVER_WITHDRAW_POLICY: EnergyWithdrawPolicy = {
  ...DEFAULT_WITHDRAW_POLICY,
  includeDropped: false,
  preferLinkRoles: ["storage"],
};

const OPERATIONAL_ENERGY_SINKS: StructureConstant[] = [
  STRUCTURE_TOWER,
  STRUCTURE_LAB,
  STRUCTURE_POWER_SPAWN,
  STRUCTURE_NUKER,
  STRUCTURE_FACTORY,
];

const DEFAULT_DEPOSIT_POLICY: EnergyDepositPolicy = {
  priorityTiers: [
    [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
    OPERATIONAL_ENERGY_SINKS,
    [STRUCTURE_STORAGE],
  ],
};

export function getEnergyAcquirePolicyForRole(
  creep: Creep,
): RoleEnergyAcquirePolicy {
  const role = creep.memory.role;

  if (role === "mover") {
    return {
      withdrawPolicy: MOVER_WITHDRAW_POLICY,
      allowHarvest: false,
    };
  }

  if (role === "builder" || role === "upgrader") {
    return {
      withdrawPolicy: DEFAULT_WITHDRAW_POLICY,
      allowHarvest: true,
      harvestOnlyWhenNoMiners: true,
    };
  }

  if (role === "harvester" || role === "miner") {
    return {
      withdrawPolicy: DEFAULT_WITHDRAW_POLICY,
      allowHarvest: true,
    };
  }

  return {
    withdrawPolicy: DEFAULT_WITHDRAW_POLICY,
    allowHarvest: true,
    harvestOnlyWhenNoMiners: true,
  };
}

export function canHarvestByRolePolicy(
  creep: Creep,
  policy: RoleEnergyAcquirePolicy,
): boolean {
  if (!policy.allowHarvest) return false;
  if (!policy.harvestOnlyWhenNoMiners) return true;

  return getRoomCreeps(creep.room, {
    role: "miner",
    includeRetiring: false,
  }).length === 0;
}

function getMoverDepositPolicy(creep: Creep): EnergyDepositPolicy {
  const room = creep.room;
  const criticalSpawnEnergy = Math.min(300, room.energyCapacityAvailable);
  const isLowEnergyForSpawning = room.energyAvailable < criticalSpawnEnergy;

  if (isLowEnergyForSpawning) {
    return {
      priorityTiers: [
        [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
        OPERATIONAL_ENERGY_SINKS,
        [STRUCTURE_STORAGE],
      ],
    };
  }

  return {
    priorityTiers: [
      [STRUCTURE_SPAWN],
      OPERATIONAL_ENERGY_SINKS,
      [STRUCTURE_EXTENSION],
      [STRUCTURE_STORAGE],
    ],
  };
}

export function getEnergyDepositPolicyForRole(creep: Creep): EnergyDepositPolicy {
  if (creep.memory.role === "mover") return getMoverDepositPolicy(creep);

  return DEFAULT_DEPOSIT_POLICY;
}
