# Handover cho Claude — AppBanHang / Oufeidun Desktop

Mốc đối chiếu ngày 12/11/2026, múi giờ Asia/Saigon. Tài liệu dành cho AI tiếp quản cùng workspace Windows hoặc clone repository sang máy mới. Đọc trạng thái thực tế ở phần đầu trước khi dùng các README và nhật ký cũ.

> Cập nhật bố cục source ngày 15/11/2026. README và docs/README.md là điểm bắt đầu cho bên nhận source. Các số đo Git/hosting ngày 12/11 bên dưới là lịch sử kiểm tra, cần tái xác minh khi tiếp quản.

## 1. Bắt đầu từ đây

- Repository đang làm việc là `E:\AppBanHang`, remote `https://github.com/duongnhan28/oufeidun_app.git`, branch `main`.
- Commit desktop đã phát hành là `94adaf729443686ec48eaf59194acd87f48ac72b`, tag `v0.1.7`. `package.json` của desktop ghi `0.1.7`. Các commit đồng bộ server/tài liệu tiếp theo có thể làm HEAD main mới hơn commit bộ cài.
- Bản LOCAL Windows x64 đang được feed công bố là **0.1.7**, đã kiểm tra chữ ký trực tiếp ngày 12/11/2026.
- Workflow phát hành thành công `43146659239`. Xem https://github.com/duongnhan28/oufeidun_app/actions/runs/43146659239 .
- API máy chủ có số phiên bản riêng. `server/package.json` ghi `0.1.4`. Phần server-update được đưa vào đợt commit đồng bộ source sau khi bàn giao 0.1.7, còn bộ cài desktop đang phân phối theo tag ở trên.
- Website phục vụ tra cứu và file cập nhật nằm tại `E:\Oufeidun_web`, remote `https://github.com/duongnhan28/oufeidun_web1.git`. Handover tương ứng là `E:\Oufeidun_web\docs\CLAUDE-HANDOVER-WEB.md`.
- `E:\mhpGroup` là source web tham khảo trước đây. Khi tiếp tục dự án app, mở đúng `E:\AppBanHang`.

Trình tự tiếp quản thực tế

1. Chạy `git status --short`, `git log -5 --oneline` và kiểm tra version trong `package.json`.
2. Đọc `AGENTS.md`, `BA-SPEC.md`, `FEATURE-CHECKLIST.md` cùng tài liệu tính năng sắp sửa.
3. Đối chiếu feed có chữ ký để biết khách đang nhận bản nào. Một tag tồn tại chưa đủ để kết luận đã phát hành.
4. Đọc mốc đồng bộ ở phần 3 và diff hiện tại trước khi sửa hoặc stage.
5. Làm công việc người dùng đang yêu cầu. Tài liệu handover không phải yêu cầu tự deploy, khởi động server hoặc chạy migration.

## 2. Kiến trúc và các kết nối

```text
Oufeidun.exe — Electron main/preload + React/Vite renderer
  ├─ HTTPS LAN → oufeidun.home.arpa/api/app/v1
  │    Caddy trên máy chủ Windows → Node/Express loopback:8787 → MySQL loopback:3306
  │    Đơn hàng, khách, kho, giá, tài khoản, quyền, báo cáo, ảnh nghiệp vụ
  ├─ UDP 47631 → khám phá máy chủ có chữ ký Ed25519
  ├─ HTTPS → oufeidun.vn/api/glass-lookup và /api/images/<id>
  │    Dữ liệu mã kính dùng chung trên website
  └─ HTTPS → oufeidun.vn/app-updates/
       Feed có chữ ký + installer trên hosting VinaHost
```

Máy chủ bán hàng là Windows tại cửa hàng. Website/hosting lưu dữ liệu web, tra cứu và các file installer. Các DB có vòng đời và cấu hình riêng. Khi không có Internet, đường LAN vẫn là đường nghiệp vụ chính nếu máy chủ nội bộ và mạng đang hoạt động. Tra cứu web và tải cập nhật phụ thuộc Internet.

## 3. Trạng thái Git và source server

Sau đợt đồng bộ ngày 12/11/2026, main đã push tới commit `71398cccf00fedfd9a8c7c2597f841293664910d`. Working tree sạch và HEAD đồng bộ origin/main tại mốc kiểm. Commit này chứa gói server-update 0.1.4, capability tồn dự kiến, script staging/kiểm tra, kiểm thử và tài liệu handover.

