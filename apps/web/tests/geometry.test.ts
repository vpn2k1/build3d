import { describe, it, expect } from "vitest";
import { demo, parseProject, issues, validPolygon, blank } from "../lib/model";
import { wallBlocks, inside, spawnPoint } from "../lib/geometry";
describe("geometry and project contract", () => {
  it("retains semantic data in JSON round trip", () => {
    const p = demo();
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it("subtracts exact opening volume and leaves door passage", () => {
    const w = {
      id: "w",
      start: [0, 0] as [number, number],
      end: [5, 0] as [number, number],
      height: 3,
      thickness: 0.2,
      status: "confirmed" as const,
    };
    const o = {
      id: "d",
      wallId: "w",
      type: "door" as const,
      offset: 2,
      width: 1,
      height: 2.2,
      sillHeight: 0,
      status: "confirmed" as const,
    };
    const blocks = wallBlocks(w, [o]);
    const volume = blocks.reduce(
      (n, b) => n + b.size[0] * b.size[1] * b.size[2],
      0,
    );
    expect(volume).toBeCloseTo((5 * 3 - 2.2) * 0.2, 10);
    expect(
      blocks.some(
        (b) =>
          Math.abs(b.center[0] - 2.5) < b.size[0] / 2 &&
          b.center[1] - b.size[1] / 2 < 2.19,
      ),
    ).toBe(false);
  });
  it("window keeps wall below sill and above head", () => {
    const p = demo(),
      w = p.floors[0].walls[0],
      o = p.floors[0].openings.find((o) => o.type === "window")!;
    const chunks = wallBlocks(w, [o]);
    expect(
      chunks.filter(
        (b) => b.center[0] > o.offset && b.center[0] < o.offset + o.width,
      ),
    ).toHaveLength(2);
  });
  it("rejects overlap and out-of-bounds openings", () => {
    const p = demo();
    p.floors[0].openings.push({ ...p.floors[0].openings[0], id: "dup" });
    expect(() => parseProject(p)).toThrow(/chồng/);
    p.floors[0].openings.pop();
    p.floors[0].openings[0].offset = 100;
    expect(() => parseProject(p)).toThrow(/ngoài/);
  });
  it("rejects duplicate ids, zero-length walls and crossing slab", () => {
    const p = demo();
    p.floors[0].walls[1].id = "w1";
    expect(issues(p).join()).toContain("ID");
    p.floors[0].walls[0].end = p.floors[0].walls[0].start;
    expect(issues(p).join()).toContain("ngắn");
    expect(
      validPolygon([
        [0, 0],
        [3, 3],
        [0, 3],
        [3, 0],
      ]),
    ).toBe(false);
  });
  it("does not invent a slab for blank or open geometry", () => {
    expect(blank().floors[0].slabs).toEqual([]);
  });
  it("spawns inside confirmed sample floor without wall intersection", () => {
    const p = demo(),
      f = p.floors[0],
      blocks = f.walls.flatMap((w) => wallBlocks(w, f.openings));
    const spawn = spawnPoint(f.slabs[0].polygon, blocks);
    expect(spawn).not.toBeNull();
    expect(inside(spawn!, f.slabs[0].polygon)).toBe(true);
  });
  it("rejects remote image URLs and nonfinite geometry", () => {
    const p: any = demo();
    p.image = {
      dataUrl: "https://example.com/a.png",
      width: 100,
      height: 100,
      rotation: 0,
    };
    expect(() => parseProject(p)).toThrow();
    delete p.image;
    p.floors[0].walls[0].start[0] = Infinity;
    expect(() => parseProject(p)).toThrow();
  });
});
