# Cập nhật AppBanHang qua hosting Oufeidun

Ngày triển khai source: 04/11/2026. Phạm vi v1: kiểm tra phiên bản, khách bấm tải, xác minh file và mở thư mục. Không tự chạy installer, không ép đóng app, không migration DB/server.

## Luồng và cấu hình

- Electron main process phụ trách kết nối mạng, kiểm tra chữ ký Ed25519 và SHA256/size, lưu file vào thư mục `app-updates` trong userData. Renderer chỉ có IPC cố định; không được truyền URL/path/lệnh shell.
- Bản Windows đóng gói tự kiểm tra sau 10 giây rồi mỗi 12 giờ; mạng lỗi không cản bán hàng. Có nút kiểm tra thủ công trong màn hình đăng nhập và cuối sidebar sau đăng nhập, không nổi đè nút lên đơn.
- Chỉ tải khi khách bấm. Có tiến độ; file tải dở/sai checksum bị loại bỏ. Không gửi cookie/login/database credential tới website cập nhật.
- Tách feed `local-mysql-win32-x64.json` và `production-mysql-win32-x64.json`. Không đưa app LOCAL sang cấu hình PRODUCTION hoặc ngược lại.
- URL gốc và public key cố định trong `electron/update-config.json`. Private key không được đưa vào app, Git, hosting hay log.
- Chỉ nhận stable version dạng X.Y.Z lớn hơn bản hiện tại, Windows x64, component client, `requiresServerUpdate=false`, installer trên đúng HTTPS origin/path cho phép. Không dùng feed này để ép cập nhật khi bản app đòi migration server.
- Các bản cũ chưa chứa updater vẫn cần cài bản tích hợp lần đầu thủ công. Bản portable tải được installer nhưng cần được hướng dẫn chuyển cách cài, không tự coi là có thể ghi đè portable an toàn.

## Khóa ký và chuẩn bị bản phát hành

Lần đầu, từ root app:

```powershell
node scripts/publish-client-update.cjs init-key
```

Lệnh từ chối ghi đè nếu key đã có. Private key mặc định nằm trong thư mục `.ssh` của user Windows, ngoài repository (máy hiện tại: `C:\Users\duong\.ssh\oufeidun_update_signing.pem`). Sao lưu key bằng kênh riêng an toàn, giới hạn ACL trên Windows. Public key được ghi vào `electron/update-config.json` và phải được đóng gói trong app. Không đổi public key tùy tiện sau khi khách đã cài; mất key cần kế hoạch chuyển khóa và phát hành mới.

Đây là chữ ký metadata của hệ thống cập nhật, KHÔNG thay thế chứng chỉ Windows Authenticode. Bộ cài chưa ký Authenticode vẫn có thể bị Windows cảnh báo. Không hướng dẫn tắt antivirus/SmartScreen.

Trước khi xuất gói, chốt số version đang chạy ở khách. Source từng có lịch sử 0.2.17 nhưng hiện package.json ghi 0.1.1; không phát hành bằng cách đoán version. Chốt profile khách, đặt version mới lớn hơn bản đã phân phối, chạy verify và build đúng profile.

```powershell
# Ví dụ thao tác, không chạy nguyên văn các placeholder:
npm.cmd run verify
npm.cmd run make:local
node scripts/publish-client-update.cjs prepare PATH_TO_SETUP.exe X.Y.Z local-mysql NOTES.txt C:\Users\duong\.ssh\oufeidun_update_signing.pem .local/update-release-X.Y.Z
```

`prepare` kiểm tra version bằng package.json và key trùng public key, tạo `files/<sha256>.exe` cùng `stable/<profile>-win32-x64.json`. Không upload hoặc tự cài. Chỉ cung cấp installer đã xác minh đúng profile và không chứa cấu hình/secret/dữ liệu khách. Metadata không thể tự chứng minh nguồn gốc profile của installer — người phát hành phải kiểm tra gói.

## Website/hosting

Route nằm trong repo `E:\Oufeidun_web`: `src/app/app-updates/[...segments]/route.ts`. Không yêu cầu mua domain/subdomain mới.

