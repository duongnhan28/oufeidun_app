# Trạng thái triển khai — 22/09/2026

## Backend

- Source hỗ trợ `VITE_DATA_BACKEND=supabase` để phát triển tạm thời trên Supabase.
- Adapter `VITE_DATA_BACKEND=api` được giữ để chuyển sang PHP/MySQL sau khi khách hàng chốt hạ tầng.
- Cấu hình thật nằm trong `.env.local` và không được commit.
- Tính năng đơn hàng mới trên Supabase yêu cầu áp dụng `supabase/migrations/017_app_order_sales_feedback.sql`.

## Feedback đã triển khai trong source

1. Giá bán linh hoạt theo từng dòng sản phẩm cho khách sỉ.
2. Địa chỉ và loại khách trên đơn/bill.
3. Màn tra cứu mã kính dùng chung qua API website.
4. Bill dạng bảng, hiển thị toàn bộ dòng hàng và tự ngắt trang khi in/PDF.
5. Tên hiển thị và ghi chú máy dùng chung theo từng dòng.
6. Hàng bán, hàng tặng và hàng mẫu; quà/mẫu vẫn trừ tồn với thành tiền 0đ.
7. Năm hình thức thanh toán, thu nhiều đợt và trạng thái chưa/một phần/toàn phần.

## Kiểm chứng local

| Kiểm tra | Kết quả |
|---|---|
| TypeScript + Vite production build | Đạt |
| PostgreSQL/PGlite nghiệp vụ | 20/20 test đạt |
| Playwright desktop | 8/8 test đạt |
| Playwright mobile 390 px | Đạt, không tràn ngang |
| npm audit runtime dependency | 0 lỗ hổng |
| Đóng gói `.exe` trong đợt này | Không thực hiện theo yêu cầu |

## Việc cần làm trước khi dùng dữ liệu thật

1. Áp dụng migration 017 lên project Supabase bằng quyền quản trị database.
2. Kiểm tra đăng nhập và một đơn mẫu trực tiếp trên Supabase thật.
3. Khi chuyển sang PHP/MySQL, bổ sung endpoint mới tương ứng rồi kiểm thử migration dữ liệu trước khi đổi `VITE_DATA_BACKEND=api`.
4. Sao lưu/phục hồi thử, kiểm tra thao tác đồng thời và nghiệm thu trên máy khách sạch.

Chi tiết cấu hình nằm trong [README.md](../README.md); nguồn yêu cầu nghiệp vụ gốc là [BA-SPEC.md](../BA-SPEC.md).
