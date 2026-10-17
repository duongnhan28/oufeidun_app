# Hướng dẫn bắt buộc cho người phát triển

- Trước khi thay đổi source, phải đọc `BA-SPEC.md` và `FEATURE-CHECKLIST.md`.
- Sau khi hoàn thành bất kỳ tính năng hoặc sửa lỗi nào, phải mở và đọc lại toàn bộ `FEATURE-CHECKLIST.md`, đối chiếu các ID bị ảnh hưởng và cập nhật mục **Nhật ký xác minh**.
- Không được nói tính năng đã hoàn thành hoặc tạo bản bàn giao nếu chưa chạy `npm.cmd run verify` thành công.
- Không được đưa URL database, service-role key, mật khẩu hoặc token vào Git, tài liệu bàn giao hay output kiểm thử.
- Build TEST và PRODUCTION phải dùng đúng profile được mô tả trong README; không thay cấu hình production bằng Supabase test.
