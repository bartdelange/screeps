import { getRoomCreeps } from "../../utils/roomCreeps";
import type { RoleName } from "../../config";
import type { EnergyWithdrawPolicy } from "./energyAcquirePolicy";
import type { EnergyDepositPolicy } from "./energyDepositPolicy";

type RoleEnergyAcquirePolicy = {
  withdrawPolicy: EnergyWithdrawPolicy;
  allowHarvest: boolean;
  harvestOnlyWhenNoMiners?: boolean;
};

const DEFAULT_WITHDRAW_POLICY: EnergyWithdrawPolicy = {
  excludeLinkRoles: ["source", "hub", "storage", "controller"],
  includeDropped: false,
};

const MOVER_WITHDRAW_POLICY: EnergyWithdrawPolicy = {
  excludeLinkRoles: ["source", "hub", "controller"],
  includeDropped: true,
  preferLinkRoles: ["storage"],
};

const UPGRADER_WITHDRAW_POLICY: EnergyWithdrawPolicy = {
  excludeLinkRoles: ["source", "hub", "storage"],
  includeDropped: false,
  preferLinkRoles: ["controller"],
};

const DEFAULT_ACQUIRE_POLICY: RoleEnergyAcquirePolicy = {
  withdrawPolicy: DEFAULT_WITHDRAW_POLICY,
  allowHarvest: true,
  harvestOnlyWhenNoMiners: true,
};

const ROLE_ACQUIRE_POLICIES: Partial<Record<RoleName, RoleEnergyAcquirePolicy>> = {
  mover: {
    withdrawPolicy: MOVER_WITHDRAW_POLICY,
    allowHarvest: false,
  },
  upgrader: {
    withdrawPolicy: UPGRADER_WITHDRAW_POLICY,
    allowHarvest: true,
    harvestOnlyWhenNoMiners: true,
  },
  builder: DEFAULT_ACQUIRE_POLICY,
  harvester: {
    withdrawPolicy: DEFAULT_WITHDRAW_POLICY,
    allowHarvest: true,
  },
  miner: {
    withdrawPolicy: DEFAULT_WITHDRAW_POLICY,
    allowHarvest: true,
  },
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
  if (!role) return DEFAULT_ACQUIRE_POLICY;
  return ROLE_ACQUIRE_POLICIES[role] ?? DEFAULT_ACQUIRE_POLICY;
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
