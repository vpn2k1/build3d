# Components / mapping

- `Topbar`: logo, project selector, undo/redo, save/export. Export có dropdown JSON/GLB.
- `Toolbar`: import/analyze; tool buttons có selected state. Analyze disabled khi job đang chạy.
- `Viewport`: heading + canvas + footer. 3D có Edit/Walkthrough và fullscreen.
- `Inspector`: form số commit onBlur/Enter, range/schema validation. Xóa và xác nhận đối tượng.
- `Dialog`: HTML dialog native, focus và Escape; các dialog project/calibration/review/help.
- `Notice`: toast lưu thành công, alert lỗi, warning dữ liệu chưa xác nhận.
- `MobileTabs`: dưới 640 px chuyển viewport hiển thị. Inspector vẫn truy cập bên dưới.

Các state cần tạo khi dựng Figma: default, hover, focus, disabled, loading, selected, error. Dùng tokens.json. UI source là tài liệu hành vi cuối cùng.
