# SPEC — BuildVision 3D v0.1

## Routes và giao diện

`/`: một workspace local, không cần đăng nhập. Header: project picker, undo/redo, save, export JSON/GLB, help. Toolbar: upload/analyze, select, wall, door, window, slab, scale, pan, snap, rotate/crop. Viewports 2D và 3D, inspector, cảnh báo. Dialog: dự án local, hiệu chỉnh tỷ lệ, review phân tích, hướng dẫn. Không có trang marketing hoặc form lead.

Desktop: grid 2D / 3D / inspector. <=960 px inspector xuống dưới; <=640 px chuyển tab 2D/3D. Đi bộ dùng WASD/mũi tên hoặc nút màn hình; kéo chuột/ngón tay để nhìn, không cần pointer lock. Focus-visible và dialog native hỗ trợ Escape; canvas chưa có phương án vẽ hoàn toàn bằng bàn phím.

## Data contract

`schemaVersion=1`, `unit=m`, `[x,z]` cho mặt bằng, Y lên trong Three.js. Một floor. Project có name/revision/projectId/calibration/image/floors. Tường: start/end/thickness/height/status/confidence tùy chọn. Opening offset tính từ start tường đến cạnh đầu lỗ mở; width/height/sillHeight. Các trạng thái `detected`, `estimated`, `confirmed` được giữ khi export. Slab polygon chỉ dựng khi confirmed.

Schema TypeScript: `lib/model.ts`. Pydantic: `app/schema.py`. Bản JSON schema phát sinh: `packages/contracts/project.schema.json`. Có kiểm tra ID duy nhất, tường tối thiểu 0.1m, opening trong tường, không chồng lấn, polygon không tự cắt. Tọa độ không chấp nhận NaN/Infinity. Ảnh trong JSON chỉ data URI PNG/JPEG; không URL từ xa.

Ảnh normalized được lưu cùng ảnh gốc, rotation và crop cuối. SourceTransform của kết quả phân tích ghi resizeRatio và deskewMatrix/inverseDeskewMatrix và góc nghiêng, chưa lưu chuỗi đầy đủ các phép biến đổi liên tiếp. Scale do người dùng xác nhận. Khi đổi scale, tọa độ/độ dày/offset/width theo tỷ lệ; chiều cao không tự suy ra từ ảnh.

## Hành vi thật

- Lịch sử tối đa 40 trạng thái. Undo/redo tăng revision. Kiểm tra schema trước khi commit chỉnh sửa.
- IndexedDB tự lưu sau 800 ms; nút Save lưu browser và server khi health check khả dụng. Server SQLite kiểm tra xung đột revision.
- Upload chuẩn hóa EXIF bằng decode browser/backend; MIME thực được kiểm tra backend. Crop/xoay chỉ trước khi tạo hình học để không làm lệch dữ liệu hiện có.
- Konva hỗ trợ pan/zoom, snap 0.1 m/đầu mút, chọn/kéo tường và chỉnh số trong inspector.
- Tường chia khối quanh opening, không CSG. Door là lỗ mở. Window có khung/kính và collider. Floor dùng ExtrudeGeometry từ polygon. GLB xuất chỉ model group, không grid/camera/walker.
- Rapier: dynamic capsule, gravity, CCD, fixed wall/slab/window colliders. Spawn trong slab confirmed, tránh wall block. Ngoài sàn có thể rơi, dưới -10 m reset spawn. Chưa có animation cửa hay cầu thang.
- Analyze: lưu project → upload ảnh → job subprocess → review → áp dụng. Kết quả không ghi đè nếu project đã đổi revision khi job chạy.

## API

POST/GET `/api/projects`; GET/PUT/DELETE `/api/projects/{id}`; POST `/{id}/image`; POST `/{id}/analyze`; GET `/{id}/export`; GET `/api/jobs/{id}`; GET `/api/health`. Swagger ở `/docs`.

Upload ≤15 MB/25 MP. Job tối đa hai đồng thời, timeout worker 90 s; frontend poll tối đa 120 lần. File path chỉ từ ID kiểm tra regex. CORS chỉ hai loopback origins cổng 3000. Backend mặc định bind 127.0.0.1 theo launcher.

## Trạng thái lỗi và giới hạn

Không ảnh, thiếu scale, backend lỗi, JSON lỗi, geometry lỗi, upload quá lớn, job lỗi/timeout đều có thông báo. Không trả thành công giả khi save/analysis thất bại. Nút Save có thể lưu browser thành công nhưng server thất bại và nêu rõ.

Baseline detection chỉ horizontal/vertical thick-line candidates, confidence .55 là heuristic, không xác suất đã hiệu chuẩn. Cửa/sổ chưa tự nhận diện. OCR adapter opt-in chưa test. Chưa tự hiệu chỉnh phối cảnh, chưa đo precision/recall ảnh thực. Xem QA_REPORT để phân biệt đã test với mã đã viết.
