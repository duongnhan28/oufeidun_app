# Excel danh mục theo mẫu khách — 08/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

- [x] Đối chiếu mẫu: 8 cột, bỏ tên sản phẩm, dòng máy phân cách bằng dấu phẩy; không đưa dòng ghi chú trong ảnh vào dữ liệu.
- [x] Theo đúng ảnh: mẫu tám cột không có số lượng, giữ tồn kho. Đã thông báo giả định này; không tự thêm cột ngoài mẫu.
- [x] Parser kiểm tra toàn bộ file, tiêu đề, giá, loại kính, SKU trùng; giữ dấu / trong tên máy.
- [x] Nhập danh mục nguyên tử: thêm SKU/hãng mới hoặc cập nhật thông tin/giá SKU cũ; giữ tồn, ảnh, trạng thái và lịch sử. Chỉ Admin, chống gửi lặp.
- [x] Mẫu tải xuống/hướng dẫn đúng tám cột. Tiếp tục hỗ trợ file nhập kho ba cột cũ.
- [x] Kiểm thử parser, MySQL thật cô lập, demo/UI và hồi quy npm run verify: 25 data, 31 UI, Electron/build/audit đạt.
- [x] Review toàn bộ checklist, cập nhật hướng dẫn; build LOCAL, packaged Admin/Nhân viên + MySQL/HTTPS, cài đè cùng version và installed config/discovery đạt.
- [x] Giữ bản trước tại E:\outputt\_BACKUP\Oufeidun-Local-0.2.14-before-excel-20261008; ghi đè folder/ZIP 0.2.14. Kiểm tra 1.148 checksum và toàn bộ file ZIP đạt, hướng dẫn cập nhật cả máy chủ/máy con.
