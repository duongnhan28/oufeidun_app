# Bổ sung số lượng Excel và Kho kính — 08/10/2026

- [x] Chốt cách xử lý theo luồng nhập hàng: cột thứ 9 Số lượng là lượng nhập thêm, không phải tồn cuối. 0 chỉ cập nhật danh mục/giá. Giữ đọc mẫu 8 cột cũ (không cộng kho) và mẫu nhập kho 3 cột.
- [x] Parser kiểm tra số nguyên 0–1.000.000, chỉ rõ dòng lỗi; cột đã có nhưng bỏ trống bị chặn.
- [x] API/Demo: lưu danh mục, giá, phiếu nhập và sổ kho trong cùng transaction. Chỉ Admin; retry cùng key không cộng lần hai. Giá mua để trống vì Excel không có giá mua, không đánh đồng với giá vốn cố định.
- [x] Kho kính: số lượng tồn hiện ngay cạnh mã kính, dễ nhìn khi màn hình hẹp; tồn cập nhật đúng sau nhập/tải lại.
- [x] Kiểm thử số lượng mới/cũ/0/sai, rollback giữa chừng, concurrency, idempotency, quyền và workbook/UI thật.
- [x] Đọc lại checklist, chạy verify trước build; cập nhật hướng dẫn rõ mỗi lần nhập mới sẽ cộng kho.
- [x] Build/test LOCAL; backup và ghi đè folder/ZIP 0.2.14, kiểm tra checksum.
