# QA_REPORT — v0.1 / 17-11-2026

## Môi trường và kết quả đã quan sát

Linux x86_64, Node 24.22.1, Python 3.12.14, Next 16.4.6, Three 0.180.0, Rapier compat 0.19.2. Dependencies cài thành công qua npm/pip; lockfiles được bàn giao.

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | Đạt |
| `npm run build` (Next webpack) | Đạt, `/` và `/_not-found` prerender thành công |
| Vitest contract/geometry | 8/8 đạt |
| Vitest Rapier thật (WASM, stepping simulation) | 2/2 đạt: capsule chặn ở tường; đi qua cửa mở |
| pytest API/pipeline | 7/7 đạt |
| Synthetic clean/noisy/rotated fixture | Mỗi ảnh 7 ứng viên; số liệu thô ở synthetic-benchmark.json |
| JSON schema sinh từ Pydantic; demo fixture | Có trong packages/contracts và fixtures |
| Browser preview | Không chạy được: `sites-preview start` và `status` đều báo `preview relay unavailable: No such file or directory` |
| Playwright E2E | Có test nguồn và config, **chưa chạy** vì preview không khả dụng |
| Responsive/accessibility/WebGL bằng trình duyệt | **Chưa xác minh trực quan** |
| GLB export tải xuống / mở trong viewer khác | Có implementation, **chưa kiểm thử trình duyệt/roundtrip** |
| OCR local runtime / model weights | **Chưa cài/test**, adapter tùy chọn |
| Lighthouse, FPS, RAM/VRAM, precision/recall ảnh thực | **Chưa đo** |

Không mở server thay thế để vượt hạ tầng preview. Không deploy cloud theo yêu cầu localhost.

## Phạm vi test thật

Geometry: JSON roundtrip, thể tích tường trừ lỗ mở, khoảng trống cửa đi, tường dưới/trên cửa sổ, opening vượt tường/chồng lấn, ID trùng, tường quá ngắn, polygon tự cắt, không tự sinh sàn, spawn trong sàn, từ chối URL ảnh từ xa/Infinity.

Physics: Rapier capsule đi về phía cùng một tường; đường không có cửa bị chặn, đường giữa cửa đi qua. Đây là test mô phỏng engine, không thay thế kiểm tra camera/pointer lock trên browser.

API: tạo/lưu/đọc/xóa SQLite, conflict revision, JSON geometry lỗi, Origin trái phép, ID mismatch, ảnh giả MIME, upload PNG, job phân tích subprocess, thiếu calibration, deskew và map ngược tọa độ.

Synthetic timing (3 lần/ảnh, cùng môi trường, không OCR): khoảng 0.05–0.10 s/ảnh 1.2 MP tự tạo. Không dùng các số này làm cam kết hiệu năng ảnh thực hoặc nhận diện chính xác. Bản đầu cho 0 tường ở ảnh nghiêng 4°, đã sửa bằng deskew; test hồi quy hiện đạt.

## Cảnh báo dependency không làm test fail

- Rapier init in deprecated signature: cảnh báo từ wrapper/bản compat, test vẫn chạy.
- Starlette TestClient dùng anyio alias deprecated: cảnh báo test, không crash.

## Các giới hạn cần xử lý trước nghiệm thu toàn PLAN

1. Chạy `npm run test:e2e` trên máy có Chromium; kiểm desktop 1440 px, tablet, mobile 390 px, bàn phím, focus, console, WebGL, pointer lock, fullscreen và download GLB.
2. Kiểm thực tế luồng ảnh → crop → scale → analyze → review → edit → slab → walkthrough → save/reload/import/export. Hiện các thành phần logic/API có test nhưng chưa có xác nhận E2E.
3. Cửa/sổ nhận diện tự động chưa có. OCR chưa có model được kiểm chứng. Chưa hiệu chỉnh phối cảnh; deskew chỉ phù hợp một hệ trục vuông góc với góc nghiêng <15°.
4. Kiểm tập ảnh thực được cấp quyền, có ground truth, đo precision/recall/sai số. Confidence .55 hiện là heuristic, không xác suất đã hiệu chuẩn.
5. Chưa có touch walkthrough; canvas chưa có lựa chọn vẽ hoàn toàn bằng bàn phím. Endpoint chỉnh số có; kéo từng đầu tường riêng chưa có.
6. Chưa lưu lịch sử đầy đủ các phép crop/rotation ảnh. Lưu ảnh gốc + ảnh hiện tại + crop cuối/rotation + transform nhận diện. Chưa có quy trình kiểm chuẩn đoạn thứ hai riêng.
7. SVG design handoff không phải screenshot và không phải Figma native. Chưa kiểm độ tương phản bằng công cụ tự động.

Bản này là local MVP core có mã thật, không khẳng định hoàn thành production hoặc toàn bộ tiêu chí plan ban đầu.

## Sửa lỗi đi bộ — 18-11-2026

Người dùng báo demo không đi bộ. Code cũ chặn cả nhận phím và vận tốc nếu `document.pointerLockElement` rỗng, và phụ thuộc nút selector để khóa chuột. Không thể xác nhận trình duyệt của người dùng có từ chối pointer lock hay không. Đã bỏ hoàn toàn điều kiện khóa chuột khỏi di chuyển; bật Đi bộ là có thể dùng WASD/mũi tên, kéo trên canvas để nhìn, hoặc giữ nút onscreen (touch/pointer). Esc thoát; blur/visibilitychange/pointercancel dừng input, tránh kẹt phím. Có HUD tọa độ để kiểm tra chuyển động.

5 test mới kiểm tra di chuyển không có browser lock, button/keyboard nhất quán, chuẩn hóa tốc độ chéo, giới hạn pitch, clear input. Tổng frontend 15 test đạt (bao gồm 2 test Rapier collision). Build/typecheck được chạy lại. E2E cho đi bộ đã thêm nhưng chưa chạy do preview relay vẫn không khả dụng. Không khẳng định đã kiểm thử trực quan trên browser hoặc điện thoại. Các ghi chú “chưa có touch walkthrough” ở báo cáo ban đầu đã được thay bằng nút onscreen ở bản sửa này; chưa nghiệm thu touch trên thiết bị thật.
