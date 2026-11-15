# Kế hoạch triển khai Oufeidun Local Server

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

> Trạng thái: đang triển khai. Đây là checklist bắt buộc cho chế độ MySQL local.
>
> Quy tắc: sau mỗi bước phải đọc lại toàn bộ file này, ghi bằng chứng vào **Nhật ký review**, rồi mới chuyển bước. Không build bản giao khách khi bước 1–8 và `npm.cmd run verify` chưa hoàn tất.

## Mục tiêu đã chốt

- Một máy Windows làm máy chủ, bật trong giờ sử dụng và không Sleep; có thể khóa bằng `Windows + L`.
- Các máy Windows khác chỉ gọi HTTPS API qua LAN, không kết nối trực tiếp MySQL và không truy cập thư mục ảnh bằng Windows Share.
- TEST tiếp tục dùng Supabase. LOCAL dùng MySQL trên máy chủ cho nghiệp vụ; riêng `Mã dùng chung` đọc API website/Supabase đã duyệt. Không ghi dữ liệu bán hàng local lên Supabase.
- Dữ liệu runtime nằm ngoài source tại `E:\OufeidunServerData`.
- Bảo toàn toàn bộ chức năng hiện tại: đăng nhập một phiên, sản phẩm, hãng kính, ảnh, kho, khách hàng, đơn hàng, thanh toán, nhân viên, lịch sử, báo cáo và Excel.

## Kiến trúc đích

```text
Máy bán hàng Electron
        |-- nghiệp vụ qua HTTPS LAN :443 --> Caddy --> Local API --> MySQL local
        |
        `-- chỉ Mã dùng chung qua Internet --> API website --> Supabase tra cứu/ảnh
