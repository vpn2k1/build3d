import { beforeAll, expect, it } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { wallBlocks } from "../lib/geometry";
beforeAll(async () => {
  await RAPIER.init();
}, 20000);
function crossWall(x: number) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.1, 20).setTranslation(0, -0.1, 0),
  );
  const wall = {
    id: "w",
    start: [0, 0] as [number, number],
    end: [5, 0] as [number, number],
    height: 3,
    thickness: 0.2,
    status: "confirmed" as const,
  };
  const opening = {
    id: "d",
    wallId: "w",
    type: "door" as const,
    offset: 2,
    width: 1,
    height: 2.2,
    sillHeight: 0,
    status: "confirmed" as const,
  };
  for (const b of wallBlocks(wall, [opening]))
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        b.size[0] / 2,
        b.size[1] / 2,
        b.size[2] / 2,
      ).setTranslation(...b.center),
    );
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, 0.85, -2)
      .lockRotations()
      .setCcdEnabled(true),
  );
  world.createCollider(
    RAPIER.ColliderDesc.capsule(0.55, 0.25).setFriction(0),
    body,
  );
  for (let i = 0; i < 120; i++) {
    body.setLinvel({ x: 0, y: body.linvel().y, z: 2 }, true);
    world.step();
  }
  const z = body.translation().z;
  world.free();
  return z;
}
it("capsule stops at closed wall", () =>
  expect(crossWall(0.6)).toBeLessThan(-0.3));
it("capsule passes through open door", () =>
  expect(crossWall(2.5)).toBeGreaterThan(1.5));
