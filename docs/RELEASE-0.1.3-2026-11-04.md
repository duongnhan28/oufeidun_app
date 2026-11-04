# LOCAL 0.1.3 — bản thử cập nhật 04/11/2026

## Bản đang phát hành: chỉnh nút xuống dưới cùng

Theo yêu cầu sau đợt thử, giữ version 0.1.3 và chuyển Cập nhật ứng dụng thành phần tử cuối của login-card (sau login-foot), cuối sidebar-bottom (sau Đăng xuất). Bỏ margin dưới, dùng margin trên 14px. Ghi chú thử 0.1.3 vẫn giữ nguyên; không đổi logic cập nhật/DB/server.

- Bộ cài hiện tại: **175270400 byte**.
- SHA256: `e8974981b439cae159665b9703b6c5f3bee9443b299b2e32243243a942436755`.
- [Tải bản 0.1.3 chỉnh vị trí nút](https://oufeidun.vn/app-updates/files/e8974981b439cae159665b9703b6c5f3bee9443b299b2e32243243a942436755.exe).
- Notes: `UPDATE-NOTES-0.1.3-layout.txt`; gói ký local `.local/update-release-0.1.3-layout`.
- `npm run verify` đạt 69 unit, 59 UI, Electron/build/audit 0; UI test thêm assert last-child và tọa độ nút nằm sau login-foot/Đăng xuất. Packaged runtime xác minh vị trí cuối login-card.
- Make LOCAL/ASAR audit, chữ ký manifest, SHA/size trên host, HTTPS GET/PE header, live feed và DB health đạt. Backup feed cũ trước atomic rename; giữ cả installer cũ và mới theo hash.
- Probe version: 0.1.2 → available; 0.1.3 → current. Đây là rebuild cùng version, KHÔNG ép máy đã cài 0.1.3 tự tải. Nếu đã tải gói cũ từ app 0.1.2, đóng/mở app rồi kiểm tra lại để lấy metadata mới. Máy đã cài 0.1.3 cần dùng link bộ cài mới; chưa nghiệm thu cài đè cùng version trên máy khách, có thể cần một version lớn hơn nếu installer không thay thế.
- Bản local mới: `E:\outputt\Oufeidun-Setup-0.1.3-layout.exe`; giữ nguyên bản local trước đó. Không chạy bộ cài trên máy vận hành/khách trong lượt này.

Thông tin đợt thử comment ban đầu bên dưới là lịch sử, không phải hash đang phát hành.

Theo yêu cầu người dùng, thêm một ghi chú hiển thị trong Cập nhật ứng dụng:

> Ghi chú 0.1.3: Bổ sung dòng xác nhận để kiểm thử cập nhật online.

Không thay đổi nghiệp vụ, server, schema, dữ liệu hoặc cấu hình kết nối. Giữ nguyên key ký cập nhật của 0.1.2; không tạo identity mới.

## Phát hành đầu tiên — lịch sử trước chỉnh layout

- Version `0.1.3`, Windows x64, profile LOCAL/API.
- Bộ cài: 175269888 byte.
- SHA256: `52f820b529a6462ac15de2c618d981ac0ff187a0658a871085e1820a64755e29`.
- URL: `https://oufeidun.vn/app-updates/files/52f820b529a6462ac15de2c618d981ac0ff187a0658a871085e1820a64755e29.exe`.
- Feed đã ký: `https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json`.
- Upload tên tạm, xác minh hash/size trên hosting, kiểm tra HTTPS rồi mới đổi feed atomically. Feed trước 0.1.2 được backup riêng; installer 0.1.2 vẫn giữ nguyên.
- Không deploy lại website hoặc cập nhật DB/server trong đợt thử này.

## Kết quả kiểm thử

- `npm run verify` cuối cùng thành công: 69 unit/nghiệp vụ, 59 UI, Electron smoke, build và production audit 0 vulnerabilities.
- Một lượt UI ban đầu chờ sidebar chỉ 5s trong lúc demo DB đang tải nên fail; thêm chờ heading Bán hàng tối đa 45s trước khi assert sidebar. Không bỏ assertion hoặc thay logic login. Rerun đầy đủ đạt.
- `make:local`, ASAR audit đúng profile/version/lookup và không chứa private config/source server/test đạt.
- App đóng gói 0.1.3 hiển thị đúng version và ghi chú mới; kiểm tra feed live báo current.
- Giữ bản đóng gói 0.1.2 làm baseline, mở bằng userData kiểm thử riêng, không đăng nhập dữ liệu khách. Bản cũ phát hiện signed 0.1.3 và tải bằng chính nút Tải bản cập nhật.
- Một lượt tải trả trạng thái error trước khi hoàn tất; chưa có log gốc để kết luận nguyên nhân mạng hay stream. Không bỏ kiểm tra hoặc dùng file lỗi. Lượt tải lại đạt downloaded/progress 100, size/hash hợp lệ và hiện Mở thư mục tải.
- Proxy có thể bỏ Content-Length; không coi header thiếu là kích thước 0. Updater đã có kiểm tra size/hash theo bytes thật. Kiểm tra GET/PE header trước công bố, rồi download đầy đủ bằng app cũ.
- Helper kiểm thử dùng polling snapshot trong Node thay vì dựa vào async waitForFunction của Electron. Các thay đổi helper nằm `.local`, không làm thay đổi app phát hành.
- Website/DB health tốt sau công bố. Không chạy installer, không nâng app đã cài trên máy vận hành hay máy khách, không thử UAC/reboot; chỉ xác minh packaged runtime và đường tải thật.

## Người dùng thử

1. Mở app đã cài 0.1.2.
2. Chọn Cập nhật ứng dụng → Kiểm tra phiên bản, phải thấy 0.1.3.
3. Bấm Tải bản cập nhật, chờ xác minh xong; lỗi thì thử tải lại, không chạy file tải dở.
4. Lưu đơn, đóng app, mở thư mục tải và chạy bộ cài.
5. Mở lại app, kiểm tra version 0.1.3 và dòng ghi chú ở trên. Không reset/cài lại máy chủ hoặc xóa connection.json/server-profile.json.

Installer chưa ký Authenticode thương mại; chữ ký manifest không thay thế chứng chỉ Windows. Không hướng dẫn tắt antivirus/SmartScreen.
