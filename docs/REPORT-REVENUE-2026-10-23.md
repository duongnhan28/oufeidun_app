# Sửa báo cáo doanh thu — 23/10/2026

## Nguyên nhân được xác minh trong source

- Danh sách đơn dùng `ordered_at`, nhưng doanh thu/số đơn/chi phí khác trong `server/src/reports.cjs` dùng `confirmed_at`. Hai màn không đối chiếu cùng tập đơn khi nhập lùi ngày hoặc đặt ngày hôm sau.
- Thẻ doanh thu chính trước đây chỉ gồm sản phẩm, phí ở một dòng tổng khác. Vì vậy thẻ chính có thể thấp hơn tổng giá trị các đơn.
- Không có truy vấn tiền thanh toán trong phép tính doanh thu hiện tại. Không kết luận lỗi do tiền thực nhận. Nháp thường có `confirmed_at=NULL`, vốn đã không vào báo cáo; chưa có DB khách để xác minh trạng thái thực tế của đơn trong phản hồi.
- Các tổng trong ảnh (630.000 + 1.860.000 + 6.930.000 + 210.000 + 760.000 + 660.000 + 0 + 0) bằng 11.050.000đ. Chỉ từ ảnh chưa thể xác minh chính xác vì sao DB khách trả 1.630.000đ/5 đơn. Đã tái hiện lỗi lọc ngày bằng dữ liệu tự tạo, không dùng mã/DB thật của khách.

## Kết quả sau sửa

- Số đơn, tiền sản phẩm và chi phí khác dùng cùng ngày đặt VN, `confirmed_at IS NOT NULL` và trạng thái confirmed/partially_returned/returned. Loại draft/deleted/cancelled; dự phòng ngày xác nhận/tạo với dữ liệu cũ.
- `revenue` và `order_value` là tổng sản phẩm sau trả + phí; `product_revenue` đối chiếu tổng dòng bán. Lợi nhuận tổng bằng doanh thu trừ giá vốn. Phí chỉ cộng một lần mỗi đơn, không theo số dòng hoặc lần giao.
- Chưa thanh toán/trả một phần/trả đủ có cùng doanh thu. Giữ tính hàng thực giao như `total_amount` của đơn; tặng/mẫu 0đ vẫn tính lượng/vốn. Hàng chưa giao không tự sinh doanh thu.
- App và Excel dùng chung hàm tổng, nhận cả API mới/cũ. Nhãn nêu ngày đặt và không phụ thuộc thanh toán. Sổ kho vẫn theo ngày thực xuất/nhập, không thay lịch sử.
- Demo cập nhật hàm báo cáo và lọc quyền trước khi trả dữ liệu. Không áp dụng Supabase online, không sửa DB khách, không thêm migration MySQL.

## Kiểm thử bổ sung

- MySQL API thật trong DB test cô lập: 8 đơn theo số tiền trong ảnh + 1 nháp ngày mai; nháp cùng ngày/xóa; 2 đơn mẫu 0đ; một đơn giao thiếu; phí; giờ 00:00/23:59; xác nhận khác ngày đặt; đơn xác nhận cho ngày mai; lọc một/hai ngày; sửa ngày không đổi thời gian xác nhận; ba mức thanh toán; Admin/staff cùng doanh thu, staff không vốn; hủy/trả/giao bổ sung; đọc báo cáo không đổi tồn/đơn.
- PGlite demo: 8 đơn/nháp ngày mai, phí đúng một lần, thanh toán, sửa ngày, hủy/trả, quyền staff và áp dụng hàm báo cáo hai lần.
- Helper tổng/Excel với API cũ và mới, tránh cộng phí hai lần.
- Playwright: bán đơn lùi ngày có phí, để nháp ngày mai, mở báo cáo và tải/đọc workbook thật; kiểm số đơn/doanh thu/chi tiết phí và ngày mai bằng 0.

## Triển khai

Kết quả cuối: `npm.cmd run verify` mã thoát 0 (48 data, 51 UI, Electron smoke, TypeScript/build, audit 0 lỗ hổng). MySQL integration thật 1/1 không skip, server unit 6/6 đạt. Đã build lại LOCAL sau verify; logs `.local/report-fix-*-20261023.*`. Đã xem ảnh báo cáo mới tại `test-results/report-business-date.png` và đọc workbook xuất thật.

Chỉ sửa source trong lần này; EXE/ZIP 0.1.1 đã xuất ngày 21/10 chưa thay. Khi đóng gói cần cập nhật API máy chủ và app mọi máy, giữ config/data. Không reset hoặc sửa tiền/ngày của đơn cũ. Các kỳ báo cáo sẽ tính lại từ dữ liệu đã lưu.
