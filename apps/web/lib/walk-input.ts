export type WalkInput = {
  keyboard: Set<string>;
  buttons: Set<string>;
  yaw: number;
  pitch: number;
};
export function createWalkInput(): WalkInput {
  return { keyboard: new Set(), buttons: new Set(), yaw: Math.PI, pitch: 0 };
}
export const walkKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
export function walkVelocity(input: WalkInput, speed = 2.6) {
  const has = (key: string) =>
    input.keyboard.has(key) || input.buttons.has(key);
  let forward =
    Number(has("KeyW") || has("ArrowUp")) -
    Number(has("KeyS") || has("ArrowDown"));
  let right =
    Number(has("KeyD") || has("ArrowRight")) -
    Number(has("KeyA") || has("ArrowLeft"));
  const len = Math.hypot(forward, right);
  if (!len) return { x: 0, z: 0 };
  forward /= len;
  right /= len;
  return {
    x: (-Math.sin(input.yaw) * forward + Math.cos(input.yaw) * right) * speed,
    z: (-Math.cos(input.yaw) * forward - Math.sin(input.yaw) * right) * speed,
  };
}
export function lookBy(input: WalkInput, dx: number, dy: number) {
  input.yaw -= dx * 0.004;
  input.pitch = Math.max(-1.35, Math.min(1.35, input.pitch - dy * 0.003));
}
export function clearWalkInput(input: WalkInput) {
  input.keyboard.clear();
  input.buttons.clear();
}
