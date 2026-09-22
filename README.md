# Oufeidun — ứng dụng bán hàng

Ứng dụng desktop Electron/React quản lý bán hàng, kho kính, công nợ và tra cứu mã kính dùng chung. Source hỗ trợ hai backend để phát triển trên Supabase trước và chuyển sang PHP/MySQL khi khách hàng chốt hosting, không cần thay đổi UI.

## Chạy source

Yêu cầu Node.js và npm tương thích với `package-lock.json`.

```powershell
cd E:\AppBanHang
npm.cmd ci
npm.cmd run dev       # giao diện tại http://127.0.0.1:5178
npm.cmd test          # kiểm thử nghiệp vụ bằng PostgreSQL WASM
npm.cmd run test:ui   # kiểm thử giao diện responsive
npm.cmd run build     # kiểm tra TypeScript và build web, không tạo .exe
```

Không chạy `npm run package` hoặc `npm run make` khi chưa cần phát hành `.exe`.

## Backend tạm thời: Supabase

Tạo `.env.local` (file này bị Git ignore và không được commit):

```dotenv
VITE_DEMO_MODE=false
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_GLASS_LOOKUP_API_URL=https://outfeidun.vercel.app/api/glass-lookup
```

Project Supabase phải có các migration nền hiện tại và chạy thêm `supabase/migrations/017_app_order_sales_feedback.sql`.

Migration 017 bổ sung địa chỉ/loại khách, giá bán riêng theo dòng, hàng tặng–hàng mẫu, ghi chú dòng hàng và thanh toán nhiều đợt. Publishable key được phép nằm ở client; bảo mật dữ liệu dựa trên Auth, RPC `security definer`, kiểm tra quyền và RLS. Không đưa service-role key hoặc mật khẩu database vào ứng dụng.

## Chuyển sang PHP API khi khách chốt

Đổi duy nhất cấu hình build:

```dotenv
VITE_DEMO_MODE=false
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=https://ten-mien-cua-ban.vn/api/app/v1
VITE_GLASS_LOOKUP_API_URL=https://ten-mien-cua-ban.vn/api/glass-lookup
```

App không kết nối MySQL trực tiếp. PHP API giữ mật khẩu MySQL ở server, xác thực người dùng, phân quyền, transaction và trả dữ liệu cần thiết cho app. Trước ngày chuyển chính thức, backend PHP cần triển khai endpoint tương ứng cho các chức năng trong migration 017 rồi chạy kiểm thử chuyển đổi dữ liệu.

## Phạm vi chức năng

- Admin/nhân viên, khóa tài khoản, lịch sử thao tác và một phiên hoạt động cho mỗi tài khoản.
- Danh mục kính, hãng kính, ảnh sản phẩm, giá bán/giá vốn và quản lý tồn kho.
- Đơn nháp, đơn bán, hủy, trả/đổi hàng; snapshot tên, giá và giá vốn tại thời điểm bán.
- Giá bán linh hoạt cho khách sỉ theo từng dòng sản phẩm.
- Địa chỉ giao hàng, tên hiển thị khác và ghi chú máy dùng chung trên từng dòng.
- Hàng bán, hàng tặng, hàng mẫu; hàng tặng/mẫu vẫn trừ kho và có thành tiền 0đ.
- Tiền mặt, chuyển khoản, COD, COD + chuyển khoản, tiền mặt + chuyển khoản.
- Thu tiền nhiều đợt, trạng thái chưa thanh toán/thanh toán một phần/đã thanh toán.
- Bill đầy đủ danh sách sản phẩm, tự ngắt trang khi in hoặc lưu PDF.
- Tra cứu mã kính dùng chung từ API của website Oufeidun.
- Báo cáo doanh thu, vốn, lãi gộp, hoàn/hủy và nhập–xuất–tồn.

## Kiểm thử trước bàn giao

- `npm.cmd test`: kiểm tra quyền, kho, snapshot, idempotency, trả hàng, giá sỉ, quà/mẫu, địa chỉ và thanh toán nhiều đợt.
- `npm.cmd run test:ui`: kiểm tra các luồng UI và không tràn ngang trên desktop/mobile.
- `npm.cmd run build`: kiểm tra TypeScript, CSP và production bundle.
- Trước khi dùng dữ liệu thật cần thử migration trên project Supabase test, sao lưu database và kiểm tra ít nhất hai tài khoản thao tác đồng thời.

## Tệp cấu hình

- `.env.example`: danh sách biến môi trường mẫu, được commit.
- `.env.local`: cấu hình thật, bị Git ignore.
- `supabase/migrations/`: schema/RPC cho backend Supabase.
- `BA-SPEC.md`: đặc tả nghiệp vụ gốc.
