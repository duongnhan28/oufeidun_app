# Bàn giao ngữ cảnh Codex — Oufeidun

Cập nhật ngày **17/10/2026**, múi giờ **Asia/Saigon**. Chủ dự án đang đổi tài khoản Codex. File này tổng hợp quyết định nghiệp vụ, source, bộ bàn giao và bằng chứng kiểm thử để AI mới tiếp tục trên cùng máy. Đây không phải bản sao source hoặc database.

## 1. Prompt dùng ngay trong tài khoản Codex mới

Sao chép đoạn sau vào cuộc trò chuyện mới, hoặc đính kèm chính file Markdown này:

```text
Tôi tiếp tục dự án Oufeidun từ tài khoản Codex cũ.
Hãy đọc toàn bộ docs/CODEX-HANDOFF.md trong repo app (hoặc file bàn giao đính kèm) trước.

Source app desktop thực tế là E:\AppBanHang.
E:\mhpGroup là website khác trong cùng workspace, không được nhầm hai dự án.

Sau đó đọc E:\AppBanHang\AGENTS.md, BA-SPEC.md và FEATURE-CHECKLIST.md,
ưu tiên các quyết định ngày 17/10/2026 và nhật ký bản final LOCAL 0.2.17.
Đối chiếu read-only package.json, mã nguồn liên quan, git status, log kiểm thử
và bộ bàn giao hiện có. Không in nội dung file env, mật khẩu, token hoặc khóa riêng.

Bản final 0.2.17 đã build, kiểm thử và cập nhật cả folder lẫn ZIP ngày 17/10.
Nhân viên có quyền nghiệp vụ như Admin, kể cả giá chung, trả/đổi/hủy và quản lý;
hai ngoại lệ là không nhập hàng và không xem/sửa giá vốn, giá nhập.
Staff không được chiếm quyền tài khoản Admin để vượt giới hạn giá vốn.

Không reset Git, không xóa dữ liệu, không tự chạy clean-data, seed, restore,
migration production hoặc build lại khi chưa có yêu cầu công việc mới.
Không dùng database khách để chạy integration test.

Hãy trả lời ngắn gọn rằng bạn đã hiểu source, bản final, phân quyền, dữ liệu
và các giới hạn kiểm thử. Nếu file hoặc log không còn tồn tại thì nói rõ;
không được giả định đã đọc hoặc đã test. Sau đó tiếp tục theo yêu cầu mới của tôi.
```

Nếu đổi cả máy tính: cần chuyển source đang làm dở, tài liệu và bộ bàn giao; một file Markdown không tự mang theo source, ảnh, config, DB hay lịch sử chat. Cấu hình bí mật chuyển riêng bằng cách an toàn. Đổi tài khoản trên cùng máy cũng không đảm bảo cuộc trò chuyện cũ tự xuất hiện: hãy mở đúng workspace và đưa file này cho AI đọc.

## 2. Đường dẫn cần phân biệt

| Nội dung | Đường dẫn trên máy phát triển |
| --- | --- |
| Source app bán hàng Electron/React | `E:\AppBanHang` |
| Source website Oufeidun/tra cứu | `E:\mhpGroup` |
| Workspace nhiều folder | `E:\AppBanHang\mhpGroup.code-workspace` |
| Folder bộ LOCAL final | `E:\outputt\Oufeidun-Local-0.2.17` |
| ZIP final gửi khách | `E:\outputt\Oufeidun-Local-0.2.17.zip` |
| Installer trong bộ | `02-MAY-CLIENT\Oufeidun-Setup.exe` |
| App portable trong bộ | `02-MAY-CLIENT\App` |
| API/scripts máy chủ trong bộ | `01-MAY-CHU` |
| Đặc tả và checklist chính | `E:\AppBanHang\BA-SPEC.md`, `FEATURE-CHECKLIST.md`, `AGENTS.md` |
| Log/helper kiểm thử local | `E:\AppBanHang\.local` — phần lớn bị Git ignore |

Các đường dẫn trên là vị trí hiện tại trên máy phát triển, **không phải đường dẫn được phép hardcode vào phần mềm khách**. Source triển khai phải tìm thư mục theo vị trí script/config thực tế. BAT dùng thư mục của chính nó; script nằm cùng bộ thì gọi tương đối.

Trước đợt push ngày 17/10, Git có nhiều file modified/untracked từ nhiều đợt phát triển; source final được gom vào repo `duongnhan28/oufeidun_app`, nhánh `main`, cùng file `docs/CODEX-HANDOFF.md` này. Khi tiếp tục hãy kiểm tra lại `git status` và lịch sử commit: không mặc định HEAD luôn chứa các thay đổi phát sinh sau lần push. Không `reset --hard`, `clean -fd`, checkout đè hoặc bỏ file untracked để “làm sạch”. File báo giá Word tại `docs/bao-gia/` được giữ local, không nằm trong commit source final. Config thật, dữ liệu, `.local` và bộ cài/ZIP cũng không được đưa lên Git; cần giữ riêng khi chuyển máy.

