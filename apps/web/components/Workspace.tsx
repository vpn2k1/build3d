"use client";
import {decodeImage,analyzeInBrowser} from "@/lib/image-import";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Upload,
  ScanLine,
  Undo2,
  Redo2,
  Save,
  Download,
  FolderOpen,
  MousePointer2,
  Minus,
  DoorOpen,
  PanelTop,
  Ruler,
  Grid3X3,
  Magnet,
  Hand,
  RotateCw,
  Crop,
  Layers,
  ChevronDown,
  Maximize2,
  Footprints,
  TriangleAlert,
  Check,
  Plus,
  X,
  Trash2,
  FileJson,
  HelpCircle,
  ArrowUpRight,
  Settings2,
} from "lucide-react";
import {
  Project,
  Wall,
  Opening,
  Vec2,
  demo,
  blank,
  parseProject,
  issues,
  length,
  download,
  polygonArea,
  validPolygon,
} from "@/lib/model";
import { saveLocal, listLocal, deleteLocal, request } from "@/lib/storage";
import type { Tool } from "./Editor";
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div className="loading">Đang mở editor…</div>,
});
const Viewer = dynamic(() => import("./Viewer"), {
  ssr: false,
  loading: () => <div className="loading">Đang khởi tạo 3D…</div>,
});
const toolItems: [Tool, string, typeof Box][] = [
  ["select", "Chọn", MousePointer2],
  ["wall", "Tường", Minus],
  ["door", "Cửa đi", DoorOpen],
  ["window", "Cửa sổ", PanelTop],
  ["slab", "Sàn", Layers],
  ["scale", "Tỷ lệ", Ruler],
  ["pan", "Di chuyển", Hand],
];
const hints: Record<Tool, string> = {
  select: "Chọn tường hoặc cửa để chỉnh sửa. Kéo tường để di chuyển.",
  wall: "Nhấp điểm đầu và điểm cuối để vẽ tường. Esc để hủy.",
  door: "Nhấp vào tường để thêm cửa đi. Chỉnh vị trí trong Thuộc tính.",
  window: "Nhấp vào tường để thêm cửa sổ.",
  slab: "Nhấp các đỉnh vùng sàn rồi Enter hoặc Khép sàn. Không suy ra sàn tự động.",
  scale: "Nhấp hai điểm trên ảnh có khoảng cách thực đã biết.",
  crop: "Nhấp hai góc vùng ảnh cần giữ. Chỉ crop trước khi vẽ hình học.",
  pan: "Kéo để di chuyển mặt bằng. Cuộn để thu phóng.",
};
export default function Workspace() {
  const [p, setP] = useState<Project>(() => demo()),
    [past, setPast] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]),
    [tool, setTool] = useState<Tool>("select"),
    [selected, setSelected] = useState<string | null>(null),
    [snap, setSnap] = useState(true),
    [walk, setWalk] = useState(false),
    [top, setTop] = useState(false),
    [tab, setTab] = useState<"2d" | "3d">("2d"),
    [fit, setFit] = useState(0),
    [exportTick, setExportTick] = useState(0),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(false),
    [saved, setSaved] = useState<number | null>(null),
    [projects, setProjects] = useState<Project[] | null>(null),
    [help, setHelp] = useState(false),
    [exportMenu, setExportMenu] = useState(false),
    [calibration, setCalibration] = useState<{ a: Vec2; b: Vec2 } | null>(null),
    [distance, setDistance] = useState(""),
    [analysis, setAnalysis] = useState<any | null>(null);
  const imageInput = useRef<HTMLInputElement>(null),
    jsonInput = useRef<HTMLInputElement>(null),
    viewerHost = useRef<HTMLDivElement>(null),
    pRef = useRef(p);
  pRef.current = p;
  useEffect(() => {
    request("/api/health")
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (!p.revision && !p.image) return;
    const snapshot = p;
    const timer = setTimeout(() => {
      saveLocal(snapshot)
        .then(() => {
          if (
            pRef.current.projectId === snapshot.projectId &&
            pRef.current.revision === snapshot.revision
          )
            setSaved(snapshot.revision);
        })
        .catch(() =>
          setError("Không tự lưu được. Hãy xuất JSON để giữ dự án."),
        );
    }, 800);
    return () => clearTimeout(timer);
  }, [p]);
  function commit(next: Project) {
    try {
      parseProject(next);
    } catch (e) {
      setError("Dữ liệu chưa hợp lệ: " + (e as Error).message);
      return false;
    }
    next.revision = p.revision + 1;
    setPast((h) => [...h.slice(-39), p]);
    setFuture([]);
    setP(next);
    return true;
  }
  function edit(fn: (next: Project) => void) {
    const n = structuredClone(p);
    fn(n);
    return commit(n);
  }
  function load(next: Project) {
    try {
      next = parseProject(next);
    } catch (e) {
      setError("Dự án không hợp lệ: " + (e as Error).message);
      return;
    }
    if (p.revision > 0 || p.image)
      void saveLocal(p).catch(() =>
        setError("Không tự lưu được dự án trước đó. Hãy xuất JSON để sao lưu."),
      );
    setP(next);
    setPast([]);
    setFuture([]);
    setSelected(null);
    setWalk(false);
    setSaved(null);
    setProjects(null);
    setTool("select");
  }
  function undo() {
    if (!past.length) return;
    setFuture([p, ...future]);
    setP({ ...past[past.length - 1], revision: p.revision + 1 });
    setPast(past.slice(0, -1));
    setSelected(null);
  }
  function redo() {
    if (!future.length) return;
    setPast([...past, p]);
    setP({ ...future[0], revision: p.revision + 1 });
    setFuture(future.slice(1));
    setSelected(null);
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
      if (e.key === "Delete") removeSelected();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const f = p.floors[0],
    wall = f.walls.find((w) => w.id === selected),
    opening = f.openings.find((o) => o.id === selected),
    unconfirmed = [...f.walls, ...f.openings, ...f.slabs].filter(
      (v) => v.status !== "confirmed",
    ).length,
    area = f.slabs
      .filter((s) => s.status === "confirmed")
      .reduce((n, s) => n + polygonArea(s.polygon), 0);
  async function save() {
    try {
      await saveLocal(p);
      setSaved(p.revision);
      setToast("Đã lưu dự án trong trình duyệt này.");
      if (online) {
        try {
          await request("/api/projects/" + encodeURIComponent(p.projectId), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          });
        } catch (e) {
          setError(
            "Đã lưu trình duyệt, nhưng chưa lưu backend: " +
              (e as Error).message,
          );
        }
      }
    } catch (e) {
      setError("Không lưu được: " + (e as Error).message);
    }
  }
  async function showProjects() {
    try {
      setProjects(await listLocal());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function upload(file: File) {
    setError("");
    if(file.size>15*1024*1024){setError("Ảnh vượt 15 MB.");return}
    const url=URL.createObjectURL(file);
    try {
      if (!/\.(png|jpe?g|jfif|webp|bmp|gif|avif)$/i.test(file.name)&&!/^image\/(png|jpeg|webp|bmp|gif|avif)$/i.test(file.type)) throw Error("Hãy chọn PNG, JPEG, WebP, BMP, GIF hoặc AVIF.");
      const image=await decodeImage(url);
      if(image.width*image.height>25000000)throw Error("Ảnh vượt 25 megapixel.");
      const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);
      const next=blank();next.name=file.name.replace(/\.[^.]+$/,"").slice(0,100)||"Mặt bằng";
      let dataUrl=canvas.toDataURL("image/png");
      if(dataUrl.length>19000000)dataUrl=canvas.toDataURL("image/jpeg",.88);
      if(dataUrl.length>19000000)throw Error("Ảnh sau giải mã quá lớn. Hãy giảm độ phân giải.");
      next.image = {
        dataUrl,
        originalDataUrl: dataUrl,
        width: canvas.width,
        height: canvas.height,
        rotation: 0,
      };
      load(next);
      setTab("2d");setAnalysis(null);
      setTool("scale");
      setToast("Đã mở ảnh 2D. Chọn hai điểm, nhập khoảng cách rồi bấm Phân tích để dựng tường 3D.");
    } catch (e) {
      setError((e as Error).message);
    }
    finally {URL.revokeObjectURL(url)}
  }
  async function transformImage(kind: "rotate" | "crop", a?: Vec2, b?: Vec2) {
    if (!p.image) {
      setError("Tải ảnh trước khi thao tác.");
      return;
    }
    if (f.walls.length || f.slabs.length) {
      setError(
        "Crop/xoay cần thực hiện trước khi vẽ tường. Mở ảnh thành dự án mới để giữ mô hình hiện tại.",
      );
      return;
    }
    const im = await createImageBitmap(
        await (await fetch(p.image.dataUrl)).blob(),
      ),
      canvas = document.createElement("canvas");
    let crop: number[] | undefined;
    if (kind === "rotate") {
      canvas.width = im.height;
      canvas.height = im.width;
      const c = canvas.getContext("2d")!;
      c.translate(canvas.width, 0);
      c.rotate(Math.PI / 2);
      c.drawImage(im, 0, 0);
    } else {
      const m = p.calibration.metersPerPixel,
        x = Math.max(0, Math.round(Math.min(a![0], b![0]) / m)),
        y = Math.max(0, Math.round(Math.min(a![1], b![1]) / m)),
        w = Math.min(im.width - x, Math.round(Math.abs(a![0] - b![0]) / m)),
        h = Math.min(im.height - y, Math.round(Math.abs(a![1] - b![1]) / m));
      if (w < 20 || h < 20) {
        im.close();
        setError("Vùng crop phải nằm trong ảnh và tối thiểu 20 × 20 px.");
        return;
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(im, x, y, w, h, 0, 0, w, h);
      crop = [x, y, w, h];
    }
    im.close();
    edit((n) => {
      n.image = {
        ...n.image!,
        dataUrl: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
        rotation:
          kind === "rotate"
            ? (n.image!.rotation + 90) % 360
            : n.image!.rotation,
        crop: crop || n.image!.crop,
      };
      n.calibration.confirmed = false;
      n.calibration.reference = undefined;
    });
    setFit((v) => v + 1);
    setTool("scale");
  }
  function pair(t: Tool, a: Vec2, b: Vec2) {
    if (t === "scale") {
      if (!p.image) {
        setError("Hiệu chỉnh tỷ lệ dành cho ảnh đã tải. Mô hình mẫu dùng mét.");
        return;
      }
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.001) {
        setError("Hai điểm phải khác nhau.");
        return;
      }
      setCalibration({ a, b });
      setDistance("");
    } else if (t === "crop") {
      void transformImage("crop", a, b);
    } else if (t === "door" || t === "window") {
      const near = f.walls
        .map((w) => {
          const dx = w.end[0] - w.start[0],
            dz = w.end[1] - w.start[1],
            L = length(w),
            off = Math.max(
              0,
              Math.min(
                L,
                ((a[0] - w.start[0]) * dx + (a[1] - w.start[1]) * dz) / L,
              ),
            );
          return {
            w,
            off,
            dist: Math.hypot(
              a[0] - w.start[0] - (off * dx) / L,
              a[1] - w.start[1] - (off * dz) / L,
            ),
          };
        })
        .sort((a, b) => a.dist - b.dist)[0];
      if (!near) return;
      const width = t === "door" ? 0.9 : 1.2;
      if (length(near.w) < width) {
        setError("Tường quá ngắn cho lỗ mở này.");
        return;
      }
      const id = crypto.randomUUID();
      if (
        edit((n) =>
          n.floors[0].openings.push({
            id,
            type: t,
            wallId: near.w.id,
            offset: Math.max(
              0,
              Math.min(length(near.w) - width, near.off - width / 2),
            ),
            width,
            height: t === "door" ? 2.1 : 1.2,
            sillHeight: t === "door" ? 0 : 1,
            status: "confirmed",
          }),
        )
      )
        setSelected(id);
    }
  }
  function calibrate() {
    const d = Number(distance);
    if (!calibration || !Number.isFinite(d) || d <= 0) {
      setError("Nhập khoảng cách dương bằng mét.");
      return;
    }
    const old = p.calibration.metersPerPixel,
      pixels =
        Math.hypot(
          calibration.a[0] - calibration.b[0],
          calibration.a[1] - calibration.b[1],
        ) / old,
      ratio = d / (pixels * old);
    if (
      edit((n) => {
        n.calibration = {
          metersPerPixel: d / pixels,
          confirmed: true,
          reference: [
            calibration.a.map((v) => v / old) as Vec2,
            calibration.b.map((v) => v / old) as Vec2,
          ],
          distance: d,
        };
        const f = n.floors[0];
        f.walls.forEach((w) => {
          w.start = w.start.map((v) => v * ratio) as Vec2;
          w.end = w.end.map((v) => v * ratio) as Vec2;
          w.thickness *= ratio;
        });
        f.openings.forEach((o) => {
          o.offset *= ratio;
          o.width *= ratio;
        });
        f.slabs.forEach(
          (s) =>
            (s.polygon = s.polygon.map(
              (pt) => pt.map((v) => v * ratio) as Vec2,
            )),
        );
        f.rooms.forEach(
          (r) => (r.center = r.center.map((v) => v * ratio) as Vec2),
        );
      })
    ) {
      setCalibration(null);
      setTool("select");
      setFit((v) => v + 1);
      setToast("Đã hiệu chỉnh tỷ lệ từ khoảng cách bạn xác nhận.");
    }
  }
  function removeSelected() {
    if (!selected) return;
    edit((n) => {
      n.floors[0].walls = n.floors[0].walls.filter((w) => w.id !== selected);
      n.floors[0].openings = n.floors[0].openings.filter(
        (o) => o.id !== selected && o.wallId !== selected,
      );
    });
    setSelected(null);
  }
  async function analyze() {
    if (!p.image) {
      setError(
        "Tải JPG/PNG/WebP/BMP/GIF/AVIF để phân tích. Mô hình mẫu không phải kết quả nhận diện.",
      );
      return;
    }
    if (!p.calibration.confirmed) {
      setError("Xác nhận tỷ lệ trước khi phân tích.");
      setTool("scale");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (!online) {
        const result=await analyzeInBrowser(p.image.dataUrl,p.calibration.metersPerPixel,f.height);
        if(!result.walls.length){setError("Chưa tìm thấy nét tường ngang/dọc đủ rõ. Dùng công cụ Tường để vẽ theo ảnh.");return}
        setAnalysis({...result,projectId:p.projectId,revision:p.revision});return;
      }
      await request("/api/projects/" + encodeURIComponent(p.projectId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const imageBlob = await (await fetch(p.image.dataUrl)).blob(),
        form = new FormData();
      form.append("file", imageBlob, "plan.png");
      await request(
        "/api/projects/" + encodeURIComponent(p.projectId) + "/image",
        { method: "POST", body: form },
      );
      const job = await request(
        "/api/projects/" + encodeURIComponent(p.projectId) + "/analyze",
        { method: "POST" },
      );
      let result;
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const state = await request("/api/jobs/" + job.id);
        if (state.status === "failed") throw Error(state.error);
        if (state.status === "succeeded") {
          result = state.result;
          break;
        }
      }
      if (!result) throw Error("Hết thời gian chờ phân tích.");
      setAnalysis({ ...result, projectId: p.projectId, revision: p.revision });
      setOnline(true);
    } catch (e) {
      setOnline(false);
      setError(
        "Phân tích local chưa hoàn tất: " +
          (e as Error).message +
          ". Kiểm tra FastAPI tại 127.0.0.1:8000. Bạn vẫn có thể vẽ thủ công.",
      );
    } finally {
      setBusy(false);
    }
  }
  function applyAnalysis() {
    if (!analysis) return;
    if (
      analysis.projectId !== p.projectId ||
      analysis.revision !== p.revision
    ) {
      setError(
        "Dự án đã thay đổi trong lúc phân tích. Chạy lại để tránh ghi đè chỉnh sửa.",
      );
      return;
    }
    if (
      edit((n) => {
        n.recognition = {
          sourceTransform: analysis.sourceTransform,
          warnings: analysis.warnings,
          ocr: analysis.ocr,
          elapsedSeconds: analysis.elapsedSeconds,
        };
        n.floors[0].walls = analysis.walls;
        n.floors[0].openings = analysis.openings || [];
        n.floors[0].rooms = [];
        n.floors[0].slabs = [];
      })
    ) {
      setAnalysis(null);
      setTool("select");
      setSelected(null);
    }
  }
  const onSlab = useCallback(
    (pts: Vec2[]) => {
      if (!validPolygon(pts)) {
        setError("Polygon sàn tự cắt hoặc diện tích quá nhỏ.");
        return;
      }
      edit((n) =>
        n.floors[0].slabs.push({
          id: crypto.randomUUID(),
          polygon: pts,
          status: "confirmed",
        }),
      );
    },
    [p],
  );
  return (
    <main>
      <input
        ref={imageInput}
        type="file"
        accept=".jpg,.jpeg,.jfif,.png,.webp,.bmp,.gif,.avif,image/jpeg,image/png,image/webp,image/bmp,image/gif,image/avif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <input
        ref={jsonInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file)
            try {
              if (file.size > 65000000) throw Error("JSON quá lớn.");
              load(parseProject(JSON.parse(await file.text())));
              setToast("Đã mở JSON.");
            } catch (err) {
              setError("JSON không hợp lệ: " + (err as Error).message);
            }
          e.target.value = "";
        }}
      />
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <Box size={23} />
          </span>
          <div>
            <h1>
              BuildVision <span>3D</span>
            </h1>
            <small>KHÔNG GIAN TỪ MẶT BẰNG</small>
          </div>
        </div>
        <span className="header-divider" />
        <button className="project-switch" onClick={showProjects}>
          <FolderOpen size={16} />
          <span>{p.name}</span>
          <ChevronDown size={14} />
        </button>
        <span className="local-badge">
          <i /> LOCAL WORKSPACE
        </span>
        <div className="header-actions">
          <button
            title="Hoàn tác (Ctrl+Z)"
            aria-label="Hoàn tác"
            disabled={!past.length}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            title="Làm lại"
            aria-label="Làm lại"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
          <span className="header-divider" />
          <button aria-label="Lưu dự án" onClick={save}>
            <Save size={16} />
            <span>Lưu dự án</span>
          </button>
          <div className="export-wrap">
            <button
              className="primary"
              onClick={() => setExportMenu(!exportMenu)}
            >
              <Download size={16} />
              Xuất mô hình
              <ChevronDown size={13} />
            </button>
            {exportMenu && (
              <div className="dropdown">
                <button
                  onClick={() => {
                    download(
                      JSON.stringify(p, null, 2),
                      "buildvision-project.json",
                      "application/json",
                    );
                    setExportMenu(false);
                  }}
                >
                  <FileJson size={16} />
                  Tải JSON dự án
                </button>
                <button
                  onClick={() => {
                    if (!f.walls.length) {
                      setError("Chưa có tường để xuất.");
                      return;
                    }
                    setExportTick((v) => v + 1);
                    setExportMenu(false);
                  }}
                >
                  <Box size={16} />
                  Tải mô hình GLB
                </button>
              </div>
            )}
          </div>
          <button aria-label="Hướng dẫn" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
          </button>
        </div>
      </header>
      <section className="project-heading">
        <div>
          <div className="eyebrow">DỰ ÁN / WORKSPACE</div>
          <div className="heading-line">
            <input
              aria-label="Tên dự án"
              value={p.name}
              maxLength={100}
              onChange={(e) => {
                if (e.target.value)
                  edit((n) => {
                    n.name = e.target.value;
                  });
              }}
            />
            <span className="version-chip">TẦNG 01</span>
          </div>
          <p>
            Biến mặt bằng thành không gian. Kiểm tra, chỉnh sửa và khám phá.
          </p>
        </div>
        <div className="project-stats">
          <div>
            <strong>{f.walls.length.toString().padStart(2, "0")}</strong>
            <span>TƯỜNG</span>
          </div>
          <div>
            <strong>{f.openings.length.toString().padStart(2, "0")}</strong>
            <span>LỖ MỞ</span>
          </div>
          <div>
            <strong>
              {area.toFixed(1)}
              <em> m²</em>
            </strong>
            <span>SÀN ĐÃ XÁC NHẬN</span>
          </div>
        </div>
      </section>
      <nav className="toolbar" aria-label="Công cụ mặt bằng">
        <div className="import-actions">
          <button
            className="primary"
            onClick={() => imageInput.current?.click()}
          >
            <Upload size={16} />
            Tải ảnh
          </button>
          <button onClick={analyze} disabled={busy}>
            <ScanLine size={17} />
            {busy ? "Đang phân tích…" : "Phân tích"}
          </button>
        </div>
        <span className="tool-divider" />
        <div className="draw-tools">
          {toolItems.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tool === id ? "active" : ""}
              onClick={() => {
                setTool(id);
                setTab("2d");
              }}
              title={hints[id]}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="aux-tools">
          <button
            className={snap ? "toggled" : ""}
            aria-pressed={snap}
            title="Bắt điểm 0.1 m"
            onClick={() => setSnap(!snap)}
          >
            <Magnet size={17} />
            <span>Bắt điểm</span>
          </button>
          <button
            title="Xoay ảnh 90°"
            aria-label="Xoay ảnh"
            onClick={() => void transformImage("rotate")}
          >
            <RotateCw size={17} />
          </button>
          <button
            title="Cắt ảnh"
            aria-label="Cắt ảnh"
            className={tool === "crop" ? "active" : ""}
            onClick={() => setTool("crop")}
          >
            <Crop size={17} />
          </button>
        </div>
      </nav>
      <div className="mobile-tabs">
        <button
          className={tab === "2d" ? "active" : ""}
          onClick={() => setTab("2d")}
        >
          Mặt bằng 2D
        </button>
        <button
          className={tab === "3d" ? "active" : ""}
          onClick={() => setTab("3d")}
        >
          Không gian 3D
        </button>
      </div>
      <section className="workspace">
        <article
          className={
            "viewport editor-panel " + (tab !== "2d" ? "mobile-hidden" : "")
          }
        >
          <div className="panel-heading">
            <span>
              <Layers size={17} />
              <b>Mặt bằng 2D</b>
              <small>EDITOR</small>
            </span>
            <button
              title="Vừa khung"
              aria-label="Vừa khung 2D"
              onClick={() => setFit((v) => v + 1)}
            >
              <Maximize2 size={15} />
            </button>
          </div>
          <div className="canvas-body">
            <Editor
              project={p}
              tool={tool}
              selected={selected}
              onSelect={setSelected}
              snap={snap}
              zoomTick={fit}
              onDraw={(a, b) => {
                const id = crypto.randomUUID();
                if (
                  edit((n) =>
                    n.floors[0].walls.push({
                      id,
                      start: a,
                      end: b,
                      thickness: 0.2,
                      height: f.height,
                      status: "confirmed",
                    }),
                  )
                )
                  setSelected(id);
              }}
              onMove={(id, dx, dz) =>
                edit((n) => {
                  const w = n.floors[0].walls.find((w) => w.id === id)!;
                  w.start = [w.start[0] + dx, w.start[1] + dz];
                  w.end = [w.end[0] + dx, w.end[1] + dz];
                })
              }
              onPair={pair}
              onSlab={onSlab}
            />
          </div>
          <div className="pane-footer">
            <span
              className={
                "status-dot " + (!p.calibration.confirmed ? "amber" : "")
              }
            />
            {p.calibration.confirmed
              ? "Tỷ lệ đã xác nhận"
              : "Chưa xác nhận tỷ lệ"}
            <span>{p.calibration.metersPerPixel.toFixed(5)} m/px</span>
          </div>
        </article>
        <article
          ref={viewerHost}
          className={
            "viewport model-panel " + (tab !== "3d" ? "mobile-hidden" : "")
          }
        >
          <div className="panel-heading">
            <span>
              <Box size={18} />
              <b>Không gian 3D</b>
              <small>LIVE VIEW</small>
            </span>
            <div>
              <button
                className={top ? "active" : ""}
                title="Nhìn từ trên"
                aria-label="Nhìn từ trên"
                onClick={() => setTop(!top)}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                title="Toàn màn hình"
                aria-label="Toàn màn hình 3D"
                onClick={() => {
                  if (document.fullscreenElement)
                    void document.exitFullscreen();
                  else
                    void viewerHost.current
                      ?.requestFullscreen()
                      .catch(() =>
                        setError("Trình duyệt không cho phép toàn màn hình."),
                      );
                }}
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
          <div className="canvas-body">
            <Viewer
              project={p}
              selected={selected}
              onSelect={setSelected}
              exportTick={exportTick}
              walk={walk}
              onWalkChange={setWalk}
              top={top}
            />
            <div className={"mode-switch" + (walk ? " is-walking" : "")}>
              <button
                className={!walk ? "active" : ""}
                onClick={() => setWalk(false)}
              >
                <MousePointer2 size={14} />
                Chỉnh sửa
              </button>
              <button
                className={walk ? "active" : ""}
                onClick={() => {
                  setWalk(true);
                  setTab("3d");
                }}
              >
                <Footprints size={15} />
                Đi bộ
              </button>
            </div>
          </div>
          <div className="pane-footer">
            <span className="status-dot" />
            Đồng bộ với mặt bằng<span>1 đơn vị = 1 mét</span>
          </div>
        </article>
        <aside className="inspector">
          <div className="panel-heading">
            <span>
              <Settings2 size={17} />
              <b>Thuộc tính</b>
            </span>
          </div>
          <div className="inspector-scroll">
            <section>
              <h2>
                CÔNG TRÌNH <span>01</span>
              </h2>
              <NumberField
                label="Chiều cao tầng"
                value={f.height}
                min={1}
                max={10}
                onChange={(v) =>
                  edit((n) => {
                    n.floors[0].height = v;
                    n.floors[0].walls.forEach((w) => (w.height = v));
                  })
                }
              />
              <div className="info-row">
                <span>Cao độ sàn</span>
                <b>{f.elevation.toFixed(2)} m</b>
              </div>
              <div className="info-row">
                <span>Chế độ</span>
                <b>Một tầng</b>
              </div>
            </section>
            <section>
              <h2>
                {wall
                  ? "TƯỜNG ĐANG CHỌN"
                  : opening
                    ? "LỖ MỞ ĐANG CHỌN"
                    : "ĐỐI TƯỢNG ĐANG CHỌN"}
              </h2>
              {wall ? (
                <>
                  <div className="object-id">Tường · {wall.id.slice(0, 8)}</div>
                  <NumberField
                    label="Độ dày"
                    value={wall.thickness}
                    min={0.05}
                    max={2}
                    onChange={(v) =>
                      edit((n) => {
                        n.floors[0].walls.find(
                          (w) => w.id === selected,
                        )!.thickness = v;
                      })
                    }
                  />
                  <NumberField
                    label="Chiều cao"
                    value={wall.height}
                    min={1}
                    max={10}
                    onChange={(v) =>
                      edit((n) => {
                        n.floors[0].walls.find(
                          (w) => w.id === selected,
                        )!.height = v;
                      })
                    }
                  />
                  {(["start", "end"] as const).map((key, i) => (
                    <div className="coord-fields" key={key}>
                      <span>Điểm {i === 0 ? "đầu" : "cuối"}</span>
                      {[0, 1].map((j) => (
                        <NumberField
                          key={j}
                          label={j === 0 ? "X" : "Z"}
                          value={wall[key][j]}
                          min={-1000}
                          max={1000}
                          onChange={(v) =>
                            edit((n) => {
                              n.floors[0].walls.find((w) => w.id === selected)![
                                key
                              ][j] = v;
                            })
                          }
                        />
                      ))}
                    </div>
                  ))}
                  <div className="info-row">
                    <span>Chiều dài</span>
                    <b>{length(wall).toFixed(2)} m</b>
                  </div>
                </>
              ) : opening ? (
                <>
                  <div className="object-id">
                    {opening.type === "door" ? "Cửa đi" : "Cửa sổ"} ·{" "}
                    {opening.id.slice(0, 8)}
                  </div>
                  {(["offset", "width", "height", "sillHeight"] as const).map(
                    (key, i) => (
                      <NumberField
                        key={key}
                        label={
                          [
                            "Vị trí từ đầu tường",
                            "Chiều rộng",
                            "Chiều cao",
                            "Cao độ bậu",
                          ][i]
                        }
                        value={opening[key]}
                        min={0}
                        max={100}
                        onChange={(v) =>
                          edit((n) => {
                            n.floors[0].openings.find(
                              (o) => o.id === selected,
                            )![key] = v;
                          })
                        }
                      />
                    ),
                  )}
                </>
              ) : (
                <div className="empty-selection">
                  <MousePointer2 size={26} />
                  <b>Chọn một đối tượng</b>
                  <p>Nhấp vào tường hoặc cửa trên mặt bằng để chỉnh sửa.</p>
                </div>
              )}
              {(wall || opening) && (
                <>
                  <div className="info-row">
                    <span>Trạng thái</span>
                    <b>
                      {(wall || opening)!.status === "confirmed"
                        ? "Đã xác nhận"
                        : "Cần kiểm tra"}
                    </b>
                  </div>
                  <button
                    className="wide"
                    onClick={() =>
                      edit((n) => {
                        const x =
                          n.floors[0].walls.find((w) => w.id === selected) ||
                          n.floors[0].openings.find((o) => o.id === selected);
                        if (x) x.status = "confirmed";
                      })
                    }
                  >
                    <Check size={14} />
                    Xác nhận đối tượng
                  </button>
                  <button className="danger wide" onClick={removeSelected}>
                    <Trash2 size={14} />
                    Xóa đối tượng
                  </button>
                </>
              )}
            </section>
            <section>
              <h2>DỮ LIỆU & TỶ LỆ</h2>
              <div className="info-row">
                <span>Nguồn</span>
                <b>{p.image ? "Ảnh đã tải" : "JSON minh họa"}</b>
              </div>
              <button className="wide" onClick={() => setTool("scale")}>
                <Ruler size={15} />
                Hiệu chỉnh hai điểm
              </button>
              <button className="wide" onClick={showProjects}>
                <FolderOpen size={15} />
                Dự án đã lưu
              </button>
              <button
                className="wide"
                onClick={() => jsonInput.current?.click()}
              >
                <FileJson size={15} />
                Mở file JSON
              </button>
              <button className="wide" onClick={() => load(blank())}>
                <Plus size={15} />
                Dự án trống
              </button>
            </section>
            <div className="local-note">
              <span className={"status-dot " + (!online ? "amber" : "")} />
              <b>{online ? "Vision API sẵn sàng" : "Chế độ chỉnh tay"}</b>
              <p>Ảnh và mô hình được xử lý trên máy của bạn.</p>
            </div>
          </div>
        </aside>
      </section>
      <div className="tool-hint">
        <MousePointer2 size={14} />
        {hints[tool]}
        <span>{saved === p.revision ? "Đã lưu" : "Có thay đổi chưa lưu"}</span>
      </div>
      <section
        className={
          "validation-bar " +
          (unconfirmed || !p.calibration.confirmed ? "warning" : "")
        }
      >
        <TriangleAlert size={18} />
        <div>
          <b>
            {unconfirmed
              ? `${unconfirmed} đối tượng cần xác nhận`
              : !p.calibration.confirmed
                ? "Cần hiệu chỉnh tỷ lệ"
                : "Mô hình phục vụ trực quan hóa"}
          </b>
          <span>
            {unconfirmed
              ? "Kiểm tra từng tường và lỗ mở trước khi dùng số đo."
              : "Không thay thế hồ sơ thi công được phê duyệt."}
          </span>
        </div>
        <button onClick={() => setHelp(true)}>
          Hướng dẫn
          <ArrowUpRight size={14} />
        </button>
      </section>
      <footer className="app-footer">
        <span>
          BUILDVISION 3D <i> / </i> LOCAL MVP
        </span>
        <span>Không API AI trả phí · Dữ liệu tính bằng mét</span>
        <span>Revision {p.revision}</span>
      </footer>
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {error && (
        <div role="alert" className="error-toast">
          <TriangleAlert size={19} />
          <span>{error}</span>
          <button aria-label="Đóng lỗi" onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}
      {calibration && (
        <Modal title="Hiệu chỉnh tỷ lệ" onClose={() => setCalibration(null)}>
          <p>
            Nhập khoảng cách thực giữa hai điểm vừa chọn. Đơn vị mét; không suy
            ra từ ảnh.
          </p>
          <label className="modal-field">
            Khoảng cách (m)
            <input
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </label>
          <button className="primary" onClick={calibrate}>
            Xác nhận tỷ lệ
          </button>
        </Modal>
      )}
      {projects && (
        <Modal
          title="Dự án trên thiết bị này"
          onClose={() => setProjects(null)}
        >
          <p>
            Dữ liệu lưu bằng IndexedDB theo trình duyệt. Xuất JSON để sao lưu
            sang máy khác.
          </p>
          <div className="project-list">
            {projects.length ? (
              projects.map((pr) => (
                <div key={pr.projectId}>
                  <button onClick={() => load(pr)}>
                    <FolderOpen size={18} />
                    <span>
                      <b>{pr.name}</b>
                      <small>
                        {pr.floors[0].walls.length} tường · Revision{" "}
                        {pr.revision}
                      </small>
                    </span>
                  </button>
                  <button
                    className="danger"
                    aria-label={"Xóa " + pr.name}
                    onClick={async () => {
                      await deleteLocal(pr.projectId);
                      setProjects(await listLocal());
                      if (pr.projectId === p.projectId) {
                        setP(blank());
                        setPast([]);
                        setFuture([]);
                        setSelected(null);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-list">Chưa có dự án đã lưu.</div>
            )}
          </div>
          <div className="modal-actions">
            <button
              onClick={() => {
                setProjects(null);
                jsonInput.current?.click();
              }}
            >
              Mở JSON
            </button>
            <button onClick={() => load(demo())}>Mở nhà mẫu</button>
            <button className="primary" onClick={() => load(blank())}>
              Dự án mới
            </button>
          </div>
        </Modal>
      )}
      {analysis && (
        <Modal
          title="Kết quả phân tích — cần review"
          onClose={() => setAnalysis(null)}
        >
          <p>
            Tìm được <b>{analysis.walls.length} ứng viên tường</b> trong{" "}
            {analysis.elapsedSeconds}s. Áp dụng sẽ thay hình học hiện tại; có
            thể hoàn tác.
          </p>
          <ul>
            {analysis.warnings?.map((w: string, i: number) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          {analysis.ocr?.length > 0 && (
            <div>
              <h3>Gợi ý OCR (chưa xác nhận)</h3>
              {analysis.ocr.map((o: any, i: number) => (
                <p key={i}>
                  {o.text} · {Math.round(o.confidence * 100)}% · bbox{" "}
                  {JSON.stringify(o.box)}
                </p>
              ))}
            </div>
          )}
          <button className="primary" onClick={applyAnalysis}>
            Đưa ứng viên vào editor
          </button>
        </Modal>
      )}
      {help && (
        <Modal
          title="Từ mặt bằng đến không gian"
          onClose={() => setHelp(false)}
        >
          <ol className="help-steps">
            <li>
              <b>Tải ảnh & chuẩn hóa</b>
              <p>JPG/PNG/WebP/BMP/GIF/AVIF ≤15 MB, ≤25 MP. Crop hoặc xoay trước khi tạo tường.</p>
            </li>
            <li>
              <b>Xác nhận tỷ lệ</b>
              <p>
                Chọn hai điểm, nhập khoảng cách thực bằng mét. Chiều cao cần
                nhập riêng.
              </p>
            </li>
            <li>
              <b>Phân tích hoặc vẽ tay</b>
              <p>
                OpenCV chạy qua FastAPI local. Nhận diện chỉ là ứng viên; kiểm
                tra từng tường. Cửa/sổ có thể thêm thủ công.
              </p>
            </li>
            <li>
              <b>Khép sàn & đi bộ</b>
              <p>
                Chọn Sàn, nhấp các đỉnh rồi Enter. Đi bộ: WASD/phím mũi tên hoặc
                giữ nút trên màn hình. Kéo để nhìn quanh; Esc thoát. Cửa đi để
                mở; kính cửa sổ có va chạm.
              </p>
            </li>
            <li>
              <b>Lưu & xuất</b>
              <p>
                Lưu trong trình duyệt; JSON giữ dữ liệu và ảnh, GLB giữ hình
                học. Undo/redo tối đa 40 bước.
              </p>
            </li>
          </ol>
          <p className="muted">
            Nhà mẫu là dữ liệu minh họa. Nhận diện ảnh nghiêng/phối cảnh, OCR và
            độ chính xác ảnh thực cần kiểm chứng riêng.
          </p>
        </Modal>
      )}
    </main>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => unknown;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(Number(value.toFixed(4)))), [value]);
  return (
    <label className="number-field">
      <span>{label}</span>
      <div>
        <input
          aria-label={label}
          type="number"
          min={min}
          max={max}
          step="0.05"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft);
            if (draft !== "" && Number.isFinite(n) && n >= min && n <= max) {
              onChange(n);
            }
            setDraft(String(value));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <small>m</small>
      </div>
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
