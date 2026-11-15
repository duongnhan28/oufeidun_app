# Cập nhật 0.2.14: mã kính và Excel tạo mã mới

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

- [x] Bỏ ô tên sản phẩm và tên riêng trên đơn; dùng SKU ở các màn hình và chứng từ, giữ dữ liệu tên cũ trong DB để đối chiếu.
- [x] Excel ba cột tự tạo SKU mới trong cùng transaction nhập kho, chỉ Admin; mã có sẵn không đổi giá/thông tin. Mã mới: tên nội bộ = SKU, loại/hãng chưa phân loại, không ảnh/model; giá vốn = giá nhập ban đầu, giá lẻ/sỉ = 0 cần thiết lập.
- [x] Chặn SKU rỗng/dài/trùng, số lượng/giá sai, mã đã xóa; không lưu một phần, chống nhập lặp và kiểm tra cạnh tranh.
- [x] Kiểm thử UI, Excel, quyền, transaction MySQL và demo; đọc lại checklist và chạy verify.
- [x] Build đúng LOCAL, kiểm thử bản đóng gói, ghi đè bộ bàn giao 0.2.14 (giữ bản trước ở thư mục backup riêng), cập nhật hướng dẫn và checksum. Không đụng dữ liệu/config đang chạy.

Yêu cầu người dùng: giữ phiên bản 0.2.14 và ghi đè bộ bàn giao cũ. Máy khách cần cập nhật cả API máy chủ và app máy con; chỉ thay EXE máy con sẽ chưa có chức năng tạo SKU từ Excel.
