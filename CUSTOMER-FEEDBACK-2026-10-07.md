# Sửa phản hồi khách ngày 07/10/2026

- [x] Hãng điện thoại: combobox có thể chọn hoặc nhập hãng mới, lưu vào sản phẩm; khi sửa không ép về Apple. Hãng đã dùng được gợi ý lại. UI xác minh lưu Tecno rồi tải lại và mở sửa vẫn giữ hãng.
- [x] Excel nhập kho: tái hiện bằng UI, đọc đúng cột theo tiêu đề, hỗ trợ số nguyên dạng text có phân nhóm và kết quả công thức đã lưu. Báo đúng dòng/cột khi dữ liệu sai; không ghi kho khi file lỗi. Chặn thông báo lỗi bị lớp friendly che đi. UI nhập thật 2 miếng, tồn từ 48 lên 50 và giữ sau reload.
- [x] Đơn thiếu: xác nhận không tự xóa ghi chú thiếu khi các dòng trong đơn giao đủ. Hiển thị ghi chú trong chi tiết. Cho xác nhận hoàn tất ghi chú khi không còn dòng hàng chờ giao; chặn nếu vẫn còn số lượng thiếu. Đơn thiếu thực tế vẫn tự hoàn tất sau giao đủ. Demo/MySQL/Supabase cô lập xác minh ghi chú giống ví dụ A12; Excel tải lại vẫn ghi Còn thiếu hàng.
- [x] Kiểm thử demo, MySQL, migration Supabase cô lập và `npm.cmd run verify`; đọc lại FEATURE-CHECKLIST.md và ghi kết quả thật. Verify: 22 dữ liệu, 29 UI, Electron smoke, build, audit 0 lỗ hổng. Server unit 6/6, MySQL integration 1/1.

## Giới hạn đối chiếu

- Chưa nhận workbook/thông báo lỗi của khách; đã sửa các lỗi parser tái hiện được, chưa kết luận mọi file của khách đều hợp lệ.
- Import này là nhập kho cho SKU đã có, không tự tạo danh mục sản phẩm từ ba cột nhập kho.
- Không tự phục hồi ghi chú đã bị bản cũ xóa hoặc sửa đơn A12 trên máy khách; cần dữ liệu gốc/backup để đối chiếu.
- Chưa tạo bộ cài mới hoặc cập nhật runtime máy khách. Khi phát hành LOCAL phải cập nhật cả server API và client; MySQL không cần migration mới. Supabase có migration 026, chỉ kiểm thử cô lập, chưa áp dụng lên DB đang vận hành.

Không tự suy ra SKU/số lượng từ ghi chú tự do, không tự tăng tiền hay trừ kho theo ghi chú. Muốn giao/thu tiền hàng chưa nằm trong đơn, phải tạo dòng hàng/đơn bán tương ứng. Không sửa dữ liệu khách hoặc chạy clean-data trong lần sửa này.
