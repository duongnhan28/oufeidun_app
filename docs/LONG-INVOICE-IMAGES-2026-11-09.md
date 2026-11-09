# Ảnh đơn hàng một file, bảng gọn — 09/11/2026

Yêu cầu mới nhất của khách thay thế phương án chia trang: giữ **một ảnh duy nhất**, bố cục bảng giống ảnh tham khảo, đủ 34 mã nhưng dễ đọc hơn.

## Thay đổi

- `createOrderImage` vẽ bảng gọn với STT, mã kính, ĐVT, SL đặt, đã giao, còn thiếu, đơn giá và thành tiền. Thông tin khách/đơn nằm trong bốn hàng ở đầu; bỏ các thẻ lớn, dòng đơn vị lặp và khoảng đệm lớn.
- Giữ toàn bộ mã hàng, máy dùng chung và ghi chú; nội dung dài xuống dòng thay vì cắt bằng dấu ba chấm. Tặng theo mã bán, mẫu ở cuối như trước.
- Một PNG, không có số trang hoặc nút chuyển trang. Render trực tiếp bằng canvas ở độ phân giải 2x (rộng 2400 px), không phóng lớn ảnh bitmap cũ. Chiều cao tự tính theo nội dung.
- Đơn nháp chưa có số liệu giao hàng hiển thị dấu “—” ở đã giao/còn thiếu, không coi số đặt là số đã giao. Số tiền giữ công thức cũ: số đã giao nếu có, nếu chưa có dùng số đặt; cộng chi phí khác một lần.
- Xem trước cho cuộn ảnh, không ép toàn bộ ảnh dài vào một khung nhỏ. Canvas được giải phóng sau mã hóa PNG. Đơn cực dài vượt giới hạn canvas sẽ báo dùng In/PDF, không tự chia hoặc bỏ dòng.

## Mẫu và kiểm chứng

- Mẫu đơn 954 dựng theo ảnh khách gửi: 34 mã, 470 tấm, 3.525.000đ. File `.local/invoice-single-preview-2026-11-09/don-954-mau.png`: 2400 × 3792 px, khoảng 0,8 MB. Sinh bằng renderer thật của app, không phải ảnh AI.
- TypeScript đạt. 6 test UI liên quan đạt: đơn dài một PNG, thứ tự bán/tặng/mẫu, màu mã hàng, ngày/ghi chú/chi phí, ảnh đơn ngắn và xem trước/tải PNG.
- Test đơn dài kiểm tra đủ 36 STT (34 mã + tặng/mẫu), một canvas, một PNG, tổng số lượng và tiền đúng, không còn hậu tố `trang-N-M`.
- Log `.local/compact-invoice-ui.log`, `.local/compact-invoice-sample.log`.

Người dùng đã chốt ảnh mẫu và yêu cầu phát hành: đưa thay đổi này vào client **0.1.5**, dùng tag `v0.1.5` và CI/CD hiện có. Không ghi đè bộ cài 0.1.4. Trạng thái phát hành thực tế phải kiểm tra trong GitHub Actions và feed công khai. Các sửa đổi server/tài liệu có sẵn trong workspace được giữ nguyên.
