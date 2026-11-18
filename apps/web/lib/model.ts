import { z } from "zod";
export const Point = z.tuple([
  z.number().finite().min(-10000).max(10000),
  z.number().finite().min(-10000).max(10000),
]);
const status = z.enum(["detected", "estimated", "confirmed"]);
const WallSchema = z.object({
  id: z.string().min(1),
  start: Point,
  end: Point,
  thickness: z.number().min(0.05).max(2),
  height: z.number().min(1).max(10),
  status,
  confidence: z.number().min(0).max(1).optional(),
});
const OpeningSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["door", "window"]),
  wallId: z.string(),
  offset: z.number().min(0),
  width: z.number().min(0.2).max(10),
  height: z.number().min(0.2).max(10),
  sillHeight: z.number().min(0).max(10),
  status,
  confidence: z.number().min(0).max(1).optional(),
});
export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  name: z.string().min(1).max(100),
  unit: z.literal("m"),
  revision: z.number().int().min(0),
  calibration: z.object({
    metersPerPixel: z.number().finite().positive(),
    confirmed: z.boolean(),
    reference: z.array(Point).optional(),
    distance: z.number().finite().positive().optional(),
  }),
  image: z
    .object({
      dataUrl: z
        .string()
        .max(30000000)
        .regex(/^data:image\/(png|jpeg);base64,/),
      width: z.number().finite().positive(),
      height: z.number().finite().positive(),
      rotation: z.number(),
      crop: z.array(z.number()).optional(),
      originalDataUrl: z
        .string()
        .max(30000000)
        .regex(/^data:image\/(png|jpeg);base64,/)
        .optional(),
    })
    .optional(),
  recognition: z
    .object({
      sourceTransform: z.object({
        resizeRatio: z.number().finite().positive(),
        deskewApplied: z.boolean(),
        estimatedSkewDegrees: z.number(),
        deskewMatrix: z.array(z.array(z.number())).optional(),
        inverseDeskewMatrix: z.array(z.array(z.number())).optional(),
      }),
      warnings: z.array(z.string()),
      ocr: z.array(
        z.object({
          text: z.string(),
          confidence: z.number(),
          box: z.array(z.array(z.number())),
          status: z.literal("detected"),
        }),
      ),
      elapsedSeconds: z.number().nonnegative(),
    })
    .optional(),
  floors: z
    .array(
      z.object({
        id: z.string(),
        elevation: z.number().finite(),
        height: z.number().min(1).max(10),
        walls: z.array(WallSchema).max(2000),
        openings: z.array(OpeningSchema).max(2000),
        rooms: z.array(
          z.object({ id: z.string(), name: z.string(), center: Point }),
        ),
        slabs: z.array(
          z.object({
            id: z.string(),
            polygon: z.array(Point).min(3).max(500),
            status,
          }),
        ),
      }),
    )
    .length(1),
});
export type Project = z.infer<typeof ProjectSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Vec2 = [number, number];
export const length = (w: Wall) =>
  Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]);
