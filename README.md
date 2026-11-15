# Oufeidun · Phần mềm quản lý bán hàng

Ứng dụng desktop dành cho cửa hàng và hệ thống phân phối kính cường lực. Oufeidun quản lý mã kính, khách hàng, đơn bán, hàng tặng và hàng mẫu, kho, công nợ và báo cáo trong cùng một hệ thống.

| Thành phần | Phiên bản trong source | Nền tảng |
| --- | --- | --- |
| Ứng dụng máy nhân viên | **0.1.7** | Windows x64 · Electron · React · TypeScript |
| API máy chủ cửa hàng | **0.1.4** | Windows · Node.js · MySQL |
| Tra cứu và phân phối cập nhật | Website Oufeidun | HTTPS · hosting riêng |

[Hướng dẫn tài liệu](docs/README.md) · [Cài đặt máy chủ](docs/CAI-DAT-LOCAL-SERVER.md) · [Mạng LAN/Wi-Fi](docs/HUONG-DAN-TRIEN-KHAI-LAN-WIFI.md) · [Phát hành ứng dụng](docs/APP-RELEASE-CICD.md)

## Chức năng

- **Bán hàng** — đơn nháp, xác nhận, giao bổ sung, hủy, trả hàng và nhiều hình thức thanh toán.
- **Khách hàng và công nợ** — khách sỉ/lẻ, giá theo dòng đơn, lịch sử mua và thu tiền nhiều đợt.
- **Kho và danh mục** — mã kính, tên cũ, ảnh, nhập Excel, điều chỉnh tồn có lý do và tồn dự kiến từ đơn nháp.
- **Nhân viên** — tài khoản Admin/nhân viên, quyền theo từng tài khoản và nhật ký thao tác.
- **Chứng từ và báo cáo** — một ảnh PNG đơn hàng rõ nét, in/PDF, báo cáo bán hàng và nhập–xuất–tồn dạng Excel.
- **Tra cứu và cập nhật** — mã kính dùng chung từ website, kiểm tra bản mới, tải bộ cài và xác minh chữ ký/hash.

Đặc tả nghiệp vụ nằm trong [BA-SPEC.md](BA-SPEC.md). Danh sách chức năng và bằng chứng nghiệm thu nằm trong [FEATURE-CHECKLIST.md](FEATURE-CHECKLIST.md).

## Kiến trúc vận hành

```text
Ứng dụng Windows tại cửa hàng
    ├─ HTTPS LAN → Caddy → API Node.js → MySQL
    │                         Máy chủ Windows của cửa hàng
    ├─ HTTPS → oufeidun.vn/api/glass-lookup
    │                         Tra cứu mã kính và ảnh
    └─ HTTPS → oufeidun.vn/app-updates/
                              Feed có chữ ký và bộ cài
```

Dữ liệu bán hàng được lưu tại máy chủ của cửa hàng. Các máy nhân viên gọi API qua HTTPS LAN. MySQL cổng 3306 và API cổng 8787 nghe trên loopback. Caddy phục vụ HTTPS cổng 443 cho mạng nội bộ. Khám phá máy chủ dùng UDP 47631 và nhận diện có chữ ký.

Máy nhân viên cần cấu hình nhận diện công khai của đúng cửa hàng. Máy chủ xuất bộ máy nhân viên sau cài đặt. Các bước kết nối, chứng chỉ và giới hạn mạng được mô tả trong [hướng dẫn LAN/Wi-Fi](docs/HUONG-DAN-TRIEN-KHAI-LAN-WIFI.md).

## Chạy source trên máy phát triển

### Yêu cầu

- Windows 10/11 x64 để chạy và đóng gói Electron Windows.
- Node.js **22** và npm. CI hiện dùng Node.js 22 trên Windows.
- Git và quyền truy cập repository.
- Microsoft Edge để chạy kiểm thử giao diện Playwright hiện tại.
- MySQL khi phát triển/kiểm thử API LOCAL. Chế độ demo dùng dữ liệu thử PGlite.

Từ PowerShell, clone và cài dependency đúng lockfile.

```powershell
git clone https://github.com/duongnhan28/oufeidun_app.git
cd oufeidun_app
npm.cmd ci
npm.cmd ci --prefix server
```

