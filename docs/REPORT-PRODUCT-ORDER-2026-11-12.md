# Thứ tự mã trên Excel báo cáo — 12/11/2026

Khách yêu cầu xuất báo cáo theo thứ tự trong `Book1.xlsx`; mẫu/mã chưa có trong danh sách phải nằm cuối.

## Phạm vi

- Chỉ sắp xếp các dòng có dữ liệu trong hai sheet **Báo cáo bán hàng** và **Nhập xuất tồn** của chức năng **Tải báo cáo Excel**. Không chèn 84 dòng rỗng, không gộp các dòng có giá khác nhau, không thay nhãn SKU hoặc số liệu.
- Danh sách cố định gồm 84 dòng từ `Sheet1!A1:A84`. Bản tham chiếu nguyên gốc tại `tests/fixtures/report-product-order.xlsx`, SHA256 `e40b59dc612fcdd13724523ed4c9e31ea8faaeac66d6ede8801ab2ee4e9d035a`. Không sửa file khách trong Downloads.
- Thứ tự: Full viền iPhone, CNT iPhone, Full viền Android, Không viền. Dòng 81 `IP 17 PRO/ 18PRO` nằm trong đoạn Không viền của mẫu dù thiếu tiền tố. Các biến thể HQT/330/380, BLACK/WHITE được giữ riêng.
- Nhận diện nhãn đầy đủ sau chuẩn hóa khoảng trắng/hoa-thường/dấu ngoặc, tiền tố loại kính, PRIVACY/PRLVACY, thứ tự các máy trong cùng nhãn iPhone. Loại kính trong danh mục được ưu tiên khi có; mã tự nhập loại `other` vẫn nhận diện được tiền tố rõ ràng. Không dùng so khớp gần đúng hoặc chuỗi con khiến A160 thành A16.
- Một số nhãn chính/rút gọn đã xuất hiện trong mẫu đơn cũ được khai báo alias tường minh (SAM A05/A06/A07, RM/REDMI 14C/15/13, REALME C55, OPPO A53 4G). Không đổi tên sản phẩm trong DB.
- Mã đã đổi tên có thể giữ vị trí bằng tên cũ; nếu tên hiện tại đã có trong mẫu thì ưu tiên tên hiện tại. Mã ngoài mẫu xuống sau toàn bộ mã đã biết, giữ thứ tự tương đối mà API trả về. Các lần thêm mẫu mới không chèn vào giữa 84 vị trí mẫu.
- Sheet Tổng quan, Chi tiết kho theo thời gian, file chi tiết từng sản phẩm, bảng hiển thị trong app và thứ tự chứng từ đơn hàng không đổi. Không migration, không cập nhật API/config hoặc DB cửa hàng.

## Source và kiểm tra

- `src/data/report-product-order.json`: danh sách thứ tự và các alias tường minh.
- `src/lib/report-product-order.ts`: sắp xếp bản sao, không sửa snapshot báo cáo.
- `src/lib/report-sheets.ts`: dùng cùng danh sách đã sắp xếp cho dữ liệu và màu SKU, giữ quyền ẩn vốn/lợi nhuận của staff.
- `tests/report-product-order.test.ts`: đối chiếu toàn bộ 84 dòng với workbook thật, mã mới, biến thể, tên cũ, hai mức giá và bảo toàn dữ liệu/quyền.
- `tests/ui/report-product-order.spec.ts`: nhập danh mục, xác nhận bán, xuất và đọc lại workbook thực qua giao diện cho Admin/staff; kiểm thứ tự, mã mới, màu, số tiền và đủ bốn sheet.

Kiểm tra cuối: `npm.cmd run verify` exit 0 — 73 unit, 63 UI không retry, Electron demo smoke, TypeScript/build và production audit 0 lỗ hổng. Log `.local/report-order-verify-20261112.log` và `.exit`. Ca UI xuất và đọc lại workbook thực cho Admin/staff, giữ đủ các mã có sẵn trong demo và mã mới, tổng 150.000đ, màu theo mã sau sắp xếp. Các file server/deployment có trước được đối chiếu checksum giữ nguyên.

Người dùng đã yêu cầu phát hành ngày 12/11/2026: chuẩn bị client **0.1.7**, tag `v0.1.7`, dùng CI/CD hiện có để kiểm thử/build/ký/publish. Không ghi đè tag hoặc bộ cài 0.1.6; không gộp các sửa đổi server có trước. Trạng thái công bố thực tế phải xác nhận từ run GitHub Actions, feed có chữ ký và lượt tải đủ bộ cài qua trình cập nhật.
