import { describe, it, expect } from "vitest";
import {
  createWalkInput,
  walkVelocity,
  lookBy,
  clearWalkInput,
} from "../lib/walk-input";
describe("walk without pointer lock", () => {
  it("W moves forward without any browser lock state", () => {
    const i = createWalkInput();
    i.keyboard.add("KeyW");
    expect(walkVelocity(i).z).toBeCloseTo(2.6);
    expect(walkVelocity(i).x).toBeCloseTo(0);
  });
  it("screen buttons and keyboard produce the same movement", () => {
    const a = createWalkInput(),
      b = createWalkInput();
    a.keyboard.add("ArrowUp");
    b.buttons.add("KeyW");
    expect(walkVelocity(a)).toEqual(walkVelocity(b));
  });
  it("diagonal movement does not increase speed", () => {
    const i = createWalkInput();
    i.keyboard.add("KeyW");
    i.buttons.add("KeyD");
    const v = walkVelocity(i);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(2.6);
  });
  it("drag adjusts yaw and clamps pitch", () => {
    const i = createWalkInput();
    lookBy(i, 100, 10000);
    expect(i.yaw).toBeCloseTo(Math.PI - 0.4);
    expect(i.pitch).toBe(-1.35);
  });
  it("clear stops both keyboard and held buttons", () => {
    const i = createWalkInput();
    i.keyboard.add("KeyW");
    i.buttons.add("KeyD");
    clearWalkInput(i);
    expect(walkVelocity(i)).toEqual({ x: 0, z: 0 });
  });
});