## 3. Trạng thái mới nhất và bộ final đã giao

Yêu cầu chức năng gần nhất đã hoàn tất: mở quyền nhân viên và build bản final **0.2.17**, vẫn giữ số phiên bản/folder đang dùng theo ngữ cảnh yêu cầu khách. Vì có nhiều lần build cùng version, **chỉ nhìn số 0.2.17 không đủ xác định nội dung**; dùng ngày, hash và nhật ký.

| File | Kích thước | SHA256 |
| --- | ---: | --- |
| `E:\outputt\Oufeidun-Local-0.2.17.zip` | 373.875.149 byte | `3538EEACD031D61CBF2E454DA2CC2DB514AF2D54C53EB7470D19E2588BA43158` |
| `02-MAY-CLIENT\Oufeidun-Setup.exe` trong folder final | 174.963.200 byte | `6EB61470A1FBA3FE5A7DAA25E4B1F009BCDAAEE9578A8F6898724548416AA244` |

- Folder, từng entry ZIP, server source/migrations, installer và asar đã được đối chiếu **1.153 checksum file**; PowerShell parse và kiểm tra loại cấu hình bí mật đạt.
- Bản folder trước khi cập nhật được giữ tại `E:\outputt\_BACKUP\Oufeidun-0.2.17-before-final-permissions-20261017-122211`.
- ZIP trước được giữ tại `E:\outputt\_BACKUP\Oufeidun-Local-0.2.17-before-final-zip-20261017-122252.zip`.
- Hướng dẫn nguồn: `deployment/customer/BAT-DAU-0.2.17.txt`. Ba bản trong bundle là `BAT-DAU-O-DAY.txt`, `01-MAY-CHU/HUONG-DAN.txt`, `02-MAY-CLIENT/HUONG-DAN.txt`, cùng hash với nguồn lúc bàn giao.
- Bản cũ ngày 16/10 có ZIP hash `2E7D880B9E736712BA4AE8F03EA3D73FBA874DCF28F2A4C589934C98E901AFD0`; đó **không phải** bản final quyền mới ngày 17/10.
- Không còn phần code/build/ZIP của yêu cầu cuối đang làm dở. Chưa có yêu cầu tính năng tiếp theo tại thời điểm viết file này.
- Build, source test và bộ gửi khách đều đã có sửa mới; không nhầm với mốc trước đó chỉ sửa source nhưng chưa ghi đè ZIP.

## 4. Phân quyền đã được người dùng chốt

“Giá bán gốc” trong trao đổi phân quyền đã được xác nhận là **giá vốn/giá nhập**, không phải giá lẻ niêm yết. Quyền gắn với tài khoản Admin/staff, không gắn riêng với IP hoặc máy chủ/máy con.

| Chức năng trong bản LOCAL final | Nhân viên |
| --- | --- |
| Tạo đơn, lưu/mở/xóa nháp, xác nhận bán | Được |
| Xem và xử lý đơn/nháp do Admin hoặc nhân viên khác tạo | Được |
| Sửa ngày đặt, thu tiền, giao bổ sung, xử lý ghi chú thiếu | Được theo điều kiện nghiệp vụ |
| Trả hàng, tạo đơn đổi liên kết, hủy đơn bán | Được theo điều kiện nghiệp vụ |
| Sửa giá thực tế trong đơn | Được |
| Lưu giá lẻ/sỉ chung theo nhóm cho đơn sau và mọi máy | Được |
| Quản lý sản phẩm, thương hiệu, khách hàng | Được |
| Xem báo cáo, lịch sử; xuất ảnh, Excel, PDF | Được, đã loại dữ liệu vốn |
| Quản lý tài khoản nhân viên khác | Được |
| Nhập hàng, nhập Excel danh mục/kho, tồn đầu kỳ | **Không được** |
| Xem hoặc sửa giá vốn/giá nhập | **Không được** |
| Xem lợi nhuận, tổng vốn, giá trị tồn/thiệt hại tính theo vốn | **Không được**, tránh suy ngược giá vốn |
| Đặt lại mật khẩu, khóa/xóa Admin; tự nâng vai trò | **Không được**, bảo vệ giới hạn vốn |

Nhân viên vẫn được xuất kho, ghi nhận hàng lỗi, điều chỉnh tồn và nhập lại hàng trả theo nghiệp vụ hiện có. Không tự mở rộng “không nhập hàng” thành cấm các thao tác này.

