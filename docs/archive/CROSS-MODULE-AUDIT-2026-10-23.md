# Rà soát các phần liên quan đến ngày và tổng tiền — 23/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

## Phạm vi

Source LOCAL/MySQL và client hiện tại, cùng demo dùng trong kiểm thử UI. Rà các luồng nháp, bán, ngày đặt, giao bổ sung, tiền thu/công nợ, hủy/trả, lịch sử kho, tổng quan/bảng chi tiết báo cáo và Excel/PNG/PDF. Không truy cập DB khách hoặc thay bản phát hành đã gửi.

## Phát hiện và sửa thêm

1. Các SELECT của báo cáo trước đây chạy độc lập. Nếu máy khác bán/giao/trả trong lúc đọc, tổng doanh thu có thể thuộc thời điểm trước còn số đơn/phí/tồn thuộc thời điểm sau. Đổi sang một connection và transaction `REPEATABLE READ`, `WITH CONSISTENT SNAPSHOT, READ ONLY`, commit/rollback và release ở mọi nhánh. Không khóa các đơn đang bán và không ghi dữ liệu báo cáo.
2. Bộ lọc ngày chỉ kiểm tra regex và Date hợp lệ, nên 30/02 có thể thành 02/03. Bổ sung đối chiếu ngày lịch VN sau parse. Giới hạn cũ chấp nhận khoảng cách 366 ngày (367 ngày tính cả hai đầu); sửa thành tối đa 366 ngày bao gồm ngày đầu/cuối.
3. Workspace đọc đơn, dòng hàng, tồn, giao và thanh toán riêng. Giao bổ sung kèm thanh toán đồng thời có thể làm UI ghép tổng cũ với tiền thu mới, thậm chí hiện còn phải thu âm. Workspace và report dùng chung `readSnapshot` trong core, trả toàn bộ màn hình từ cùng trạng thái committed.

## Những phần đã đối chiếu

| Phần | Kết quả |
|---|---|
| Nháp/đơn bán và chứng từ | Tổng dòng hàng + phí một lần; nháp dùng lượng đặt, bán dùng lượng đã giao. Ngày đặt dùng thống nhất trên danh sách, chi tiết và chứng từ. |
| Giao bổ sung | Cộng đúng giá trị mới giao; không cộng lại phí; lịch sử từng đợt đối chiếu tổng sản phẩm đã giao. |
| Thanh toán | Sổ tiền thu riêng; `còn phải thu + đã thu = tổng đơn` theo hợp đồng hiện có. Thay tiền thu không thay doanh thu/giá trị sản phẩm. |
| Hủy/trả | Hủy loại khỏi tập đơn bán báo cáo; trả trừ sản phẩm theo lượng, không trừ hai lần. Chứng từ gốc giữ tổng gốc/lịch sử trả riêng. |
| Kho | Nháp/xóa nháp không sinh biến động kho; `đầu + tăng - giảm = cuối`; ngày kho là ngày thao tác thực tế. |
| Báo cáo/Excel | Tổng sản phẩm và phí khớp tổng quan, không nhân phí theo số dòng; cùng quyền Admin/staff, staff không đọc vốn/lợi nhuận. |
| Ngày VN | Danh sách, lịch sử, chứng từ chuyển về +07; lọc từ 00:00 ngày đầu đến trước 00:00 ngày kế sau ngày cuối. |

Không phát hiện thêm lỗi tính nháp thành doanh thu hoặc lấy tiền thực nhận làm doanh thu trong các luồng đã rà và chạy ca thử. Không khẳng định toàn bộ app không còn mọi loại lỗi khác.

## Ca tái hiện và đối chiếu

- MySQL: cố ý xác nhận một đơn 3 dòng bán/tặng/mẫu từ connection khác ngay sau SELECT doanh thu của báo cáo. Yêu cầu đang đọc giữ 8 đơn/11.050.000đ/phí30.000/tồn cũ; yêu cầu tiếp theo thấy đủ 9 đơn/11.681.234đ/phí31.234/tồn giảm3. Hủy đơn test trả lại số liệu nền.
- MySQL workspace: giao thêm và thu đủ tiền từ connection khác ngay sau khi đọc hàng đơn. Yêu cầu đang đọc giữ tổng631.234đ/đã thu0/còn631.234/giao1đợt/tồn cũ; lần tiếp theo thấy tổng1.261.234đ/đã thu1.261.234/còn0/giao2đợt/tồn giảm1. Không ghép tổng cũ với tiền thu mới.
- Toàn bộ đơn/nháp trong workspace test đối chiếu tổng dòng + phí, tiền thu/còn phải thu và tổng lịch sử giao. Kiểm tra nháp không có stock movement và phương trình tồn trên từng mã.
- Giữ các ca 8 bán + 1 nháp ngày mai, thanh toán, hủy/trả, giao bổ sung, sửa ngày, biên 00:00/23:59, ngày mai đã xác nhận và quyền từ lần sửa trước.
- Ngày sai 30/02, 29/02 năm không nhuận, khoảng đảo và khoảng367 ngày bị chặn; 29/02 năm nhuận và khoảng366 ngày hợp lệ.

## Lưu ý đối chiếu khi vận hành

Kiểm thử cuối: verify mã thoát0, 48data/51UI/Electron smoke/TypeScript/build/audit0; MySQL integration1/1 không skip và server unit7/7 đều đạt. Logs `.local/cross-audit-*-20261023.*`. Các ca UI hiện có bao gồm Excel/PNG/PDF, lưu/mở nháp, ngày/phí, giao/thu/trả/hủy, Admin/staff và bảo toàn giỏ đang soạn.

- Doanh thu/số đơn theo ngày đặt; nhập–xuất–tồn theo thời điểm thực xuất/nhập. Đơn đặt lùi ngày, giao khác ngày sẽ làm hai bảng có tập giao dịch khác nhau một cách có chủ đích.
- Danh sách đơn tải tối đa500 đơn mới cập nhật; báo cáo tổng hợp không lấy tổng từ500 đơn này. Khi dữ liệu nhiều, không cộng riêng phần đang hiển thị để kết luận tổng kỳ sai.
- Tổng đơn gốc/chứng từ gốc và doanh thu sau trả không bắt buộc bằng nhau khi có hoàn/hủy. Không dùng số đã thanh toán để đối chiếu doanh thu.
- Chưa đóng gói lại EXE/ZIP hoặc nghiệm thu dữ liệu/hai máy vật lý của khách.
