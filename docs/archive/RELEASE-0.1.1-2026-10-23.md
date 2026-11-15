# LOCAL 0.1.1 — đóng gói lại ngày 23/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

## Nội dung

Giữ version 0.1.1, bổ sung toàn bộ sửa doanh thu/ngày đặt/nháp/phí và tính nhất quán khi nhiều máy bán/giao/thu tiền đồng thời. Giữ các chức năng, quyền và sửa lỗi khách hàng/mã báo cáo/màu/backup trước đó.

- Báo cáo và Excel theo ngày đặt, chỉ đơn xác nhận trong kỳ, không tính nháp/ngày mai; doanh thu là giá trị hàng thực giao sau trả + phí đúng một lần, không phụ thuộc tiền đã thu.
- Báo cáo/workspace dùng snapshot chỉ đọc. Ngày không tồn tại, khoảng đảo hoặc vượt 366 ngày bị chặn.
- Không schema MySQL mới riêng cho sửa này. Bộ vẫn kèm migrations đến 010 cho máy chưa cập nhật. Không sửa/reset data/config/ảnh/tài khoản của khách.

## Xác minh

- Source verify exit 0: 48 data/51 UI/Electron/TypeScript/build/audit 0; server 7/7, MySQL thật 1/1 cô lập. Hai ca cố ý ghi xen kẽ khi đang đọc report/workspace đạt.
- Build LOCAL và Forge maker-squirrel đạt; asar đúng version/backend/API tra cứu, không kèm config riêng/source/tests.
- App đóng gói Admin/staff qua HTTPS/discovery/MySQL: báo cáo và workbook thật khớp 7 đơn synthetic/9.740.000đ/phí 30.000 sau các ca hủy/trả/giao bổ sung; giữ mã đơn/màu, staff không thấy vốn, khách số 0/An-Ân dùng chung, 11 biến động khớp DB. Đọc/xuất không đổi tồn/vốn. Đã xem cả hai screenshot.
- Installer silent cài đè cùng version exit 0, installed asar khớp package. Default Update.exe mở đúng app 0.1.1 với profile test riêng.
- Lượt native đầu timeout ở chụp screenshot của cửa sổ test ẩn; sửa harness tắt background throttling và show cửa sổ trước capture, chạy lại sau installer, cả hai vai trò đạt. Không bỏ assertion nghiệp vụ, không sửa sản phẩm để vượt test.
- Logs `.local/release-011-*-20261023.*`; source regression `.local/cross-audit-*-20261023.*`.

## Cập nhật tại cửa hàng

Đã thay folder và ZIP `E:\outputt\Oufeidun-Local-0.1.1` sau khi audit đủ 1.162 checksum trong folder/ZIP, đối chiếu API/migrations/asar/installer, parse PowerShell, loại config riêng và khớp ba bản hướng dẫn.

- ZIP: `E:\outputt\Oufeidun-Local-0.1.1.zip`, 373.891.813 byte; SHA256 `9C94B1C9A7D2C19BA6CEDF96118314103299443B45C95753AA2B4628A57E8F2D`.
- Setup: `02-MAY-CLIENT\Oufeidun-Setup.exe`, 174.964.224 byte; SHA256 `2E404D91FB8E09138B21B2ADEF726B45993E95C871F63BE592179E18ADE2FB99`.
- Bộ trước: `E:\outputt\_BACKUP\Oufeidun-0.1.1-before-revenue-20261023-115243`, giữ cả folder và ZIP cũ, SHA256 ZIP cũ không đổi.
- ZIP 0.2.18 giữ nguyên SHA256 `8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C`.

Đóng app, giải nén ZIP mới. Máy chủ chạy `01-MAY-CHU\CAP-NHAT.bat` trước, kiểm tra API, sau đó cập nhật app máy chủ và mọi máy nhân viên dù vẫn là 0.1.1. Giữ folder dữ liệu/config, không clean/reset hoặc nhập lại DB. Hướng dẫn 23/10 ở `BAT-DAU-O-DAY.txt` và hai thư mục con.

Không kiểm thử trực tiếp DB/hai máy vật lý/OAuth Google của cửa hàng. Installer chưa ký chứng chỉ Authenticode thương mại. Bộ 0.2.18 được giữ nguyên; bộ 0.1.1 ngày 21/10 được sao lưu trước khi thay.
