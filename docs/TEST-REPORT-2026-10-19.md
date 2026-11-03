# Kết quả kiểm thử hồi quy — 19/10/2026

**Cập nhật sau đóng gói:** đã bàn giao LOCAL 0.2.18 trong `E:\outputt\Oufeidun-Local-0.2.18` và ZIP cùng tên. Chạy lại verify version mới 43/43 dữ liệu, 48/48 UI và MySQL integration đạt; build/package, packaged Admin/Nhân viên HTTPS/MySQL, installer nâng version/hash và audit 1.154 file folder/ZIP đều đạt. Chi tiết release/hash tại FEATURE-CHECKLIST.md. Nội dung dưới đây là báo cáo source trước đóng gói; trạng thái chưa tạo EXE ở cuối là mốc trước đó.

Phạm vi: source Oufeidun LOCAL 0.2.17 sau sửa khóa SKU chưa bán và mã nháp đã xóa. Kiểm thử trên demo/database MySQL test riêng; không sửa dữ liệu, cấu hình hoặc dịch vụ khách. Đây không phải kết quả kiểm thử bộ EXE/ZIP mới.

## Kết quả chạy lại toàn bộ

| Bộ kiểm tra | Kết quả |
| --- | --- |
| `npm.cmd run verify` | Exit 0: 43/43 bài dữ liệu, 48/48 bài UI, Electron demo smoke, TypeScript/build, audit production 0 lỗ hổng |
| Local API syntax và unit | Đạt, 6/6 bài |
| MySQL integration | 1/1 đạt, không bỏ qua; bao gồm nhiều luồng API và tranh chấp đồng thời |
| LAN discovery | 1/1 đạt: chữ ký máy chủ, đổi IP, HTTPS tin cậy, không phát lại mutation |
| Cấu hình triển khai | Đạt: đổi thư mục, đường dẫn có khoảng trắng, cấu hình cũ không còn đúng, hostname/port riêng, không lộ mật khẩu |
| Backup thật trên DB test | Đạt: SQL, ảnh, checksum, thư mục dữ liệu cô lập; chưa thử restore trong lần này |
| Build LOCAL | Đạt, profile local-mysql |
| Electron LOCAL Admin qua HTTPS/MySQL | Đạt: nháp, PNG, Excel đọc lại, hủy Save, xác nhận bán/tồn; Excel danh mục chín cột tạo/sửa mã/model/giá/số lượng |
| Electron LOCAL Nhân viên qua HTTPS/MySQL | Đạt: nháp, PNG/Excel, hủy Save, xác nhận bán và tồn |
| Electron LOCAL quyền dùng chung | Đạt: staff sửa giá chung/sản phẩm giữ vốn, xác nhận nháp Admin, trả/đổi, xem các trang nghiệp vụ và xuất báo cáo không lộ vốn; không nhập hàng/tồn đầu |
| Audit dependency server | 0 lỗ hổng production |

## Các nhóm nghiệp vụ đã đối chiếu

- Đăng nhập, phiên tài khoản, quyền Admin/Nhân viên, bảo vệ tài khoản Admin và dữ liệu vốn.
- Danh mục, thương hiệu, mã dùng chung, phân loại kính/phụ kiện, tìm kiếm và tìm khách hàng.
- Giá bán/sỉ, giá khách, giá riêng trên đơn và lưu giá chung cho các đơn sau.
- Nhập kho/Excel, tồn đầu, xuất/điều chỉnh, transaction rollback, chống ghi lặp và tranh chấp tồn.
- Lưu/mở/xóa/xác nhận nháp; bảo toàn đơn đang nhập dở; thứ tự hàng bán, tặng và mẫu.
- Ngày đặt, phí khác, đủ/thiếu hàng, giao bổ sung, thanh toán/công nợ, trả/đổi/hủy và lịch sử giao.
- PNG, Excel, báo cáo; nội dung thật trong workbook; hủy chọn chỗ lưu không báo lỗi.
- Audit giao diện các trang hai vai trò, cửa sổ tối thiểu và mobile; overflow, tên control và lỗi render.
- Hai lỗi mới: đổi mã sau nhập kho/nháp; dùng lại mã nháp xóa trước migration; giữ lịch sử/snapshot/tồn/vốn; mã đã bán/hủy vẫn bảo vệ; hai máy gửi cùng mã chỉ một thành công; migration chạy lại sau gián đoạn.

## Bằng chứng và giới hạn

- Log đầy đủ: `.local/full-regression-20261019.log` và `.exit` bằng 0. Các log cấu hình, backup, LOCAL build/Admin/staff/permissions cùng tiền tố `.local/full-regression-` và hậu tố `20261019`; các luồng Electron đều exit 0.
- MySQL API, server unit, LAN và server audit chạy lại trực tiếp trong phiên kiểm thử; không có bài integration bị skip. Ảnh quyền staff: `test-results/local-staff-permissions-stock.png`, `test-results/local-staff-permissions-report.png`.
- Chưa kiểm thử cập nhật trên hai máy vật lý tại cửa hàng, router Wi-Fi thật, UAC/reboot, tác vụ backup theo lịch hoặc restore trên máy khách. Kiểm thử LAN sử dụng HTTPS/discovery fixture trên máy phát triển.
- Không thể cam kết phần mềm không còn bất kỳ lỗi nào. Kết quả là các ca đã chạy đều đạt, chưa phát hiện lỗi mới trong phạm vi trên.
- Chưa tạo lại EXE/folder/ZIP bàn giao. Bộ 0.2.17 ngày 17/10 chưa chứa sửa lỗi 19/10. Khi phát hành cần API mới và migration MySQL 009 cùng client; giữ dữ liệu/config cũ, không reset database. Supabase online không được cập nhật trong lần này.
