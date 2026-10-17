# Oufeidun — ứng dụng bán hàng

> Quy trình phát triển và checklist nghiệm thu bắt buộc: [`FEATURE-CHECKLIST.md`](FEATURE-CHECKLIST.md). Sau mỗi thay đổi phải đọc lại file này, chạy toàn bộ kiểm thử và cập nhật nhật ký xác minh trước khi bàn giao.

Ứng dụng desktop Electron/React quản lý bán hàng, kho kính, công nợ và tra cứu mã kính dùng chung. Source hỗ trợ hai backend để phát triển trên Supabase trước và chuyển sang PHP/MySQL khi khách hàng chốt hosting, không cần thay đổi UI.

Bản LOCAL 0.2.14 cập nhật 08/10/2026 dùng mã kính thay tên sản phẩm trên UI/chứng từ. Excel nhập kho tự tạo mã chưa có cùng transaction (chỉ Admin); giá vốn mã mới bằng giá nhập, giá bán/sỉ bằng 0 cần thiết lập, mã đã có giữ nguyên giá. Cần cập nhật cả API máy chủ và app máy con dù version vẫn là 0.2.14 theo yêu cầu. Không cài lại MySQL hoặc xóa dữ liệu. Supabase migration tương ứng là `027_excel_create_sku.sql`, chưa áp dụng lên hệ thống Supabase đang vận hành trong lần phát hành LOCAL này.

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

Project Supabase phải có các migration nền hiện tại và chạy tuần tự `supabase/migrations/017_app_order_sales_feedback.sql` đến `supabase/migrations/022_manual_order_code.sql`.

Migration 018 bổ sung danh mục khách sỉ/lẻ, giá sỉ mặc định, trạng thái đơn đủ/thiếu và báo cáo bán hàng/kho chi tiết. Ứng dụng có thể nhập phiếu nhập kho từ `.xlsx` (cột Mã kính, Số lượng, Giá nhập) và xuất đơn/báo cáo thành `.xlsx`.

Migration 019 bổ sung nhân viên Sales độc lập với người thao tác đơn, nhóm kính full viền/không viền cao cấp và cập nhật giá đồng loạt theo nhóm. File theo dõi đơn hàng được xuất trên một sheet; đơn thiếu hàng có thể xuất Excel khi vẫn là bản nháp.

Migration 020 khóa giá bán tại server: dòng hàng bán luôn lấy giá lẻ hoặc giá sỉ đã thiết lập theo loại khách; hàng tặng/hàng mẫu có giá 0. Nhân viên không thể thay giá bằng UI hoặc request chỉnh sửa thủ công.

Migration 021 cho phép lưu giá bán thực tế theo từng dòng đơn nhưng vẫn giữ snapshot giá của đơn đã xác nhận. Migration 022 bổ sung mã đơn do người bán tự nhập, bắt buộc duy nhất không phân biệt chữ hoa/thường. Ở màn Bán hàng, tài liệu xác nhận gửi khách được tải dưới dạng PNG; Excel vẫn dùng tại màn Đơn hàng, Báo cáo và nhập kho.

### Hai profile máy chủ

Không dùng chung một lệnh build cho TEST và PRODUCTION:

| Profile | File cấu hình local | Backend | Lệnh kiểm tra/build |
| --- | --- | --- | --- |
| TEST | `.env.test-supabase.local` | Supabase test | `npm.cmd run build:test` |
| PRODUCTION | `.env.production-mysql.local` | PHP API kết nối MySQL | `npm.cmd run build:production` |

Đóng gói Windows tương ứng bằng `npm.cmd run make:test` hoặc `npm.cmd run make:production`. Profile production bị chặn nếu hai URL HTTPS chưa hợp lệ, không cùng origin hoặc sai path API; nhờ đó không thể vô tình tạo bản production vẫn gọi Supabase/Vercel. Hai file `.local` bị Git ignore; dùng `.env.test-supabase.example` và `.env.production-mysql.example` làm mẫu. Mỗi build cũng sinh `dist/server-config.json` để tiến trình Electron và giao diện dùng đúng cùng API tra cứu.

Migration 017 bổ sung địa chỉ/loại khách, giá bán riêng theo dòng, hàng tặng–hàng mẫu, ghi chú dòng hàng và thanh toán nhiều đợt. Publishable key được phép nằm ở client; bảo mật dữ liệu dựa trên Auth, RPC `security definer`, kiểm tra quyền và RLS. Không đưa service-role key hoặc mật khẩu database vào ứng dụng.

## Chuyển sang PHP API khi khách chốt

Đổi duy nhất cấu hình build:

```dotenv
VITE_DEMO_MODE=false
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=https://ten-mien-cua-ban.vn/api/app/v1
VITE_GLASS_LOOKUP_API_URL=https://ten-mien-cua-ban.vn/api/glass-lookup
```

App không kết nối MySQL trực tiếp. PHP API giữ mật khẩu MySQL ở server, xác thực người dùng, phân quyền, transaction và trả dữ liệu cần thiết cho app. Backend PHP đã có endpoint `/orders/features` và migration MySQL cho các chức năng trong migration Supabase 017; trước ngày chuyển chính thức chỉ còn nhập dữ liệu và chạy kiểm thử trên URL hosting thật.

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
## Backend LOCAL trên máy chủ Windows

