"use client";
import {
  Stage,
  Layer,
  Line,
  Circle,
  Text,
  Group,
  Image as KImage,
  Rect,
} from "react-konva";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Project, Vec2, bounds, length } from "@/lib/model";
export type Tool =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "scale"
  | "crop"
  | "slab"
  | "pan";
export default function Editor({
  project: p,
  tool,
  selected,
  onSelect,
  onDraw,
  onMove,
  onPair,
  onSlab,
  snap,
  zoomTick,
}: {
  project: Project;
  tool: Tool;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onDraw: (a: Vec2, b: Vec2) => void;
  onMove: (id: string, dx: number, dz: number) => void;
  onPair: (tool: Tool, a: Vec2, b: Vec2) => void;
  onSlab: (pts: Vec2[]) => void;
  snap: boolean;
  zoomTick: number;
}) {
  const container = useRef<HTMLDivElement>(null),
    stage = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 500, height: 600 }),
    [view, setView] = useState({ x: 50, y: 70, scale: 35 }),
    [points, setPoints] = useState<Vec2[]>([]),
    [cursor, setCursor] = useState<Vec2 | null>(null),
    [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    const r = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    if (container.current) r.observe(container.current);
    return () => r.disconnect();
  }, []);
  useEffect(() => {
    const b = bounds(p),
      s = Math.min(
        (size.width - 100) / Math.max(1, b.maxX - b.minX),
        (size.height - 120) / Math.max(1, b.maxZ - b.minZ),
      );
    setView({
      x: (size.width - (b.maxX - b.minX) * s) / 2 - b.minX * s,
      y: (size.height - (b.maxZ - b.minZ) * s) / 2 - b.minZ * s,
      scale: Math.max(1, s),
    });
  }, [p.projectId, size, zoomTick, p.image?.width, p.image?.height]);
  useEffect(() => {
    setPoints([]);
    setCursor(null);
  }, [tool, p.projectId]);
  useEffect(() => {
    if (!p.image) {
      setImage(undefined);
      return;
    }
    const im = new window.Image();
    im.onload = () => setImage(im);
    im.src = p.image.dataUrl;
  }, [p.image?.dataUrl]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "Escape") setPoints([]);
      if (e.key === "Enter" && tool === "slab" && points.length >= 3) {
        onSlab(points);
        setPoints([]);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [points, tool, onSlab]);
  const f = p.floors[0],
    s = view.scale;
  function pointer(): Vec2 | null {
    const st = stage.current,
      pt = st?.getPointerPosition();
    if (!st || !pt) return null;
    let x = (pt.x - view.x) / s,
      z = (pt.y - view.y) / s;
    if (snap && !["scale", "crop"].includes(tool)) {
      const ends = f.walls.flatMap((w) => [w.start, w.end]);
      const near = ends.find((e) => Math.hypot(e[0] - x, e[1] - z) < 10 / s);
      if (near) return near;
      x = Math.round(x * 10) / 10;
      z = Math.round(z * 10) / 10;
    }
    return [x, z];
  }
  function click() {
    const pt = pointer();
    if (!pt) return;
    if (tool === "select") {
      onSelect(null);
      return;
    }
    if (tool === "pan" || tool === "door" || tool === "window") return;
    if (tool === "slab") {
      setPoints([...points, pt]);
      return;
    }
    if (!points.length) setPoints([pt]);
    else {
      if (tool === "wall") onDraw(points[0], pt);
      else onPair(tool, points[0], pt);
      setPoints([]);
    }
  }
  const grid = [];
  const gx = Math.floor(-view.x / s),
    gz = Math.floor(-view.y / s);
  for (let i = gx; i < (size.width - view.x) / s; i++)
    grid.push(
      <Line
        key={"x" + i}
        points={[i, gz, i, gz + size.height / s + 2]}
        stroke="#e4eaf3"
        strokeWidth={1 / s}
        listening={false}
      />,
    );
  for (let i = gz; i < (size.height - view.y) / s; i++)
    grid.push(
      <Line
        key={"z" + i}
        points={[gx, i, gx + size.width / s + 2, i]}
        stroke="#e4eaf3"
        strokeWidth={1 / s}
        listening={false}
      />,
    );
  return (
    <div ref={container} className={"editor-canvas tool-" + tool}>
      <Stage
        ref={stage}
        width={size.width}
        height={size.height}
        x={view.x}
        y={view.y}
        scaleX={s}
        scaleY={s}
        draggable={tool === "pan"}
        onDragEnd={(e) => {
          if (e.target === stage.current)
            setView({ ...view, x: e.target.x(), y: e.target.y() });
        }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const pt = stage.current?.getPointerPosition();
          if (!pt) return;
          const ns = Math.max(
            3,
            Math.min(250, s * (e.evt.deltaY < 0 ? 1.12 : 1 / 1.12)),
          );
          setView({
            scale: ns,
            x: pt.x - ((pt.x - view.x) / s) * ns,
            y: pt.y - ((pt.y - view.y) / s) * ns,
          });
        }}
        onMouseMove={() => setCursor(pointer())}
        onClick={click}
        onTap={click}
      >
        <Layer>
          {grid}
          {image && p.image && (
            <KImage
              image={image}
              width={p.image.width * p.calibration.metersPerPixel}
              height={p.image.height * p.calibration.metersPerPixel}
              opacity={0.62}
              listening={false}
            />
          )}{" "}
          {f.slabs.map((sl) => (
            <Line
              key={sl.id}
              points={sl.polygon.flat()}
              closed
              fill={image ? "#e2edff22" : "#f0f5fcaa"}
              stroke="#c6d3e4"
              strokeWidth={1 / s}
              listening={false}
            />
          ))}
          {f.walls.map((w) => (
            <Group
              key={w.id}
              draggable={tool === "select"}
              onDragEnd={(e) => {
                const dx = e.target.x(),
                  dz = e.target.y();
                e.target.position({ x: 0, y: 0 });
                onMove(
                  w.id,
                  snap ? Math.round(dx * 10) / 10 : dx,
                  snap ? Math.round(dz * 10) / 10 : dz,
                );
              }}
              onClick={(e) => {
                if (tool === "select" || tool === "door" || tool === "window") {
                  e.cancelBubble = true;
                  onSelect(w.id);
                  if (tool !== "select") {
                    const pt = pointer();
                    if (pt) onPair(tool, pt, [0, 0]);
                  }
                }
              }}
              onTap={(e) => {
                if (tool === "select" || tool === "door" || tool === "window") {
                  e.cancelBubble = true;
                  onSelect(w.id);
                  if (tool !== "select") {
                    const pt = pointer();
                    if (pt) onPair(tool, pt, [0, 0]);
                  }
                }
              }}
            >
              <Line
                points={[...w.start, ...w.end]}
                stroke={
                  selected === w.id
                    ? "#2463eb"
                    : w.status === "confirmed"
                      ? "#485366"
                      : "#d78e26"
                }
                strokeWidth={w.thickness}
                hitStrokeWidth={Math.max(w.thickness, 12 / s)}
                lineCap="square"
              />
              <Line
                points={[...w.start, ...w.end]}
                stroke={selected === w.id ? "#c9dcff" : "#8793a4"}
                strokeWidth={0.025}
                listening={false}
              />
              {selected === w.id &&
                [w.start, w.end].map((pt, i) => (
                  <Circle
                    key={i}
                    x={pt[0]}
                    y={pt[1]}
                    radius={4 / s}
                    fill="white"
                    stroke="#2463eb"
                    strokeWidth={1.5 / s}
                  />
                ))}
              <Text
                x={(w.start[0] + w.end[0]) / 2 + 0.12}
                y={(w.start[1] + w.end[1]) / 2 - 0.35}
                text={length(w).toFixed(2) + " m"}
                fontSize={10 / s}
                fill="#768398"
                listening={false}
              />
            </Group>
          ))}
          {f.openings.map((o) => {
            const w = f.walls.find((w) => w.id === o.wallId);
            if (!w) return null;
            const a = Math.atan2(w.end[1] - w.start[1], w.end[0] - w.start[0]);
            return (
              <Group
                key={o.id}
                x={w.start[0] + o.offset * Math.cos(a)}
                y={w.start[1] + o.offset * Math.sin(a)}
                rotation={(a * 180) / Math.PI}
                onClick={(e) => {
                  if (tool === "select") {
                    e.cancelBubble = true;
                    onSelect(o.id);
                  }
                }}
              >
                <Rect
                  y={-w.thickness / 2 - 0.01}
                  width={o.width}
                  height={w.thickness + 0.02}
                  fill="#f8faff"
                />
                <Line
                  points={[
                    0,
                    -w.thickness / 2,
                    o.width,
                    -w.thickness / 2,
                    o.width,
                    w.thickness / 2,
                    0,
                    w.thickness / 2,
                  ]}
                  stroke={
                    selected === o.id
                      ? "#2463eb"
                      : o.type === "door"
                        ? "#6a7b91"
                        : "#4d9fc9"
                  }
                  strokeWidth={1.3 / s}
                />
                {o.type === "door" ? (
                  <>
                    <Line
                      points={[0, 0, 0, -o.width]}
                      stroke="#9daabd"
                      strokeWidth={1 / s}
                    />
                    <Line
                      points={Array.from({ length: 20 }, (_, i) => {
                        const angle = -Math.PI / 2 + ((i / 19) * Math.PI) / 2;
                        return [
                          Math.cos(angle) * o.width,
                          Math.sin(angle) * o.width,
                        ];
                      }).flat()}
                      stroke="#9daabd"
                      strokeWidth={1 / s}
                    />
                  </>
                ) : (
                  <Line
                    points={[0, 0, o.width, 0]}
                    stroke="#6bb4d6"
                    strokeWidth={2 / s}
                  />
                )}
              </Group>
            );
          })}
          {f.rooms.map((r) => (
            <Text
              key={r.id}
              x={r.center[0] - 1.5}
              y={r.center[1]}
              width={3}
              align="center"
              text={r.name}
              fill="#6a7a91"
              fontSize={9 / s}
              fontStyle="bold"
              listening={false}
            />
          ))}
          {points.length > 0 && (
            <>
              <Line
                points={[...points, ...(cursor ? [cursor] : [])].flat()}
                stroke="#2463eb"
                strokeWidth={2 / s}
                dash={[5 / s, 4 / s]}
                listening={false}
              />
              {points.map((pt, i) => (
                <Circle
                  key={i}
                  x={pt[0]}
                  y={pt[1]}
                  radius={4 / s}
                  fill="#2463eb"
                />
              ))}
              {tool === "crop" && cursor && (
                <Rect
                  x={Math.min(points[0][0], cursor[0])}
                  y={Math.min(points[0][1], cursor[1])}
                  width={Math.abs(points[0][0] - cursor[0])}
                  height={Math.abs(points[0][1] - cursor[1])}
                  stroke="#2463eb"
                  strokeWidth={2 / s}
                  fill="#2463eb22"
                />
              )}
            </>
          )}
        </Layer>
      </Stage>
      <div className="editor-coordinates">
        {cursor
          ? `X ${cursor[0].toFixed(2)}  ·  Z ${cursor[1].toFixed(2)} m`
          : "X 0.00  ·  Z 0.00 m"}
        <span> Lưới 1 m</span>
      </div>
      {tool === "slab" && points.length >= 3 && (
        <button
          className="finish-slab primary"
          onClick={() => {
            onSlab(points);
            setPoints([]);
          }}
        >
          Khép sàn ({points.length} điểm)
        </button>
      )}
    </div>
  );
}
