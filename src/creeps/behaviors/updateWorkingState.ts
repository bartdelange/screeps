export type WorkPhase = "gather" | "work";

type UpdateWorkingStateOpts = {
  energyResource?: ResourceConstant;
  onStartWorking?: () => void;
  onStopWorking?: () => void;
};

export function updateWorkingState(
  creep: Creep,
  opts?: UpdateWorkingStateOpts,
): WorkPhase {
  const resource = opts?.energyResource ?? RESOURCE_ENERGY;

  if (creep.memory.working && creep.store.getUsedCapacity(resource) === 0) {
    creep.memory.working = false;
    opts?.onStopWorking?.();
  }

  if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
    opts?.onStartWorking?.();
  }

  return creep.memory.working ? "work" : "gather";
}