### Mở giao diện với dữ liệu demo

Chạy trong một PowerShell riêng cho demo.

```powershell
$env:VITE_DEMO_MODE='true'
$env:VITE_SERVER_ENV='test'
$env:VITE_GLASS_LOOKUP_API_URL='https://oufeidun.vn/api/glass-lookup'
npm.cmd run dev
```

Mở `http://127.0.0.1:5178`. Cấu hình demo được đặt trong tiến trình PowerShell hiện tại. Đóng cửa sổ này sau khi thử, rồi dùng cửa sổ mới cho build LOCAL.

### Kết nối API LOCAL khi phát triển

Tạo file public profile từ mẫu và điền URL máy chủ thử nghiệm.

```powershell
Copy-Item .env.local-mysql.example .env.local-mysql.local
npm.cmd run build:local
```

Mẫu LOCAL dùng `http://127.0.0.1:8787/api/app/v1` để thử ngay tại máy phát triển. Bộ cài dùng chung cho cửa hàng sử dụng HTTPS LAN theo phần build bên dưới.

Để chạy API từ source, tạo `server/.env.local` theo mẫu, cấu hình MySQL và thư mục dữ liệu dành cho phát triển rồi khởi động API.

```powershell
Copy-Item server/.env.example server/.env.local
# Điền thông tin MySQL, mật khẩu admin và thư mục dữ liệu thử trong server/.env.local.
npm.cmd run server:start
```

API áp dụng migration khi khởi động. Dùng database thử riêng khi phát triển. Quy trình cài máy chủ cửa hàng nằm trong [hướng dẫn cài đặt](docs/CAI-DAT-LOCAL-SERVER.md) và `deployment/customer/server/`. Mật khẩu, dữ liệu và cấu hình cửa hàng được chuyển giao qua kênh riêng.

## Kiểm thử

`npm.cmd run verify` chạy unit, UI, Electron smoke, TypeScript/build và audit dependency production. Khối dưới dùng PowerShell con để cấu hình QA tự hết hiệu lực sau kiểm thử.

```powershell
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
    exit $LASTEXITCODE
}
```

Thông tin MYSQL trong ví dụ là fixture của unit test. Kiểm thử MySQL integration cần database và thư mục dữ liệu thử riêng. Đọc cấu hình ở đầu các file `tests/*.integration.cjs` trước khi chạy.

| Lệnh | Mục đích |
| --- | --- |
| `npm.cmd test` | Kiểm thử nghiệp vụ và helper |
| `npm.cmd run test:ui` | Luồng giao diện trên Edge |
| `npm.cmd run test:electron` | Build test và smoke Electron |
| `npm.cmd run server:test` | Unit test API LOCAL |
| `npm.cmd run server:test:integration` | Integration MySQL với cấu hình QA |
| `node --test scripts/release/release.test.cjs` | Quy tắc phát hành, chữ ký và upload |

## Build bộ cài Windows LOCAL

Chạy từ thư mục repository. Lệnh sinh profile public chuẩn, build bộ cài, kiểm gói và chạy smoke trên app đã đóng gói.

