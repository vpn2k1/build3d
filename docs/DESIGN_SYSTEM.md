# Design system — A / CAD sáng

Màu và kích thước nằm tại `design/tokens.json`; CSS thực tế `apps/web/app/globals.css`. Font dùng hệ thống Arial/Helvetica, không tải font ngoài. UI phản hồi hover/focus-visible/disabled/error/loading; reduced motion tắt transitions.

| Thành phần | Source | Vai trò |
|---|---|---|
| Topbar, toolbar, inspector, dialogs, alerts | components/Workspace.tsx | Hành động, properties, trạng thái |
| Editor 2D | components/Editor.tsx | Vẽ, drag, pan/zoom, ảnh |
| Viewport 3D | components/Viewer.tsx | Orbit, walkthrough, GLB |
| Button/input/panel/modal | app/globals.css | Semantic CSS dùng chung |

Desktop dùng 3 cột; <=960 inspector xuống dưới; <=640 dùng tab 2D/3D. Tham chiếu frame 1440×1000 và 390×1160. SVG là bản dựng vector để handoff, không ảnh chụp runtime, không chứng minh UI đã browser-QA. Hình 3D trong SVG là minh họa khối giản lược, code runtime mới dựng lỗ mở.

Giá trị thuộc tính thực tế, câu lỗi và trạng thái xác nhận ở source. Không dùng ảnh mockup làm background chức năng.
