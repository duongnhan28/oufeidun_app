# Dọn dữ liệu thử trước khi nhập production

- Chỉ tạo công cụ, không chạy xóa database thật của người dùng.
- Giữ toàn bộ app_users và schema_migrations; giữ cấu hình, CA/discovery, backup cũ.
- Preview theo đúng cấu hình server đang cài, hiển thị tên DB/folder/số dòng.
- Người chạy phải nhập đúng câu xác nhận; hủy không thay đổi dữ liệu.
- Dừng Local API, xác minh cổng đã ngừng nghe; backup thành công mới tiếp tục.
- Chuyển uploads vào backup; xóa dữ liệu nghiệp vụ bằng DELETE trong một transaction InnoDB, không TRUNCATE/DROP.
- Từ chối schema lạ, trigger tùy biến hoặc FK ngoài database. So sánh nguyên vẹn tài khoản/migration trước commit.
- Lỗi SQL rollback; khôi phục ảnh khi DB không hoàn tất; khởi động lại API trong finally.
- Test MySQL riêng: preview không ghi, rollback giữa chừng, giữ account/mật khẩu/quyền/session, schema lạ, toàn bộ bảng nghiệp vụ rỗng, chạy lại an toàn.
- Test PowerShell orchestration với task/DB/backup giả: Cancel, backup lỗi, cổng còn nghe, lỗi SQL và thành công. Không dừng/xóa dữ liệu máy thật.
- Verify bắt buộc; bàn giao gói BAT + scripts bổ sung, không đổi EXE hoặc bản ZIP 0.2.13 cũ.
- Backup theo ngày đã có: task Oufeidun Backup 23:00/StartWhenAvailable; kiểm tra việc đăng ký/task chạy thật ở máy khách.

## Review 06/10/2026

- [x] MySQL test thật: preview, rollback, giữ account/schema, schema lạ, xóa và chạy lại an toàn.
- [x] PowerShell 5 trường hợp Cancel/backup lỗi/cổng mở/SQL lỗi/thành công.
- [x] Backup thật tại dataDir thử cô lập và kiểm tra SQL/ảnh/checksum.
- [x] Verify 21 dữ liệu, 26 UI, Electron, TypeScript/build, audit đạt.
- [x] Bộ bổ sung scripts parse đạt; SHA256 được ghi trong FEATURE-CHECKLIST.md.
- Không chạy clean trên DB đang dùng của người dùng, không xóa backup cũ, không thay bộ cài EXE. UAC/task thật cần người dùng chạy trên máy chủ lúc đã đóng app tất cả máy.
