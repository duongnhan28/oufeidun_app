# Phân quyền từng nhân viên và báo cáo chi tiết sản phẩm — 29/10/2026

Triển khai theo phương án khách đã duyệt. Phạm vi LOCAL API/MySQL và demo; không đổi Supabase online hoặc dữ liệu/config cửa hàng. **Đã đóng gói/thay bộ 0.1.1 ngày 29/10**, bộ 24/10 giữ trong backup. File/hash/kiểm thử EXE và hướng dẫn tại [RELEASE-0.1.1-2026-10-29.md](RELEASE-0.1.1-2026-10-29.md). Kết quả nghiệm thu source bên dưới được hoàn tất trước đóng gói.

## Quyền sử dụng

Giữ hai role Admin/staff. Admin toàn quyền, độc quyền xem/sửa giá vốn/giá nhập/lợi nhuận và quản trị tài khoản khác. Không tạo role Admin giả cho nhân viên hoặc giới hạn cứng ba tài khoản.

Nhân viên mới có nghiệp vụ bán cơ bản: bán hàng/nháp/chứng từ, thanh toán/giao hàng/ngày đơn, khách hàng và tra cứu sản phẩm/tồn. Bảy quyền có thể cấp riêng:

| Khóa | Chức năng |
| --- | --- |
| receive_stock | Nhập hàng một mã hoặc Excel số lượng |
| adjust_stock | Điều chỉnh tăng/giảm/kiểm kê, xuất kho, ghi nhận lỗi |
| manage_products | Thêm/sửa/xóa sản phẩm, thương hiệu, ảnh |
| manage_prices | Giá danh mục chung cho mọi máy/đơn sau; giá lẻ/sỉ theo mã/nhóm |
| manage_returns | Trả/đổi hàng, hủy đơn đã bán |
| view_reports | Báo cáo doanh thu, chi tiết sản phẩm và Excel |
| view_audit | Lịch sử thao tác |

Admin vào **Nhân viên → Phân quyền**, đánh dấu và lưu. Tài khoản mới tạo xong mặc định chưa có các quyền bổ sung. Hai Admin cùng sửa từ version cũ sẽ bị báo xung đột; không ghi đè im lặng. Audit lưu người/thời gian/nội dung quyền, không mật khẩu.

Quyền đi theo tài khoản đăng nhập, không theo máy chủ/máy nhân viên. Đăng nhập Admin trên máy nào vẫn có toàn quyền; nhân viên dùng tài khoản staff được cấp quyền tương ứng.

Tài khoản cũ có permissions NULL được ánh xạ quyền nghiệp vụ trước nâng cấp: chỉnh kho/danh mục/giá/trả-hủy/báo cáo/lịch sử vẫn dùng được; nhập hàng vẫn chưa có cho đến khi được cấp. Quản trị tài khoản khác chuyển về Admin theo phương án đã duyệt. Khi Admin lưu một bộ quyền, tài khoản đó dùng cấu hình tường minh, không tự cộng thêm quyền legacy.

API lấy tài khoản/quyền từ DB theo token ở mỗi request; không tin role hoặc permissions client gửi. Thu hồi có hiệu lực ở request tiếp theo, gồm gửi lại request nhập đã thành công với cùng key. Request đang xử lý từ trước không bị mô tả là đã đảo ngược. Giao diện tải lại quyền khi focus/tải lại và định kỳ 10 giây khi hiển thị; backend vẫn chặn ngay cả khi popup cũ còn mở. Staff không tạo/khóa/reset tài khoản khác hoặc tự cấp quyền.

## Nhập hàng không có vốn

- Staff có receive_stock nhập SKU/ID, số lượng và lý do; không có ô giá nhập/vốn. API từ chối trường vốn/giá nhập gửi trực tiếp.
- File mẫu riêng hai cột **Mã kính, Số lượng**; không dùng file danh mục chín cột hoặc file có cột giá/vốn. Admin vẫn dùng các mẫu hiện có; tồn đầu kỳ và nhập danh mục/giá/vốn chỉ Admin.
- Mã hiện tại hoặc alias resolve về cùng ID. Hàng cũ giữ giá lẻ/sỉ/vốn/trạng thái; retry không cộng lần hai, alias trùng cùng ID trong file không nhập đôi.
- Mã mới do staff tạo/nhập có cost_configured=false, hiển thị **Chưa thiết lập vốn**. Staff có thể soạn nháp, nhưng chưa xác nhận bán trước khi Admin thiết lập vốn. Không để vốn 0 mặc định tạo lợi nhuận giả. Admin có thể chủ động xác nhận vốn 0 hợp lệ; dữ liệu cũ vốn 0 không bị tự suy là sai.
- Admin thấy cảnh báo nếu còn hàng có tồn chưa thiết lập vốn; giá trị tồn theo vốn khi đó chưa đầy đủ. Excel tổng quan Admin có chỉ dẫn tương ứng. Staff vẫn không nhận giá trị tồn theo vốn.

