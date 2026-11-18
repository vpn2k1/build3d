import { Wall, Opening, length, Vec2 } from "./model";
export type Block = {
  center: [number, number, number];
  size: [number, number, number];
  angle: number;
  wallId: string;
};
export function wallBlocks(
  w: Wall,
  openings: Opening[],
  elevation = 0,
): Block[] {
  const L = length(w),
    a = Math.atan2(w.end[1] - w.start[1], w.end[0] - w.start[0]),
    os = openings.filter((o) => o.wallId === w.id);
  const xs = [
    ...new Set([0, L, ...os.flatMap((o) => [o.offset, o.offset + o.width])]),
  ].sort((a, b) => a - b);
  const blocks: Block[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i],
      x1 = xs[i + 1],
      mid = (x0 + x1) / 2;
    const spans = os
      .filter((o) => mid > o.offset && mid < o.offset + o.width)
      .map((o) => [o.sillHeight, o.sillHeight + o.height])
      .sort((a, b) => a[0] - b[0]);
    let y = 0;
    for (const [bottom, top] of [...spans, [w.height, w.height]]) {
      if (bottom > y + 1e-6)
        blocks.push({
          center: [
            w.start[0] + mid * Math.cos(a),
            elevation + (y + bottom) / 2,
            w.start[1] + mid * Math.sin(a),
          ],
          size: [x1 - x0, bottom - y, w.thickness],
          angle: -a,
          wallId: w.id,
        });
      y = Math.max(y, top);
    }
  }
  return blocks;
}
export function inside(p: Vec2, poly: Vec2[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      c = !c;
  }
  return c;
}
export function spawnPoint(poly: Vec2[], blocks: Block[]): Vec2 | null {
  const minX = Math.min(...poly.map((p) => p[0])),
    maxX = Math.max(...poly.map((p) => p[0])),
    minZ = Math.min(...poly.map((p) => p[1])),
    maxZ = Math.max(...poly.map((p) => p[1]));
  for (let z = minZ + 0.5; z < maxZ; z += 0.5)
    for (let x = minX + 0.5; x < maxX; x += 0.5) {
      if (!inside([x, z], poly)) continue;
      const blocked = blocks.some((b) => {
        const dx = x - b.center[0],
          dz = z - b.center[2],
          c = Math.cos(b.angle),
          s = Math.sin(b.angle);
        const lx = c * dx - s * dz,
          lz = s * dx + c * dz;
        return (
          Math.abs(lx) < b.size[0] / 2 + 0.3 &&
          Math.abs(lz) < b.size[2] / 2 + 0.3 &&
          b.center[1] - b.size[1] / 2 < 1.8
        );
      });
      if (!blocked) return [x, z];
    }
  return null;
}