```

## Nguyên tắc an toàn dữ liệu

- Không commit mật khẩu, token, URL chứa bí mật hoặc file `.env.local`.
- MySQL chỉ lắng nghe loopback; không mở cổng `3306` trên Windows Firewall.
- Client không nhận tài khoản MySQL.
- Giá bán, giá vốn, quyền và tồn kho được quyết định ở server.
- Xác nhận bán, nhập/xuất kho, hủy và trả hàng phải chạy trong transaction, khóa hàng sản phẩm theo thứ tự ổn định và không cho tồn âm.
- Request ghi sử dụng idempotency key để gửi lại không tạo tác động lần hai.
- Ảnh được xác minh MIME/kích thước, đổi tên UUID và chỉ đọc qua API.
- Backup phải gồm MySQL và thư mục upload, đồng thời phải kiểm tra phục hồi thử.

## Bước 1 — Database MySQL

### Công việc

- [x] Đối chiếu toàn bộ migration Supabase `004` và `017`–`020` với schema MySQL.
- [x] Tạo database riêng `oufeidun_local` trên MySQL chính.
- [x] Tạo user `oufeidun_app` chỉ có quyền trên database này.
- [x] Tạo migration có thể chạy lại an toàn và bảng `schema_migrations`.
- [x] Tạo đầy đủ FK, unique key và index.
- [x] Bảo đảm tiền dùng `DECIMAL(18,0)`, số lượng dùng số nguyên và chuỗi dùng `utf8mb4`.
- [x] Tạo script migration và script khởi tạo admin, không ghi mật khẩu vào Git.

### Điều kiện hoàn thành

- [x] Migration chạy được bằng đúng MySQL 8.0.46 hiện có trên máy, trong instance cô lập cổng 3307.
- [x] Chạy migration lần hai không lỗi và không tạo dữ liệu trùng.
- [x] MySQL chỉ kết nối qua `127.0.0.1`.
- [x] Có kiểm thử constraint quan trọng: SKU/login duy nhất, tồn không âm, FK đơn–sản phẩm.

## Bước 2 — Local API

### Công việc

- [x] Xác thực username/password bằng password hash mạnh.
- [x] Một tài khoản chỉ có một phiên hoạt động; heartbeat và logout hoạt động.
- [x] `GET /workspace` trả đúng dữ liệu và ẩn giá vốn với staff.
- [x] `/mutations` hỗ trợ draft, xác nhận, xóa draft, hủy, trả hàng, sản phẩm, kho, hãng kính và trạng thái nhân viên.
- [x] Hoàn thiện API khách hàng, thanh toán, sales, giá sỉ, giá đồng loạt và xóa sản phẩm.
- [x] Hoàn thiện báo cáo bán hàng, nhập–xuất–tồn và lịch sử kho.
- [x] Hoàn thiện API tra mã dùng chung từ dữ liệu local.
- [x] Giới hạn kích thước JSON, rate limit đăng nhập và xử lý lỗi thống nhất.

### Điều kiện hoàn thành

- [x] Hợp đồng JSON tương thích `src/data/client.ts`.
- [x] Tất cả endpoint yêu cầu đăng nhập đều từ chối token thiếu/hết hạn.
- [x] Staff không đọc hoặc sửa dữ liệu chỉ dành cho admin.
- [x] Hai request đồng thời không làm tồn âm.

## Bước 3 — Ảnh sản phẩm

### Công việc

- [x] Lưu ảnh dưới `E:\OufeidunServerData\uploads\products\YYYY\MM`.
- [x] Chấp nhận JPEG/PNG/WebP tối đa 5 MB.
- [x] Kiểm tra chữ ký file, không chỉ tin MIME từ client.
- [x] Database chỉ lưu đường dẫn tương đối chuẩn hóa.
- [x] API upload/read/delete chặn path traversal.
- [x] Không xóa ảnh còn được sản phẩm sử dụng.

### Điều kiện hoàn thành

- [x] Máy con tải ảnh qua API, không cần Windows Share.
- [x] File sai loại, quá lớn và đường dẫn `..` đều bị từ chối.

## Bước 4 — Cấu hình và Windows Service

### Công việc

- [x] Tạo `.env.local` mẫu cho server và `.env.local-client` mẫu cho client.
- [x] API chỉ nghe `127.0.0.1:8787` khi đặt sau Caddy.
- [x] Cài API thành tác vụ/service tự chạy khi Windows khởi động.
- [x] Cài Caddy HTTPS tại cổng `443` với hostname LAN.
- [x] Tạo script cài/gỡ service và kiểm tra trạng thái.
- [x] Tạo hướng dẫn Windows Firewall: chỉ mở `443` cho mạng Private/LAN.
- [x] Tạo script cấu hình không Sleep; màn hình vẫn được phép tắt.

### Điều kiện hoàn thành

- [ ] Khởi động lại Windows mà không đăng nhập, MySQL/API/HTTPS vẫn tự chạy.
- [ ] `Windows + L` không làm máy con mất kết nối.
- [x] Cổng `3306` và `8787` chỉ bind `127.0.0.1`; firewall LAN chỉ mở `443`.

## Bước 5 — Backup và phục hồi

### Công việc

- [x] Backup MySQL bằng `mysqldump --single-transaction`.
- [x] Backup đồng bộ thư mục upload và manifest checksum.
- [x] Lưu daily 14 bản, weekly 8 bản.
- [x] Không đặt mật khẩu trực tiếp trong dòng lệnh hoặc log.
- [x] Tạo script phục hồi vào database kiểm thử riêng.
- [x] Lập Scheduled Task chạy backup hằng ngày lúc 23:00.

### Điều kiện hoàn thành

- [x] Tạo được một bộ backup đầy đủ.
- [x] Phục hồi vào database test và đối chiếu số lượng bản ghi/ảnh thành công.

## Bước 6 — Kết nối ứng dụng Electron

### Công việc

- [x] Thêm profile `local-mysql`, tách khỏi `test-supabase` và production hosting.
- [x] Cấu hình API `https://oufeidun.home.arpa/api/app/v1`.
- [x] Cấu hình lookup `https://outfeidun.vercel.app/api/glass-lookup`; nghiệp vụ vẫn gọi `https://oufeidun.home.arpa/api/app/v1`.
- [x] Loại Supabase key khỏi bundle local.
- [x] Kiểm tra login, session touch/logout và thông báo mất kết nối bằng tiếng Việt.
- [x] Client không lưu access token lâu dài và không tự đăng nhập sau khi đóng app.

### Điều kiện hoàn thành

- [x] `dist/server-config.json` mang môi trường `local` và chỉ cấu hình ngoại lệ online cho API `Mã dùng chung` đã duyệt.
- [x] Chỉ màn `Mã dùng chung` gọi Vercel/Supabase; mọi nghiệp vụ còn lại chỉ gọi máy chủ local.
- [ ] App mở được trên ít nhất hai máy LAN.

