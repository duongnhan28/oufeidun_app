# Cập nhật server trước khi thử app 0.1.4

## Chẩn đoán trực tiếp tại máy phát triển

`E:\OufeidunServerData\app\package.json` vẫn là 0.2.17; `workspace.cjs` chưa có draft_quantity, migrations chỉ đến 007. Kiểm tra `/health` API thực đang chạy xác nhận 0.2.17 và thiếu capability tồn dự kiến. App 0.1.4 đã có cảnh báo, nhưng cần API cung cấp tổng lượng của mọi nháp. Cơ chế cập nhật desktop online không thay API Windows/MySQL tại cửa hàng.

## File đã chuẩn bị

- ZIP: `E:\outputt\Oufeidun-Server-Update-0.1.4.zip`.
- Folder đã giải nén để thử: `E:\outputt\Oufeidun-Server-Update-0.1.4`.
- SHA256 ZIP: `156A85893AE1105BF00AEB7B578BAC0DCD61E3CB34999F949D0BCF1274FBAB58`.
- Gói chỉ dành cho server: CAP-NHAT.bat, KIEM-TRA-TON-DU-KIEN.bat, SAO-LUU.bat, KHOI-DONG-LAI.bat, code/deps/migrations, hướng dẫn/checksum. Không có DB/env/config cài riêng, không cần gửi bộ cài desktop lần nữa.

## Người dùng thực hiện trên máy này

1. Lưu đơn đang soạn, đóng app ở các máy đang nối cùng server.
2. Mở folder đã giải nén, chạy **CAP-NHAT.bat**, chọn Yes ở UAC. Không chép đè thủ công vào thư mục dữ liệu.
3. Nếu hỏi thư mục dữ liệu cũ, nhập **E:\OufeidunServerData**. Máy khách phải chọn đường dẫn cài thật của họ, không lấy đường dẫn máy phát triển.
4. Chờ Cap nhat thanh cong. Updater backup DB/ảnh/config trước, giữ app cũ, thay API và chạy migration còn thiếu. Từ bản cũ có thể áp dụng 008–013: không reset tài khoản/đơn/giá/tồn, không đổi cấu hình DB/IP/certificate. Có thể cần đăng nhập lại sau nâng phiên.
5. Chạy **KIEM-TRA-TON-DU-KIEN.bat**: server đang chạy phải là 0.1.4 và báo OK hỗ trợ tồn dự kiến. Chỉ thấy app version 0.1.4 chưa đủ.
6. Mở app 0.1.4, đăng nhập và tải lại. Phải có dòng Trong nháp / Dự kiến trên sản phẩm.
7. Dùng mã test tồn 8, lưu nháp 8 rồi tạo đơn mới cùng mã: +1 cảnh báo thiếu1; tiếp tục rồi nhập7 cảnh báo thiếu7. Đóng giữ lượng cũ; tiếp tục mới nhận7; tồn thực tế vẫn8. Nếu đã có nháp8 từ lần thử trước thì dùng lại, không tạo lặp làm tổng nháp tăng thêm.

Sau khi test trên máy này đạt mới gửi ZIP server cho khách, để họ chạy trên máy chủ; client các máy dùng 0.1.4 online. Không gửi OufeidunServerData hoặc backup/env thật. Giữ bản cũ/backup tới khi kiểm đơn/kho/ảnh/Excel và máy nhân viên đạt.

## Kiểm thử đã thực hiện

- npm run verify exit0: 69 unit, 61 UI, Electron, build và audit production0.
- `tests/server-update.integration.cjs`: fixture schema007, nâng bằng code mới và code trong gói, giữ tài khoản/password/order/item/SKU/giá/tồn, migrate rerun an toàn, health capability và nhu cầu nháp 8+7. Dùng DB test riêng được cấu hình; user test không có CREATE DATABASE nên bật rõ OUFEIDUN_UPGRADE_RESET_TEST_DB=1 để reset đúng DB test, không đọc/đổi DB thực tại cửa hàng.
- `tests/server-update.ps1`: updater thật trên cây file test, mock Admin/Windows Tasks/start và backup boundary; success/backup-failure giữ config/ảnh/app cũ. `tests/clean-backup.ps1`: SQL/uploads/checksum MySQL test và cloud hook lỗi vẫn giữ backup local đạt.
- Audit1062 file folder/source/ZIP và parse PowerShell đạt. Dữ liệu thật chưa nâng; phiên công cụ không elevated. UAC/SYSTEM/dịch vụ/HTTPS thật phải nghiệm thu khi người dùng chạy BAT trên máy này, không coi các mock là kết quả chạy thật.
