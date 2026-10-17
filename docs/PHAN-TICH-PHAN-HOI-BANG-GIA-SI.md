# Phân tích phản hồi bảng giá sỉ

Ngày phân tích: 30/09/2026

## Trạng thái triển khai ngày 30/09/2026

Phần khách hàng đã chốt đã được triển khai: chọn khách/loại khách tại đơn hàng, tự gợi ý giá, sửa giá thực tế theo từng dòng, lưu giá riêng cho khách sỉ, hỏi giữ hay áp lại giá khi đổi khách, lưu snapshot và audit. Migration đã có cho cả MySQL local và Supabase test.

Màn quản trị `price_group` riêng chưa được tạo trong đợt này. Chức năng giá đồng loạt hiện có vẫn dùng các nhóm loại kính hiện hành; phần này không ảnh hưởng luồng sửa giá linh hoạt vừa chốt.

## Phản hồi của khách

1. Giá sỉ đang hiển thị nhưng người dùng không biết thiết lập ở đâu.
2. Mỗi khách sỉ có thể có một mức giá khác nhau.
3. Cần tùy chỉnh giá linh hoạt theo từng sản phẩm.
4. Cần chỉnh giá đồng loạt theo dòng sản phẩm như full viền, chống nhìn trộm và không viền cao cấp.

## Hiện trạng đã kiểm tra

- Popup **Tên và loại hàng** chỉ cho đổi tên hiển thị, loại hàng và ghi chú. Đơn giá là trường chỉ đọc theo đúng thiết kế cũ.
- Giá lẻ và giá sỉ của từng SKU được sửa tại **Kho kính → Sửa mã kính**.
- Giá đồng loạt nằm tại **Kho kính → Bảng giá đồng loạt**. Vị trí này khó nhận biết và popup bán hàng không chỉ đường tới nơi cấu hình.
- Database hiện chỉ có một `wholesale_price` trên mỗi sản phẩm. Mọi khách sỉ dùng chung giá này; chưa có bảng giá riêng theo khách hàng.
- Khi chọn khách sỉ, server tự lấy `products.wholesale_price`; staff không thể gửi giá tùy ý từ client.
- Toàn bộ 8 sản phẩm local hiện có giá sỉ bằng giá lẻ. Bảy SKU thuộc nhóm `clear`, một SKU thuộc nhóm `privacy`; chưa SKU nào được phân nhóm `full_border` hoặc `premium_borderless`. Vì vậy thao tác giá đồng loạt cho hai nhóm này hiện cập nhật 0 sản phẩm.
- Đơn đã xác nhận lưu giá snapshot, vì vậy có thể mở rộng bảng giá mà không thay đổi doanh thu của đơn cũ.

## Kết luận về khoảng thiếu

Yêu cầu chính là **được sửa đơn giá ngay trên từng dòng hàng khi đang lên đơn**. Giá lẻ/giá sỉ trong danh mục chỉ là giá gợi ý ban đầu, không phải mức giá bắt buộc cho mọi đơn. Chức năng hiện tại đang khóa đơn giá nên chưa đáp ứng yêu cầu này.

Ngoài giá linh hoạt cho đơn hiện tại, người dùng cần có thể lưu mức giá đã thỏa thuận cho từng khách sỉ để lần sau hệ thống tự điền. `glass_type` cũng đang bị dùng cho cả loại kính hiển thị và nhóm định giá, trong khi hai khái niệm này có thể khác nhau.

## Thiết kế đề xuất

### 1. Tách nhóm định giá khỏi loại kính

Thêm `price_group` cho sản phẩm, gồm:

- `full_border`: Full viền
- `privacy`: Chống nhìn trộm
- `premium_borderless`: Không viền cao cấp
- `standard`: Kính thường
- `other`: Khác

`glass_type` tiếp tục dùng để mô tả và lọc loại kính; `price_group` chỉ dùng cho bảng giá đồng loạt. Khi migration, dữ liệu chưa xác định được gán `standard`, không tự đoán full viền hay không viền.

### 2. Giữ giá mặc định trên sản phẩm

Mỗi SKU vẫn có:

- Giá bán lẻ mặc định
- Giá bán sỉ mặc định
- Giá vốn quy định

Đây là giá dự phòng khi khách không có giá riêng.

### 3. Thêm giá riêng theo khách sỉ và sản phẩm

Tạo bảng `customer_product_prices`:

| Trường | Ý nghĩa |
| --- | --- |
| `customer_id` | Khách sỉ được áp dụng |
| `product_id` | SKU được áp dụng |
| `unit_price` | Giá riêng của khách cho SKU |
| `created_by`, `updated_by` | Người thiết lập |
| `created_at`, `updated_at` | Thời gian thay đổi |

Ràng buộc duy nhất là `customer_id + product_id`. Xóa giá riêng sẽ quay về giá sỉ mặc định, không xóa sản phẩm hoặc khách hàng.

### 4. Cho sửa giá trực tiếp trên từng dòng hàng

Popup **Tên và loại hàng** đổi trường **Đơn giá áp dụng** từ chỉ đọc thành ô số **Giá bán thực tế**.

