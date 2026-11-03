# Sửa mã đơn trên báo cáo và màu chữ trong app — 20/10/2026

## Phạm vi

- Báo cáo chi tiết kho LOCAL ưu tiên `sales_orders.order_code`, giống danh sách đơn. Đơn nhập `899` xuất báo cáo thành `899`; chỉ dùng `DH-xxxxx` khi đơn cũ không có mã tự nhập.
- Giữ liên kết đơn cho giao lần đầu, giao bổ sung, hủy và trả hàng. Biến động trả hàng lấy đơn qua dòng trả tương ứng; nhập kho không gắn nhầm đơn.
- Mã sản phẩm trong Bán hàng, giỏ, Kho hàng, chi tiết đơn, giao/trả và báo cáo: Full viền đen, CNT vàng đậm #D6A000, Không viền xanh #0070C0. Excel báo cáo sử dụng cùng quy tắc với chứng từ PNG/Excel/PDF.
- Không sửa schema hoặc dữ liệu khách; không thay số lượng, giá, tổng tiền, thứ tự bán/tặng/mẫu hoặc quyền xem vốn. Cần cập nhật cả API máy chủ và client để sử dụng đầy đủ.

## Kiểm chứng

- MySQL cô lập: mã 899, giao 2/3 rồi giao tiếp 1, trả nhập kho 1; biến động bán/trả và hủy đơn dùng mã khách nhập; tồn đầu không có đơn. Kiểm tra cả Admin/nhân viên, dữ liệu không lộ vốn hoặc trường mã nội bộ. Đơn cũ không có order_code vẫn dùng DH, doanh thu và tồn không thay đổi.
- Playwright: kiểm màu CSS ở thẻ sản phẩm, giỏ, kho và báo cáo; đọc lại font file XLSX đơn/báo cáo thật; kiểm màu canvas PNG và bản in/PDF. Tổng thử nghiệm giữ 77.000đ. Ảnh kiểm tra `test-results/order-category-colors-pdf.png`.
- API syntax và unit 6/6 đạt. Log MySQL `.local/report-code-20261020-mysql.log`; UI `.local/app-colors-20261020-ui.log`.
- Bộ test dữ liệu được giới hạn hai tiến trình đồng thời vì lượt verify đầu gặp lỗi thiếu bộ nhớ V8 khi chạy toàn bộ file song song; không bỏ ca kiểm thử.
- `npm.cmd run verify` exit 0: 45 kiểm thử dữ liệu, 49 giao diện, Electron smoke, TypeScript/build và audit 0 lỗ hổng; `.local/verify-20261020-report-colors.log` và `.exit` bằng 0.

## Kiểm tra lại theo phản hồi khách

- Verify lần hai đạt 45 dữ liệu, 49 UI, Electron/build/audit; `.local/recheck-20261020-verify.log`, exit 0. Thêm staff kiểm màu CSS và đọc file Excel không vốn.
- MySQL thật kiểm thêm `000899`, `DH-CUSTOM-899`, mã có dấu/nháy đơn/gạch chéo và đối chiếu từng biến động không mất/trùng; `.local/recheck-20261020-mysql.log`, exit 0. API unit 6/6, LAN 1/1, server audit 0 lỗ hổng.
- Đã build LOCAL và package riêng để kiểm thử bằng `tests/local-report.electron.cjs`. Cả Admin và staff qua HTTPS/discovery/MySQL thật: mã ở danh sách đơn/app báo cáo/Excel thống nhất; 11 biến động tồn đầu/giao đầu/bổ sung/trả/hủy đối chiếu đúng database; mã số 0 đầu vẫn là chuỗi trong XLSX; đủ màu; staff không có cột vốn; tồn và vốn toàn bộ sản phẩm giữ nguyên sau xem/xuất. `.local/recheck-20261020-packaged-report.log`, exit 0.
- App kiểm thử: `out/Oufeidun-win32-x64/Oufeidun.exe`; app.asar SHA256 `0A5ADD15FD25E5F842E3B1589A832C220F4D91C2049B2914B6E1918FECB83E22`. Package audit đúng LOCAL/version và loại private config/source/tests. Không tạo installer, không thử nâng cấp trong lượt này, chưa dùng dữ liệu/máy vật lý khách. Không phát hiện thêm lỗi nghiệp vụ trong phạm vi các ca bổ sung.

## Trạng thái bộ gửi khách

Đã cập nhật folder và ZIP `E:\outputt\Oufeidun-Local-0.2.18` ngày 20/10. Make LOCAL, kiểm lại package qua HTTPS/MySQL cả hai role, installer cài đè cùng version và audit 1.161 file folder/ZIP đạt; `.local/release-20261020-*` exit 0. Backup bộ 19/10 tại `E:\outputt\_BACKUP\Oufeidun-0.2.18-before-report-colors-20261020-173946`.

- ZIP SHA256 `8DAA8CA300A95D01578EE601A4F6D1E6978E03D59FF516F79BF236129B67488A` (373.889.894 byte).
- Setup SHA256 `97B3A1044717EE63F859111FD7D8FBD0D79C14048F351FBC00AE1AEC9E38E579` (174.964.736 byte).
- Máy khách cập nhật máy chủ trước bằng `01-MAY-CHU\CAP-NHAT.bat`, kiểm tra/xuất bộ client rồi cập nhật app mọi máy. Giữ dữ liệu/config; không reset DB, không cần migration mới riêng cho hai sửa lỗi này. Hướng dẫn 20/10 trong ba file của bộ mới; không dùng ZIP/hash 19/10 để gửi sửa lỗi này.