export function polygonArea(p: Vec2[]) {
  return (
    Math.abs(
      p.reduce((s, a, i) => {
        const b = p[(i + 1) % p.length];
        return s + a[0] * b[1] - b[0] * a[1];
      }, 0),
    ) / 2
  );
}
function cross(a: Vec2, b: Vec2, c: Vec2) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
export function validPolygon(p: Vec2[]) {
  if (p.length < 3 || polygonArea(p) < 0.01) return false;
  for (let i = 0; i < p.length; i++) {
    if (
      Math.hypot(
        p[i][0] - p[(i + 1) % p.length][0],
        p[i][1] - p[(i + 1) % p.length][1],
      ) < 0.001
    )
      return false;
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      const a = p[i],
        b = p[(i + 1) % p.length],
        c = p[j],
        d = p[(j + 1) % p.length];
      if (
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0
      )
        return false;
    }
  }
  return true;
}
export function issues(p: Project): string[] {
  const f = p.floors[0],
    out: string[] = [];
  const ids = [
    f.id,
    ...f.walls.map((w) => w.id),
    ...f.openings.map((o) => o.id),
    ...f.slabs.map((s) => s.id),
    ...f.rooms.map((r) => r.id),
  ];
  if (new Set(ids).size !== ids.length) out.push("ID phải duy nhất.");
  for (const w of f.walls) {
    if (length(w) < 0.1) out.push(`Tường ${w.id} ngắn hơn 0.1 m.`);
  }
  for (const o of f.openings) {
    const w = f.walls.find((w) => w.id === o.wallId);
    if (
      !w ||
      o.offset + o.width > length(w) + 1e-6 ||
      o.sillHeight + o.height > w.height + 1e-6
    )
      out.push(`Lỗ mở ${o.id} nằm ngoài tường.`);
    if (o.type === "door" && o.sillHeight !== 0)
      out.push(`Cửa đi ${o.id} cần cao độ 0.`);
    for (const b of f.openings) {
      if (
        o.id < b.id &&
        o.wallId === b.wallId &&
        o.offset < b.offset + b.width &&
        o.offset + o.width > b.offset &&
        o.sillHeight < b.sillHeight + b.height &&
        o.sillHeight + o.height > b.sillHeight
      )
        out.push(`Lỗ mở ${o.id} chồng lấn ${b.id}.`);
    }
  }
  for (const s of f.slabs)
    if (!validPolygon(s.polygon)) out.push(`Sàn ${s.id} không hợp lệ.`);
  return out;
}
export function parseProject(raw: unknown) {
  const p = ProjectSchema.parse(raw),
    errors = issues(p);
  if (errors.length) throw Error(errors.join("\n"));
  return p;
}
export function bounds(p: Project) {
  const pts = p.floors[0].walls.flatMap((w) => [w.start, w.end]);
  if (p.image) {
    pts.push(
      [0, 0],
      [
        p.image.width * p.calibration.metersPerPixel,
        p.image.height * p.calibration.metersPerPixel,
      ],
    );
  }
  if (!pts.length) return { minX: 0, minZ: 0, maxX: 10, maxZ: 12 };
  return {
    minX: Math.min(...pts.map((p) => p[0])),
    maxX: Math.max(...pts.map((p) => p[0])),
    minZ: Math.min(...pts.map((p) => p[1])),
    maxZ: Math.max(...pts.map((p) => p[1])),
  };
}
export function demo(): Project {
  const segs: [Vec2, Vec2][] = [
    [
      [0, 0],
      [10, 0],
    ],
    [
      [10, 0],
      [10, 12],
    ],
    [
      [10, 12],
      [0, 12],
    ],
    [
      [0, 12],
      [0, 0],
    ],
    [
      [0, 4],
      [10, 4],
    ],
    [
      [3.5, 0],
      [3.5, 4],
    ],
    [
      [6.5, 0],
      [6.5, 4],
    ],
    [
      [3.5, 4],
      [3.5, 8],
    ],
    [
      [0, 8],
      [3.5, 8],
    ],
    [
      [7, 4],
      [7, 12],
    ],
  ];
  return {
    schemaVersion: 1,
    projectId: "demo-" + Date.now(),
    name: "Nhà mẫu · 1 tầng",
    unit: "m",
    revision: 0,
    calibration: { metersPerPixel: 0.01, confirmed: true },
    floors: [
      {
        id: "floor-1",
        height: 3.2,
        elevation: 0,
        walls: segs.map(([start, end], i) => ({
          id: "w" + (i + 1),
          start,
          end,
          thickness: 0.2,
          height: 3.2,
          status: "confirmed",
        })),
        openings: [
          {
            id: "d1",
            type: "door",
            wallId: "w3",
            offset: 4,
            width: 1.2,
            height: 2.2,
            sillHeight: 0,
            status: "confirmed",
          },
          {
            id: "d2",
            type: "door",
            wallId: "w5",
            offset: 2,
            width: 0.9,
            height: 2.2,
            sillHeight: 0,
            status: "confirmed",
          },
          {
            id: "d3",
            type: "door",
            wallId: "w5",
            offset: 4.5,
            width: 0.9,
            height: 2.2,
            sillHeight: 0,
            status: "confirmed",
          },
          {
            id: "d4",
            type: "door",
            wallId: "w5",
            offset: 7.5,
            width: 0.9,
            height: 2.2,
            sillHeight: 0,
            status: "confirmed",
          },
          {
            id: "d5",
            type: "door",
            wallId: "w8",
            offset: 2,
            width: 0.9,
            height: 2.2,
            sillHeight: 0,
            status: "confirmed",
          },
          {
            id: "d6",
            type: "door",
            wallId: "w10",
            offset: 4,
            width: 1.1,
            height: 2.2,
            sillHeight: 0,
            status: "confirmed",
          },
          ...[1, 2, 4].map((n, i) => ({
            id: "win" + n,
            type: "window" as const,
            wallId: "w" + n,
            offset: i === 0 ? 1 : 5,
            width: 1.6,
            height: 1.3,
            sillHeight: 1,
            status: "confirmed" as const,
          })),
        ],
        rooms: [
          { id: "r1", name: "PHÒNG NGỦ 01", center: [1.75, 2] },
          { id: "r2", name: "WC", center: [5, 2] },
          { id: "r3", name: "PHÒNG NGỦ 02", center: [8.25, 2] },
          { id: "r4", name: "PHÒNG LÀM VIỆC", center: [1.75, 6] },
          { id: "r5", name: "PHÒNG KHÁCH", center: [5, 9] },
          { id: "r6", name: "BẾP + ĂN", center: [8.5, 8] },
        ],
        slabs: [
          {
            id: "s1",
            polygon: [
              [0, 0],
              [10, 0],
              [10, 12],
              [0, 12],
            ],
            status: "confirmed",
          },
        ],
      },
    ],
  };
}
export function blank(): Project {
  const p = demo();
  p.projectId = crypto.randomUUID();
  p.name = "Dự án mới";
  p.calibration.confirmed = false;
  p.floors[0].walls = [];
  p.floors[0].openings = [];
  p.floors[0].rooms = [];
  p.floors[0].slabs = [];
  return p;
}
export function download(data: BlobPart, name: string, type: string) {
  const u = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
