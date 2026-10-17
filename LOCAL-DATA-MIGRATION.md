# Kế hoạch chuyển dữ liệu Supabase sang MySQL local

> Quy tắc: chỉ ghi MySQL sau khi snapshot nguồn, backup local và báo cáo dry-run đã hoàn thành. Không xóa dữ liệu Supabase. Không đưa URL, khóa hoặc mật khẩu vào snapshot/log/Git.

## Phạm vi

- Sản phẩm, hãng kính, giá lẻ/giá sỉ/giá vốn, tồn kho và mã máy dùng chung.
- Ảnh sản phẩm trong bucket nguồn `app-ban-hang-product-images`.
- Khách hàng, nhân viên, đơn hàng/dòng hàng, thanh toán, trả hàng.
- Phiếu kho, chi tiết phiếu kho, lịch sử kho và lịch sử thao tác.
- Giữ UUID nguồn khi có thể để bảo toàn quan hệ.

## Các bước bắt buộc

1. [x] Kiểm kê bảng/cột và số bản ghi nguồn, chỉ đọc.
2. [x] Tạo snapshot JSON nguồn và manifest SHA-256 ngoài Git.
3. [x] Tạo backup MySQL local và uploads trước migration.
4. [x] Dry-run ánh xạ, kiểm tra khóa ngoại, SKU/login trùng và file ảnh.
5. [x] Loại bốn sản phẩm mẫu local; backup trước migration vẫn giữ bản cũ.
6. [x] Import trong transaction theo thứ tự cha–con; công cụ chỉ thay dữ liệu khi có `--apply --replace-local`.
7. [x] Tải ảnh, kiểm tra MIME/chữ ký/kích thước, đổi sang đường dẫn local.
8. [x] Đối chiếu số lượng, tổng tồn, tổng đơn và checksum ảnh.
9. [x] Đăng nhập app local, kiểm tra ảnh, mã dùng chung, kho, đơn và báo cáo.
10. [x] Chạy regression và cập nhật `FEATURE-CHECKLIST.md`.

## Điều kiện rollback

- Giữ nguyên backup trước migration.
- Nếu import hoặc đối chiếu lỗi, không sửa Supabase; khôi phục MySQL/uploads từ backup.
- Snapshot và báo cáo không chứa mật khẩu, access token hoặc database URL.

## Nhật ký

| Thời gian | Bước | Kết quả | Bằng chứng / việc còn lại |
| --- | --- | --- | --- |
| 30/09/2026 | Khởi tạo | Đã tạo checklist trước khi truy cập dữ liệu nguồn. | Chờ kiểm kê read-only Supabase. |
| 30/09/2026 | Kiểm kê nguồn | Đã đọc schema `app_ban_hang`: 4 tài khoản, 8 sản phẩm, 3 khách, 17 đơn, 38 dòng đơn, 11 phiếu kho, 35 biến động kho, tổng tồn 5.185. | Không sửa dữ liệu nghiệp vụ Supabase. |
| 30/09/2026 | Snapshot và dry-run | Snapshot `supabase_2026-09-30_072118` đạt; tải 2/2 ảnh JPEG và tạo SHA-256. | `mutation_requests` và phiên đăng nhập được loại khỏi migration vì là dữ liệu runtime/nhạy cảm. |
| 30/09/2026 | Apply local | Snapshot áp dụng `supabase_2026-09-30_072147`; tất cả bảng đối chiếu đúng số lượng, tổng tồn local 5.185, ảnh 2/2. | Backup trước migration: `backups/daily/2026-09-30_071417`. |
| 30/09/2026 | Kiểm tra ứng dụng | EXE local đăng nhập được, hiện 8 sản phẩm, tải 2 ảnh; API trả 17 đơn, 3 khách, 3 tài khoản còn hiệu lực, 11 đơn xác nhận năm 2026 và lookup `IP` có 4 kết quả. | Một trong 4 tài khoản nguồn đã xóa mềm nên không hiện trong workspace. |
| 30/09/2026 | Backup sau migration | Đã tạo dump MySQL, uploads và checksum. | `backups/daily/2026-09-30_072500`. |
| 30/09/2026 | Regression cuối | Server unit 6/6, database 20/20, UI 21/21, Electron smoke, TypeScript/build và audit dependency đều đạt. | App đóng gói được kiểm tra lại riêng với dữ liệu MySQL local thật. |
| 30/09/2026 | Tách nguồn dữ liệu runtime | Nghiệp vụ bán hàng dùng MySQL/API local. Màn `Mã dùng chung` dùng API `outfeidun.vercel.app` để đọc kho tra cứu Supabase 44 SKU/ảnh riêng của website. | Khi mất Internet, bán hàng local vẫn hoạt động; riêng tra cứu mã dùng chung online tạm không dùng được. |