Staff sửa mã cũ/bảng giá phải giữ nguyên giá vốn. Staff tạo mã mới có tồn 0, giá vốn nội bộ mặc định 0; không có ô nhập vốn hay số lượng ban đầu. Admin cần bổ sung vốn trước khi nhập/bán. Quyền được kiểm tra ở API, không chỉ giấu nút. Giữ role thật là `staff`, không giả làm Admin để mở chức năng.

Quy tắc cũ “staff chỉ sửa đơn mình”, “staff không được sửa danh mục/giá chung”, “không có báo cáo/nhân viên/lịch sử” đã bị thay thế trong **LOCAL final 17/10**. Các dòng nhật ký cũ mô tả đúng bản lịch sử, không phải chính sách hiện tại.

## 5. Các yêu cầu nghiệp vụ phải giữ

### Sản phẩm, kính, phụ kiện và tìm kiếm

- App quản lý cả kính và phụ kiện. Kính dùng đơn vị **tấm**, phụ kiện dùng **sản phẩm**; không quy đổi hộp. Ví dụ “10 hộp tặng 1” chỉ là ví dụ, không có khuyến mại tỷ lệ tự động.
- UI và chứng từ dùng **mã kính/SKU**, đã bỏ nhập/hiển thị tên sản phẩm ở các luồng được cập nhật. Vẫn giữ tên nội bộ/snapshot cũ trong DB để đối chiếu, không xóa lịch sử.
- Hãng điện thoại có thể chọn hãng có sẵn hoặc gõ thêm, hỗ trợ Android. Yêu cầu “chỉ Apple” trước đó đã bị thay thế.
- Tên phân loại: `clear` = Full viền; `privacy` = Chống nhìn trộm; `matte` = Full viền cao cấp; `other` = Phụ kiện khác; `premium_borderless` giữ Không viền cao cấp cũ.
- `full_border` và `clear` được nhận cùng nhóm khi lọc/tìm kiếm/đổi giá. Đã sửa lỗi có hàng nhưng chọn Full viền/Kính trong không hiện và lỗi trùng hai lựa chọn Full viền.
- Full viền cao cấp đã bỏ khỏi **bộ lọc tìm kiếm**, không xóa phân loại/dữ liệu cũ; vẫn xem qua Tất cả và giữ hỗ trợ form/import.
- Kho có nhóm Tất cả/Kính/Phụ kiện, số mã/tổng tồn/tồn từng nhóm/sắp hết theo bộ lọc. “Hãng kính” trên các phần được cập nhật đổi nhãn thành “Thương hiệu”.
- Tìm theo SKU và model máy dùng chung; ảnh sản phẩm có xem phóng lớn/tải.
- Tìm khách bằng tên không dấu/SĐT trên toàn danh sách đang hoạt động, chỉ hiện tối đa **3 gợi ý**, không giới hạn việc tìm ở ba khách đầu tiên.
- Nhân viên chọn được mọi Sales đang hoạt động; Sales phụ trách độc lập người thực hiện thao tác.

### Excel danh mục/nhập hàng — chỉ Admin

Mẫu mới gồm: **Mã kính; Loại kính; Hãng điện thoại; Hãng kính; Giá bán (đ); Giá sỉ mặc định (đ); Giá vốn cố định (đ); Mã/dòng máy dùng chung; Số lượng**. Giữ tương thích tiêu đề cũ.

- Máy dùng chung có thể cách bằng dấu phẩy hoặc dòng theo parser đã có; không tách mù dấu `/` nằm trong tên model.
- Số lượng là **nhập thêm**, không phải ghi đè tồn; 0 chỉ cập nhật danh mục. Hỗ trợ số nguyên 0–1.000.000 theo validation hiện tại.
- Mẫu tám cột cũ không cộng tồn; mẫu ba cột Mã kính/Số lượng/Giá nhập vẫn dùng được.
- Mã chưa tồn tại tự được tạo trong cùng transaction; mã cũ không được tự mất giá/thông tin ngoài phạm vi import. Chặn trùng/sai/archived và rollback toàn bộ khi một dòng lỗi.
- Retry cùng idempotency key không được cộng kho lần hai.
- Giá mua một lần nhập không tự thay giá vốn cố định. Với import danh mục có số lượng, không suy ra giá mua thực tế từ giá vốn; snapshot vốn và giá mua là hai trường khác nhau.

### Đơn hàng, hàng tặng/mẫu và thứ tự

