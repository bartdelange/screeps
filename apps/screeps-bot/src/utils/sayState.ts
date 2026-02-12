export function sayState(creep: Creep, state: string, publicSay = true) {
  if (creep.memory._lastState !== state) {
    creep.say(state, publicSay);
    creep.memory._lastState = state;
  }
}
