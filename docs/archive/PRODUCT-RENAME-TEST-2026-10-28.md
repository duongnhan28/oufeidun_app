# Đổi mã sau bán — triển khai và kiểm thử 28/10/2026

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

Đã áp dụng phương án A theo yêu cầu: danh mục/dòng mới dùng mã mới, nháp đã chọn và đơn cũ giữ nhãn cũ. Source LOCAL/demo đã kiểm thử; đã build LOCAL và chạy trực tiếp Electron với MySQL thật cô lập. Chưa đóng gói/thay EXE hoặc ZIP 0.1.1 đã bàn giao ngày 24/10.

## Hành vi

- Cho Admin/Nhân viên đổi SKU sau bán/hủy/trả. ID, tồn, giá, vốn và liên kết khách/đơn/kho giữ nguyên; rename riêng không tăng stock_version/price_version.
- A→B→C giữ A/B làm tên tìm kiếm. Bán hàng/Kho và form nhập tìm được tên cũ; Mã dùng chung bổ sung kết quả LOCAL cho hàng đã đổi tên khi website không có alias hoặc không kết nối được. Không sửa dữ liệu website oufeidun.vn.
- Hai loại Excel nhập đều resolve tên hiện tại/cũ về cùng ID trước khi tạo hàng. Một file chứa hai alias của cùng hàng bị từ chối toàn bộ, không cộng kho đôi. Cấm cấp alias của hàng khác, kể cả hàng xóa mềm. Dữ liệu mẫu cũng đi qua resolver/reservation.
- Giỏ chưa lưu gửi tên đã chọn có kiểm tra chủ sở hữu. Nháp đã lưu giữ snapshot qua sửa/lưu/xác nhận; hiển thị thêm mã hiện tại. Tìm tên cũ/mới rồi thêm cùng hàng/cùng loại bán-tặng-mẫu tăng dòng cũ, giữ nhãn/giá/thứ tự.
- Excel/PNG/PDF đơn/nháp dùng snapshot. Báo cáo bán hàng/nhập-xuất-tồn dùng mã hiện tại + danh sách mã cũ; Chi tiết kho thêm cột Mã hiện tại ở cuối, giữ mã đơn cột 7 và lý do cột 8. History từng hàng hiện mã giao dịch + mã hiện tại. Audit ghi mã trước/sau/người/thời gian.
- Giao bổ sung/trả/hủy tiếp tục theo ID dòng. Không ghi đè chứng từ lịch sử hoặc tính lại tiền khi đổi tên.

## Kiểm thử thực chạy

| Kiểm tra | Kết quả |
| --- | --- |
| npm.cmd run verify | Exit 0: 51 dữ liệu, 54 UI, Electron smoke, TypeScript/build, production dependency audit 0 |
| Server unit | 7/7 đạt |
| MySQL integration | Đạt, không skip; API thật, DB test cô lập, gồm các nhánh mới phía dưới |
| LOCAL build | Exit 0, runtime backend api/environment local; khôi phục sau verify |
| Electron LOCAL + MySQL + HTTPS/discovery | Admin rồi staff đổi mã hàng đã bán, alias B tìm ra C, nháp A thêm 5 thành 7 trên một dòng, native Excel/PNG, xác nhận, tồn/giá/vốn/snapshot/history và quyền staff đạt |
| Backup thật | SQL/ảnh/config/checksum đạt; dump chứa bảng alias/lịch sử đổi tên, dữ liệu tên cũ và sku_snapshot; giả lập upload lỗi vẫn giữ backup local hoàn tất |

Ca mới MySQL: A→B→C; quay về A của chính mình; giữ số dư/giá/vốn/stock_version/price_version và tổng báo cáo sau rename; nháp ngày mai/sold snapshot; staff lưu/chốt nháp cũ; giỏ chưa lưu với alias bán/tặng/mẫu; alias không thuộc sản phẩm bị chặn; hai loại nhập bằng alias; retry nhập chỉ cộng một lần; alias+current cùng ID rollback; tạo hàng khác chiếm alias bị chặn; hai hàng đồng thời tranh cùng tên chỉ một thành công; giao thêm/trả sau rename giữ nhãn A; xác nhận/hủy đơn nhãn C sau quay về A hoàn kho chính xác; local lookup tìm alias; xóa record migration rồi chạy lại hai lần không thay snapshot.

Ca UI mới: Admin/staff đổi A→B→C, tìm B (không dựa vào product.name A), mở nháp A thêm 5 thành 7; lưu/reload vẫn A/7/70.000đ; đọc workbook thật, ghi nhận chữ vẽ PNG, kiểm bảng in/PDF vẫn A; xác nhận tồn còn 2; đơn mới dùng C; báo cáo Excel có aliases và Mã dùng chung trả C. Bộ regression kiểm lại bán/tặng/mẫu/thứ tự, giá chung/giá khách, thiếu/giao/trả/đổi/hủy, phí/công nợ/doanh thu, khách hàng/quyền và nhập/xuất Excel.

Một lượt UI đầu nhận toast cũ “Đã lưu sản phẩm” khi chờ “Đã lưu”, nên reload trước khi lưu nháp hoàn tất. Đã sửa test chờ đúng “Đã lưu bản nháp.”, chạy lại targeted và full verify đều đạt; không bỏ assertion lưu/reload. Không phải kết quả nghiệm thu dựa vào lượt lỗi đó.

## Migration và triển khai

- MySQL `011_product_sku_names.sql` thêm product_sku_names/product_sku_renames; seed mã hiện có, chỉ điền snapshot NULL theo tên đang hiển thị lúc nâng cấp. Giữ snapshot đã có; không sửa số lượng/tiền/trạng thái/ngày/version đơn. Không thể khôi phục tên cũ từ những lần đổi trước khi tính năng ghi lịch sử tồn tại.
- Khi phát hành: backup DB/ảnh/config trước, cập nhật API + migrations, cập nhật app mọi máy rồi cho thao tác lại. Không dùng app cũ xen kẽ để nghiệm thu giao diện alias; chưa có cơ chế tự ép phiên bản client tối thiểu cho build cùng số 0.1.1.
- Backup hiện tại dump toàn DB nên có các bảng mới; đã kiểm tra dump chứa dữ liệu. Lần này chưa thử restore sang DB khác hoặc Google OAuth/tải Drive bằng tài khoản khách.
- Chưa triển khai Supabase online, chưa chạm dữ liệu khách, chưa nghiệm thu hai máy vật lý/Wi-Fi/UAC/reboot. Không cam kết không còn mọi lỗi có thể xảy ra ngoài các ca đã chạy. Mật khẩu bảo vệ lợi nhuận/kho chưa triển khai.

## Bằng chứng

Tests: tests/product-renames.test.ts, tests/ui/product-renames.spec.ts, tests/local-api.integration.cjs, tests/local-product-renames.electron.cjs.

Logs ignored: .local/product-rename-{verify,mysql,server,local-build,native,backup}-20261028.log và .exit đều 0 ở lượt cuối. Ảnh: test-results/renamed-old-draft.png, test-results/product-renames-local-native.png. Native tạo file thật trong profile .local/rename-native-*; không chứa trong bộ bàn giao/Git.