```powershell
powershell.exe -NoProfile -Command {
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

| Kết quả | Đường dẫn |
| --- | --- |
| Ứng dụng đã đóng gói | `out/Oufeidun-win32-x64/` |
| Bộ cài Windows | `out/make/squirrel.windows/x64/Oufeidun-Setup.exe` |
| Cấu hình public thực tế của bundle | `dist/server-config.json` |

`npm.cmd run build` tạo bundle web để kiểm tra source. `npm.cmd run make:local` tạo bộ cài Windows theo profile LOCAL. Kiểm version/profile bằng audit trước khi gửi khách, vì thư mục output có thể chứa lần build cũ.

Source còn hỗ trợ hai profile tương thích lịch sử. Chọn theo môi trường cần duy trì.

| Profile | File cấu hình riêng | Build / đóng gói |
| --- | --- | --- |
| **LOCAL đang triển khai** | `.env.local-mysql.local` | `build:local` / `make:local` |
| TEST Supabase | `.env.test-supabase.local` | `build:test` / `make:test` |
| PRODUCTION API hosting | `.env.production-mysql.local` | `build:production` / `make:production` |

Các biến `VITE_*` được đưa vào client và phải là thông tin công khai. Biến môi trường của process có thể ghi đè file profile.

## Phát hành và cập nhật

Workflow [app-release.yml](.github/workflows/app-release.yml) kiểm thử và build khi push `main`, mở pull request hoặc chạy thủ công. Main có thêm bước kiểm ký manifest. Push tag `vX.Y.Z` trùng `package.json` sẽ công bố bản mới lên hosting sau khi kiểm thử thành công.

Mỗi bản phát hành cần version cao hơn feed hiện tại, release notes trong `docs/releases/`, CI đạt và tag đúng commit trên main. Quy trình chi tiết, GitHub Secrets và xác minh sau upload nằm trong [hướng dẫn CI/CD](docs/APP-RELEASE-CICD.md).

Ứng dụng kiểm tra feed sau khi mở và theo lịch, người dùng bấm tải rồi cài bản mới. Updater xác minh chữ ký Ed25519, kích thước và SHA256. Khóa ký cập nhật cần được bàn giao cùng quyền quản lý phát hành. Chứng chỉ Windows Authenticode có quy trình và khóa riêng. [Cơ chế cập nhật ứng dụng](docs/ONLINE-CLIENT-UPDATES.md).

API máy chủ có version riêng. Khi thay schema hoặc API, chuẩn bị gói server, backup, cập nhật máy chủ và kiểm tra tương thích trước khi phát hành client phụ thuộc thay đổi đó. Hướng dẫn hiện tại nằm tại [gói cập nhật server 0.1.4](docs/SERVER-UPDATE-0.1.4-2026-11-04.md).

## Cấu trúc source

| Thư mục / file | Nội dung |
| --- | --- |
| `src/` | React UI, data adapter, nghiệp vụ client và xuất chứng từ |
| `electron/` | Main/preload, kết nối LAN, IPC và updater |
| `server/src/` | API, xác thực, phân quyền và transaction MySQL |
| `server/mysql/` | Migration schema LOCAL, chạy theo thứ tự |
| `deployment/customer/` | Mẫu cài đặt, cập nhật, backup và quản trị cửa hàng |
| `deployment/relocate/` | Công cụ chuyển máy chủ |
| `scripts/` | Build, kiểm gói, vận hành và phát hành |
| `tests/` | Unit, UI, integration và fixture |
| `supabase/` | Migration và adapter backend tương thích lịch sử |
| `docs/` | Hướng dẫn vận hành và tài liệu kỹ thuật |
| `docs/archive/` | Kế hoạch, ghi nhận và báo cáo phát hành lịch sử |
| `docs/releases/` | Nội dung thông báo theo version dùng khi phát hành |
| `BA-SPEC.md` | Đặc tả nghiệp vụ |
| `FEATURE-CHECKLIST.md` | Danh sách chức năng và nhật ký nghiệm thu |

## Nhận bàn giao source

1. Clone repository, kiểm tra branch/commit và cài dependency bằng lockfile.
2. Chạy demo và `verify` trên máy phát triển.
3. Nhận cấu hình cửa hàng, dữ liệu/backup và quyền truy cập cần thiết qua kênh riêng. Kiểm tra phục hồi trên môi trường thử trước khi vận hành.
4. Nhận quyền repository/CI, hosting phục vụ cập nhật, khóa ký Ed25519 và chứng chỉ ký Windows nếu có. Đối chiếu public key đang đóng gói trước khi phát hành tiếp.
5. Cài thử mô hình máy chủ/máy nhân viên, kiểm tra login, đơn, kho, Excel/PNG, backup và tải cập nhật.

Repository chứa source và cấu hình mẫu. Các file `.env.local`, `server.env`, khóa riêng, dữ liệu MySQL, backup, `node_modules`, `dist`, `out` và bộ cài được quản lý bên ngoài Git theo `.gitignore`.

Bản ghi kỹ thuật chi tiết có mốc kiểm tra và các vấn đề cần theo dõi nằm trong [tài liệu bàn giao kỹ thuật](docs/CLAUDE-HANDOVER-APP.md). Tài liệu trong `docs/archive/` giữ ngữ cảnh tại ngày viết. Dùng source, package, workflow và hướng dẫn hiện tại để xác định cách chạy/phát hành.