- Một SKU có thể có ba dòng độc lập: sale/gift/sample. Tặng/mẫu giá 0 vẫn trừ tồn. Phân bổ tồn/giao/trả theo ID dòng; tổng tồn dùng chung SKU.
- Quy tắc **chốt ngày 16/10**, thay cách sắp cũ: giữ thứ tự chọn giữa hàng bán; tặng cùng mã ngay dưới bán; tặng không có dòng bán sau mọi nhóm bán–tặng; **tất cả hàng mẫu cuối cùng**.
- Ví dụ: IP12 bán → IP12 tặng → IP15 bán → Samsung A55 tặng riêng → toàn bộ hàng mẫu.
- Dùng cùng quy tắc ở giỏ, lưu/mở nháp, chi tiết, giao/trả, PNG, Excel và PDF. Không sắp alphabet thay thứ tự click, không mutate mảng gốc dùng phân bổ tồn.
- DB lưu `line_position` để giữ thứ tự; bản hiển thị tạo mảng mới. Không viết lại ID/giá/số lượng/lịch sử đơn cũ.
- Chi tiết nháp có **Xác nhận bán** trực tiếp, không ép mở vào giỏ và không làm mất giỏ khác đang nhập. Nháp chính đang sửa chưa lưu phải lưu trước khi chốt.
- Hủy hộp thoại lưu Excel/PNG của Windows là Cancel bình thường, không báo lỗi hoặc giả báo tải thành công.

### Giao thiếu, tiền, ngày và chứng từ

- Đơn thiếu vẫn bán được; chỉ số thực giao trừ kho và tính tiền sản phẩm. Không trừ vượt tồn hoặc cho giao vượt lượng đặt.
- Lưu đặt/đã giao/còn thiếu, ghi chú thiếu, số lần và lịch sử từng đợt giao.
- Thiếu số lượng thực tự hoàn tất khi giao đủ. Nếu các dòng đủ nhưng còn ghi chú thiếu thủ công, giữ ghi chú đến khi người dùng xác nhận đã xử lý; không tự biến thành Đủ hàng.
- Giao bổ sung có thể thu tiền trong cùng thao tác; không tự xem giao là đã thanh toán. Tiền thu tối đa số còn phải thu, mặc định 0 theo nghiệp vụ đã chốt.
- Tổng đơn = tiền sản phẩm theo trạng thái giao + **chi phí khác**. Phí cộng một lần, không cộng lặp khi giao bổ sung; có nội dung phí, công nợ gồm phí.
- Ngày giờ đặt tự nhập/sửa theo giờ Việt Nam qua `ordered_at`; danh sách/lọc/chứng từ dùng ngày đặt. Không hồi tố thời gian thao tác thực `created_at`, `confirmed_at`, giao/thu/hoàn hoặc kỳ báo cáo.
- PNG/Excel/PDF có SKU, máy dùng chung, ghi chú dòng/đơn, ngày đặt, chi phí khác và tổng tiền. Nháp cũng có xem/tải ảnh xác nhận, không trừ kho khi xuất.
- Giá chung lẻ/sỉ chỉ cập nhật mức được chọn, giữ vốn/mức giá còn lại/giá riêng khách/đơn đã bán. Giá riêng khách sỉ vẫn được ưu tiên ở đơn mới; tặng/mẫu giữ 0.
- Danh mục và danh sách đơn tự tải lại khoảng 10 giây khi màn tương ứng đang hiển thị, giữ giỏ/modal đang thao tác; không tự replay giao dịch sau lỗi mạng.
- Trả/hủy không vượt số thực giao, hoàn kho theo số bán lại được. Lịch sử trả có **Tạo đơn đổi**; gọi lại mở đơn liên kết đã có, không tạo trùng. Trước khi mở nếu giỏ chưa lưu thì dùng luồng lưu/bỏ thay đổi.
- Trang lịch sử chỉ hiển thị bán hàng/giao bổ sung và nhập hàng/tồn ban đầu; các log khác vẫn lưu DB, không trả audit có vốn cho staff.

## 6. Kiến trúc và bản đồ source

App LOCAL: **Electron + React + TypeScript/Vite**, Node API CommonJS, MySQL, HTTPS LAN qua Caddy. App không kết nối MySQL trực tiếp. Có backend demo PGlite và mã hỗ trợ Supabase/hosting khác; không nhầm profile khi phát hành.

