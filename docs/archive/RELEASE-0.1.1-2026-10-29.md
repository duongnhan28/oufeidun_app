# LOCAL 0.1.1 — build và bàn giao ZIP 29/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

Đã thay folder/ZIP 0.1.1 bằng bản có đổi mã sau bán, phân quyền tài khoản và báo cáo chi tiết sản phẩm. Giữ đầy đủ chức năng/sửa lỗi trước đó. Bộ 24/10 được chuyển nguyên vẹn vào backup trước khi đặt bộ mới vào vị trí bàn giao.

## File bàn giao

- ZIP: `E:\outputt\Oufeidun-Local-0.1.1.zip`, **373.913.857 byte**.
- SHA256 ZIP: `DDA8B5F36212B662C5FB0A97B2CAF6BEEA3CD058695D0D18724982979E830C5B`.
- Setup: `02-MAY-CLIENT\Oufeidun-Setup.exe`, **174.969.344 byte**.
- SHA256 Setup: `BE7CF5853FDEADC6966454C602BDF644B6B385F3195C322CD3B7BADD0F401ABF`.
- Backup folder/ZIP trước: `E:\outputt\_BACKUP\Oufeidun-0.1.1-before-permissions-20261029-130649`.
- ZIP trước giữ SHA256 `84292CB412D6FA1809DA309BF68734D18A75669A32A54D39570DE6B3165662C2`. Bộ 0.2.18 không thay đổi.

## Nội dung mới

1. Đổi mã/tên sản phẩm sau bán, giữ cùng ID/tồn/giá. Nháp/đơn/chứng từ giữ nhãn đã lưu, mã cũ tìm/nhập Excel được và không cấp lại cho hàng khác. Migration 011 chỉ điền nhãn NULL bằng tên đang hiển thị khi nâng cấp, không tái dựng lịch sử không còn nguồn.
2. Admin cấp bảy quyền riêng theo account; nhân viên mới cơ bản, legacy giữ nghiệp vụ trừ quản trị account chỉ Admin. API kiểm quyền mới từng request, version/audit và chặn replay sau revoke. Vốn/giá nhập/lợi nhuận chỉ Admin.
3. Staff được nhập một mã hoặc Excel hai cột không vốn; giữ giá/vốn mã cũ. Mã mới pending vốn, chưa chốt bán trước Admin thiết lập. Điều chỉnh tồn/lý do/version và các giao dịch khác theo quyền.
4. Báo cáo từng sản phẩm theo ID, từng đơn/khách/Sales/bán-tặng-mẫu/đặt-giao-trả-net/giá/thành tiền. 200 dòng/trang, Excel đủ kỳ, không lộ vốn staff; số liệu khớp tổng hợp và không phụ thuộc thu tiền. Sửa race xuất Excel khi workspace polling quyền, popup rộng.
5. Giữ bán/tặng/mẫu đúng thứ tự, direct-confirm nháp, ngày/ghi chú/phí, thiếu/giao bổ sung/thu/trả/đổi/hủy, khách số 0/An-Ân, mã đơn thật/màu, kho kính/phụ kiện, backup local/Drive và discovery Wi-Fi/LAN.

Chi tiết nghiệp vụ và nghiệm thu hai lượt: [STAFF-PERMISSIONS-AND-PRODUCT-REPORT-2026-10-29.md](../STAFF-PERMISSIONS-AND-PRODUCT-REPORT-2026-10-29.md).

## Kiểm tra bản bàn giao

- Hai lượt đầy đủ source trước đóng gói: mỗi lượt verify 52 dữ liệu/56 UI/Electron smoke/TypeScript/build/root audit 0; server unit7, MySQL API cũ/mới, LAN, bốn bộ Electron nguồn, backup/CLEAN đều đạt, không skip DB/LAN. Server audit cuối 0.
- LOCAL/Forge Squirrel make exit 0. Audit ASAR đúng version/profile/discovery/lookup; không chứa source/tests/.env/cấu hình riêng.
- Kiểm thử EXE vừa build qua HTTPS/discovery/MySQL test: quyền mới/default/grant/revoke, nhập một mã/Excel không vốn, pending, bán/tặng/mẫu, Excel chi tiết native, giữ giá/vốn; Admin/staff report/khách/mã/màu/11 biến động; điều chỉnh tồn/lý do/history/audit/Excel; đổi mã/alias/nháp/PNG/XLSX đều đạt.
- Cài đè cùng 0.1.1 exit 0; installed app.asar khớp package. Default Update.exe launcher mở đúng bản đã cài trong profile test cô lập.
- Audit **1.167 file** và từng entry ZIP trước lẫn sau chuyển vào output: SHA256, API/migrations 011–012, setup/asar, parse PowerShell, loại config riêng; ba bản hướng dẫn cùng hash với nguồn ngày 29/10. Bộ cũ backup giữ hash, 0.2.18 không đổi.
- Logs `.local/release-011-*-20261029.*`, mọi exit cuối 0; metadata `.local/release-011-artifacts-20261029.json` và progress ghi PASS. Chỉ thử DB/profile tự tạo, không chạm data/config cửa hàng.

## Cập nhật

Đọc BAT-DAU-O-DAY.txt trong ZIP. Đóng app mọi máy, giữ thư mục dữ liệu cũ. Máy chủ chạy **01-MAY-CHU\CAP-NHAT.bat** trước để backup/cập nhật API và migrations còn thiếu đến 012. Kiểm tra server, xuất bộ nhân viên rồi cập nhật app máy chủ/mọi máy nhân viên. Không clean/reset/nhập lại DB hoặc sửa server.env. Portable cần cả folder App và public profile cửa hàng.

Quyền theo account, không theo máy; Admin cấp ở Nhân viên > Phân quyền. Không dùng API/app cũ xen kẽ để đánh giá quyền mới dù số version vẫn 0.1.1.

Giới hạn: chưa nghiệm thu DB/hai máy vật lý/Wi-Fi/UAC/reboot/Google OAuth của cửa hàng; installer chưa ký Authenticode thương mại. Mật khẩu chung bảo vệ màn hình chưa triển khai. Không coi kiểm thử này là bảo đảm không thể có mọi lỗi khác.
