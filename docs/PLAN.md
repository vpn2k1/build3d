# PLAN — trạng thái triển khai thực tế

| Giai đoạn theo plan đầu vào | Đã triển khai | Còn lại trước nghiệm thu đầy đủ |
|---|---|---|
| P0 — Khởi tạo | Repo nguồn, dependencies pin + lock, contract TS/Python, fixtures tự tạo, test, inventory license | Xác minh weights OCR tùy chọn; chốt tập ảnh thực có quyền sử dụng |
| P1 — Engine 3D | Tường/sàn/lỗ mở, cửa sổ, orbit/top view, Rapier capsule, GLB; test thể tích và collision/pass-through đạt | Browser/WebGL QA, GLB roundtrip trong viewer ngoài, FPS/GPU/memory |
| P2 — Editor/upload | Konva, upload, crop/rotate 90°, calibration, pan/zoom/snap, chỉnh tường/cửa, undo/redo, IndexedDB, SQLite revisions, JSON | Kiểm tra desktop/mobile E2E, cải thiện accessibility canvas, endpoint drag riêng, chuỗi transform ảnh đầy đủ, kiểm chuẩn đoạn thứ hai |
| P3 — Nhận diện | OpenCV thick-line candidates, resize + deskew và biến đổi ngược về ảnh gốc, Shapely validity, job process timeout, review trước áp dụng | Hiệu chỉnh phối cảnh, phân loại cửa/sổ, PaddleOCR runtime/model, chất lượng ảnh thực, precision/recall và sai số |
| P4 — QA/đóng gói | Build/typecheck, test geometry/API/physics, README, source ZIP, design import kit, synthetic timing | Preview bị chặn bởi hạ tầng; chưa chạy Playwright, chưa benchmark CPU/GPU đại diện hoặc nghiệm thu tất cả tiêu chí |

Không gọi v0.1 là hoàn thành toàn bộ MVP đề xuất 22–34 ngày. Đây là nền tảng chạy local và triển khai luồng chỉnh tay/nhận diện tường baseline, có các phần chưa được kiểm chứng nêu trên.

Thứ tự tiếp theo: (1) chạy E2E/WebGL trên máy thật; (2) kiểm GLB ngoài ứng dụng; (3) tập ảnh được cấp quyền có ground truth; (4) xử lý skew/perspective và đánh giá tường; (5) model OCR với license rõ; (6) thử nhận diện openings, đo chất lượng rồi mới mở rộng. Không thêm cloud hoặc segmentation chưa xác minh.
