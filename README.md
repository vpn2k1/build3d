# BuildVision 3D — mẫu A / local MVP 0.1

Workspace CAD sáng để dựng nhà một tầng từ ảnh mặt bằng hoặc JSON. Có mã nguồn Next.js/TypeScript, editor Konva, Three.js/R3F, vật lý Rapier và FastAPI/OpenCV. Chạy localhost; không triển khai cloud và không cần khóa API AI.

**Đây là bản triển khai lõi, chưa nghiệm thu toàn bộ PLAN.** Build và các test logic/API/physics đã chạy. Preview của môi trường tạo gói không hoạt động, nên chưa chạy E2E/trình duyệt hoặc xác nhận WebGL trực quan. OCR, độ chính xác ảnh thực và các mục còn thiếu được liệt kê trong `docs/QA_REPORT.md` và `docs/PLAN.md`.

## Chạy trên máy của bạn

Yêu cầu Node.js >=20.9 (đã build bằng Node 24), Python 3.12, npm và trình duyệt desktop hỗ trợ WebGL. Cần Internet khi cài dependencies lần đầu. Sau cài đặt, chức năng baseline chạy local; không có font/CDN hoặc dịch vụ AI bên ngoài.

Từ thư mục `buildvision-3d` sau khi giải nén:

```bash
python -m venv .venv
# macOS/Linux:
.venv/bin/python -m pip install -r services/vision/requirements.txt
# Windows thay lệnh trên bằng:
# .venv\Scripts\python.exe -m pip install -r services/vision/requirements.txt
npm ci --prefix apps/web
python scripts/dev.py
```

Mở **http://127.0.0.1:3000**. API local: **http://127.0.0.1:8000/docs**. `Ctrl+C` dừng cả hai dịch vụ. Nếu máy dùng lệnh `python3`, thay `python` tương ứng. Lệnh trên là hướng dẫn chạy sau giải nén; gói không chứa node_modules hay virtualenv.

Chạy riêng, hai terminal:

```bash
# Terminal 1, từ services/vision:
../../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# Terminal 2, từ apps/web:
npm run dev
```

Build production local:

```bash
npm run build --prefix apps/web
npm run start --prefix apps/web
```

## Luồng sử dụng

1. Mở nhà mẫu có sẵn hoặc `Dự án trống`. Nhà mẫu là JSON tự tạo, không phải dữ liệu nhận diện.
2. `Tải ảnh` JPG/PNG ≤15 MB, ≤25 MP. Ảnh chuẩn hóa quá lớn sẽ bị từ chối. Xoay/crop trước khi tạo hình học.
3. Chọn `Tỷ lệ`, nhấp hai điểm có khoảng cách thực, nhập mét. Chiều cao tầng được nhập riêng, mặc định mẫu 3.2 m và có thể sửa.
4. `Phân tích` gửi ảnh đến **backend localhost**; OpenCV trả về ứng viên ngang/dọc. Review trước khi áp dụng; ứng viên giữ trạng thái `detected`. Cửa/cửa sổ thêm thủ công bằng cách chọn công cụ rồi nhấp tường. Lỗ mở được kiểm tra phạm vi và chồng lấn.
5. `Tường`: nhấp hai điểm; bật Bắt điểm để snap 0.1 m/đầu mút. `Chọn`: kéo tường hoặc sửa tọa độ trong Thuộc tính. `Sàn`: nhấp polygon, Enter hoặc Khép sàn. Sàn không tự sinh khi mặt bằng hở. Chỉ xác nhận sau khi kiểm tra thực tế.
6. Dùng orbit để xoay/zoom. `Đi bộ` bật ngay: dùng WASD/phím mũi tên hoặc giữ nút di chuyển trên màn hình. Kéo chuột/ngón tay trong khung 3D để nhìn quanh; ↶/↷ để xoay. Esc hoặc nút Thoát về orbit. Không cần khóa chuột. Capsule va chạm tường/kính, cửa đi luôn mở. Chế độ mobile có tab 2D/3D; có nút đi bộ/đổi hướng trên màn hình, cần kiểm thử trên thiết bị thật.
7. Tự lưu sau sửa trong IndexedDB của trình duyệt, hoặc `Lưu dự án`. Nếu API đã sẵn sàng, nút Lưu cũng ghi SQLite và phiên bản server. Mở danh sách qua tên dự án ở thanh trên desktop; mobile dùng Dự án đã lưu trong Thuộc tính. JSON giữ ảnh, hình học, trạng thái; GLB chỉ giữ hình học/vật liệu. **Xuất JSON để sao lưu** trước khi xóa dữ liệu trình duyệt.