| File/thư mục trong `E:\AppBanHang` | Vai trò |
| --- | --- |
| `src/App.tsx` | Form, giỏ, đơn/nháp, trả/đổi, trang quản trị, `canOperate` và `canSeeCosts` |
| `src/types.ts` | Kiểu dữ liệu, trạng thái, tiền và ngày |
| `src/data/client.ts` | Chọn backend, API/RPC, `sharedOperations` bật cho LOCAL API và demo |
| `src/data/demo.ts`, `demo-*.sql` | PGlite, seed mẫu, các migration demo; quyền mới áp dụng cuối bằng `demo-shared-operations.sql` |
| `src/lib/catalog.ts` | Nhóm loại kính, đơn vị, dòng bán/tặng/mẫu, tồn/phân bổ giao |
| `src/lib/order-item-order.ts` | Quy tắc hiển thị thứ tự bán–tặng–mẫu |
| `src/lib/order-date.ts`, `order-image.ts` | Ngày đặt và ảnh chứng từ |
| `src/lib/excel.ts`, `product-excel.ts`, `download.ts` | Đọc/xuất Excel, import danh mục, lưu file/Cancel |
| `src/lib/report-sheets.ts`, `src/components/SalesReportTable.tsx` | Báo cáo có lọc vốn/lợi nhuận theo quyền |
| `server/src/index.cjs`, `auth.cjs`, `core.cjs` | API, xác thực/phiên, DB/transaction/hàm chung |
| `server/src/permissions.cjs` | Operator admin/staff, lọc dữ liệu vốn, chặn staff ghi vốn |
| `server/src/mutations.cjs` | Đơn/kho/sản phẩm/đổi hàng; khóa đơn, version, idempotency; chặn staff nhập |
| `server/src/services.cjs` | Khách, thanh toán/thông tin đơn, giá chung, tài khoản staff |
| `server/src/workspace.cjs`, `reports.cjs` | Đọc chung đơn/trang quản lý, lọc dữ liệu vốn |
| `server/src/import-products.cjs`, `images.cjs` | Import Admin, ảnh sản phẩm |
| `server/mysql/001_*.sql` đến `008_*.sql`, `server/src/migrate.cjs` | Schema/migration LOCAL |
| `electron/main.cjs`, `preload.cjs`, `lan-connection.cjs` | IPC an toàn, file, kết nối/discovery có chữ ký |
| `deployment/customer`, `scripts/stage-customer-local.ps1` | BAT/PowerShell cài/cập nhật, hướng dẫn, gom bộ giao |
| `deployment/relocate` | Công cụ gom thư mục bằng copy/verify/recovery |
| `supabase/migrations` | Lịch sử PostgreSQL/Supabase; không tự áp dụng online |

MySQL migrations hiện có: 001 schema, 002 giá linh hoạt, 003 mã đơn, 004 giao thiếu, 005 lịch sử giao, 006 ngày/phí/ghi chú, 007 sale/gift/sample, 008 vị trí dòng. **Phân quyền final 17/10 không cần bảng/cột/migration MySQL mới**. Cửa hàng thiếu 007/008 vẫn phải chạy cập nhật bộ tổng hợp.

Quyền mới đã làm cho LOCAL và demo. Supabase online **chưa** được nâng RPC theo chính sách mới; không khẳng định các profile ngang quyền. Các test migration cũ có thể cố tình kiểm tra quyền cũ của schema cũ; không xóa các test đó hoặc đổi tất cả `requireAdmin` thành cho phép để làm test qua.

## 7. Kiểm thử đã thực hiện và giới hạn

Đây là kết quả của bản final, không thay thế việc chạy lại sau thay đổi source tiếp theo:

| Kiểm tra | Kết quả/bằng chứng trong `.local` |
| --- | --- |
| `npm.cmd run verify` | Exit 0; 42 data, 47 UI, Electron demo, TypeScript/build, audit 0 lỗ hổng; `verify-final-permissions-20261017.log/.exit` |
| Server syntax/unit | Đạt, 6/6 unit |
| MySQL API integration thật, DB test cô lập | Đạt, không skip; `final-permissions-mysql.log/.exit` |
| Build LOCAL/maker-squirrel/package audit | Đạt; `build-final-permissions-20261017.log/.exit` |
| EXE staff + HTTPS/discovery/MySQL | Đạt; `packaged-final-permissions-staff.log/.exit` |
| EXE Admin hồi quy | Đạt; `packaged-final-permissions-admin.log/.exit` |
| Installer cài đè cùng 0.2.17 | Exit 0, installed `app.asar` khớp package; `installer-final-permissions-20261017.log/.exit` |
| Folder/ZIP/checksum | Đạt; `stage-final-permissions-20261017.log/.exit`, `zip-final-permissions-20261017.log/.exit` |

Test mới quan trọng: `tests/shared-operations.test.ts`, `tests/ui/shared-operations.spec.ts`, `tests/ui/staff-final-permissions.spec.ts`, `tests/local-api.integration.cjs`. Có kiểm tra giá chung tồn tại sau bỏ giỏ chưa lưu/đổi tài khoản, giữ vốn, xử lý đơn Admin, đổi hàng không trùng, chặn nhập và chiếm quyền Admin, báo cáo/Excel không lộ vốn.

