# Kiểm thử lại toàn bộ Oufeidun LOCAL 0.2.18 — 21/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

Thực hiện sau yêu cầu kiểm tra lại toàn bộ app và yêu cầu tiếp tục. Tất cả các lượt cuối của các kiểm thử dưới đây đạt. Không sửa logic ứng dụng hoặc phát hành ZIP khác trong lượt này.

## Kết quả

| Nhóm | Kết quả và bằng chứng |
| --- | --- |
| Dữ liệu, nghiệp vụ và migration | 46 kiểm thử đạt; `.local/full-retest-20261021-verify.log`, exit 0 |
| Giao diện Admin/nhân viên | 50 kiểm thử đạt, gồm danh mục/khách/nháp/bán/tặng/mẫu/giá/ngày/phí/thiếu/giao/trả/Excel/PNG/PDF và bố cục; cùng log verify |
| Electron, TypeScript/build, thư viện app | Electron smoke đạt, build đạt, audit 0 lỗ hổng; cùng log verify |
| Local API | Syntax và 6 unit đạt; MySQL integration thật đạt (`full-retest-20261021-mysql.log`): transaction, tranh chấp tồn/mã đơn, quyền, khách 0/An-Ân, khôi phục và chạy lại migration, bảo toàn đơn/tiền/tồn/vốn |
| LAN và thư viện API | LAN discovery ký định danh/đổi IP/HTTPS/chống replay 1/1 đạt; server audit 0 lỗ hổng |
| App đóng gói Admin | `.local/full-retest-20261021-packaged-admin.log`, exit 0: nhiều SKU bán/tặng kề dưới/mẫu cuối, lưu/mở nháp, giỏ nhập dở giữ qua Cancel/Confirm nháp cũ, ngày/phí 5.000đ/ghi chú/máy dùng chung, PNG/XLSX đọc lại, hủy Save Dialog không lỗi, xác nhận và trừ đúng tồn, nhập Excel 3/9 cột/tạo SKU/giá/số lượng, giá chung và thử lại sau lỗi mạng |
| App đóng gói nhân viên | `.local/full-retest-20261021-packaged-staff.log`, exit 0: giá chung, sửa mã giữ vốn, chốt nháp Admin, trả/đổi, trang khách/báo cáo/nhân viên/lịch sử; không có nhập hàng/tồn đầu/cột vốn, XLSX không lộ vốn. Đã xem ảnh `test-results/local-staff-permissions-stock.png` và `local-staff-permissions-report.png` |
| Khách 0 và báo cáo trên EXE | `.local/full-retest-20261021-customers-report.log`, exit 0: cả Admin/staff tạo ba khách số 0 kể cả An/Ân, thấy khách của tài khoản trước; 11 biến động tồn đầu/giao đầu/bổ sung/hủy/trả khớp DB và XLSX thật, mã tự nhập/số 0 đầu/Unicode/màu/quyền đúng, xem/xuất không đổi tồn/vốn |
| Backup thật | `full-retest-20261021-clean-backup.log` và `relocate-backup.log`, exit 0: dump DB test, ảnh/config/checksum, đường dẫn có khoảng trắng, hook cloud lỗi vẫn hoàn tất local và trả đúng một kết quả |
| Backup Drive | `full-retest-20261021-drive.log`, exit 0: rclone thật copy/check remote filesystem cô lập; bỏ backup chưa hoàn tất/hỏng/traversal/link giả, không xóa cloud-only, khóa chạy trùng, lỗi mạng/quota/token giả lập và retry |
| Cài đặt Drive | `full-retest-20261021-drive-setup.log`, exit 0: chọn folder mặc định/link, OAuth no-output, task SYSTEM mỗi giờ, giữ config khi chạy lại. OAuth và đăng ký task Windows được mock, không đăng nhập/tải lên Google thật |
| Cấu hình/công cụ hỗ trợ | Các log `full-retest-20261021-deployment-config`, `relocate-server`, `relocate-windows`, `clean-data-orchestration`, exit 0: tìm config cũ/port/hostname, đường dẫn khoảng trắng và ký tự &, copy/checksum/ACL thật; các ca hủy/lỗi/rollback, mock tác vụ Windows và clean SQL |
| Cài đè cùng phiên bản | `full-retest-20261021-installer.log`, exit 0; installed app.asar khớp package 0.2.18 |
| Bộ gửi khách | `full-retest-20261021-zip.log`, exit 0; 1.162 checksum folder/ZIP khớp source API/migrations/installer/asar, parse PowerShell đạt, không private config. Runtime LOCAL đúng profile; kết thúc đã build:local lại cho workspace |

## Điều chỉnh môi trường kiểm thử

Harness Admin cũ mặc định dùng port 8787 đang có dịch vụ cũ trên máy, và cần bật cờ HTTPS/LAN. Đã chuyển riêng test sang port 8798, bật `OUFEIDUN_SMOKE_LAN=1`, thêm kiểm tra API test chết sớm; không dừng dịch vụ đang chiếm 8787. Harness cũng cần `OUFEIDUN_SMOKE_ORDER_DETAILS=1` để tạo đúng chi phí 5.000đ cho kỳ vọng tổng 255.000đ. Không sửa cách tính tiền hoặc cấu hình app để vượt test.

Console `Simulated connection failure`, backup checksum hỏng và lỗi upload cloud là lỗi cố ý trong ca kiểm thử; thử lại thành công và dữ liệu local được giữ. Các trạng thái exit ghi tại `.local/full-retest-20261021-*.exit`; tất cả lượt cuối bằng 0.

## Bộ ZIP giữ nguyên

- ZIP: `E:\outputt\Oufeidun-Local-0.2.18.zip`, SHA256 `8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C`.
- Setup: SHA256 `A1EA9E4216516B86881114D02A7873E37933182EE35FD0E67AFC77BFF5942A5A`.
- Chính package đã kiểm tra khớp file trong bộ gửi khách. Không cần tạo ZIP mới sau lượt kiểm thử này.

## Giới hạn thực tế

Các giao dịch dùng database test và profile/ảnh tự tạo; chưa kiểm tra trực tiếp dữ liệu hoặc hai máy vật lý của cửa hàng, Wi-Fi/router/UAC/reboot tại khách. OAuth/tải Google Drive bằng tài khoản khách và đăng ký/chạy task SYSTEM thực tế cần nghiệm thu tại máy chủ khách. Kết quả trên xác nhận các ca đã chạy đạt, không phải bảo đảm mọi lỗi có thể xảy ra đều đã được loại bỏ.