Undo/redo: Ctrl+Z / Ctrl+Shift+Z, tối đa 40 trạng thái. Ctrl+S lưu, Delete xóa đối tượng. Revisions tăng khi undo/redo để tránh ghi đè phiên bản cũ. Đổi dự án tự lưu bản trước nếu đã chỉnh.

## Kiểm thử

```bash
npm test --prefix apps/web
npm run typecheck --prefix apps/web
.venv/bin/python -m pip install -r services/vision/requirements-dev.txt
# từ services/vision:
../../.venv/bin/python -m pytest -q
# E2E cần cài browser, từ apps/web:
npx playwright install chromium
npm run test:e2e
```

E2E được cung cấp để chạy trên máy bạn; **chưa được chạy trong phiên tạo gói**. Không suy ra điểm Lighthouse/FPS từ build pass.

## Dữ liệu, quyền riêng tư và giới hạn

- Baseline không gọi AI cloud. Trình duyệt gửi đến `127.0.0.1:8000` khi Phân tích/Lưu server.
- IndexedDB lưu dự án theo origin/trình duyệt. Backend lưu tại `services/vision/data/`, SQLite giữ các revision; thư mục mỗi dự án có ảnh. Dữ liệu này được gitignore và không nằm trong gói nguồn.
- Xóa ở danh sách trình duyệt chỉ xóa bản IndexedDB. Xóa bản backend bằng `DELETE /api/projects/{id}` trong tài liệu API. JSON/GLB đã tải xuống phải xóa riêng.
- Chỉ bind loopback; không dùng server này trực tiếp trên Internet. CORS cho localhost/127.0.0.1:3000, kiểm tra Origin cho thao tác ghi, kiểm tra định dạng ảnh thực, giới hạn upload, tối đa hai job, worker timeout 90 s.
- Không có đăng nhập, cloud sync, nhiều tầng, BIM/DWG/IFC, MEP, thanh toán hoặc AI segmentation.
- OpenCV chưa phân loại cửa/cửa sổ. OCR adapter PaddleOCR 2.x là tùy chọn, chưa đóng gói model, chưa test runtime. Không có hiệu chỉnh phối cảnh tự động; deskew tự động bảo toàn tọa độ ảnh gốc, cần review. Không chứng minh độ chính xác trên ảnh công trình thực tế.
- Không dùng mô hình thay hồ sơ thi công được phê duyệt.

## OCR tùy chọn

`app/pipeline/ocr.py` dùng giao diện PaddleOCR 2.x. Không cài mặc định để giữ baseline nhẹ và không tải weights ngầm. Khi đã xác minh giấy phép model và môi trường tương thích, cài PaddleOCR 2.x/PaddlePaddle trong môi trường riêng, đặt `PADDLE_OCR_MODEL_DIR` trỏ đến thư mục có `det/` và `rec/`. Adapter trả text, bbox, confidence; không tự biến chữ OCR thành kích thước đã xác nhận. PaddleOCR 3.x cần adapter riêng. Chưa khẳng định cấu hình tùy chọn này chạy trên mọi hệ điều hành/Python.

## Cấu trúc chính

- `apps/web/components/Workspace.tsx`: UI và lịch sử chỉnh sửa.
- `apps/web/components/Editor.tsx`: Konva, ảnh và thao tác 2D.
- `apps/web/components/Viewer.tsx`: Three/R3F, GLB, orbit, Rapier walkthrough.
- `apps/web/lib/model.ts`, `geometry.ts`, `storage.ts`: contract, tường/lỗ mở, lưu local/API.
- `services/vision/app/`: FastAPI, SQLite, job, OpenCV, adapter OCR.
- `packages/contracts/project.schema.json`: schema server; test kiểm tra contract.
- `fixtures/`: nhà mẫu JSON và ảnh tự tạo (sạch/nhiễu/nghiêng).
- `docs/`: brief, spec, plan, QA, SEO, license inventory, benchmark synthetic.
- `design/`: tokens và SVG desktop/mobile để nhập Figma; **không phải file .fig native**.

Dùng CSS semantic và tokens thay Tailwind để giảm phụ thuộc; giữ Next.js, TypeScript, Konva, Three/R3F/Drei, Rapier, FastAPI, OpenCV/NumPy/Shapely, SQLite theo plan. Không có backend hay nút thành công giả; lỗi kết nối hiện rõ và editor vẫn dùng được.