Helper kiểm thử `.local/smoke-shared-operations.cjs --packaged` dùng DB test/APP_TEST_DATA riêng; `.local/smoke-017-gift-pairing-20261016.cjs --packaged` dùng cho Admin hồi quy. **Nhánh staff của helper cũ còn kỳ vọng chỉ đọc, đã lỗi thời cho quyền mới; không dùng nguyên nhánh đó để kết luận app sai.**

Một `Simulated connection failure` trong log Admin là lỗi mạng cố ý để thử giữ modal/giỏ rồi retry; cả test cuối exit 0. Một test UI đầu thiếu bấm Bỏ thay đổi khi logout giỏ chưa lưu; đã sửa test theo hành vi đúng và chạy lại toàn bộ đạt. Không tắt guard để “làm test xanh”.

Giới hạn: đã test local, nhiều phiên, HTTPS/discovery và MySQL cô lập; **chưa nghiệm thu hai máy vật lý/router/Wi-Fi/UAC/reboot tại cửa hàng**. Installer chưa ký Authenticode thương mại. Không hứa đã kiểm tra trên máy khách khi chỉ có bằng chứng local.

## 8. Cách phát triển và build tiếp

Đọc `AGENTS.md`, `BA-SPEC.md`, toàn bộ `FEATURE-CHECKLIST.md` trước sửa. Sau sửa đối chiếu ID, cập nhật nhật ký, chạy verify trước nói hoàn tất/bàn giao. Cẩn thận README và phần lịch sử có các mốc 0.2.13/0.2.14 và chính sách cũ: quyết định 17/10 và source hiện tại ưu tiên cho bản LOCAL này.

```powershell
Set-Location E:\AppBanHang
npm.cmd run verify
npm.cmd run server:check
npm.cmd run server:test
npm.cmd run server:test:integration
```

**Integration có thao tác TRUNCATE/dọn dữ liệu test.** Chỉ chạy sau khi xác minh config `server/.env.test.local` là DB test cô lập; không thay trỏ sang DB khách. Nếu thiếu config, test có thể skip — skip không phải pass trên MySQL thật.

Khi thực sự có yêu cầu build LOCAL sau kiểm thử:

```powershell
npm.cmd run build:local
npx.cmd electron-forge make --targets '@electron-forge/maker-squirrel'
node scripts/audit-local-package.cjs
```

- `npm.cmd run verify` có thể để `dist` ở profile mặc định/demo; **phải build:local lại trước đóng gói LOCAL**.
- `npm.cmd run build` đơn thuần không tạo EXE và không chứng minh profile LOCAL đúng.
- `make:local` còn gọi maker ZIP của Forge; nếu muốn chỉ installer thì dùng target maker-squirrel như trên, ZIP bộ khách tạo riêng sau.
- Profile LOCAL là `local-mysql`/backend API; TEST/Supabase và PRODUCTION hosting là profile khác. Không lấy cấu hình test thay production.
- Rà thư mục package, kiểm thử EXE cả hai role + API mới, installer cài đè, hash, rồi stage và nén; không chỉ test React rồi nói EXE đã đạt.
- PowerShell có thể chặn chạy script trực tiếp. Các helper đã dùng `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ...` cho script local được kiểm tra; không sửa policy toàn máy chỉ để build.
- Python hiện không sẵn qua lệnh thông thường trong phiên trước; dùng Node/PowerShell theo tool đang có. Kiểm tra lại môi trường nếu cần.

Helper phát hành lần cuối nằm trong `.local`: `stage-final-permissions-20261017.ps1`, `zip-017-shared-orders.ps1`, `audit-017-product-units-folder.ps1`, `audit-release-bundle.ps1`, `test-release-installer.ps1`. Đây là helper máy phát triển, không phải bộ BAT cho khách. Không chạy lại mù: kiểm tra đường dẫn, backup duy nhất, đầu ra, file `.exit` có đúng lượt chạy mới không. Không kiểm audit trong khi stage còn đang copy.

## 9. Dữ liệu và triển khai ở khách

Khách đã nhập dữ liệu thật từ 0.2.15. Cập nhật phải giữ DB, account, đơn, tồn, ảnh, config, CA và discovery. Không chạy seed/clean/reset để nâng phiên bản.

Khách từng có `C:\OufeidunServerData` và `C:\Oufeidun-Local-0.2.14`, sau đó yêu cầu gom chung thư mục. Đây là **thông tin lịch sử, không đảm bảo đường dẫn hiện tại**. Phải tìm dataDir thật từ `server-info.json`, `config/server.env`, task Windows và script dò server; không đoán theo ổ đĩa máy phát triển.

Quy trình cập nhật final (đầy đủ trong BAT-DAU-O-DAY.txt của ZIP):

