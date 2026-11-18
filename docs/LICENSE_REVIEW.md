# Dependency / license review

Inventory được trích từ các package thực đã cài; xem `dependency-inventory.json`, lockfiles và `licenses/`. Giữ lại license notices có sẵn. Đây là inventory kỹ thuật, không phải kết luận pháp lý về một sản phẩm thương mại hoàn chỉnh.

| Thành phần | Phiên bản được dùng | Nguồn license |
|---|---|---|
| Next / React | 16.4.6 / 19.2.0 | MIT trong package |
| Three | 0.180.0 | MIT trong package |
| R3F / Drei | 9.4.0 / 10.7.6 | MIT metadata; Drei có LICENSE |
| React Three Rapier | 2.2.0 | Package thiếu license metadata/file; repo chính thức ghi MIT, cần đối chiếu release khi phân phối thương mại |
| Rapier compat | 0.19.2 | Apache-2.0 metadata; repo chính thức |
| Konva / react-konva | 10.0.8 / 19.0.10 | MIT trong package |
| Lucide | 0.468.0 | ISC trong package |
| FastAPI/Uvicorn, OpenCV, NumPy, Shapely, Pillow | requirements-lock.txt | Metadata và notices cài đặt được lưu trong inventory |

Nguồn đối chiếu chính thức đã đọc:
- https://github.com/pmndrs/react-three-rapier/blob/main/LICENSE
- https://github.com/dimforge/rapier.js/blob/master/LICENSE
- https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE

Không lấy code/model/dataset từ Floorplan-to-3D hoặc CubiCasa5K vào gói. Không đóng gói model weights nào. PaddleOCR adapter tùy chọn chưa cài model; license code không tự động xác nhận quyền sử dụng weights/dataset. Mọi tích hợp model tương lai cần kiểm tra riêng.

Nhà mẫu JSON và fixture PNG được tạo trong phiên, không chứa bản vẽ người dùng. UI dùng icon Lucide và system font; không hotlink ảnh/font. Code mới được bàn giao để người dùng tiếp tục phát triển; chưa tự chọn giấy phép phát hành công khai cho toàn dự án.
