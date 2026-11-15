# Gom thư mục máy chủ LOCAL

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

Đã được người dùng duyệt: copy bộ bàn giao và dữ liệu vào thư mục mới, chuyển
đường dẫn vận hành, kiểm tra rồi giữ bản cũ để đối chiếu. Không tự xóa bản cũ.

- [x] Kiểm kê đường dẫn trong env, launcher, Caddy, server-info và Scheduled Tasks.
- [x] Tạo BAT chạy Administrator, cho chọn nguồn/đích; chặn chồng lấn, junction,
  đích đã tồn tại, thiếu dung lượng, MySQL datadir nằm trong nguồn và task lạ.
- [x] Lưu XML task, dừng/vô hiệu hóa API/HTTPS/backup, backup DB/ảnh/cấu hình.
- [x] Copy có kiểm tra checksum, giữ nguyên cert/key/DB; sửa đường dẫn chỉ ở bản mới.
- [x] Đăng ký lại task giữ trigger/principal/settings, kiểm tra DB, API, HTTPS,
  ảnh local nếu có và chạy backup tại vị trí mới.
- [x] Khi lỗi: dừng task mới, giữ ảnh mới nếu có, khôi phục XML/task cũ và chạy lại.
- [x] Kiểm thử cô lập các nhánh thành công, hủy, backup/copy/task/health lỗi và
  bảo vệ đường dẫn; không di chuyển dữ liệu/dịch vụ đang dùng trên máy phát triển.
- [x] Đọc lại checklist, chạy verify và đóng gói BAT/scripts/hướng dẫn riêng tại E:\outputt.

Đích mặc định: `%SystemDrive%\Oufeidun`; nguồn mặc định cùng gốc ổ hệ thống.
MySQL service/datadir, IP, hostname, firewall, hosts và cấu hình máy con giữ nguyên.
Shortcut portable cần đổi sang folder mới. Nếu muốn xóa nguồn, người dùng kiểm tra
máy bán hàng và backup trước, sau đó xóa thủ công; công cụ không tự dọn nguồn.