1. Lưu đơn đang nhập, đóng app các máy, tạm ngừng bán trong lúc cập nhật.
2. Giải nén bộ mới ở folder riêng, không đè lên dataDir hoặc xóa data cũ.
3. Máy chủ chạy `01-MAY-CHU\CAP-NHAT.bat`; nếu hỏi, chọn dataDir **cũ** chứa `config\server.env` và `app`. Công cụ backup trước, thay API, chạy migration còn thiếu rồi khởi động lại.
4. Chạy `KIEM-TRA-LOI.bat`; chưa mở bán lại nếu còn lỗi.
5. Chạy `TAO-BO-MAY-NHAN-VIEN.bat`, chuyển **toàn bộ** bộ client vừa xuất sang máy con. Máy đã cài chạy `CAP-NHAT.bat` phía client; portable dùng `MO-APP.bat`/cả folder App mới. Máy chủ cũng cập nhật app nếu dùng bán hàng.
6. Kiểm tra đăng nhập/đơn cũ/kho/ảnh, quyền staff và xuất file. Không xác nhận đơn thử lên DB thật nếu không muốn phát sinh giao dịch.

Đợt final cần **API máy chủ và app các máy**, không chỉ ghi đè EXE hay “tools”. Giữ config cũ, không cài lại MySQL. Chưa xác nhận khách đã thực hiện cập nhật final trên máy thật.

## 10. Wi-Fi/LAN, khởi động và cấu hình

- Không dùng ngrok; người dùng đã bỏ phương án này.
- Server dùng Node API/MySQL loopback, Caddy HTTPS cho LAN; client không truy cập MySQL trực tiếp.
- Client có public profile cửa hàng: thử IP cũ trước, rồi tìm đúng máy chủ bằng UDP discovery có nonce/chữ ký Ed25519, giữ xác minh TLS/CA/hostname. Không bỏ TLS để sửa lỗi kết nối.
- Wi-Fi dùng được khi các máy liên lạc LAN được. Guest network/Client Isolation/VLAN không định tuyến có thể chặn; discovery không vượt được cách ly mạng.
- `server-profile.json` là nhận diện công khai cho client. `discovery-identity.json` chứa khóa riêng, chỉ giữ máy chủ. Không gửi private config/identity sang máy nhân viên.
- Không hứa bộ generic chưa xuất profile có thể copy qua máy mới tự nhận đúng cửa hàng. Máy mới cần bộ client được xuất từ máy chủ cửa hàng.
- Task thường dùng: `Oufeidun Local API`, `Oufeidun HTTPS`, `Oufeidun Backup`. Bộ BAT có khởi động/restart/kiểm tra/xuất bộ client để khách tự chạy lại. Máy chủ cần bật, tránh Sleep khi bán.
- Dùng tài liệu `LAN-DISCOVERY-PLAN.md`, `LOCAL-UPDATE-PLAN.md`, `LOCAL-SERVER-IMPLEMENTATION.md`, `docs/CAI-DAT-LOCAL-SERVER.md`, `docs/HUONG-DAN-TRIEN-KHAI-LAN-WIFI.md` để xử lý đúng môi trường.

## 11. Backup, clean và gom thư mục

**Phân biệt đúng script, không trả lời chung rằng mọi bản backup giống nhau.**

- Bộ khách hiện tại dùng `deployment/customer/server/scripts/backup-server.ps1`, cài task `Oufeidun Backup` chạy hằng ngày **23:00** với StartWhenAvailable. Trên máy khách phải kiểm tra task đang có/enabled/kết quả chạy, không suy ra hoạt động thực chỉ vì source có logic.
- Đích là `<dataDir>\backups\daily\<timestamp-unique>`, gồm `database.sql`, bản `server.env` có khóa quyền truy cập, `uploads.zip` nếu có ảnh, `SHA256SUMS.txt`.
- Script backup trong bộ khách hiện tại không tự xóa backup cũ; không mặc định hứa có retention 14/8.
- `scripts/backup-local-server.ps1` là script khác: có logic giữ 14 daily/8 weekly và copy weekly vào Chủ nhật; nội dung/config khác bộ khách. Phải xác minh task thực đang gọi script nào trước khi kết luận.
- Backup SQL/ảnh/env không có nghĩa đã backup toàn bộ source, binaries MySQL/datadir vật lý, website tra cứu và mọi khóa CA/discovery. Nếu cần phục hồi toàn hệ thống phải kiểm kê riêng; backup có env chứa bí mật, không đăng công khai.
- Có `CLEAN-DATA-GIU-ACCOUNT.bat` để dọn dữ liệu thử, giữ account theo yêu cầu trước. Đây là thao tác phá hủy nghiệp vụ, có backup/xác nhận. **Không tự chạy khi cập nhật hoặc bàn giao tài khoản Codex**.
- Có bộ `deployment/relocate/GOM-THU-MUC.bat`: tạo đích mới, backup/dừng phần liên quan, copy/đối chiếu, sửa đường dẫn/task/launcher, kiểm tra và có recovery. Giữ hai nguồn cũ; không tự xóa nguồn chỉ vì copy xong, không tự chuyển MySQL datadir vật lý.
- Mọi recursive delete/move trên Windows phải xác minh đường dẫn tuyệt đối nằm trong đích đã định; không nối lệnh qua nhiều shell để xóa.

