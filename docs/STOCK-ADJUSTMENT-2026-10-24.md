# Điều chỉnh tồn kho có lý do — 24/10/2026

## Điều tra và thiết kế

Nghiệp vụ `inventory/type=adjustment` đã có từ trước, nhưng nút nằm cuối trang, form yêu cầu tồn thực đếm và không cho biết rõ cách trừ số lượng. Lý do đã lưu trong phiếu kho nhưng chưa được join ra lịch sử mã/báo cáo; danh sách audit chỉ lấy nhập kho/mở đầu/bán/giao nên không thấy điều chỉnh.

Đưa nút lên đầu trang Kho hàng và thêm theo từng mã. Form chọn giảm/tăng theo lượng hoặc nhập tồn thực tế, hiển thị trước/sau và bắt buộc lý do. Tách khỏi form sửa thông tin sản phẩm để thao tác tồn không vô tình lưu kèm giá/SKU/ảnh chưa hoàn tất.

Giữ nguyên backend ghi tồn hiện có: khóa row sản phẩm, kiểm stock_version, chênh lệch và stock movement trong transaction, kiểm không âm và idempotency. Không ghi trực tiếp vào on_hand từ form sửa sản phẩm, không mở API nhập hàng cho staff, không thay quyền hoặc schema.

## Ảnh hưởng được kiểm tra

- Tồn và stock_version thay đổi; tồn trên mọi máy tải lại như trước. Một thay đổi tồn xảy ra sau khi mở form sẽ khiến lần lưu cũ bị chặn, tránh ghi đè giao dịch mới.
- Đơn đã bán, nháp và giá/vốn/price_version không bị viết lại. Giảm tồn có thể khiến nháp không đủ hàng; xác nhận vẫn kiểm tồn và từ chối vượt tồn. Khi tăng tồn đủ lại, nháp cũ bán được với giá đã lưu.
- Không sinh doanh thu hoặc khoản thu tiền. Nhập–xuất–tồn cộng đúng chênh lệch; giá trị tồn hiện hành thay đổi theo lượng mới, giá vốn đơn vị giữ nguyên. Đây là kiểm kê, hàng hỏng thực tế vẫn dùng Ghi nhận kính lỗi để vào chỉ tiêu thiệt hại.
- Lịch sử mã hiển thị lý do/người thực hiện. Lịch sử thao tác nhận adjustment và nhãn đúng. Báo cáo/Excel Chi tiết kho thêm lý do ở cột thứ 8, giữ mã đơn ở cột thứ 7. Không gán mã đơn cho điều chỉnh.
- Demo bổ sung đọc lý do/lịch sử/report movements tương ứng, không triển khai Supabase online. MySQL không có migration mới; phiếu cũ có lý do được đọc lại khi cập nhật API.
- Không thay dữ liệu/config/DB/tài khoản/ảnh của khách; cần cập nhật cả API và app. Giữ version 0.1.1 theo bộ hiện tại, sao lưu bộ 23/10 trước khi đóng gói lại.

## Các ca kiểm thử

Bước audit phát hiện Zod 4.6.5 bị ảnh hưởng bởi [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Đã chỉ cập nhật một package lên bản vá 4.6.6 (pin package/lockfile), `npm audit --omit=dev` trở lại 0; chạy lại verify sau thay đổi dependency. Không cập nhật hàng loạt thư viện hoặc thay backend.

Audit riêng server phát hiện [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828) và [multer](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) có cảnh báo mới. Đã cập nhật body-parser 2.4.0 trong lockfile và multer 2.5.0, giữ Express/MySQL và nghiệp vụ; audit server về 0, chạy lại unit/MySQL integration gồm upload ảnh thật/ảnh giả và kiểm sau bản vá. Không chạy `audit fix --force` hoặc nâng hàng loạt dependency.

- Giảm/tăng/đặt tồn, đưa về 0, giảm quá tồn, số âm/lẻ/quá giới hạn/rỗng/no-op và lý do rỗng/khoảng trắng.
- Admin/staff, kính và phụ kiện, thiếu lý do không ghi, retry không cộng/trừ lặp; hai yêu cầu cùng stock_version chỉ một thành công.
- Giá/vốn/đơn/nháp/doanh thu bất biến khi kiểm kê; thiếu tồn chặn bán và rollback; tăng lại rồi bán nháp cũ được.
- Lịch sử và audit có lý do/người, Excel tải thật có chênh lệch/tồn sau/lý do đúng; cột mã đơn giữ nguyên; staff không vốn và vẫn bị chặn nhập hàng.
- Kiểm tra hồi quy toàn app, app đóng gói HTTPS/discovery/MySQL hai vai trò, cài đè và audit bộ ZIP trước khi bàn giao. Nhật ký kết quả cuối trong FEATURE-CHECKLIST.md.
