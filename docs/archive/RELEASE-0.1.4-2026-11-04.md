# LOCAL 0.1.4 — cảnh báo tồn dự kiến

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

## Đã phát hành và kiểm chứng online

- Commit phát hành/tag v0.1.4: e78499f98b6658d7d397aafc8c2395ded00b7120. Main CI 41816522678 đạt; tag CI 41818322494 đạt sau retry riêng job ký/publish chưa khởi động runner. Job Windows/test/build thành công từ lượt đầu của tag, giữ nguyên artifact và tag.
- Feed live đã ký tại https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json công bố 0.1.4. Bộ cài 172647936 byte, SHA256 5ee1995a03aa5e5496828c2468fb4983d640c013bb068a34e7cc0619d8ba68a1.
- Đường tải: https://oufeidun.vn/app-updates/files/5ee1995a03aa5e5496828c2468fb4983d640c013bb068a34e7cc0619d8ba68a1.exe
- Dùng chính AppUpdates: phiên bản 0.1.3 nhận available 0.1.4; 0.1.4 nhận current. Tải đầy đủ, kiểm chữ ký manifest, size/hash hai lần và Windows EXE header đạt. Không tự chạy installer. Proof local .local/online-release-014-proof.json, log .local/verify-online-014.log.
- Khách dùng Cập nhật ứng dụng → Kiểm tra cập nhật → tải và cài 0.1.4; không sửa DB/config. Không thay server hoặc dữ liệu cửa hàng.

## Trình diễn trên bản đã cài

- Theo yêu cầu mới của người dùng, mở cửa sổ riêng từ file đã cài app-0.1.4/Oufeidun.exe, xác nhận app.getVersion() = 0.1.4, profile và HTTPS/MySQL test riêng. Không kết nối/đóng/sửa cửa sổ ứng dụng hoặc dữ liệu người dùng đang mở.
- Tạo mã thử tồn 19, thao tác UI lưu nháp 19: tồn thực tế 19, trong nháp 19, dự kiến 0, nhãn đỏ Hết tồn dự kiến. Đơn mới chọn cùng mã hiện cảnh báo thiếu 1. Đóng không thêm vào giỏ; mở lại cảnh báo và để cửa sổ cho người dùng tự xem/thử tiếp. Không xác nhận bán.
- Ảnh test-results/installed-014-stock19-saved.png và installed-014-stock19-warning.png; proof .local/installed-014-stock19-proof.json. Cửa sổ thử được giữ cùng service test đến khi người dùng đóng; không đổi cấu hình app thật.

Thông tin chuẩn bị và điều tra CI bên dưới là lịch sử trước phát hành.

Người dùng đã yêu cầu tự đẩy bản mới để khách tải qua Cập nhật ứng dụng. Release notes tại docs/releases/0.1.4.md; hành vi và phạm vi tại docs/STOCK-WARNINGS-2026-11-04.md.

- Source đã qua npm run verify: 69 unit, 61 UI, Electron smoke, TypeScript/build và production audit 0. Electron source qua HTTPS/MySQL test thật đạt; ca Admin/staff tồn 19 → nháp 19 → đơn mới hỏi xác nhận đạt. An toàn phát hành 7/7.
- Chỉ client thay đổi; không migration/API/config mới, không tác động DB/ảnh/backup hoặc giá trị tồn khi lưu nháp.
- Phát hành qua GitHub Actions: main kiểm thử/build/ký kiểm chứng trước; tag v0.1.4 mới publish. Giữ identity ký cập nhật, không tái phát hành version 0.1.3.
- Commit tính năng 4d782e7 đã push main. Lượt CI 41815459200 đạt 69 unit nhưng dừng UI: ba kiểm thử nhập kho/xác nhận bán/tạo tồn đầu kỳ không thấy toast trong 5s. Chưa tạo tag hoặc đổi feed.
- Bổ sung diagnostic artifact khi CI thất bại và thời hạn assertion CI 15s (local vẫn 5s), giữ toàn bộ assertion nghiệp vụ, test timeout 60s, maxFailures 3 và hai worker. Chạy lại verify với CI=true và CI remote trước khi phát hành; chưa kết luận nguyên nhân nghiệp vụ nếu chưa có bằng chứng UI.
- Chưa xác nhận feed live hoặc bản cài 0.1.4 cho đến khi workflow tag và kiểm tra chữ ký/hash tải về đạt.
