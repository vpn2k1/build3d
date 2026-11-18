# Kế hoạch sửa luồng đọc ảnh mặt bằng và dựng 3D

Mục tiêu là tải được ảnh mặt bằng, kiểm tra các tường nhận diện trên ảnh 2D và mở được mô hình 3D đúng tỷ lệ. Nguyên nhân lỗi và trạng thái build production cần được xác minh ở giai đoạn 1.

## Giai đoạn 1 — Tái hiện và khoanh vùng

- [ ] Trong `apps/web`, chạy hai script `typecheck` và `build`. Ghi kết quả riêng cho mỗi lệnh.
- [ ] Tải một ảnh PNG mặt bằng phòng chữ nhật. Ghi bước đầu tiên gặp lỗi khi xem ảnh, nhận diện tường hoặc chuyển sang 3D.
- [ ] Mở 3D với một project có sẵn bốn tường hợp lệ. Nếu ca này đạt, ưu tiên xử lý đường đi từ ảnh đến dữ liệu tường. Nếu cảnh trống, điều tra phần dựng hình độc lập ở giai đoạn 4.

**Nghiệm thu.** Có ảnh mẫu, project đối chứng, thao tác tái hiện và kết quả mong đợi so với thực tế cho cả hai ca.

## Giai đoạn 2 — Đọc, hiển thị và lưu ảnh

- [ ] Theo dõi ảnh từ lúc chọn tệp qua giải mã, hiển thị trên mặt bằng đến khi lưu project. Đối chiếu trường `image.dataUrl` với định dạng PNG/JPEG base64 trong [schema dự án](../packages/contracts/project.schema.json).
- [ ] Sửa bước thất bại và hiển thị nguyên nhân khi người dùng chọn ảnh hỏng hoặc định dạng chưa hỗ trợ.

**Nghiệm thu.** Thử riêng một PNG và một JPEG. Cả hai hiển thị đúng tỷ lệ và vẫn nhìn thấy sau khi lưu rồi mở lại project. Tệp hỏng có thông báo tại bước đọc ảnh.

## Giai đoạn 3 — Nhận diện tường và hiệu chỉnh tỷ lệ

- [ ] Vẽ các đoạn tường nhận diện chồng lên ảnh để đối chiếu đầu mút. Kiểm tra lại với ảnh đã thu nhỏ hoặc xoay.
- [ ] Dùng một cạnh chuẩn dài 4 m để kiểm tra phép đổi từ pixel sang mét. Xác định sai số chấp nhận được trước khi chạy ca kiểm thử.
- [ ] Khi kết quả có 0 tường, báo kết quả và cho phép thử lại.

**Nghiệm thu.** Bốn tường trùng với bốn cạnh phòng trên ảnh mẫu. Chiều dài cạnh chuẩn nằm trong sai số đã ghi nhận.

## Giai đoạn 4 — Dựng và cập nhật cảnh 3D

- [ ] Dựng tường từ dữ liệu tầng đã kiểm tra ở 2D. Kiểm tra trục tọa độ, chiều cao, độ dày và khung nhìn camera ban đầu.
- [ ] Chạy lại cả project đối chứng và project tạo từ ảnh. Sửa một tường ở 2D rồi mở lại cảnh 3D.

**Nghiệm thu.** Cả hai project đều hiện đủ bốn tường ngay khi mở cảnh. Mô hình phản ánh đúng thay đổi vừa thực hiện ở 2D.

## Giai đoạn 5 — Kiểm thử hồi quy và build production

- [ ] Dùng Vitest kiểm tra phép đổi tọa độ và tỷ lệ với cạnh chuẩn.
- [ ] Dùng Playwright kiểm tra luồng tải ảnh → nhận diện → mở 3D → lưu → mở lại.
- [ ] Chạy các script `typecheck`, `test` và `build` trong [ứng dụng web](../apps/web/package.json). Khởi động bản production bằng script `start` và chạy ca đầu cuối trên bản đó.

**Nghiệm thu.** Các kiểm tra đều đạt trên phiên bản dự kiến phát hành. Khi mở lại project đã lưu, người dùng thấy đúng ảnh ở 2D và đủ tường ở 3D.