CI main `43225979658` đã thành công cả build và bước ký manifest thử. Feed khách vẫn công bố desktop 0.1.7 từ tag ở phần 1. Khi tiếp quản, chạy lại Git status/log để xác định thay đổi mới. [Workflow đồng bộ source](https://github.com/duongnhan28/oufeidun_app/actions/runs/43225979658).

Những file server/deployment từng nằm ngoài commit phát hành desktop đã được lưu trong commit đồng bộ trên. Đọc diff `94adaf7..71398cc` để xem phạm vi bổ sung. Những thay đổi mới trên máy tiếp quản cần được kiểm tra theo trạng thái thực tế.

Máy phát triển có `E:\OufeidunServerData\app\package.json` ghi 0.1.4 khi kiểm tra ngày 12/11. GET `http://127.0.0.1:8787/health` trả ECONNREFUSED tại thời điểm kiểm tra. Chưa xác nhận server đó đang chạy, migration nào đã áp dụng hoặc trạng thái máy chủ thật ở cửa hàng. Một số tài liệu 04/11 mô tả API 0.2.17 là ghi nhận lịch sử.

## 4. Bản đồ source

| Khu vực | File / thư mục chính | Vai trò |
| --- | --- | --- |
| Entry/UI | `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/types.ts` | Màn hình, giỏ, modal, kiểu dữ liệu và định dạng |
| Data adapter | `src/data/client.ts` | Chọn demo/API/Supabase, token, request, chống phản hồi phiên cũ |
| Demo | `src/data/demo.ts`, `src/data/demo-*.sql`, `supabase/migrations/` | PGlite/WASM và luồng Supabase lịch sử |
| Electron | `electron/main.cjs`, `electron/preload.cjs`, `src/electron.d.ts` | Protocol, IPC, save dialog, tra cứu, kết nối và updater |
| LAN | `electron/lan-connection.cjs`, `server/src/discovery.cjs` | Profile/CA, tìm IP và xác minh discovery |
| Updater | `electron/app-updates.cjs`, `electron/update-config.json`, `src/components/AppUpdateNotice.tsx` | Kiểm tra/tải/xác minh cập nhật |
| Đơn và xuất file | `src/lib/order-item-order.ts`, `order-image.ts`, `excel.ts`, `download.ts`, `order-product-color.ts` | Thứ tự dòng, PNG, XLSX, màu và lưu file |
| Báo cáo | `src/lib/report-sheets.ts`, `report-totals.ts`, `report-product-order.ts`, `src/data/report-product-order.json` | Số liệu và thứ tự xuất báo cáo |
| Báo cáo UI | `src/components/SalesReportTable.tsx`, `ProductReportDetails.tsx`, `src/InventoryReport.tsx` | Tổng hợp và chi tiết theo mã |
| Quyền/giá/kho | `src/lib/permissions.ts`, `catalog.ts`, `product-excel.ts`, `stock-adjustment.ts`, `stock-forecast.ts` | Quyền, đơn vị, import và tính tồn |
| API core | `server/src/index.cjs`, `core.cjs`, `auth.cjs`, `permissions.cjs`, `mutations.cjs` | Express, pool, token/quyền, transaction |
| API nghiệp vụ | `server/src/services.cjs`, `workspace.cjs`, `reports.cjs`, `product-report.cjs`, `stock-forecast.cjs`, `sku-names.cjs`, `images.cjs` | Đơn/khách/giá/báo cáo/alias/ảnh |
| Schema | `server/mysql/001_schema.sql` đến `013_session_lifetime.sql`, `server/src/migrate.cjs` | Migration MySQL LOCAL |
| Đóng gói | `forge.config.cjs`, `scripts/audit-local-package.cjs`, `scripts/write-runtime-config.cjs` | ASAR, installer và profile |
| CI/CD | `.github/workflows/app-release.yml`, `scripts/release/`, `scripts/publish-client-update.cjs` | Build/ký/upload/công bố |
| Cài/vận hành LAN | `deployment/customer/server/`, `deployment/customer/client/`, `scripts/*local*.ps1` | BAT/PowerShell và bộ máy chủ/máy con |

Tên file rút gọn trong một ô bảng thuộc cùng thư mục với file đầy đủ ở đầu ô.

## 5. Toolchain và lệnh phát triển

CI dùng Node 22, Windows 2022 và Ubuntu 22.04 cho bước ký/publish. Máy Windows hiện tại có Node 24.19.0. Khi tái lập CI, ưu tiên Node 22 và lockfile đã commit. Stack gồm React 19, Vite 6, TypeScript, Electron/Forge, ExcelJS và PGlite cho kiểm thử demo. API có bộ dependency riêng trong `server/package-lock.json`.

```powershell
cd E:\AppBanHang
npm.cmd ci
npm.cmd ci --prefix server --ignore-scripts
npm.cmd run dev
```

Vite dùng `http://127.0.0.1:5178`, strict port. `npm.cmd run desktop` build rồi mở Electron. `npm.cmd run build` chạy TypeScript/Vite và tạo runtime config. File EXE được tạo bởi `make:*`.

Các script `server:start`, `server:migrate`, `server:seed` có thể ghi dữ liệu. `server:start` gọi migration trước khi lắng nghe. Chọn cấu hình DB thử rõ ràng trước khi chạy các lệnh này trong môi trường QA.

## 6. Profile build và cấu hình

| Profile | File local | Backend / mục đích | Lệnh |
| --- | --- | --- | --- |
| `local-mysql` | `.env.local-mysql.local` | Electron bán hàng → API LAN; tra cứu → web | `build:local`, `make:local` |
| `test-supabase` | `.env.test-supabase.local` | Luồng Supabase test lịch sử | `build:test`, `make:test` |
| `production-mysql` | `.env.production-mysql.local` | API hosting theo giao thức `/api/app/v1`, cần cấu hình dự án tương ứng | `build:production`, `make:production` |
| `test` | Biến demo trong CI | Electron/PGlite thử nghiệm | `build:electron-test`, `test:electron` |

Khách hiện nhận profile **local-mysql**. Cấu hình public mà CI sinh bằng `node scripts/release/ci.cjs local-env` là

```ini
VITE_SERVER_ENV=local
VITE_DEMO_MODE=false
VITE_DATA_BACKEND=api
VITE_API_BASE_URL=https://oufeidun.home.arpa/api/app/v1
VITE_GLASS_LOOKUP_API_URL=https://oufeidun.vn/api/glass-lookup
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

`scripts/validate-server-config.cjs` kiểm profile, HTTPS/path và origin. Vite gộp `.env`, `.env.local`, file theo mode và biến process. `scripts/write-runtime-config.cjs` tạo `dist/server-config.json`. Kiểm file này sau build để biết bundle thực sự chứa profile nào. Các biến `VITE_*` đi vào client nên chỉ chứa cấu hình công khai phù hợp.

README còn các ví dụ URL Vercel/Supabase/PHP cũ. Tra cứu LOCAL hiện dùng `oufeidun.vn`. Tính năng quyền mới được triển khai ở LOCAL và demo. Backend Supabase có vòng nâng RPC riêng.

## 7. Profile cửa hàng và máy con

`electron/main.cjs` tìm `server-profile.json` từ tham số `--server-profile=...`, cạnh EXE, folder kit phía trên, rồi cache `%APPDATA%\Oufeidun\server-profile.json`. Profile chứa server ID, hostname, HTTPS port, discovery port, public key và CA công khai. IP cache có thể được cập nhật sau discovery.

Kết nối HTTPS kiểm CA và hostname. Discovery dùng nonce và chữ ký Ed25519 để xác minh đúng máy chủ. Máy con thử IP đã biết rồi broadcast theo mạng LAN. Mạng guest/client isolation/VLAN có thể chặn broadcast hoặc HTTPS.

Các cấu hình cũ có thể sử dụng `%APPDATA%\Oufeidun\connection.json`. Việc nâng desktop phải giữ profile/connection của cửa hàng. `discovery-identity.json` thuộc máy chủ, chứa private identity. Khi thử Electron, dùng `APP_TEST_DATA` trỏ tới thư mục QA riêng để tách userData.

## 8. API LAN và dữ liệu MySQL

`server/src/core.cjs` nạp env từ `OUFEIDUN_SERVER_ENV`, mặc định `server/.env.local`. Các tên cấu hình cần biết

| Tên biến | Mục đích |
| --- | --- |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | Kết nối DB máy chủ |
| `OUFEIDUN_HOST`, `OUFEIDUN_PORT` | Bind API, mặc định loopback và 8787 |
| `OUFEIDUN_DATA_DIR` | Root dữ liệu, upload, backup, logs |
| `OUFEIDUN_SERVER_ENV` | Chọn file cấu hình API |
| `OUFEIDUN_ALLOWED_ORIGINS` | Các origin được phép, có `shop://app` và Vite local |
| `SESSION_IDLE_SECONDS`, `SESSION_MAX_SECONDS` | Presence lease và tuổi tuyệt đối token |
| `ADMIN_LOGIN`, `ADMIN_DISPLAY_NAME`, `ADMIN_PASSWORD` | Khởi tạo admin theo quy trình server |

Giá trị đăng nhập/DB nằm trong cấu hình riêng tại máy chủ. Khi bàn giao tiếp, truyền vị trí và tên biến, dùng kênh bảo mật cho credential.

Các endpoint LOCAL nằm dưới `/api/app/v1`, gồm `auth/login`, `session/touch`, `auth/logout`, `workspace`, `stock/forecast`, `query`, `mutations`, `orders/features`, `orders/business`, `customers`, `products/wholesale-price`, `products/bulk-price`, `products/delete`, `staff`, `reports`, `reports/product`, `images`. Đọc method và schema trong `index.cjs` cùng service tương ứng trước khi gọi.

Schema cốt lõi có `schema_migrations`, `app_users`, `glass_brands`, `products`, `customers`, `sales_orders`, `sales_order_items`, `sales_returns`, `sales_return_items`, `sales_payments`, `inventory_documents`, `inventory_document_items`, `inventory_movements`, `audit_logs`, `mutation_requests`. Migration sau bổ sung lịch sử giao hàng, alias SKU và các cột nghiệp vụ.

Mutation dùng idempotency key, transaction, stock/version checks và snapshot. Khi sửa retry/concurrency, đối chiếu cả client lẫn API. Tổng tiền dùng số nguyên đồng, nhiều trường tiền truyền bằng chuỗi. Alias SKU giữ liên kết theo product ID và nhãn lịch sử của chứng từ.

## 9. Các quy tắc nghiệp vụ cần bảo toàn

- Admin và staff có quyền theo tài khoản. Staff mới có nghiệp vụ bán cơ bản. Quyền bổ sung gồm `receive_stock`, `adjust_stock`, `manage_products`, `manage_prices`, `manage_returns`, `view_reports`, `view_audit`. Admin cấp/thu hồi với version. API kiểm quyền từ DB theo request.
- Vốn/giá nhập/lợi nhuận dành cho Admin. Staff có quyền nhập kho dùng mẫu Excel hai cột mã/số lượng. Hàng mới chưa cấu hình vốn phải được Admin thiết lập trước chốt bán.
- Đơn nháp lưu lượng nhưng chưa trừ kho. Xác nhận/giao hàng trừ lượng thực giao. Giao bổ sung có lịch sử từng đợt. Trả/hủy chỉ tác động số đã giao phù hợp.
- Cùng sản phẩm có dòng bán/tặng/mẫu riêng. Hàng bán theo thứ tự chọn. Tặng cùng mã ở ngay sau dòng bán, tặng không có mã bán ở sau các nhóm bán-tặng. Toàn bộ hàng mẫu ở cuối.
- Mã đổi tên giữ ID, tồn, giá và alias. Đơn/nháp/chứng từ giữ snapshot. Các tên cũ được dùng để tra/nhập đúng sản phẩm.
- Khách dùng số điện thoại `0` còn phân biệt theo tên. Các tên có dấu khác nhau không được gộp tùy tiện.
- Báo cáo doanh thu theo ngày đặt Việt Nam, loại nháp/xóa/hủy, lấy giá trị hàng thực giao sau trả và phí toàn đơn đúng một lần. Theo dõi thanh toán/công nợ có cách tính riêng.
- Tồn dự kiến bằng tồn thực tế trừ tổng mọi nháp đang lưu theo ID, gộp bán/tặng/mẫu. Khi sửa nháp, loại snapshot chính nháp đó trước khi xét giỏ đang sửa. Đây là cảnh báo mềm, API chốt vẫn kiểm tồn thực tế.
- Hàng đã giao trong kỳ ở kho dự kiến là xuất bán gross theo thời gian sổ kho. Hoàn/hủy xem sổ kho tương ứng.
- Phiên LOCAL có deadline mặc định 12 giờ và presence lease mặc định 90 giây. Heartbeat 25 giây. Lỗi mạng giữ form/token còn hạn, phản hồi token cũ không được xóa phiên mới. Hết hạn hoặc bị thay/thu hồi yêu cầu login.

Chi tiết từng quyết định và giới hạn trong BA-SPEC, FEATURE-CHECKLIST, các tài liệu `STAFF-PERMISSIONS-AND-PRODUCT-REPORT-2026-10-29.md`, `SESSION-LIFETIME-2026-11-03.md`, `STOCK-FORECAST-2026-11-03.md`, `CUSTOMER-IDENTITY-2026-10-21.md`.

## 10. Hai thay đổi gần nhất đã giao khách

### Ảnh hóa đơn từ 0.1.6

Renderer `src/lib/order-image.ts` xuất một PNG rộng **2400 px** bằng canvas 2x. Bảng gọn có STT, mã, ĐVT, đặt, đã giao, còn thiếu, đơn giá, thành tiền. Nội dung dài xuống dòng. Preview cuộn để đọc. Dữ liệu giao chưa biết dùng dấu `—`.

Mẫu đơn 954 được người dùng duyệt có 34 mã, 470 tấm, 3.525.000đ, kích thước 2400 × 3792 px, khoảng 0,8 MB. Nếu file mẫu local còn tồn tại, xem `.local/invoice-single-preview-2026-11-09/don-954-mau.png`. Giới hạn an toàn của renderer là chiều cao vật lý 16000 và 40 triệu pixel. Đơn vượt giới hạn có thông báo dùng PDF. Khi gửi Zalo, gửi file PNG gốc giúp giữ chất lượng trước việc nén của ứng dụng chat. Xem `docs/LONG-INVOICE-IMAGES-2026-11-09.md`.

### Thứ tự Excel từ 0.1.7

Khách gửi `Book1.xlsx`, 84 dòng tại `Sheet1!A1:A84`. Hai sheet Báo cáo bán hàng/Nhập xuất tồn theo thứ tự mẫu. Mã ngoài mẫu ở cuối theo thứ tự tương đối đầu vào. Mỗi mức giá vẫn có dòng riêng. Màu đi cùng mã sau sắp xếp.

Fixture được commit ở `tests/fixtures/report-product-order.xlsx`, SHA256 `e40b59dc612fcdd13724523ed4c9e31ea8faaeac66d6ede8801ab2ee4e9d035a`. Data/helper và quy tắc alias được giải thích trong `docs/REPORT-PRODUCT-ORDER-2026-11-12.md`. Dòng 81 thiếu tiền tố nhưng nằm trong đoạn Không viền của mẫu. Bộ sort chuẩn hóa các khác biệt nhãn đã xác định, giữ riêng biến thể HQT/330/380 và BLACK/WHITE. Chứng từ đơn và lịch sử kho theo thời gian có quy tắc riêng.

## 11. Kiểm thử nguồn và tái lập

Lượt local trước phát hành 0.1.7 đã chạy `npm.cmd run verify`, đạt 73 unit và 63 UI ngay lượt đầu, Electron smoke, TypeScript/build, production audit 0 lỗ hổng. Log `.local/report-order-verify-20261112.log`, file `.exit` bằng 0.

CI của tag 0.1.7 đã kiểm 7 test phát hành, 73 unit, 63 UI. Có 2 UI qua ở retry một lần. Packaged app audit và smoke production login đạt. Các số liệu này xác nhận source của commit phát hành. Source server-update trong commit đồng bộ 71398cc đã qua 7 unit test liên quan, kiểm thử PowerShell gồm nhánh backup thất bại và integration nâng schema 007 lên mới nhất hai lần với dữ liệu được giữ. Máy chủ khách cần được nghiệm thu tại chỗ khi cài gói server.

Lệnh tái lập theo môi trường demo cô lập

```powershell
cd E:\AppBanHang
powershell.exe -NoProfile -Command {
    $env:CI='true'
    $env:VITE_DEMO_MODE='true'
    $env:VITE_SERVER_ENV='test'
    $env:VITE_GLASS_LOOKUP_API_URL='https://oufeidun.vn/api/glass-lookup'
    $env:MYSQL_USER='ci-unused'
    $env:MYSQL_PASSWORD='ci-no-database-connection'
    $env:OUFEIDUN_SERVER_ENV=Join-Path $env:TEMP 'oufeidun-qa-no-server.env'
    $env:OUFEIDUN_DATA_DIR=Join-Path $env:TEMP 'oufeidun-qa-no-server-data'
    npm.cmd run verify
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    node --test scripts/release/release.test.cjs
    exit $LASTEXITCODE
}
```

Các biến QA ở ví dụ chỉ tồn tại trong PowerShell con và tự hết hiệu lực khi tiến trình kết thúc. Giá trị MYSQL ở ví dụ là fixture cho unit test. Test MySQL integration thực cần `server/.env.test.local`, DB/dataDir thử riêng và server dependencies. Xem đầu các file `tests/local-api.integration.cjs`, `tests/local-report.electron.cjs`, `tests/staff-permissions.integration.cjs` trước khi chạy. Kiểm UI dùng Edge, config tại `playwright.config.ts` có 2 workers trên CI và một retry. `APP_TEST_DATA` dành cho các thử nghiệm Electron cô lập.

## 12. Build installer thủ công khi cần

```powershell
cd E:\AppBanHang
powershell.exe -NoProfile -Command {
    # Dùng profile public do local-env sinh, xóa override Vite trong tiến trình con.
    Get-ChildItem Env: | Where-Object Name -Like 'VITE_*' | ForEach-Object {
        [Environment]::SetEnvironmentVariable($_.Name, $null, 'Process')
    }
    node scripts/release/ci.cjs local-env
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm.cmd run make:local
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    node scripts/audit-local-package.cjs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    node scripts/smoke-electron.cjs --packaged --production
    exit $LASTEXITCODE
}
```

Lệnh `local-env` ghi file profile public `.env.local-mysql.local`, phù hợp bộ cài dùng chung. Khối lệnh trên dùng tiến trình con và xóa override VITE_* kế thừa trước khi sinh profile. Mỗi bước dừng khi lệnh trước thất bại.

Thư mục local còn giữ sau cleanup ngày 12/11 là baseline 0.1.3 tại `out/Oufeidun-win32-x64/resources/app.asar`. Muốn gửi bộ cài mới, chạy build và audit theo khối trên. Audit kiểm version trong ASAR khớp package.json và profile LOCAL. Mốc feed 0.1.7 được xác minh độc lập ở phần 15.

Output chính là `out/Oufeidun-win32-x64/` và `out/make/squirrel.windows/x64/Oufeidun-Setup.exe`. `forge.config.cjs` dùng ASAR và Squirrel, loại thư mục source/server/tests/docs/env/private data. Windows native dependencies được đóng gói trên Windows.

`scripts/stage-customer-client.ps1` còn guard cứng version 0.2.16. `scripts/stage-customer-local.ps1` cần file `BAT-DAU-<version>.txt` tương ứng và đóng bộ server/client lớn. Đọc và điều chỉnh đúng yêu cầu nếu dùng các công cụ lịch sử này. Đường phát hành client online hiện dùng workflow ở phần sau.

## 13. GitHub Actions và phát hành khách

Workflow `.github/workflows/app-release.yml` có các hành vi đang hoạt động

| Sự kiện | Kết quả |
| --- | --- |
| Push `main` | Kiểm thử, build installer, ký thử manifest, giữ artifact |
| Pull request | Kiểm thử/build |
| `workflow_dispatch` | Kiểm thử/build/ký theo điều kiện workflow |
| Push tag `vX.Y.Z` trùng package | Kiểm thử/build/ký và publish hosting |

Job Windows `build` tối đa 35 phút. Job Ubuntu `sign-and-publish` tối đa 45 phút, environment `app-production`, concurrency `app-local-stable`, không hủy job đang chạy. `local-installer` lưu 1 ngày, `signed-local-manifest` 7 ngày, failed UI diagnostics 3 ngày.

Environment `app-production` đã được kiểm qua GitHub API ngày 12/11. Branch policy cho `main`, tag policy cho `v*`. Sáu environment Secrets hiện có

```text
APP_UPDATE_SIGNING_KEY
DEPLOY_SSH_HOST
DEPLOY_SSH_PORT
DEPLOY_SSH_USER
DEPLOY_SSH_KEY
DEPLOY_SSH_KNOWN_HOSTS
```

Quy trình phát hành tiếp theo, thay `X.Y.Z` bằng số thật cao hơn feed hiện tại

```powershell
cd E:\AppBanHang
git status --short
npm.cmd version X.Y.Z --no-git-tag-version
# Viết docs/releases/X.Y.Z.md rồi chạy kiểm thử phù hợp.
git add -- package.json package-lock.json docs/releases/X.Y.Z.md FILE_SOURCE_DA_REVIEW
git diff --cached --check
git diff --cached --stat
git commit -m 'Release LOCAL X.Y.Z'
git push origin main
# Chờ kiểm thử main đạt, sau đó tạo tag đúng commit đã review.
git tag -a vX.Y.Z -m 'Oufeidun LOCAL X.Y.Z'
git push origin vX.Y.Z
```

Người vận hành có thể push main/tag cùng commit bằng `git push --atomic origin main vX.Y.Z`. Khi đó hai workflow được tạo. Lượt 0.1.7 đã hủy riêng run main trùng SHA để tiết kiệm runner, còn tag vẫn chạy đầy đủ. Cần xác nhận đúng SHA/ref khi thao tác hủy.

GitHub UI cho xem log từng step và rerun failed jobs. Nếu runner lỗi trước lúc job ký bắt đầu, rerun failed job có thể tận dụng artifact còn hạn. Nếu artifact hết hạn, cần build lại đúng source và xác minh trước công bố. Giữ tag và bộ cài đã công bố bất biến. Khôi phục tính năng bằng version mới cao hơn khi cần.

## 14. Cơ chế cập nhật ở máy khách

`electron/update-config.json` pin HTTPS feed base và public key. Electron main dùng `AppUpdates`, renderer chỉ gọi các IPC cố định trong preload. Bản Windows đóng gói kiểm tra sau 10 giây và mỗi 12 giờ. Nút cập nhật nằm dưới cùng sidebar và có ở màn login.

Khách chọn kiểm tra, tải, rồi mở thư mục chứa installer. File nằm trong `app-updates` dưới Electron userData. Updater xác minh chữ ký, version, profile, OS/arch, URL allowlist, size và SHA256. Giao thức hiện hỗ trợ stable X.Y.Z, win32 x64, component client, `requiresServerUpdate=false`. Khách tự chạy installer và cập nhật app từng máy.

Feed là JSON envelope có `payload` dạng chuỗi và `signature` base64. Kiểm chữ ký trên đúng byte của payload trước khi dùng dữ liệu. File EXE dùng tên SHA256 bất biến. V1 tải lại từ đầu khi đứt giữa chừng. Bản portable cần hướng dẫn người dùng cách cài/chạy bộ mới phù hợp.

Bản 0.1.7 đã được thử nhận bản mới bằng core updater từ 0.1.6 và app đóng gói thật 0.1.3. Đã tải trọn bộ cài, rehash, kiểm header EXE và xác nhận 0.1.7 coi mình là current. Thử nghiệm này chưa chạy installer lên máy khách.

## 15. Bản 0.1.7 đang phục vụ

| Thuộc tính | Giá trị |
| --- | --- |
| Profile | local-mysql / stable / win32 / x64 |
| Version | 0.1.7 |
| Size | 172648448 byte |
| SHA256 | `7337d68563f303be80bf236451fa858ffb97420d34b38807b3408422791687ab` |
| Feed | `https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json` |
| Installer | `https://oufeidun.vn/app-updates/files/7337d68563f303be80bf236451fa858ffb97420d34b38807b3408422791687ab.exe` |
| GitHub run | `43146659239` |

0.1.5 đã có tag nhưng dừng ở kiểm thử và chưa phát hành. 0.1.6 đưa mẫu PNG được duyệt tới khách. 0.1.7 thêm thứ tự báo cáo. Các phiên bản 0.2.17/0.2.18 trong tài liệu cũ thuộc lịch sử trước khi người dùng chốt dãy 0.1.x.

## 16. SSH tới hosting từ Windows

| Mục | Giá trị đã xác minh |
| --- | --- |
| Nhà cung cấp | VinaHost, cPanel/CloudLinux, gói LH2 |
| SSH | `103.9.76.10`, port `22`, user `hwqrwrir` |
| Hostname cPanel | `vdc-whm-cheaphosting-1112.vinahost.org` |
| Private SSH key local | `C:\Users\duong\.ssh\oufeidun_github_deploy` |
| Public key local | Cùng tên có đuôi `.pub`, đã Authorize trong cPanel |
| Known hosts | `C:\Users\duong\.ssh\oufeidun_hosting_known_hosts` |
| Fingerprint ED25519 | `SHA256:uoQ0dMrHq3545tCeyzDqWNVRGPFZ2+u+NNDqPTkOzNU` |
| Node host | `/opt/alt/alt-nodejs22/root/usr/bin/node`, kiểm hiện tại v22.23.4 |
| Activation | `/home/hwqrwrir/nodevenv/apps/oufeidun/22/bin/activate` |

```powershell
ssh -i C:/Users/duong/.ssh/oufeidun_github_deploy -p 22 -o IdentitiesOnly=yes -o UserKnownHostsFile=C:/Users/duong/.ssh/oufeidun_hosting_known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes hwqrwrir@103.9.76.10
```

Trong shell host nếu `node` chưa có trên PATH

```bash
source /home/hwqrwrir/nodevenv/apps/oufeidun/22/bin/activate
cd /home/hwqrwrir/apps/oufeidun
node --version
```

Script bash `set -u` cần `set +u` quanh activation CloudLinux rồi bật lại. Dùng absolute Node path cũng được. Port cPanel 2083 và port SSH 22 là hai dịch vụ riêng.

Claude dùng tài khoản mới trên cùng Windows có thể tiếp tục dùng các file khóa và Git Credential Manager còn được cấp quyền. Trên máy mới cần clone repo, đăng nhập GitHub bằng cơ chế của người vận hành và chuyển key/known_hosts qua kênh riêng. Handover cung cấp đường dẫn, tên Secrets và fingerprint, không chứa credential.

## 17. Ký và upload hosting hoạt động thế nào

Private signing key Ed25519 nằm tại `C:\Users\duong\.ssh\oufeidun_update_signing.pem`, được lưu ở environment Secret `APP_UPDATE_SIGNING_KEY`. Public key ở `electron/update-config.json` và trên host `app-updates/trusted-public-key.pem`. Khóa này giữ nhận diện cập nhật cho các app đã cài.

Chứng chỉ Windows Authenticode có cấu hình riêng trong `forge.config.cjs` và `scripts/make-signed.cjs`. Workflow hiện ký manifest Ed25519. Tình trạng Authenticode thương mại của bộ cài chưa được xác nhận bằng một chứng thư riêng trong lượt handover.

Đường dẫn host

```text
/home/hwqrwrir/apps/oufeidun/.deploy-lock
/home/hwqrwrir/app-updates/
  .ci-incoming/<commit>-<run>-<attempt>/
  files/<sha256>.exe
  stable/local-mysql-win32-x64.json
  stable/production-mysql-win32-x64.json   # Chỉ có nếu profile này đã công bố
  stable/*.before-*                      # Lịch sử feed
  trusted-public-key.pem
```

CI verify artifact proof, version, commit và profile. `publish-client-update.cjs prepare` ký metadata. `scripts/release/publish.cjs` dùng SSH key tạm trên runner để upload helper, public config, signed manifest và EXE staging. `scripts/release/remote.cjs` giữ lock chung, kiểm quota đủ bộ cài cộng 256 MiB, public key, size/hash và version tăng, sau đó đưa installer vào tên hash và đổi feed atomically cuối cùng. Public probe lỗi thì phục hồi feed trước.

SSH/SCP mỗi thao tác có timeout 600 giây, riêng upload installer 1800 giây. Lượt 0.1.7 tải khoảng 165 MiB mất gần 10 phút; 0.1.8 và 0.1.9 bị ngắt ở mốc 600 giây nên từ 0.1.10 nới timeout. Nếu upload bị ngắt, xem run, staging và lock trước retry vì script giữ staging khi chưa biết trạng thái remote. Khóa deploy thuộc job đang làm việc phải được xử lý theo trạng thái thực của tiến trình.

Nếu chuẩn bị release thủ công, xem giao diện CLI thật trong `scripts/publish-client-update.cjs` và `docs/ONLINE-CLIENT-UPDATES.md`. Luồng đang vận hành mặc định là GitHub Actions.

## 18. Website và dung lượng liên quan app

Website đọc `APP_UPDATES_DIR=/home/hwqrwrir/app-updates` qua route `E:\Oufeidun_web\src\app\app-updates\[...segments]\route.ts`. Route stream installer. Hai feed được allowlist và có Cache-Control no-store. Installer hash immutable, tối đa 1 GiB. Upload qua SSH.

Quota account kiểm ngày 12/11 là 7168 MB tổng, 3543,51 MB dùng, 3624,49 MB còn. Đây là số đo thời điểm kiểm tra. Pruner nằm repo web `E:\Oufeidun_web\scripts\deploy\prune.cjs`, bảo vệ current/previous và installer hiện tại/trước đó, giữ khoảng đệm 7 ngày cho file app. Nó tự chạy sau deploy web thành công. Đợt chỉ publish app có thể cần một lượt bảo trì dung lượng riêng khi có yêu cầu.

## 19. Cập nhật server và migration

Lịch sử migration LOCAL hiện đến `013_session_lifetime.sql`. `migrate.cjs` xét bảng `schema_migrations` và có xử lý chạy lại một số DDL đã áp dụng dở. MySQL DDL có hành vi commit riêng, vì vậy phải kiểm từng migration và backup khi nâng server.

Danh sách trong `server/mysql/` giúp xác định server thiếu bước nào

| File | Nội dung chính |
| --- | --- |
| `001_schema.sql` | Schema nghiệp vụ, account, đơn, kho, audit và idempotency |
| `002_flexible_order_prices.sql` | Giá thực tế theo dòng đơn |
| `003_manual_order_code.sql` | Mã đơn do người dùng nhập |
| `004_partial_fulfillment.sql` | Lượng đã giao, bán thiếu và giao bổ sung |
| `005_order_delivery_history.sql` | Batch và item lịch sử mỗi lần giao |
| `006_order_details.sql` | Ngày đặt, phí khác và model snapshot |
| `007_sale_gift_lines.sql` | Cùng sản phẩm có các dòng loại bán/tặng/mẫu |
| `008_order_line_position.sql` | Vị trí dòng đơn |
| `009_reuse_deleted_draft_codes.sql` | Unique mã đơn đang hoạt động và tái dùng mã nháp đã xóa |
| `010_customer_placeholder_identity.sql` | Identity cho khách dùng số tạm 0 và tên |
| `011_product_sku_names.sql` | Alias/tên cũ, lịch sử đổi mã và snapshot liên quan |
| `012_staff_permissions.sql` | Quyền nhân viên, version quyền, cờ cấu hình vốn |
| `013_session_lifetime.sql` | Deadline tuyệt đối của phiên |

Gói server dùng `CAP-NHAT.bat` trong `deployment/customer/server/`. Quy trình gọi backup, giữ config/data, thay source/dependencies, migrate và kiểm health. Tồn dự kiến cần server cung cấp `draft_quantity`/capability tương ứng. Desktop updater giữ `requiresServerUpdate=false` cho các bản client độc lập.

Gói server-update 0.1.4 có script staging `scripts/stage-customer-server.ps1`, tài liệu `docs/SERVER-UPDATE-0.1.4-2026-11-04.md`, và tests được đưa vào đợt đồng bộ source. Đường dẫn ghi trong tài liệu cũ tại `E:\outputt` phải được kiểm tồn tại/hash trước sử dụng. Khi cập nhật tại cửa hàng, chọn dataDir cài thật của cửa hàng.

## 20. Vận hành máy chủ, backup và phục hồi

DataDir có thể là `E:\OufeidunServerData` ở máy phát triển. Cấu hình cài thật được phát hiện qua `server-info.json` và công cụ `existing-server.ps1`. Các mục quan trọng gồm `app/`, `config/server.env`, CA/Caddy/discovery config, `uploads/`, `backups/`, `logs/` và `tools/`.

Scheduled Tasks chính là `Oufeidun Local API`, `Oufeidun HTTPS`, `Oufeidun Backup`, và `Oufeidun Drive Backup` khi đã cài Drive. Backup daily mặc định 23 giờ, Drive retry mỗi giờ. Caddy phục vụ HTTPS LAN 443, Node 8787 và MySQL 3306 bind loopback theo cài đặt.

BAT vận hành có `KIEM-TRA-LOI.bat`, `KHOI-DONG-LAI.bat`, `SAO-LUU.bat`, `KIEM-TRA-TON-DU-KIEN.bat`, `TAO-BO-MAY-NHAN-VIEN.bat`, `CAI-BACKUP-GOOGLE-DRIVE.bat`, `BACKUP-VA-DAY-LEN-DRIVE.bat`, `KIEM-TRA-BACKUP-DRIVE.bat`. Đọc wrapper và script trước khi dùng, một số thao tác yêu cầu UAC trên máy chủ.

Backup gồm SQL, uploads nếu có, cấu hình cần thiết và `SHA256SUMS.txt`. Rclone dùng copy và check one-way với OAuth của cửa hàng, file token/settings ở dataDir ngoài repo. Backup riêng chứa thông tin nhạy cảm và cần được quản lý theo quyền của cửa hàng.

`CLEAN-DATA-GIU-ACCOUNT.bat`, gỡ/cài lại server, di chuyển dataDir và restore là các công cụ thay đổi dữ liệu lớn. Chỉ chạy khi đó là công việc được giao và đã xác định backup/đích. Khi phục hồi, xác nhận bộ backup hoàn chỉnh, dừng các thao tác ghi và kiểm trạng thái sau phục hồi. Đọc `scripts/restore-local-backup.ps1` và các runbook trước thực hiện.

## 21. Tra cứu lỗi thường gặp

| Triệu chứng | Điểm kiểm tra |
| --- | --- |
| App mới nhưng thiếu tồn dự kiến | Version/capability API, `draft_quantity`, migrations và gói server |
| Máy con không tìm server | Profile đúng cửa hàng, máy chủ bật, UDP 47631, HTTPS 443, Private network, guest isolation/VLAN |
| Mất kết nối hoặc login lại | Deadline 12h, token bị thay/thu hồi, giờ hệ thống, server health/log, sleep/network, heartbeat và phản hồi phiên cũ |
| Gần 17h bị thoát | Thu log thực theo `CHAN-DOAN-DANG-XUAT.bat`; lịch cố định 17h chưa được chứng minh |
| SKU mới nhập không chốt được | `cost_configured`, quyền và giá vốn Admin |
| Báo cáo lệch với thu tiền | Ngày đặt/đã giao/trả/phí và số thu là các chỉ tiêu khác nhau |
| PNG gửi chat mờ | Lấy PNG gốc 2400 px và đối chiếu cách ứng dụng chat nén file |
| Updater báo chưa có bản mới | Feed live, chữ ký, version lớn hơn, profile local-mysql, URL HTTPS và lỗi mạng |
| App ký/publish fail trước runner | Environment branch/tag policy, trạng thái GitHub, thời hạn artifact |
| ASAR lỗi/rỗng | Audit package và override `@electron/asar` dùng glob/minimatch phù hợp trong lockfile |
| Server login/SQL lỗi | Env/dataDir đúng, MySQL service và migrations. Bảo vệ giá trị credential khi ghi log |

## 22. Bằng chứng và giới hạn của handover

Đã đối chiếu source HEAD, working tree, workflow, branch policy/Secrets metadata, SSH fingerprint, public feed có chữ ký và GitHub run thành công. Bằng chứng phát hành nằm local trong `.local/release-017-live-evidence.json`, `.local/release-017-download-evidence.json`, `.local/release-017-ci-build.log`. Các file `.local` có thể không tồn tại trên máy clone mới, dùng GitHub và live feed để tái kiểm.

Ngày 12/11 đã kiểm tra DNS apex/www cùng về 103.9.76.10, HTTPS web/health/tra cứu/ảnh trả 200, SSH login key hoạt động. API LAN trên máy phát triển không lắng nghe cổng 8787 khi kiểm. Trạng thái máy chủ/máy con thật của khách, cài nâng cấp trên máy khách và OAuth Drive thực của cửa hàng cần kiểm tại hệ thống tương ứng khi thực hiện công việc đó.

Phát hiện liên quan website cần chuyển cho Claude phụ trách web là runtime Next trên host resolve 15.5.27 từ nodevenv, trong khi lockfile release ghi 15.5.29. Handover web có bằng chứng và lệnh chẩn đoán. Việc viết hai tài liệu này thực hiện kiểm tra đọc trạng thái và các test cô lập.

## 23. Nhật ký review tài liệu

1. Rà nguồn và trạng thái phát hành, sửa mốc phiên bản theo feed 0.1.7 và SHA thực. Bổ sung khác biệt desktop/server cùng lịch sử source server được đồng bộ sau phát hành.
2. Đối chiếu các đường build/CI/SSH/Secrets với file workflow và GitHub API. Bổ sung vị trí environment khác web, timeout upload, profile và phương pháp verify file.
3. Rà luồng nghiệp vụ, LAN, migration, backup, dữ liệu kiểm thử, giới hạn mẫu PNG và Excel. Bổ sung cảnh báo script staging lịch sử còn guard 0.2.16 và trạng thái API dev thực tế.
4. Rà liên kết/path, lệnh minh họa, thông tin nhạy cảm và tính tự chứa. Các hướng dẫn hiện trạng có mốc kiểm tra để Claude đối chiếu lại trước hành động.

5. Review sau commit và cleanup ngày 12/11 đã cập nhật main/CI, bỏ trạng thái pending cũ, cô lập biến QA/build và ghi rõ baseline đóng gói local 0.1.3.

### Tái kiểm feed có chữ ký trên máy clone mới

Chạy từ repository app bằng Node 22 trở lên. Lệnh đọc cấu hình public và dùng chính bộ kiểm chữ ký/schema của updater. Kết quả in metadata bản phát hành, thao tác tải installer được mô tả ở phần cập nhật.

```powershell
cd E:\AppBanHang
@'
const { validateEnvelope } = require('./electron/app-updates.cjs');
const config = require('./electron/update-config.json');
(async () => {
    const url = new URL('local-mysql-win32-x64.json', config.feedBaseUrl).href;
    const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('Feed HTTP ' + response.status);
    const release = validateEnvelope(await response.json(), config.publicKey, url, 'x64', 'local-mysql');
    console.log(JSON.stringify(release, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'@ | node
```

## 24. Prompt khởi động cho Claude

> Bạn đang tiếp quản Oufeidun Desktop tại E:\AppBanHang. Đọc toàn bộ docs/CLAUDE-HANDOVER-APP.md, AGENTS.md và yêu cầu mới của người dùng. Kiểm tra git status, HEAD và feed phát hành trước khi kết luận phiên bản. Source server/deployment đã đồng bộ trong 71398cc, hãy đọc diff hiện tại để giữ đúng phạm vi công việc mới. Dùng source/workflow hiện tại để xác minh các ghi chú lịch sử. Khi thay đổi app, kiểm tra theo entry point thật, chạy kiểm thử phù hợp và hoàn tất công việc đã được người dùng giao. Khi được giao phát hành, theo dõi xuyên suốt tới feed có chữ ký và lượt tải xác minh thành công.
