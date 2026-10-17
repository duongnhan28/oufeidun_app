# Kế hoạch 4 phản hồi đơn hàng — 10/10/2026

- [x] Ngày giờ đặt đơn: nhập theo giờ Việt Nam; lưu riêng ordered_at, không thay thời điểm thao tác/giao/hoàn thực tế. Nháp sửa trong form; đơn đã bán sửa riêng ngày đặt với version/quyền/audit, không đổi kho/giá/thu tiền.
- [x] Chứng từ: lưu snapshot máy dùng chung khi xác nhận, giữ ghi chú từng dòng và ghi chú đơn trên PNG/Excel/PDF; xuống dòng đầy đủ, không cắt nội dung.
- [x] Chi phí khác: tiền nguyên đồng không âm và ghi chú lý do, lưu trên nháp; cộng một lần khi xác nhận vào tiền hàng thực giao, giao bổ sung không cộng lại. Tổng/công nợ/thu tiền/chứng từ thống nhất; hủy loại toàn đơn, trả hàng chỉ hoàn tiền sản phẩm. Báo cáo tách khoản thu khác khỏi doanh thu sản phẩm.
- [x] Chi tiết nháp có xem/tải ảnh PNG, không chuyển trạng thái/trừ kho.
- [x] Migration nâng cấp giữ dữ liệu cũ; API MySQL và demo/Postgres tương đương, không chạy migration trên DB cửa hàng khi kiểm thử.
- [x] Kiểm thử lưu/reload/giờ Việt Nam/quyền/version/giao bổ sung/phí một lần/chứng từ/ghi chú nhiều dòng; đọc lại checklist và chạy verify.

Verify cuối exit 0: 27 data/32 UI, Electron demo, TypeScript/build, audit 0 lỗ hổng. MySQL integration, server unit 6/6, migration Supabase cô lập chạy lại và deployment-config đạt. Đã xem PNG thực tế. Build LOCAL và Electron source + MySQL/HTTPS Admin có ngày tự nhập, ghi chú và phí 5.000đ đạt. Bộ cài chưa được tạo lại và migration chưa áp dụng lên dịch vụ/DB cửa hàng.

Chưa đóng gói bộ cài trong bước phát triển này. Các đơn cũ giữ thời gian và tổng tiền cũ, chi phí khác mặc định 0.

Electron source + MySQL/HTTPS Nhân viên cũng đạt cùng luồng ngày/ghi chú/phí/PNG/Excel/chốt bán; profile cuối là LOCAL. Không cần cài lại MySQL khi phát hành, nhưng cần chạy cập nhật API/migration trước rồi cập nhật app.