## Bước 7 — Kiểm thử toàn bộ và đồng thời

### Kiểm thử bắt buộc

- [x] Admin/staff, tạo/sửa/xóa/khóa tài khoản và đổi mật khẩu.
- [x] Một tài khoản không hoạt động đồng thời trên hai máy.
- [x] CRUD sản phẩm, hãng kính, ảnh và xóa kính.
- [x] Tìm theo SKU, model chính và mã dùng chung.
- [x] Nhập kho thủ công, nhập Excel, tải template, xuất và điều chỉnh.
- [x] Lưu/mở/xóa draft; xác nhận bán; hàng quà/mẫu; giá sỉ/lẻ.
- [x] Khách hàng, sales, địa chỉ, đủ/thiếu hàng và Excel đơn.
- [x] Thanh toán một/nhiều đợt, hủy, trả và đổi hàng.
- [x] Báo cáo theo ngày/hãng, chi tiết sales và xuất Excel.
- [x] Hai máy cùng bán sản phẩm còn một đơn vị: chỉ một giao dịch thành công.
- [ ] Khóa server bằng `Windows + L`, máy con vẫn dùng được.
- [ ] Mất Internet nhưng còn LAN vẫn bán hàng được; màn `Mã dùng chung` báo lỗi kết nối có kiểm soát.
- [ ] Tắt API/server hiển thị lỗi có kiểm soát, không làm mất draft đang soạn.
- [x] Chạy `npm.cmd run verify` thành công.
- [x] Chạy `npm audit --omit=dev` không còn lỗ hổng production mức high/critical.

## Bước 8 — Đóng gói và bàn giao

### Công việc

- [x] Tạo bộ cài Server hoặc script cài server có kiểm tra điều kiện.
- [x] Tạo `Oufeidun-Client-Setup.exe` profile local.
- [x] Tạo script cài chứng chỉ/hosts cho máy con.
- [x] Tạo tài liệu cài đặt, vận hành, backup và khôi phục.
- [x] Ghi phiên bản, checksum và ngày build.
- [x] Không đưa file `.env.local`, password hoặc backup dữ liệu thật vào gói bàn giao.

### Điều kiện hoàn thành

- [ ] Cài sạch trên máy thử và kết nối server thành công.
- [ ] Gỡ/cài lại client không làm mất dữ liệu server.
- [x] Bộ bàn giao có checksum và kết quả kiểm thử đi kèm.

## Dữ liệu và cấu hình cần tại máy chủ

- MySQL 8.0: đã phát hiện service `MySQL80` đang `Running`, `Automatic`.
- Node.js: đã có trên máy phát triển.
- Source: `E:\AppBanHang`.
- Runtime data: `E:\OufeidunServerData`.
- Mật khẩu quản trị MySQL: chỉ nhập trực tiếp trong Terminal khi chạy setup, không gửi qua chat và không ghi vào source.
- Hostname mặc định: `oufeidun.home.arpa`.
- IP LAN cố định: xác định tại bước cài máy chủ.

## Nhật ký review