Bộ bàn giao LOCAL 0.2.13: máy chủ đã cài chạy `01-MAY-CHU/CAP-NHAT.bat`, kiểm tra rồi chạy `TAO-BO-MAY-NHAN-VIEN.bat`. Copy cả `02-MAY-CLIENT` đã được xuất từ máy chủ cửa hàng sang máy nhân viên và chạy `MO-APP.bat`. App portable tự tìm đúng máy chủ qua mạng dây hoặc Wi-Fi bằng UDP 47631 có chữ ký, kết nối dữ liệu qua HTTPS 443 bằng CA riêng. Không cần MySQL/Node, nhập IP hoặc sửa hosts ở máy con trong chế độ này. Bộ chưa có public profile giữ cách kết nối cũ; `CAP-NHAT.bat` vẫn cập nhật app đã cài.

`server-profile.json` là nhận diện công khai của cửa hàng, được cache trong AppData/Oufeidun. `discovery-identity.json` chứa khóa riêng, chỉ nằm trong config máy chủ và không được gửi cùng bộ client. Thử lại IP cũ trước khi broadcast; không tự replay giao dịch bán/thu tiền sau lỗi mạng. Mạng Guest/Client Isolation hoặc khác VLAN chưa định tuyến vẫn cần cấu hình mạng. Chi tiết triển khai và giới hạn kiểm thử nằm tại `LAN-DISCOVERY-PLAN.md` và `FEATURE-CHECKLIST.md`.

Profile `local-mysql` dùng Node API và MySQL trên một máy Windows trong mạng LAN. Bán hàng, kho, đơn, khách và tài khoản gọi HTTPS `https://oufeidun.home.arpa`; riêng màn **Mã dùng chung** gọi `https://oufeidun.vn/api/glass-lookup` để đọc dữ liệu và ảnh trên hosting mới. MySQL và API nội bộ chỉ nghe tại loopback nên không mở trực tiếp cho máy con.

Client LOCAL 0.2.16 chỉ đổi endpoint tra cứu/ảnh sang hosting `oufeidun.vn`. Không cập nhật backend máy chủ, migration, dữ liệu, account hay cấu hình LAN/CA/discovery; máy chủ đang ở 0.2.15 được giữ nguyên. Profile TEST/Supabase và PRODUCTION hosting không thay đổi. Khi cập nhật máy đã cài, dùng installer client mới và giữ cấu hình AppData; với portable, dùng toàn bộ folder App mới và giữ public profile cửa hàng. Không chạy cài lại máy chủ hoặc clean-data vì thay URL tra cứu.

Quy trình cài đặt và vận hành chi tiết nằm tại [`docs/CAI-DAT-LOCAL-SERVER.md`](docs/CAI-DAT-LOCAL-SERVER.md). Trên máy chủ, nhấp đúp `CAI-MAY-CHU-LOCAL.cmd`, nhập mật khẩu root MySQL và tạo mật khẩu admin. Sau khi dịch vụ hoạt động, dùng các lệnh sau để đóng gói client và tạo bộ cài cho máy con:

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts\build-local-client.ps1
powershell.exe -ExecutionPolicy Bypass -File scripts\export-local-client-kit.ps1 -ServerIp 192.168.1.10
```

Không sao chép `server/.env.local`, file backup hoặc mật khẩu vào bộ cài client. TEST Supabase, LOCAL MySQL và PRODUCTION hosting là ba profile độc lập.

# Ký số bản Windows phát hành

Windows App Control có thể chặn hoàn toàn file EXE chưa ký. Bản giao cho khách hàng phải được ký bằng chứng thư Authenticode được Windows tin cậy.

Thiết lập biến môi trường trong PowerShell rồi chạy quy trình build có kiểm tra bắt buộc:

```powershell
$env:WINDOWS_CERTIFICATE_FILE = 'C:\duong-dan\oufeidun-code-signing.pfx'
$env:WINDOWS_CERTIFICATE_PASSWORD = 'mat-khau-chung-thu'
npm.cmd run make:signed
```

Quy trình ký cả `Oufeidun.exe` và `Oufeidun-Setup.exe`, đồng thời đóng dấu thời gian. Không chép chứng thư hoặc mật khẩu vào `.env`, source hay Git. Nếu nhà cung cấp lưu khóa trong USB token/cloud HSM, cấu hình hook ký tương ứng theo hướng dẫn của nhà cung cấp thay cho file `.pfx`.

Mẫu Excel danh mục 0.2.14 cập nhật 08/10: tám cột theo ảnh khách, máy cách bằng dấu phẩy. Nhập giá/loại/hãng/model, giữ tồn kho; tương thích file nhập kho ba cột cũ. Cập nhật cả API máy chủ và app các máy.

Cập nhật mới nhất 0.2.14: mẫu Excel chín cột có Số lượng nhập thêm; 0 chỉ sửa danh mục. Tự tạo phiếu và sổ kho, giữ đọc mẫu tám/ba cột cũ. Kho kính hiển thị Số lượng tồn cạnh mã kính. Retry cùng key được chống lặp; lần nhập file mới cộng tiếp số lượng.
