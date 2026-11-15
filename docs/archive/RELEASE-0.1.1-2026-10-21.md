# Bàn giao Oufeidun LOCAL 0.1.1 — 21/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

Đổi số phiên bản thành 0.1.1 đúng yêu cầu người dùng, giữ toàn bộ tính năng và sửa lỗi mới nhất của 0.2.18. Không dùng lại source cũ hoặc reset dữ liệu. App/API và hai lockfile cùng 0.1.1; giữ Application ID và vị trí cấu hình hiện có.

## Kiểm thử và tương thích bản đã cài

- Verify mới exit 0: 46 dữ liệu/50 UI/Electron/TypeScript/build/audit 0 lỗ hổng (`.local/release-011-verify-20261021.log`). MySQL integration thật exit 0, gồm khách 0/An-Ân, khôi phục, chạy lại migration, đơn/tồn/giá/quyền/báo cáo (`release-011-mysql-20261021.log`).
- Kiểm tra khởi động máy chủ không được bỏ qua xác nhận version chỉ vì 0.1.1 nhỏ hơn 0.2.12. API có module discovery phải công bố đúng version; API 0.2.18 còn chạy hoặc thiếu version bị từ chối. Máy chủ legacy thật sự không có capability vẫn giữ tương thích. Kiểm discovery dựa trên trường health, không dựa mốc số 0.2.13. `tests/server-health-version.ps1` có bảy tình huống, kèm deployment-config đạt (`release-011-health-20261021.log`).
- Make LOCAL maker-squirrel và package audit đạt: đúng LOCAL/API/version/discovery/lookup, không private config/source/test (`release-011-make-20261021.log`).
- EXE mới qua HTTPS/discovery/MySQL: cả Admin và staff tạo khách 0 riêng kể cả An/Ân, chia sẻ danh sách, đối chiếu 11 biến động báo cáo với XLSX thật, giữ mã tự nhập/số 0 đầu/Unicode/màu/quyền vốn và toàn bộ tồn/vốn (`release-011-packaged-20261021.log`, exit 0).
- Cài 0.1.1 đè bản 0.2.18 đã cài thành công; installed asar khớp package (`release-011-installer-20261021.log`). Kiểm riêng đường khởi chạy mặc định Update.exe: mở đúng app-0.1.1, không nhầm bản cao hơn (`release-011-default-launch-20261021.log`). Fixture tách APP_TEST_DATA và bỏ ELECTRON_RUN_AS_NODE do môi trường công cụ đặt; không thay app để vượt test.
- Audit 1.162 checksum folder/ZIP, API/migrations/setup/asar khớp source/build, parse PowerShell và loại private config đạt (`release-011-stage-20261021.log`, exit 0). Ba hướng dẫn khớp nguồn. Các log nằm trong `.local` không đưa vào bộ khách.

## File bàn giao

- Folder: `E:\outputt\Oufeidun-Local-0.1.1`.
- ZIP: `E:\outputt\Oufeidun-Local-0.1.1.zip`, 373.887.050 byte; SHA256 `ED5BCDCFE643D6DAC8C4B6ACAA4B8F79ED119B18C7262C707893C5130A05B7D5`.
- Setup: `02-MAY-CLIENT\Oufeidun-Setup.exe`, 174.961.664 byte; SHA256 `C8C85A4CE6B794F7E8B7E64185544111D07069DAFD6B34123CBDC3BB54F2D1D3`.
- Bộ 0.2.18 giữ nguyên, ZIP vẫn SHA256 `8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C`.

## Cập nhật cửa hàng

Đóng app các máy, chạy `01-MAY-CHU\CAP-NHAT.bat` trước để backup/API/migrations còn thiếu (đến 010), kiểm tra/xuất bộ nhân viên rồi cập nhật app tất cả máy. Giữ folder data/config/DB/account/ảnh/chứng chỉ/identity. Không cài lại MySQL, không clean data; không cần nhập lại config. Nếu đã cập nhật đủ 010 từ bộ 0.2.18 thì migration không lặp dữ liệu.

Kiểm thử dùng dữ liệu tự tạo trên DB test; chưa nghiệm thu dữ liệu/hai máy vật lý, router/UAC/reboot hoặc Google OAuth/task thực tại cửa hàng. Số phiên bản thấp hơn theo yêu cầu, nhưng nội dung chức năng vẫn là bản mới nhất.
