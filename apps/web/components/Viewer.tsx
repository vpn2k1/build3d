"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  CapsuleCollider,
  RapierRigidBody,
} from "@react-three/rapier";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  createWalkInput,
  clearWalkInput,
  walkKeys,
  walkVelocity,
  lookBy,
  type WalkInput,
} from "@/lib/walk-input";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Project, bounds, download } from "@/lib/model";
import { wallBlocks, spawnPoint } from "@/lib/geometry";
export default function Viewer({
  project,
  selected,
  onSelect,
  exportTick,
  walk,
  onWalkChange,
  top,
}: {
  project: Project;
  selected: string | null;
  onSelect: (id: string) => void;
  exportTick: number;
  walk: boolean;
  onWalkChange: (v: boolean) => void;
  top: boolean;
}) {
  const [error, setError] = useState("");
  const input = useRef(createWalkInput());
  const positionOutput = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    clearWalkInput(input.current);
  }, [walk]);
  const heldButton = (code: string, label: string, symbol: string) => (
    <button
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        input.current.buttons.add(code);
      }}
      onPointerUp={() => input.current.buttons.delete(code)}
      onPointerCancel={() => input.current.buttons.delete(code)}
      onLostPointerCapture={() => input.current.buttons.delete(code)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          input.current.buttons.add(code);
        }
      }}
      onKeyUp={() => input.current.buttons.delete(code)}
      onBlur={() => input.current.buttons.delete(code)}
    >
      {symbol}
    </button>
  );
  return (
    <div className="three-wrap">
      <Canvas
        fallback={
          <div className="loading">
            Trình duyệt chưa hỗ trợ WebGL. Bạn vẫn có thể chỉnh 2D và xuất JSON.
          </div>
        }
        shadows
        camera={{ position: [19, 17, 22], fov: 42, near: 0.05, far: 1000 }}
        onCreated={({ gl }) => gl.setClearColor("#eef2f8")}
      >
        <Suspense fallback={null}>
          <Scene
            {...{
              project,
              selected,
              onSelect,
              exportTick,
              walk,
              onWalkChange,
              top,
              setError,
              input: input.current,
              positionOutput,
            }}
          />
        </Suspense>
      </Canvas>
      {walk && (
        <div className="walk-help">
          <b>Khám phá công trình</b>
          <span>
            WASD / phím mũi tên để đi · Kéo khung 3D để nhìn · Esc thoát
          </span>
          <output
            ref={positionOutput}
            className="walk-position"
            aria-label="Vị trí nhân vật"
          >
            Đang đặt nhân vật…
          </output>
          <button onClick={() => onWalkChange(false)}>
            Thoát chế độ đi bộ
          </button>
        </div>
      )}
      {walk && (
        <div className="walk-pad" aria-label="Điều khiển đi bộ">
          <div className="walk-turn">
            {heldButton("TurnLeft", "Xoay trái", "↶")}
            {heldButton("TurnRight", "Xoay phải", "↷")}
          </div>
          <div className="walk-directions">
            <span />
            {heldButton("KeyW", "Đi tới", "↑")}
            <span />
            {heldButton("KeyA", "Đi sang trái", "←")}
            {heldButton("KeyS", "Đi lùi", "↓")}
            {heldButton("KeyD", "Đi sang phải", "→")}
          </div>
          <small>Giữ nút để di chuyển</small>
        </div>
      )}
      {error && (
        <div role="alert" className="viewer-error">
          {error}
          <button onClick={() => setError("")}>Đóng</button>
        </div>
      )}
      <div className="viewport-note">
        {walk ? "WASD / MOUSE" : "Kéo để xoay · Cuộn để thu phóng"}
      </div>
    </div>
  );
}
function Scene({
  project: p,
  selected,
  onSelect,
  exportTick,
  walk,
  onWalkChange,
  top,
  setError,
  input,
  positionOutput,
}: {
  project: Project;
  selected: string | null;
  onSelect: (s: string) => void;
  exportTick: number;
  walk: boolean;
  onWalkChange: (v: boolean) => void;
  top: boolean;
  setError: (e: string) => void;
  input: WalkInput;
  positionOutput: RefObject<HTMLOutputElement | null>;
}) {
  const f = p.floors[0],
    b = bounds(p),
    cx = (b.minX + b.maxX) / 2,
    cz = (b.minZ + b.maxZ) / 2,
    span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ, 6);
  const blocks = useMemo(
    () => f.walls.flatMap((w) => wallBlocks(w, f.openings, f.elevation)),
    [f],
  );
  const spawn = useMemo(() => {
    for (const s of f.slabs.filter((s) => s.status === "confirmed")) {
      const v = spawnPoint(s.polygon, blocks);
      if (v) return v;
    }
    return null;
  }, [f.slabs, blocks]);
  const model = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const previousExport = useRef(exportTick);
  useEffect(() => {
    if (!walk) {
      camera.position.set(
        cx + (top ? 0.001 : span),
        top ? span * 1.7 : span * 1.1,
        cz + (top ? 0 : span * 1.3),
      );
      camera.lookAt(cx, 0, cz);
    }
  }, [p.projectId, walk, top, camera, cx, cz, span]);
  useEffect(() => {
    if (walk && !spawn) {
      setError("Cần sàn đã xác nhận và vị trí trống để đi bộ.");
      onWalkChange(false);
    }
  }, [walk, spawn, onWalkChange, setError]);
  useEffect(() => {
    if (previousExport.current === exportTick) return;
    previousExport.current = exportTick;
    if (!model.current) return;
    const clone = model.current.clone(true);
    clone.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = (o.material as THREE.Material).clone();
        if (o.userData.baseColor)
          (o.material as THREE.MeshStandardMaterial).color.set(
            o.userData.baseColor,
          );
      }
    });
    new GLTFExporter()
      .parseAsync(clone, { binary: true })
      .then((result) =>
        download(result as ArrayBuffer, "buildvision.glb", "model/gltf-binary"),
      )
      .catch((e) => setError("Không xuất được GLB: " + e.message))
      .finally(() =>
        clone.traverse((o) => {
          if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
        }),
      );
  }, [exportTick, setError]);
  return (
    <>
      <ambientLight intensity={1.4} />
      <hemisphereLight args={["#e3edff", "#b7b4ac", 1.5]} />
      <directionalLight
        castShadow
        position={[8, 18, 6]}
        intensity={2.7}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0003}
      />
      <Grid
        position={[cx, -0.16, cz]}
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#d3dce8"
        sectionSize={5}
        sectionColor="#bbc9dc"
        fadeDistance={70}
        infiniteGrid
      />
      <Physics gravity={[0, -9.81, 0]}>
        <group ref={model}>
          {blocks.map((v, i) => (
            <RigidBody
              key={i}
              type="fixed"
              colliders={false}
              position={v.center}
              rotation={[0, v.angle, 0]}
            >
              <CuboidCollider
                args={[v.size[0] / 2, v.size[1] / 2, v.size[2] / 2]}
              />
              <mesh
                castShadow
                receiveShadow
                onClick={(e) => {
                  if (!walk) {
                    e.stopPropagation();
                    onSelect(v.wallId);
                  }
                }}
                userData={{ baseColor: "#f6f5f0" }}
              >
                <boxGeometry args={v.size} />
                <meshStandardMaterial
                  color={selected === v.wallId ? "#a8c4ff" : "#f6f5f0"}
                  roughness={0.8}
                />
              </mesh>
            </RigidBody>
          ))}
          {f.slabs
            .filter((s) => s.status === "confirmed")
            .map((s) => (
              <Slab key={s.id} polygon={s.polygon} elevation={f.elevation} />
            ))}
          {f.openings
            .filter((o) => o.type === "window")
            .map((o) => {
              const w = f.walls.find((w) => w.id === o.wallId)!;
              const a = Math.atan2(
                  w.end[1] - w.start[1],
                  w.end[0] - w.start[0],
                ),
                mid = o.offset + o.width / 2;
              return (
                <group
                  key={o.id}
                  position={[
                    w.start[0] + mid * Math.cos(a),
                    f.elevation + o.sillHeight + o.height / 2,
                    w.start[1] + mid * Math.sin(a),
                  ]}
                  rotation={[0, -a, 0]}
                >
                  <RigidBody type="fixed" colliders="cuboid">
                    <mesh
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(o.id);
                      }}
                    >
                      <boxGeometry args={[o.width, o.height, 0.035]} />
                      <meshStandardMaterial
                        color="#8bc5de"
                        transparent
                        opacity={0.32}
                        roughness={0.2}
                      />
                    </mesh>
                  </RigidBody>
                  {[-1, 1].flatMap((sign) => [
                    <mesh
                      key={"h" + sign}
                      position={[0, sign * (o.height / 2 - 0.025), 0]}
                    >
                      <boxGeometry args={[o.width, 0.05, 0.08]} />
                      <meshStandardMaterial color="#526277" />
                    </mesh>,
                    <mesh
                      key={"v" + sign}
                      position={[sign * (o.width / 2 - 0.025), 0, 0]}
                    >
                      <boxGeometry args={[0.05, o.height, 0.08]} />
                      <meshStandardMaterial color="#526277" />
                    </mesh>,
                  ])}
                </group>
              );
            })}
        </group>
        {walk && spawn && (
          <Walker
            spawn={[spawn[0], f.elevation + 1.0, spawn[1]]}
            input={input}
            positionOutput={positionOutput}
            onExit={() => onWalkChange(false)}
          />
        )}
      </Physics>
      {!walk && (
        <OrbitControls
          makeDefault
          target={[cx, 0.5, cz]}
          minDistance={2}
          maxDistance={span * 5}
          maxPolarAngle={Math.PI * 0.49}
        />
      )}
    </>
  );
}
function Slab({
  polygon,
  elevation,
}: {
  polygon: [number, number][];
  elevation: number;
}) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    polygon.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
  }, [polygon]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, elevation - 0.12, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#d7d0c2" roughness={0.95} />
      </mesh>
    </RigidBody>
  );
}
function Walker({
  spawn,
  input,
  positionOutput,
  onExit,
}: {
  spawn: [number, number, number];
  input: WalkInput;
  positionOutput: RefObject<HTMLOutputElement | null>;
  onExit: () => void;
}) {
  const body = useRef<RapierRigidBody>(null);
  const { camera, gl } = useThree();
  const spawnRef = useRef(spawn);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  useEffect(() => {
    input.yaw = Math.PI;
    input.pitch = 0;
    clearWalkInput(input);
    const canvas = gl.domElement;
    const oldTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";
    let drag: { id: number; x: number; y: number } | null = null;
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      if (e.key === "Escape") {
        clearWalkInput(input);
        onExitRef.current();
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && walkKeys.has(e.code)) {
        e.preventDefault();
        input.keyboard.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => input.keyboard.delete(e.code);
    const clear = () => {
      clearWalkInput(input);
      drag = null;
    };
    const pointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      canvas.focus();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const pointerMove = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      lookBy(input, e.clientX - drag.x, e.clientY - drag.y);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const pointerEnd = (e: PointerEvent) => {
      if (drag?.id === e.pointerId) drag = null;
    };
    const oldTabIndex = canvas.tabIndex;
    canvas.tabIndex = 0;
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerEnd);
    canvas.addEventListener("pointercancel", pointerEnd);
    canvas.addEventListener("lostpointercapture", pointerEnd);
    return () => {
      clear();
      canvas.style.touchAction = oldTouchAction;
      canvas.tabIndex = oldTabIndex;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerEnd);
      canvas.removeEventListener("pointercancel", pointerEnd);
      canvas.removeEventListener("lostpointercapture", pointerEnd);
    };
  }, [camera, gl, input]);
  useFrame((_, delta) => {
    if (!body.current) return;
    if (input.buttons.has("TurnLeft")) input.yaw += Math.min(delta, 0.05) * 1.5;
    if (input.buttons.has("TurnRight"))
      input.yaw -= Math.min(delta, 0.05) * 1.5;
    let pos = body.current.translation();
    if (pos.y < spawnRef.current[1] - 10) {
      const [x, y, z] = spawnRef.current;
      body.current.setTranslation({ x, y, z }, true);
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      pos = { x, y, z };
    }
    camera.position.set(pos.x, pos.y + 0.65, pos.z);
    camera.rotation.set(input.pitch, input.yaw, 0, "YXZ");
    const velocity = walkVelocity(input);
    body.current.setLinvel(
      { x: velocity.x, y: body.current.linvel().y, z: velocity.z },
      true,
    );
    if (positionOutput.current)
      positionOutput.current.textContent = `X ${pos.x.toFixed(2)} · Z ${pos.z.toFixed(2)} m`;
  });
  return (
    <RigidBody
      ref={body}
      position={spawnRef.current}
      colliders={false}
      enabledRotations={[false, false, false]}
      ccd
      friction={0}
      mass={75}
    >
      <CapsuleCollider args={[0.55, 0.25]} />
    </RigidBody>
  );
}