Đặt biến môi trường production bằng kênh riêng:

```ini
APP_UPDATES_DIR=/home/hwqrwrir/app-updates
```

Đây là thư mục riêng ngoài `.releases`, không đặt private key hoặc file cấu hình DB vào đó. Route chỉ đọc 2 feed cho phép và EXE tên SHA256, từ chối đường dẫn tùy ý/symlink ra ngoài. Không có API upload công khai. Installer được stream; không nạp cả file vào heap. V1 không hỗ trợ resume, tải lỗi phải tải lại.

Quy trình phát hành: backup manifest cũ → upload EXE trước qua SSH/SCP → kiểm tra SHA256 và size trên host → upload manifest thành tên tạm → rename atomically thành tên feed CUỐI CÙNG. Chỉ đổi manifest sau khi đã tải được file qua HTTPS. Không ghi đè EXE cùng tên hash. Manifest cache no-store; EXE immutable. Giữ bản trước phục vụ rollback/chẩn đoán, không tự xóa để giải phóng quota.

Không công bố feed nếu chưa chốt version/profile, verify app, kiểm tra installer sạch và sao lưu khóa. Push website main chỉ triển khai route, KHÔNG tự phát hành installer app. Khi chưa cấu hình thư mục/feed, route trả 404 và app báo chưa có bản công bố.

## Database và máy chủ

Không đưa migration DB vào installer máy nhân viên. Server/database được cập nhật ở máy chủ theo quy trình riêng: backup, bảo đảm không còn ghi dữ liệu, migration, health check và kiểm tra tương thích. Không rollback code cũ lên schema không tương thích. Không xóa connection.json/server-profile.json để cập nhật app.

## Kiểm thử

- `npx tsx --test tests/app-updates.test.ts`: version, chữ ký, sai profile/URL/platform, hash/size, tải dở, offline, giữ file cấu hình.
- `npx playwright test tests/ui/app-updates.spec.ts`: kiểm tra, bấm tải, mở thư mục có chủ đích, không auto-install.
- `npm run test:electron`: smoke app thực, IPC/context isolation và hồi quy bán hàng.
- Website: `npx tsx --test scripts/test-app-updates-route.ts`, typecheck, lint, build và CI hiện có.
- Trước khi phát hành: thử hai bản installer liên tiếp trên Windows staging, một máy Squirrel đã cài và một máy khách đúng cấu hình; kiểm tra lưu draft/config trước-sau. Không dùng dữ liệu khách thật để thử cài.

## Nhật ký xác minh — 04/11/2026

- `npm.cmd run verify`: thành công trên source cuối; 69 test nghiệp vụ/unit, 59 test UI, Electron smoke gồm update IPC, TypeScript/Vite build; production audit 0 vulnerabilities. Có cảnh báo bundle/PGlite từ build demo hiện có, không phải lỗi build.
- Test UI cập nhật chứng minh không tải trước khi bấm và không mở file/cài đặt tự động; unit test kiểm tra chữ ký, hash, profile, lỗi mạng và giữ file cấu hình.
- Website: route test, typecheck, lint và production build local đạt; workflow website được kích hoạt bằng commit endpoint riêng.
- Endpoint website đã deploy và probe HTTPS đạt tại release `a71f85d0ca4fd2332eece069edd53c854b79e623-41745196219-1`; workflow `41745196219` CI/deploy success. Hai feed chưa công bố đều trả 404 body rỗng đúng thiết kế; đường dẫn installer không hợp lệ bị chặn. Homepage/DB health tốt.
- Đã tạo identity ký cập nhật: private key `C:\Users\duong\.ssh\oufeidun_update_signing.pem` nằm ngoài repo, public key trong `electron/update-config.json`. Chưa ký/công bố installer khách. Người vận hành phải sao lưu private key an toàn.
- Chưa chọn version mới, chưa build bộ cài khách, chưa thử nâng hai installer trên máy Windows staging, chưa thử tải EXE lớn qua hosting. Không coi các phần này đã nghiệm thu.
