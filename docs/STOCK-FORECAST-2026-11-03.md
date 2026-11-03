# Tồn dự kiến và bộ gửi khách03/11/2026

Người dùng duyệt phần tồn dự kiến, yêu cầu đóng ZIP trước; auto-update qua oufeidun.vn hoãn, chưa sửa web hoặc thêm updater. Giữ version0.1.1 theo bộ đang bàn giao, build mới ghi ngày và giữ bản trước trong backup.

Tồn dự kiến = tồn hiện tại - tất cả lượng trong đơn nháp chưa xóa của mọi người. Không giới hạn500đơn của danh sách, không lọc ngày nháp. Bán/tặng/mẫu cùng product ID đều tính. Số âm là thiếu dự kiến, không giữ chỗ, không trừ kho hoặc phát sinh doanh thu khi lưu. Giỏ chưa lưu chỉ ảnh hưởng tính nháp tại máy đang soạn; nháp đang sửa trừ phần snapshot đã lưu của chính nó trước khi cộng giỏ mới, giữ cảnh báo tham khảo theo snapshot đang đọc. Kiểm tồn/lock/version khi xác nhận giữ như trước, không dùng dự kiến để trừ kho.

Kho có tab Danh mục và tồn thực tế/Tồn dự kiến; bảng dự kiến có hiện tại/trong nháp/dự kiến/Hàng đã giao trong kỳ. Hàng đã giao mặc định hôm nay, chọn tối đa366ngày gồm2đầu theo VN; theo ngày sổ kho thực tế, gồm giao bổ sung, trước hoàn/hủy. Không trừ hàng đã giao lần nữa. Hoàn/hủy vẫn tra báo cáo kho cũ. Ngày chỉ lọc đã giao, tồn/nháp luôn hiện tại. Excel riêng2sheet theo bộ lọc sản phẩm, có giải thích công thức và quy ướcgross. Không đổi Excel đơn/báo cáo trước đây.

API POST /stock/forecast đọc cùng snapshot read-only, aggregate nháp toàn bộ, chỉ trả số lượng và mã/loại cho Admin/staff kể cả staff không có view_reports, không giá/vốn/lợi nhuận. Workspace thêm draft_quantity cho sản phẩm. Demo/PGLite tương đương để tự kiểm; không triển khai Supabase online. Không schema mới riêng cho tồn dự kiến, release cần migration013 của phiên12h.

MySQL test501nháp chứng minh workspace chỉ500đơn nhưng tổng501; xóa/confirm/edit vượt dựkiến/cancel; kỳ trước2000chỉđãgiao0nhưngnhápgiữnguyên; staff không report vẫn xem lượng; invaliddate bịchặn; đọc không thay stock/versions. UI Admin/staff lưu nháp vượt dựkiến, self-exclusion, đọc XLSX thật. Native package kiểm người khác tạo nháp, warning/lưu, xác nhận/giao80không trừhai lần, xóa nháp/refresh, XLSX thật. Kết quả cuối ở FEATURE-CHECKLIST.md và tài liệu release khi ZIP xong.

Bộ mới gộp cả sửa phiên30/10–03/11:12h tuyệt đối, presence90s, phản hồi cũ không xóa tokenmới, nối lại mạng và login lặp. Cửa hàng cập nhật máy chủ/API/migration013 trước rồi app mọi máy. Giữ data/config/accounts, không CLEAN/reset; sau cập nhật login lại1lần. Chưa nghiệm thu máy vật lý/DB/Wi-Fi khách, OAuthDrive hoặc chạy updaterweb.