| Thời gian | Bước | Kết quả review | Bằng chứng / việc còn lại |
| --- | --- | --- | --- |
| 29/09/2026 | Khởi tạo | Đã tạo kế hoạch trước khi tiếp tục backend. Schema/API hiện có chỉ là bản nháp, chưa được đánh dấu hoàn thành. | MySQL80 chạy tự động; thư mục runtime đã tạo; cần review migration và hoàn thiện API. |
| 29/09/2026 | Review bước 1 lần 1 | Schema có 15 bảng, 24 FK, money/stock constraint và migration idempotent. Integration API đã chạy trên MySQL 8.0 cô lập; phát hiện và sửa lỗi middleware `next`. | `server:test` 5/5; `server:test:integration` 1/1; migration chạy liên tiếp 2 lần. Còn chạy setup trên instance MySQL chính bằng mật khẩu nhập trực tiếp. |
| 29/09/2026 | Review bước 2–3 | API tương thích client, scrypt password, single-session, phân quyền, transaction/idempotency và khóa tồn đã chạy trên MySQL thật cô lập. Upload/read/delete ảnh và magic-byte/path traversal đã kiểm thử. | Unit 6/6; integration 1 suite qua: đăng nhập, chặn phiên thứ hai, product, stock, hai confirm đồng thời 200/409, customer, payment, report, staff ẩn cost, lookup mã dùng chung và ảnh. |
| 29/09/2026 | Review bước 4–6 lần 1 | Caddy 2.11.4 validate thành công; script UAC/service/firewall/no-sleep và client-kit đã tạo. Backup có checksum đã phục hồi thành công sang DB khác với 15 bảng và số sản phẩm khớp 1/1. Electron local đăng nhập và tải workspace thành công. | Còn chạy installer bằng quyền admin trên máy thật, kiểm tra reboot/Windows+L và thử từ máy LAN thứ hai. Audit production app/server đều 0 lỗ hổng. |
| 29/09/2026 | Review đóng gói 0.2.0 | Đã loại server/scripts/.env khỏi app.asar; tạo Oufeidun-Setup.exe profile local HTTPS; package bên trong trỏ đúng `local` và `oufeidun.home.arpa`. | SHA256 `CB498DFBFD39B74676233DA5586BB4FA5D05F0C705CBA611BCB6411A9CC272C7`; verify 20 DB + 21 UI + Electron/build/audit đạt. File chưa ký số; cài service máy thật và xuất client-kit vẫn chờ thao tác UAC/mật khẩu trực tiếp. |
| 30/09/2026 | Nghiệm thu máy chủ local thật | Đã tạo `oufeidun_local`, user giới hạn quyền, cài API/Caddy/backup, chuyển Ethernet sang Private, mở duy nhất HTTPS 443 cho LocalSubnet; MySQL/API chỉ bind loopback. Đã seed 4 sản phẩm mẫu và chạy package local đăng nhập thành công. | Health HTTP/HTTPS đạt; package hiển thị 4 sản phẩm; backup thật + checksum đạt; Defender ZIP không phát hiện mối đe dọa; verify 20 DB + 21 UI + Electron/build/audit đạt. Còn test thực tế reboot/Windows+L và máy LAN thứ hai. |
| 30/09/2026 | Chuyển dữ liệu vận hành vào local | Đã thay dữ liệu mẫu bằng snapshot Supabase: 8 sản phẩm, 17 đơn, 3 khách, 4 tài khoản nguồn, tổng tồn 5.185 và 2 ảnh. EXE local, lookup, ảnh, báo cáo và toàn bộ regression đều đạt. | Backup trước/sau migration và snapshot SHA-256 nằm trong `E:\OufeidunServerData`; vẫn còn test vật lý Windows+L, mất Internet và máy LAN thứ hai. |
| 30/09/2026 | Hybrid mã dùng chung | Đã tách API nghiệp vụ local và API tra cứu website. Electron local đăng nhập/tải 8 sản phẩm từ MySQL; tra `sa` nhận SKU `GNS-T023- SAM A10` cùng ảnh từ Supabase. | Màn mã dùng chung cần Internet; các màn bán hàng/kho/đơn không phụ thuộc Internet. |
| 30/09/2026 | Sửa đổi mật khẩu/đăng nhập 0.2.2 | Thêm xác nhận mật khẩu, xóa token client sau khi admin tự đổi mật khẩu và sửa rate limit chỉ đếm lần đăng nhập sai. Integration đã xác nhận mật khẩu cũ bị từ chối, mật khẩu mới đăng nhập được cho cả staff và admin. | Source/runtime API đã đồng nhất; cần chạy script restart service bằng Administrator để tiến trình SYSTEM nạp API mới. Bộ cài và ZIP máy con 0.2.2 đã smoke test đạt. |
| 30/09/2026 | Đóng gói local 0.2.3 | Thêm mã đơn tự nhập duy nhất và ảnh PNG xác nhận; migration 003 đã áp dụng sau backup; tạo hướng dẫn LAN/Wi-Fi và bộ cài máy con tự cấu hình chứng chỉ/hosts. | Verify 20 DB + 21 UI + Electron/build/audit đạt; server unit 6/6 và integration đạt. ZIP SHA256 `907F89437EF14DCE298F6765FDD6ED17B124B820450AA547F77AAC7221840193`. Cần chạy `KHOI-DONG-LAI-MAY-CHU.cmd` bằng Administrator và kiểm tra vật lý từ máy Wi-Fi. |