## Báo cáo chi tiết sản phẩm

Trong bảng **Báo cáo bán hàng theo mã kính**, chọn **Chi tiết** để xem từng dòng đơn theo product_id, gồm cả mã đã đổi tên hoặc sản phẩm đã xóa mềm khỏi danh mục.

Các cột: ngày đặt Việt Nam, mã đơn khách nhập, khách hàng/Sales, mã trên đơn, loại bán/tặng/mẫu, lượng đặt/giao/trả/sau trả, đơn giá và thành tiền. Hiện thêm mã hiện tại khi khác nhãn đã lưu. Hàng tặng/mẫu có dòng 0đ và số lượng, không bị nhập vào dòng bán.

- Cùng kỳ ngày đặt, trạng thái và cách trừ lượng trả như báo cáo tổng hợp. Loại nháp/xóa/hủy; không lấy tiền thực nhận. Giao thiếu tính lượng thực giao, giao bổ sung cập nhật tương ứng.
- Tổng chi tiết sản phẩm đối chiếu với phần doanh thu sản phẩm; không chia chi phí khác toàn đơn vào từng sản phẩm. Tổng quan toàn đơn vẫn gồm phí theo quy tắc cũ.
- Summary và rows dùng cùng snapshot MySQL chỉ đọc, tránh ghép dữ liệu hai thời điểm.
- 200 dòng/trang; file Excel chi tiết lấy toàn bộ kỳ, không chỉ trang đang xem. Trên 100.000 dòng báo thu hẹp kỳ, không cắt âm thầm. Nhân viên có quyền báo cáo không nhận vốn/lợi nhuận trong API hoặc workbook.
- Popup rộng, có cuộn bảng và phân trang, header/footer giữ trong khung. Excel là file riêng; bốn sheet báo cáo tổng hợp cũ vẫn giữ.

## Bảo toàn dữ liệu và vận hành

MySQL **012_staff_permissions.sql** thêm app_users.permissions, permissions_version và products.cost_configured. NULL giữ chính sách cũ; API tạo staff mới ghi {}. Sản phẩm cũ mặc định đã cấu hình vốn, không đổi tiền/tồn/version/nhãn đơn. Migration chạy lại không reset quyền đã lưu. Thay đổi đổi mã ngày 28/10 vẫn cần migration 011 khi nâng từ bộ 24/10.

Backup dump toàn DB nên có các cột quyền, cờ vốn, alias và nhãn chứng từ. Công cụ CLEAN được cập nhật danh sách bảng alias/rename để nhận schema mới; vẫn bảo toàn toàn bộ app_users gồm mật khẩu/role/quyền/version/phiên, và schema_migrations. Đây là công cụ xóa dữ liệu chủ động có xác nhận/backup, không phải bước cập nhật và không được tự chạy ở cửa hàng.

Khi phát hành: backup DB/ảnh/config; dừng thao tác app; cập nhật API/migrations 011–012 trước, cập nhật app mọi máy rồi nghiệm thu. Giữ DB, account, config, chứng chỉ và thư mục dữ liệu. Không trộn API/app cũ để đánh giá quyền mới; chưa có cơ chế ép minimum client build khi cùng số 0.1.1.

## Kiểm thử

Trạng thái cuối: **hai lượt đầy đủ đều đạt**, sau sửa lỗi refresh báo cáo. Mỗi lượt có 52 kiểm thử dữ liệu và 56 UI, Electron smoke, TypeScript/build và root production audit 0 lỗ hổng. Không tính lượt bị lỗi trước sửa là một lượt đạt.

| Bộ kiểm tra | Lượt 1 | Lượt 2 |
| --- | --- | --- |
| npm.cmd run verify | 52 data / 56 UI, exit 0 | 52 data / 56 UI, exit 0 |
| Server unit | 7/7 | 7/7 |
| MySQL integration cũ + quyền/báo cáo mới | Đạt, không skip | Đạt, không skip |
| LAN/HTTPS/discovery | Đạt, không skip | Đạt, không skip |
| Build LOCAL + Electron nguồn: quyền mới, báo cáo/khách/mã/màu, chỉnh tồn, đổi SKU | Cả bốn bộ đạt | Cả bốn bộ đạt |
| Backup SQL/ảnh/config/checksum, marker quyền/vốn/alias/snapshot, mock cloud offline | Đạt | Đạt |
| CLEAN preview/rollback/schema guard/giữ mọi trường account và migration/chạy lại | Đạt | Đạt |

