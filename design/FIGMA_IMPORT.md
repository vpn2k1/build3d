# Bộ nhập Figma

Gói này không có file .fig hoặc liên kết Figma native. Không có công cụ ghi Figma được dùng trong phiên.

1. Tạo file Figma mới, pages Foundations / Components / Desktop / Mobile.
2. Kéo `frames/desktop.svg` và `frames/mobile.svg` vào page tương ứng. Text/vector có thể chỉnh sửa; dùng Arial hoặc thay font có hỗ trợ tiếng Việt.
3. Tạo variables từ `tokens.json`, components/variants theo `COMPONENTS.md`.
4. Dựng auto layout cho header, toolbar, inspector và dialogs theo `docs/DESIGN_SYSTEM.md`.
5. SVG import không tự tạo đầy đủ auto layout/variables/variants. So sánh với code khi chạy local; SVG chỉ handoff layout, không screenshot nghiệm thu.
