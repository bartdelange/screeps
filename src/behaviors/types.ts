export type ActResult = "done" | "not_found" | "not_in_range" | "blocked";

export type EnergyWithdrawTarget =
  | AnyStoreStructure
  | Resource<RESOURCE_ENERGY>;