Server production audit cuối cũng 0 lỗ hổng. Mọi file `.local/staff-permissions-final-*-20261029.exit` bằng 0; orchestration ghi `ALL TWO ROUNDS PASS`. Dist cuối là environment local/backend api. Đã xem ảnh báo cáo chi tiết rộng, đủ cột và không hiện vốn cho staff.

Các bộ được chạy ở mỗi lượt: npm.cmd run verify; server unit; MySQL API integration cũ; tests/staff-permissions.integration.cjs; LAN; build LOCAL; Electron nguồn qua HTTPS/discovery/MySQL với quyền mới và workbook native; regression báo cáo/khách/mã/màu, điều chỉnh tồn và đổi SKU; backup thật và CLEAN/rollback trên DB test.

Ca mới: tài khoản mới không có quyền bổ sung; legacy giữ quyền; cấp/thu hồi giữa phiên; quyền lạ/stale version/chiếm Admin bị chặn; nhập lượng không vốn và retry; pending vốn chặn chốt; Admin bổ sung; không lộ vốn; trả sau cấp quyền; đổi mã giữ chứng từ; report chi tiết khớp tổng hợp; 204 dòng chia 200+4 và xuất đủ; loại draft; giao thiếu/giao bổ sung; ngày sai; migration chạy hai lần; CLEAN bảo toàn mọi trường account; backup chứa cột/dữ liệu mới.

Lượt rà soát đầu phát hiện và sửa: aria-label của ô chọn nhập kho; migration demo cũ nhận nhầm source đã nâng cấp khi reload; bổ sung summary bán hàng trong demo; khung chi tiết quá hẹp; lỗi report bị reset theo workspace polling và nút xuất có thể bấm khi còn busy. Test hồi quy chờ qua mốc 10 giây, dùng MutationObserver kiểm report không biến mất, đọc workbook bốn sheet và workbook chi tiết; không tăng timeout hoặc bỏ assertion.

Báo cáo nay chỉ tải lại khi đổi kỳ/tài khoản/quyền hoặc bấm Tải lại dữ liệu; việc polling workspace để lấy quyền không làm report tạm biến mất. Khi đang xử lý hoặc chưa có report, nút xuất được khóa. Ca màu/Excel từng bị timeout trước sửa đã được chạy lại trong cả hai lượt cuối và đều đạt.

Logs cuối có tiền tố `.local/staff-permissions-final-`, hai bộ verify là `verify-round1-20261029.log` và `verify-round2-20261029.log`; các bộ mysql/api/native/native-report/native-stock/native-rename/backup/clean có round tương ứng. Ảnh: `test-results/staff-permissions-local-native.png`, `product-sales-detail-staff.png`, `staff-permissions-revoked.png`. Các harness regression cũ giữ chữ “packaged” trong console, nhưng lần này chạy bản copy dùng Electron nguồn với args `['.']`, không phải bộ cài mới.

Script orchestration thử đầu bị Windows PowerShell coi cảnh báo stderr của Node là lỗi dừng; đã sửa runner dùng exit code thực của child và lưu log cảnh báo riêng. Hai lượt cuối đã chạy lại từ đầu đầy đủ, không bỏ kiểm tra hoặc tăng timeout. Dữ liệu fixture dùng tên/brand theo từng lần chạy để đối chiếu độc lập.

Sau nghiệm thu source, đã Forge/make, kiểm thử EXE thật, cài đè installer/default launcher và thay ZIP mới. ZIP 24/10 giữ nguyên hash `84292CB412D6FA1809DA309BF68734D18A75669A32A54D39570DE6B3165662C2` trong backup. Kết quả phát hành chi tiết ở RELEASE-0.1.1-2026-10-29.md.

Giới hạn: chưa chạy trên DB/hai máy vật lý/Wi-Fi/UAC/reboot cửa hàng; chưa OAuth Google của khách hoặc restore backup sang DB khác trong lần này. Các cảnh báo cloud offline trong ca giả lập là dự kiến. Không khẳng định mọi lỗi có thể xảy ra đều đã được loại bỏ.