## 12. Website `E:\mhpGroup` là miền riêng

Theo `E:\mhpGroup\AGENTS.md`, website Next.js App Router + `pg` đã triển khai Phase 1–6 công cụ tra cứu tại `/san-pham`, CRUD riêng `/admin/glass-lookup`; demo được duyệt `public/tra-cuu-demo.html`.

- Snapshot nguồn đã copy một lần: 44 SKU, 772 quan hệ model, 88 ảnh. Đây là trạng thái được ghi trong AGENTS, không phải kiểm kê live mới thực hiện khi viết file này.
- Danh mục marketing `products` và các bảng `glass_lookup_*` là hai miền riêng. Không thay `products` bằng dữ liệu tra cứu.
- Không chuyển Admin/JWT/NestJS/Prisma của web cũ sang web mới. Không xây sync tự động, cron, webhook hoặc hai chiều; web cũ vẫn độc lập sau snapshot.
- Giữ `raw_model_name`, chuẩn hóa trường tìm kiếm; không tách mù `/`, không đoán model ngoặc lỗi. Ảnh đưa vào hệ thống ảnh mới; không phụ thuộc bucket cũ lúc vận hành.
- LOCAL 0.2.16 trở đi gọi public lookup `https://oufeidun.vn/api/glass-lookup`. Dữ liệu website tra cứu không phải tồn kho/đơn/accounts của app LOCAL.
- Chỉnh app không đồng nghĩa được sửa DB hoặc publish website. Nếu có việc website mới, đọc AGENTS tại chính repo đó và kiểm tra lại trạng thái; không dựa vào kiểm thử app để kết luận web đã đạt.

## 13. Quy tắc tiếp tục làm việc với chủ dự án

- Trả lời tiếng Việt rõ ràng, người dùng thường gõ sai; suy luận theo nghiệp vụ và tiếp tục việc đã được cho phép, không hỏi lại những gì đã chốt.
- Nếu người dùng yêu cầu confirm trước thì confirm đúng phạm vi; nếu yêu cầu thiết kế trước thì trình bày thiết kế trước khi sửa. Khi đã bảo “tiến hành”, làm và tự kiểm thử, không chỉ đưa kế hoạch.
- Nếu bảo “run app” thì khởi chạy đúng profile thực tế và báo rõ app đang kết nối môi trường nào; không tự phát hành ZIP thay yêu cầu chạy thử.
- Nếu bảo chưa build/ZIP thì chỉ sửa source/thực hiện phần được cho phép. Khi yêu cầu final thì hoàn tất cả test, EXE, installer, server/client, stage và ZIP.
- Tôn trọng dữ liệu khách. Không hỏi xác nhận lặp cho sửa chữa/read-only/reversible đã được phép, nhưng cũng không suy ra được phép xóa DB/đăng web production từ yêu cầu build app.
- Không nói “đã test thành công” nếu chỉ compile, chỉ nhìn source hoặc test bị skip; luôn phân biệt source, packaged EXE, installed EXE, test cô lập và máy khách vật lý.
- Không tự đổi nghiệp vụ đã chốt để dễ viết test: không cấm bán thiếu, không mất giỏ khác, không gom lại alphabet, không bật lại quyền cũ, không sửa vốn qua staff.
- Không in/chép `.env`, database URL, mật khẩu, access token, service-role key, private key vào log/Markdown/Git/ZIP. File này cố ý chỉ chứa đường dẫn và hash artifact, không chứa thông tin đăng nhập.
- Các trạng thái cũ có thể đã thay đổi sau ngày 17/10; khi làm tiếp, đối chiếu filesystem/source/log mới thay vì xem file này là dữ liệu live vĩnh viễn.

## 14. Tóm tắt để bắt đầu cuộc chat mới

**Dự án đang bàn giao là app LOCAL tại `E:\AppBanHang`. Bản final mới nhất là ZIP 0.2.17 ngày 17/10 với hash ở mục 3. Nhân viên đã có quyền nghiệp vụ như Admin, trừ nhập hàng và giá vốn/giá nhập; giới hạn được thực thi cả API và file xuất. Ba nhóm quyền cuối đã test/build/đóng ZIP xong. DB/config thật của khách chưa bị thay đổi trong kiểm thử. Không còn task code đang dở; chờ yêu cầu tiếp theo.**