- Người bán được nhập giá riêng cho từng SKU trong đơn đang soạn.
- Giá nhập vào chỉ áp dụng cho dòng hàng của đơn hiện tại.
- Khi khách là khách sỉ đã lưu, có checkbox **Lưu giá này cho khách ở những lần sau**.
- Hiển thị giá gợi ý ban đầu và chênh lệch để người dùng biết mình đang tăng hay giảm giá.
- Hàng tặng/hàng mẫu vẫn tự về `0đ`; hàng bán giá `0đ` phải xác nhận riêng.
- Server kiểm tra và lưu giá, không chỉ thay đổi số tiền ở giao diện.
- Mỗi lần sửa giá phải ghi audit gồm đơn, khách, SKU, giá cũ, giá mới và người thực hiện.

Quyền đề xuất theo đúng nhu cầu vận hành: cả Admin và Nhân viên bán hàng đều có thể sửa giá trên đơn của mình; chỉ Admin được sửa giá mặc định, giá vốn và bảng giá đồng loạt.

### 5. Thứ tự chọn giá khi lên đơn

Khi thêm sản phẩm, server đưa ra giá gợi ý theo thứ tự:

1. Hàng tặng/hàng mẫu: `0đ`.
2. Khách sỉ đã lưu và SKU có giá riêng: dùng giá riêng của khách.
3. Khách sỉ không có giá riêng: dùng giá sỉ mặc định của SKU.
4. Khách lẻ: dùng giá lẻ mặc định của SKU.

Người bán có thể thay giá gợi ý trên dòng hàng trước khi xác nhận. Server lưu giá thực tế vào draft và dùng đúng giá đó khi xác nhận. Đơn đã xác nhận giữ nguyên snapshot khi bảng giá thay đổi về sau.

### 6. Giao diện đề xuất

- Thêm mục **Bảng giá** rõ ràng trong sidebar admin hoặc nút nổi bật tại Kho kính.
- Màn **Bảng giá mặc định** hiển thị SKU, nhóm giá, giá lẻ, giá sỉ và giá vốn; sửa nhanh từng SKU.
- Màn **Giá riêng khách sỉ** có combobox chọn khách, tìm SKU, nhập giá riêng và nút xóa giá riêng.
- Popup dòng hàng có ô **Giá bán thực tế**, đồng thời hiển thị nguồn giá gợi ý: `Giá riêng của khách`, `Giá sỉ mặc định` hoặc `Giá lẻ mặc định`.
- Khi giá thực tế khác giá gợi ý, giỏ hàng gắn nhãn **Giá đã chỉnh**.
- Với admin, popup có thêm nút **Đi tới cấu hình giá** để sửa giá mặc định.
- Popup chỉnh đồng loạt phải cho xem số SKU sẽ bị ảnh hưởng và yêu cầu xác nhận trước khi ghi.

## Kiểm thử bắt buộc

1. Nhân viên sửa giá của một SKU trên draft, lưu/mở lại vẫn giữ đúng giá đã sửa.
2. Hai SKU trong cùng đơn có thể dùng hai mức giá tùy chỉnh độc lập.
3. Hai khách sỉ mua cùng SKU nhận hai mức giá riêng khác nhau.
4. Checkbox lưu giá riêng làm lần lên đơn tiếp theo tự điền đúng giá của khách đó.
5. Khách sỉ không có giá riêng nhận giá sỉ mặc định; khách lẻ nhận giá lẻ mặc định.
6. Request giá âm, số lẻ không hợp lệ hoặc vượt giới hạn bị từ chối; hàng bán `0đ` cần xác nhận.
7. Người dùng không thể sửa giá của đơn đã xác nhận hoặc draft không thuộc quyền.
8. Đổi bảng giá không làm thay đổi đơn đã xác nhận.
9. Draft đang mở dùng giá đã tùy chỉnh; nếu chưa tùy chỉnh thì phát hiện thay đổi giá mặc định và yêu cầu xem lại.
10. Chỉnh đồng loạt chỉ tác động đúng `price_group` và hiển thị đúng số SKU ảnh hưởng.
11. Audit ghi khách hàng, SKU, giá cũ, giá mới và người thực hiện bằng nội dung dễ hiểu.

## Phạm vi ảnh hưởng

- Database MySQL local và migration Supabase test.
- API sản phẩm, khách hàng, lưu draft và xác nhận đơn.
- Màn Kho kính/Bảng giá, màn Khách hàng và popup dòng hàng trong Bán hàng.
- Báo cáo không đổi công thức; tiếp tục dùng giá snapshot của đơn.

## Đề xuất triển khai

Triển khai thành hai phần nhưng phát hành cùng một phiên bản:

1. Cho sửa giá thực tế trên từng dòng đơn, lưu đúng vào draft/snapshot và ghi audit.
2. Thêm `price_group`, màn Bảng giá rõ ràng và chỉnh đồng loạt có xem trước.
3. Thêm tùy chọn lưu giá riêng theo khách sỉ để tự điền ở những đơn sau.
