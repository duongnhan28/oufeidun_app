# Khách hàng bị ghi đè khi nhập số 0 — 21/10/2026

## Nguyên nhân và sửa lỗi

Khóa unique chỉ theo phone và INSERT ON DUPLICATE KEY UPDATE làm nhiều khách cùng số 0 ghi đè một bản ghi. Các đơn giữ customer_name/customer_phone/customer_address riêng nên vẫn hiện đầy đủ tên trong danh sách đơn, còn danh mục chỉ còn khách lưu cuối cùng.

LOCAL MySQL migration 010 thay khóa duy nhất phone bằng identity_key: phone thật giữ nhận diện theo phone; phone chỉ gồm số 0 nhận diện thêm tên không phân biệt hoa/thường, có phân biệt dấu tiếng Việt. API sửa theo ID chính xác; đổi khách số 0 trên nháp không đổi tên hoặc lấy ID khách trước. Cạnh tranh cùng tên/phone không tạo trùng, khác tên không gộp. Trang Khách hàng tải lại khi mở và mỗi 10 giây, tránh khi modal/busy/ẩn.

## Khôi phục dữ liệu cũ

Chỉ xử lý customer_id đang hoạt động, dùng số 0 và bị nhiều tên khác nhau trên đơn chưa xóa cùng trỏ vào. Tạo lại tên/phone/loại/địa chỉ từ snapshot đơn mới nhất, sửa liên kết customer_id tương ứng; giữ số tiền, tồn, ID đơn, snapshot chứng từ, version và thời gian cập nhật đơn. Không suy đoán điện thoại thật, không sao chép giá riêng mơ hồ, không kích hoạt lại khách đã xóa. Khách không còn thông tin trên đơn hoặc trường hợp không đủ bằng chứng không được tự dựng lại.

DDL/DML chạy lại sau gián đoạn không trùng bản ghi; không phục hồi tên cũ chỉ vì chủ động đổi tên hồ sơ có một tên trên các đơn. Có parity migration riêng cho demo PGlite, không triển khai Supabase online.

## Kiểm thử

Tests/customer-identity.test.ts mô phỏng lỗi cũ rồi chạy migration hai lần: ba tên/SĐT 0 khôi phục đủ, giữ snapshot, đúng liên kết; lưu lại cùng khách, đổi khách trên nháp, sửa hồ sơ trực tiếp, điện thoại thật, xung đột phone và quyền staff. MySQL integration có cạnh tranh cùng/khác tên, An/Ân, lưu lại nháp, mô phỏng liên kết cũ, chạy lại migration 010 và so toàn bộ số tiền/version/thời gian/tồn/vốn trước sau. UI kiểm ba khách số 0, lưu nháp nhiều lần, tải lại, đổi tài khoản và xem lại nháp.

Chỉ dùng dữ liệu tự tạo trong database test cô lập, không truy cập hoặc sửa DB khách. Khi phát hành cần cập nhật máy chủ/API/migration 010 và app mọi máy; giữ config/data và backup trước cập nhật.

## Bộ bàn giao đã cập nhật

- Folder và ZIP `E:\outputt\Oufeidun-Local-0.2.18` đã ghi đè ngày 21/10. Bộ trước nằm tại `E:\outputt\_BACKUP\Oufeidun-0.2.18-before-customer-identity-20261021-173959`.
- Verify 46 dữ liệu/50 UI/Electron/build/audit đạt; MySQL integration và dữ liệu phục hồi/rerun đạt. Packaged app kiểm ba khách 0, An/Ân, chia sẻ hai tài khoản, báo cáo Excel và quyền vốn qua HTTPS/MySQL thật đạt; installer cài đè cùng version và audit 1.162 file folder/ZIP đạt. Log `.local/customer-identity-*20261021*` và `.local/release-20261021-*`, exit 0.
- ZIP SHA256 `8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C`, 373.888.902 byte. Setup SHA256 `A1EA9E4216516B86881114D02A7873E37933182EE35FD0E67AFC77BFF5942A5A`, 174.961.664 byte.
- Khách chạy `01-MAY-CHU\CAP-NHAT.bat` trước để backup/API/migration 010; sau đó kiểm tra/xuất bộ client và cập nhật app mọi máy dù cùng version. Khôi phục trên dữ liệu khách chỉ diễn ra khi khách chạy bước cập nhật máy chủ; không khẳng định đã sửa DB khách từ máy phát triển.
