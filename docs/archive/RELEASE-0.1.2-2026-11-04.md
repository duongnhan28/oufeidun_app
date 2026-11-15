# Oufeidun LOCAL 0.1.2 — 04/11/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

Người dùng xác nhận khách hiện dùng 0.1.1 mới nhất. Bản này nâng lên 0.1.2, chỉ cập nhật client; không thay API server/schema/migration, không cài lại MySQL hoặc reset dữ liệu.

## File và kênh phát hành

- Bộ cài Windows x64: `out/make/squirrel.windows/x64/Oufeidun-Setup.exe`.
- Dung lượng: **175269888 byte**.
- SHA256: `9a48478938f7f57a1a325d46802654716cd204ae9700913d3c25b65bf91ff011`.
- [Tải bộ cài LOCAL 0.1.2](https://oufeidun.vn/app-updates/files/9a48478938f7f57a1a325d46802654716cd204ae9700913d3c25b65bf91ff011.exe).
- Manifest đã ký Ed25519: `https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json`.
- Kênh PRODUCTION không được phát hành nhầm; chỉ công bố LOCAL.
- Bộ 0.1.1 cũ tại `E:\outputt\Oufeidun-Local-0.1.1.zip` được giữ nguyên.

## Cách cài cho khách đang dùng 0.1.1

1. Lưu các đơn đang soạn và đóng app.
2. Tải bộ cài 0.1.2 từ link trên, chạy cài theo cách đang dùng; mở Oufeidun và đăng nhập lại nếu được yêu cầu.
3. Không xóa connection.json/server-profile.json, thư mục dữ liệu hay chạy CLEAN/reset/cài lại máy chủ. Bản này không có migration server mới.
4. Có nút Cập nhật ứng dụng tại màn hình đăng nhập và cuối sidebar. Bản Windows đã đóng gói kiểm tra sau 10 giây và mỗi 12 giờ, chỉ tải khi người dùng bấm.
5. 0.1.1 không có updater nên phải cài 0.1.2 một lần đầu. Các bản sau mới kiểm tra/tải được trong app; không có chuyện app 0.1.1 tự biết cập nhật ngay khi công bố feed.

Updater chỉ tải, xác minh và mở thư mục; không tự chạy bộ cài hoặc ép đóng app. Bộ cài chưa ký Authenticode thương mại; chữ ký manifest không thay thế chữ ký Windows. Không hướng dẫn tắt công cụ bảo vệ Windows để cài.

## Kiểm thử và công bố

- Source tính năng đã qua `npm run verify`: 69 unit/nghiệp vụ, 59 UI, Electron smoke, build, audit production 0. Sau đổi metadata sang 0.1.2, chạy lại 69 unit và audit đạt; `make:local` thành công.
- ASAR audit: LOCAL/API đúng, lookup hosting đúng, version 0.1.2, có updater và public key, không chứa config riêng/source server/test/private key.
- Packaged smoke chỉ đọc: login UI, update IPC, lookup/ảnh HTTPS đạt. Không chạy script đổi mật khẩu tạm hoặc đăng nhập dữ liệu khách.
- Hosting quota kiểm tra trước upload: còn 1760,49MB trong tổng 7168MB. Không hiểu dung lượng filesystem toàn server là quota tài khoản.
- Upload bộ cài bằng tên tạm, hash/size trên host khớp rồi rename thành tên hash immutable.
- Dùng chính AppUpdates với version trước 0.1.1 và metadata đã ký: tải đầy đủ bộ cài thật qua HTTPS, hash/size và kiểm tra lại file hoàn chỉnh đều đạt. Không chạy installer.
- Sau bước trên mới rename manifest atomically vào tên stable. Public key ở client, private key chỉ ở máy người phát hành.
- Bản app đóng gói 0.1.2 kiểm tra feed thật và báo current; probe module 0.1.1 báo available, 0.1.2/0.1.3 không bị hạ phiên bản. Website/DB health tốt sau công bố.
- Chưa thử cài nâng 0.1.1 → 0.1.2 trên Windows VM/máy vật lý khách, chưa nghiệm thu LAN/UAC/reboot hoặc đăng nhập dữ liệu khách thật. Không coi packaged smoke là bằng chứng đã cài thành công trên máy khách.

File metadata/file kiểm thử nằm `.local/update-release-0.1.2`, `.local/release-download-0.1.2`, `.local/packaged-updater-0.1.2.png` và không commit. Khóa ký tại `C:\Users\duong\.ssh\oufeidun_update_signing.pem` cần sao lưu riêng an toàn, không đưa lên hosting/Git.
