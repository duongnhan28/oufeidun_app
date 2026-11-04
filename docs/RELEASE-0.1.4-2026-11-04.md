# LOCAL 0.1.4 — cảnh báo tồn dự kiến

Người dùng đã yêu cầu tự đẩy bản mới để khách tải qua Cập nhật ứng dụng. Release notes tại docs/releases/0.1.4.md; hành vi và phạm vi tại docs/STOCK-WARNINGS-2026-11-04.md.

- Source đã qua npm run verify: 69 unit, 61 UI, Electron smoke, TypeScript/build và production audit 0. Electron source qua HTTPS/MySQL test thật đạt; ca Admin/staff tồn 19 → nháp 19 → đơn mới hỏi xác nhận đạt. An toàn phát hành 7/7.
- Chỉ client thay đổi; không migration/API/config mới, không tác động DB/ảnh/backup hoặc giá trị tồn khi lưu nháp.
- Phát hành qua GitHub Actions: main kiểm thử/build/ký kiểm chứng trước; tag v0.1.4 mới publish. Giữ identity ký cập nhật, không tái phát hành version 0.1.3.
- Commit tính năng 4d782e7 đã push main. Lượt CI 41815459200 đạt 69 unit nhưng dừng UI: ba kiểm thử nhập kho/xác nhận bán/tạo tồn đầu kỳ không thấy toast trong 5s. Chưa tạo tag hoặc đổi feed.
- Bổ sung diagnostic artifact khi CI thất bại và thời hạn assertion CI 15s (local vẫn 5s), giữ toàn bộ assertion nghiệp vụ, test timeout 60s, maxFailures 3 và hai worker. Chạy lại verify với CI=true và CI remote trước khi phát hành; chưa kết luận nguyên nhân nghiệp vụ nếu chưa có bằng chứng UI.
- Chưa xác nhận feed live hoặc bản cài 0.1.4 cho đến khi workflow tag và kiểm tra chữ ký/hash tải về đạt.
