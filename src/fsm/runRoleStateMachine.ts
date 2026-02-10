type RoleStateMachineOpts<TState extends string, TResult> = {
  memoryKey?: string;
  isState: (value: unknown) => value is TState;
  getInitialState: (creep: Creep) => TState;
  switchState: (creep: Creep, current: TState) => TState;
  runState: (creep: Creep, state: TState) => TResult;
};

export function runRoleStateMachine<TState extends string, TResult>(
  creep: Creep,
  opts: RoleStateMachineOpts<TState, TResult>,
): TResult {
  const memoryKey = opts.memoryKey ?? "_state";
  const mem = creep.memory as Record<string, unknown>;
  const rawState = mem[memoryKey];
  const current = opts.isState(rawState)
    ? rawState
    : opts.getInitialState(creep);
  const next = opts.switchState(creep, current);

  mem[memoryKey] = next;
  return opts.runState(creep, next);
}

