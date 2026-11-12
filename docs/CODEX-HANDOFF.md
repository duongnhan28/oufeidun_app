# Bàn giao ngữ cảnh Codex — Oufeidun

## Cập nhật 12/11/2026 — phát hành 0.1.7, thứ tự xuất Excel báo cáo

- Khách gửi Book1.xlsx gồm 84 dòng và muốn mã/mẫu mới xuống cuối. Đã sửa hai sheet Báo cáo bán hàng/Nhập xuất tồn qua src/lib/report-sheets.ts, helper src/lib/report-product-order.ts và dữ liệu src/data/report-product-order.json. Fixture nguyên gốc tests/fixtures/report-product-order.xlsx; chi tiết docs/REPORT-PRODUCT-ORDER-2026-11-12.md.
- Giữ số liệu, nhãn SKU, các dòng khác giá, quyền staff và màu đi cùng mã; không sửa bảng UI, thứ tự chứng từ đơn hàng hoặc các dòng giao dịch theo thời gian. Có hỗ trợ tên cũ/tiền tố/spacing, không fuzzy matching hoặc tự đổi DB.
- Verify đạt exit 0: 73 unit, 63 UI không retry, Electron smoke, TypeScript/build, production audit 0 lỗ hổng; .local/report-order-verify-20261112.log/.exit. Người dùng đã yêu cầu phát hành: package 0.1.7, tag v0.1.7, xem docs/releases/0.1.7.md. Phải xác nhận CI thành công, feed/chữ ký và tải đầy đủ trước báo hoàn tất. Không ghi đè bản cũ hoặc gộp sửa đổi server/deployment có trước.

## Cập nhật 09/11/2026 — client 0.1.6, ảnh đơn hàng một PNG

- Người dùng duyệt mẫu bảng gọn và yêu cầu phát hành bản mới. Đọc `docs/releases/0.1.6.md` và `docs/LONG-INVOICE-IMAGES-2026-11-09.md`. Ảnh gốc rộng 2400 px, giữ một file, không chia trang. Bản mẫu đơn 954: 34 mã, 470 tấm, 3.525.000đ, 2400 × 3792 px.
- Tag 0.1.5 giữ nguyên để truy vết, chưa phát hành vì CI bị lỗi kiểm tra toast tự tắt. 0.1.6 giữ nguyên code ảnh, dùng kiểm tra dữ liệu đã lưu thay toast ở các test bị ảnh hưởng và một retry riêng trên CI; mọi kiểm tra nghiệp vụ vẫn còn.
- Source sửa ở `src/lib/order-image.ts`, phần cuộn xem trước trong App/CSS; thêm test `tests/ui/long-order-image.spec.ts`. Không thay server/migration cho tính năng ảnh. Workspace có các sửa đổi server và tài liệu 0.1.4 khác chưa commit; không gom vào bản phát hành ảnh.
- Phiên bản đang phục vụ phải kiểm tra feed `https://oufeidun.vn/app-updates/stable/local-mysql-win32-x64.json`, không suy ra chỉ từ package hoặc tag. Các phiên bản 0.1.3, 0.1.4 phía dưới là lịch sử.

## Cập nhật 04/11/2026 — phát hành app tự động theo tag

- Thông tin cũ bên dưới là lịch sử. Package hiện tại là **0.1.3**, không phải 0.2.17 hoặc 0.1.1. Feed LOCAL đang công bố bộ cài 0.1.3 đã đưa nút cập nhật xuống cuối; SHA256 `e8974981b439cae159665b9703b6c5f3bee9443b299b2e32243243a942436755`.
- Repository app thực tế: `E:\AppBanHang`, `duongnhan28/oufeidun_app`. Website production riêng: `E:\Oufeidun_web`, `duongnhan28/oufeidun_web1`; không nhầm với bản web cũ `E:\mhpGroup`.
- Đọc [APP-RELEASE-CICD.md](APP-RELEASE-CICD.md) trước khi phát hành. Main chỉ kiểm thử/build/ký thử; push tag khớp package mới được upload hosting. Không tạo tag 0.1.3 để thử và không tự tăng version chỉ để kiểm tra CI.
- Khóa Ed25519 giữ nguyên tại `%USERPROFILE%\.ssh\oufeidun_update_signing.pem`, public key trong `electron/update-config.json`. SSH key `%USERPROFILE%\.ssh\oufeidun_github_deploy`; host key pin trong `oufeidun_hosting_known_hosts`. Không chép nội dung khóa vào chat/Git/tài liệu. Secrets mã hóa ở environment GitHub `app-production`.
- Workflow chỉ phát hành client LOCAL; không migrate DB, không cài server, không chạy bộ kiểm thử thay password admin thật. Cập nhật DB/API cửa hàng phải lập kế hoạch riêng và giữ tương thích.
- Host lưu app ở `/home/hwqrwrir/app-updates`, dùng chung `.deploy-lock` của website khi công bố manifest. Không xóa khóa của lượt deploy khác. Công bố installer trước và feed cuối; có kiểm tra hash, quota, phiên bản, public feed và phục hồi feed khi kiểm tra sau công bố thất bại.

## Bản bàn giao mới nhất03/11/2026 — đã đóng ZIPLOCAL0.1.1

- Hoàn tất E:\outputt\Oufeidun-Local-0.1.1.zip,374.526.066byte SHA256 A0F14CF1FB72740A2EFCDAC9E30B883E1DB20C8F1A49BB689A0534449B37930F. Setup175.265.792byte SHA256 F4A861EAA5CC40C43BDB7A33793E45D63530F4581118FFF5677DB57CEE9ABE54. Gồmforecast +session12h/migration013 +fixes cũ;webupdater hoãn, chưađụngweb. Cửa hàngAPItrước rồiapp,giữdata/config/loginlại1lần.
- Verify63data/58UI/Electron/build/prodaudit0;MySQL business/501forecast/session/permissions/unit10;nativepackagedforecast/session/relogin/report/customer/revenue/stock/rename/permissions/PNG/XLSX;installer/defaultlauncher;ZIP1.171checksums+source/API/migrations/setup/asar/PS/privacy tất cảexit0. Logs .local/forecast-verify-release-20261103.* /forecast-release-*-20261103.*, orchestration-final0. Metadata .local/forecast-release-artifacts-20261103.json.
- Bản29/10 folder+ZIP backup E:\outputt\_BACKUP\Oufeidun-0.1.1-before-forecast-20261103-223043;hashcũ DDA8B5F36212B662C5FB0A97B2CAF6BEEA3CD058695D0D18724982979E830C5B bảo toàn,0.2.18khôngđổi. ChưaDB/hai máy vật lý khách/OAuth/UAC/reboot/router hoặc kýAuthentiCode thương mại. Khôngcommit/push. Chi tiết docs/RELEASE-0.1.1-2026-11-03.md.
- Buildcompat:runtimeExcelJS minimatch11;ASARdevlegacy phải tách glob7.2.0/minimatch3.1.5, nếu không archive28byte rỗng. Đã testASARpackage.json/Excelglob/XLSX vàmake/audit lại. Không dùnglượtmakefailed. Cácmụcsource/phát hành dưới là lịch sử, ưu tiênbản03/11 ởđây.

## Source03/11/2026 — tồn dự kiến đã duyệt, đã đóng ZIP (ghi chú triển khai)

- User duyệt tồn dự kiến và sau đó chốt làm kho+ZIP trước; updaterweb hoãn. oufeidun.vn chỉ đã đọc public, không deploy/sửa web hoặc thêm updater.
- Mới: server/src/stock-forecast.cjs, POST /stock/forecast quantity-only snapshot; workspace draft_quantity tổng mọi nháp/statusdraft không limit500. Demo helper/PGLite tương đương; src/lib/stock-forecast.ts xử lý self-exclusion/cart/dates/XLSX; StockForecastPanel có kỳ đã giao mặc địnhhômnay và2sheetExcel. App nhãn card/giỏ/ô tồn+tab kho+summary; stylesstatmin240; giữ SKUcolors app/Excel.
- Dự kiến=onhand-draft; sale/gift/sample tính đủ, nháp deleted loại, self saved snapshot loại trước khi cộng giỏ; negative/cảnh báo mềm, không giữ hàng/trừ kho. Đã giao trong kỳ gross movement_type sale gồm giao bổ sung, trước hoàn/hủy, không trừ lại; UI/Excel giải thích, ngày không lọc demand/currentstock. Không thay nghiệp vụ thiếu/giao/bán/giá/vốn. Xem docs/STOCK-FORECAST-2026-11-03.md.
- MySQL501draft pass, Admin/staffUI/realXLSX targetpass. Verify đang chạy cuối .local/forecast-verify-release-20261103.*; hai lượt cũ fail: assertiontd tồn phải chọn riêngbadge vì thêmlineforecast; bài mới cần45sbudgetcoldstartPGLite như toàn bộfixture thay5s. Giữ assertion thực tếvà self-exclusion/XLSX, không bỏ test. Kết quả cuối ở FEATURE-CHECKLIST.
- Release giữ0.1.1 nhưng build03/11, bao gồm phiên12h/migration013. Guide cập nhật03/11, APItrước app, giữdata/config/loginlại1lần. Runner .local/release-forecast-20261103.ps1 + stage-forecast-20261103.ps1 cógates và backupoldfolder+ZIP; chuẩn bịpackagedsession/relogin clones. Chưa chạy release khi verify chưa0. Artifacts dựkiến E:\outputt\Oufeidun-Local-0.1.1.zip, metadata .local/forecast-release-artifacts-20261103.json. Chưa thayoldrelease cho đến auditstage+ZIPpass.

## Source03/11/2026 — phiên LOCAL12h đã xác minh, chưa đóng gói

- User duyệt làm logout trước, tồn dự kiến chờ khách. Tách SESSION_IDLE_SECONDS90 chỉ presence/takeover khỏi deadline SESSION_MAX_SECONDS43200 (12h từ login, tuyệt đối, heartbeat không gia hạn). Same-device relogin ngay; device khác active409, sau presence lease có thể claim/rotate vô hiệu token cũ. Mất mạng/sleep lâu tự nối lại nếu token chưa hết hạn/thu hồi.
- Migration013 thêm app_users.session_expires_at nullable, không đổi account/quyền/đơn/tiền/tồn. Token legacyNULL cần login một lần khi nâng cấp, không tự cho thêm12h. Env mới tùy chọn300–86400s, config cũ không cần đổi. Touch conditional hash/active/deleted/deadline chống token bị thay giữaSELECT/UPDATE. LOCAL only, không Supabase/demo và không lưu password.
- Hoàn tất:verify cuối60data/56UI/Electron/build/production audit0 (.local/session-lifetime-verify-release-20261103.*);server audit0;MySQL business/permissions/lifetime không skip exit0,auth unit10/10. Native real signedHTTPS/MySQL offline2phút/30phút/4giờ,API interruption/recovery giữ token/deadline/form,expiry401 và source relogin5vòng/late401/logout failure đều exit0. Logs .local/session-lifetime-*-20261103.*.
- Một lượt toast assertion nháp fail (đơn đã bán đúng) đã chạy riêng/full lại pass, không sửa assertion/timeout/app. Một lượt audit chặn advisory mới minimatch; scoped override ExcelJS->minimatch11.0.1, giữ ExcelJS4.4.0, testarchiveglob/XLSX thật pass. Package-lock update; không --force hoặc giấu audit; dev audit không nằm trong tuyên bố0 production. Xem FEATURE-CHECKLIST.md/docs/SESSION-LIFETIME-2026-11-03.md.
- Cập nhật máy chủ/migration trước rồi app mọi máy để có cả fixes30/10. Chưa EXE/ZIP app mới; bộ29/10 và bộdiagnostic30/10 không có code phiên12h. Không truy cập DB/config máy khách.

## Source mới 30/10/2026 — app tự về đăng nhập, chưa đóng gói

- Bổ sung feedback login nhiều lần: request LOCAL giữ token lúc gửi, bỏ401/workspace cũ bằng SESSION_STALE; login không gửi Bearer cũ/không bị old token clear hủy kết quả; logout finally chỉ clear token khớp, UIlogout finally đóng màn hình và dùng run/busy/error. Đã verify58data/56UI/Electron/build/audit0, nhóm race mới nhất5/5, server unit+authmock9/9, build LOCAL và native staff5vòng login/logout mỗi vòng1request,401 muộn,logout mạng lỗi đều exit0. Logs .local/session-relogin-*-20261030.*. Không DB/schema/server policy/migration mới; chưa EXE/ZIP app, không dữ liệu khách. Xem journal cuối trong FEATURE-CHECKLIST.md.

- Khách xác nhận app còn mở nhưng về login gần17h. Source cũ heartbeat25s coi mọi lỗi như mất phiên, tái hiện được cả network/AbortError/HTTP500; sửa chỉ SESSION_REQUIRED/SESSION_REPLACED/ACCOUNT_DISABLED/UNAUTHENTICATED mới về login. Lỗi còn lại giữ form/giỏ và thử lại, warning một lần/đợt; chống overlap và kết quả phiên đã hủy. Electron backgroundThrottling=false duy trì timer thu nhỏ, không ngăn sleep.
- Không đổi lease90s, auth/quyền server, DB/schema/config, không tự replay mutation. Lease hết sau mất liên lạc/sleep vẫn phải login. Chưa có log máy khách để giải thích tác nhân đúng17h; backup source23h và Drive hourly không chủ động ngắt API.
- BAT CHAN-DOAN-DANG-XUAT + scripts/diagnose-session.ps1 đọc metadata task/sự kiện/power, không token/config/DB; chạy trên máy khách để đối chiếu thời điểm. Đã self-test trên máy phát triển.
- Verify54data/56UI/Electron/build/audit0; server8/8 và build LOCAL exit0. Native LOCAL regression exit0: thu nhỏ thật>90s vẫnheartbeat,503/500/network/timeout giữ form/phục hồi,401 login, khôngmutation; log .local/session-fix-native-final-20261030.*. Harness sửa getter Electron và cleanup cửa sổ test, không nới assertion. Khách có1chủ+1nhân viên, chỉ nhân viên out; chưa biết tác nhân17h. Bộ hỗ trợ E:\outputt\Oufeidun-ChanDoan-DangXuat-20261030.zip chỉ2file BAT/script, chạy trước trên máy nhân viên. EXE/ZIP app29/10 bên dưới chưa chứa sửa30/10. Xem FEATURE-CHECKLIST.md và docs/SESSION-DISCONNECT-2026-10-30.md.

## Bản bàn giao mới nhất — LOCAL 0.1.1, build lại 29/10/2026

- User yêu cầu ZIP, đã hoàn tất E:\outputt\Oufeidun-Local-0.1.1.zip và folder cùng tên, gồm source đổi mã 28/10 + quyền/report 29/10 + mọi sửa cũ. ZIP 373.913.857 byte, SHA256 DDA8B5F36212B662C5FB0A97B2CAF6BEEA3CD058695D0D18724982979E830C5B. Setup 174.969.344 byte, SHA256 BE7CF5853FDEADC6966454C602BDF644B6B385F3195C322CD3B7BADD0F401ABF.
- Bộ 24/10 giữ tại E:\outputt\_BACKUP\Oufeidun-0.1.1-before-permissions-20261029-130649, ZIP vẫn hash84292CB412D6FA1809DA309BF68734D18A75669A32A54D39570DE6B3165662C2; 0.2.18 không thay. Audit 1.167 file/từng entry ZIP, source/API/migrations 011–012/setup/asar/PS/private config và ba guide khớp đạt.
- Make LOCAL/package audit, EXE thật HTTPS/MySQL với quyền mới/nhập/Excel chi tiết, report/customer/mã/màu, kho/rename/PNG; installer cài đè cùng version/default launcher đều exit0. Source đã hai lượt verify 52data/56UI và API/MySQL/LAN/native/backup/CLEAN đạt. Logs .local/release-011-*-20261029.*, final source tests .local/staff-permissions-final-*; artifacts metadata/progress đạt.
- Máy chủ CAP-NHAT.bat trước (backup, API/migrations), rồi xuất/cập nhật app mọi máy; giữ data/config, không clean/reset. Guide 29/10 trong ZIP. Chi tiết docs/RELEASE-0.1.1-2026-10-29.md. Không DB/hai máy vật lý/Wi-Fi/UAC/reboot/OAuth khách; installer chưa ký thương mại; mật khẩu chung màn hình không thuộc bản này.

## Source 29/10/2026 trước khi đóng gói — quyền tài khoản + báo cáo sản phẩm

- User/khách đã duyệt thiết kế và yêu cầu test hai lần. Đã thêm bảy quyền staff theo account (nhập; chỉnh/xuất/lỗi; danh mục; giá chung; trả/đổi/hủy; báo cáo; audit), Admin độc quyền vốn/lợi nhuận/quản trị. Staff mới {}, legacy NULL giữ nghiệp vụ trừ tài khoản chỉ Admin. API lấy quyền mỗi request, revoke chặn replay; cấp quyền có version/audit. Quyền theo account, không theo máy.
- MySQL 012 thêm permissions/permissions_version/cost_configured, không đổi role/tiền/tồn/config. Staff nhập một mã/Excel hai cột không giá/vốn; giữ vốn/giá cũ, mã mới pending vốn và chưa chốt trước Admin thiết lập. Admin cảnh báo giá trị tồn chưa đầy đủ nếu còn pending. Tồn đầu và catalog chín cột vẫn Admin.
- Báo cáo tổng hợp có Chi tiết theo product_id (kể cả đổi mã/xóa mềm), mã snapshot, đơn thật/khách/Sales/loại/đặt-giao-trả-net/giá/thành tiền, 200 dòng/trang, Excel đủ kỳ (204 dòng đã đối chiếu 200+4), cùng snapshot và không vốn staff. Popup rộng. Sửa race report reset theo polling quyền 10 giây: dependencies/refresh revision riêng, khóa xuất khi busy, test qua 11 giây bằng observer + workbook.
- **Hai lượt cuối đầy đủ đạt**: mỗi lượt verify 52 data/56 UI/Electron/build/audit 0; server7, MySQL cũ + quyền/report mới, LAN, LOCAL build và bốn bộ Electron nguồn HTTPS/MySQL/native workbook/PNG/report/khách/màu/kho/rename; backup SQL/ảnh/checksum chứa quyền/cờ vốn/alias; CLEAN giữ mọi trường account/quyền/session, rollback/chạy lại. Server audit 0. Mọi `.local/staff-permissions-final-*-20261029.exit` bằng 0, progress ALL TWO ROUNDS PASS, dist LOCAL.
- Tài liệu đầy đủ docs/STAFF-PERMISSIONS-AND-PRODUCT-REPORT-2026-10-29.md. Source đổi mã 28/10 vẫn có đầy đủ. **Chưa Forge/make/cài installer hoặc thay EXE/ZIP**: bộ 24/10 bên dưới vẫn là bộ đã giao, hash ZIP giữ nguyên. Khi phát hành cập nhật API+migrations 011–012 và mọi app; giữ data/config, chưa ép minimum client build. Không DB cửa hàng/Supabase online/hai máy vật lý/OAuth/restore thật. Mật khẩu chung bảo vệ màn hình không được triển khai trong scope đã duyệt.

## Source mới 28/10/2026 — đổi mã sau bán, chưa đóng gói

- User duyệt phương án A: đổi danh mục kể cả đã bán, cùng ID/tồn/giá; nháp/đơn/PNG/Excel/PDF giữ snapshot. Alias A/B/C tìm và nhập hai loại Excel về cùng ID, không tái cấp cho hàng khác; audit đổi tên. MySQL 011 thêm bảng và điền snapshot NULL, không hồi tố tiền/tồn. LOCAL/demo, không Supabase online.
- Verify 51 data/54 UI/Electron/build/audit 0; server unit7, MySQL integration thật, LOCAL build và Electron nguồn qua HTTPS/discovery/MySQL Admin/staff/native Excel/PNG/snapshot/kho/quyền đạt. Backup SQL/ảnh/checksum chứa aliases/audit/snapshots, upload lỗi không hỏng local. Chi tiết docs/PRODUCT-RENAME-TEST-2026-10-28.md.
- Chưa tạo/thay EXE hoặc ZIP; bộ 24/10 dưới đây vẫn là bản đã giao. Khi phát hành cập nhật API + migration 011 rồi app mọi máy; chưa có minimum client build gate. Không đụng DB khách. Mật khẩu bảo vệ lợi nhuận/kho chưa triển khai, không tự thêm vào scope lần này.

## Bản bàn giao mới nhất — LOCAL 0.1.1, build lại 24/10/2026

- ĐÃ thay folder/ZIP E:\outputt\Oufeidun-Local-0.1.1 với điều chỉnh tồn có lý do. Nút đầu Kho hàng/theo mã, giảm/tăng/tồn thực tế, preview, lý do bắt buộc. Dùng inventory adjustment/stock_version/idempotency cũ; không migration MySQL mới. Reason/người ở history, adjustment vào audit, reason cột thứ 8 report/Excel; mã đơn vẫn cột 7.
- Giữ giá/vốn/price_version và đơn/nháp/doanh thu; giảm tồn có thể làm nháp thiếu, lúc bán chặn vượt tồn. Staff vẫn không receipt/opening/import hoặc vốn. Cập nhật máy chủ/API trước rồi app mọi máy, giữ config/data.
- Verify sau Zod 4.6.6: 50 data/53 UI/Electron/build/audit production 0. Server multer 2.5.0/body-parser 2.4.0 đã vá audit mới, chạy lại server unit 7/7 và MySQL integration thật (gồm ảnh thật/giả) đạt. Native HTTPS/discovery/MySQL Admin/staff: phụ kiện 10→7→9→0, chặn thiếu lý do/vượt tồn, history/audit/Excel và bất biến giá/vốn/tồn khác; report/customer regression 7 đơn/9.740.000đ/phí 30.000, mã/màu/11 biến động/khách 0/An-Ân đều đạt. Cài đè cùng version/default launcher đạt.
- ZIP 373.905.305 byte, SHA256 84292CB412D6FA1809DA309BF68734D18A75669A32A54D39570DE6B3165662C2. Setup 174.963.712 byte, SHA256 D4A62266ABCA518905E7A7258AA7A975D8AFB6D516304989EBD85C638CB7C6B5. Audit 1.162 file folder/ZIP/nguồn/installer/asar/PS và loại config riêng đạt. Backup bộ 23/10: E:\outputt\_BACKUP\Oufeidun-0.1.1-before-stock-adjustment-20261024-144708, old ZIP hash giữ nguyên; 0.2.18 không thay.
- Tài liệu docs/STOCK-ADJUSTMENT-2026-10-24.md và docs/RELEASE-0.1.1-2026-10-24.md; logs .local/stock-adjustment-* và release-011-*20261024. Targeted UI đầu dùng label text bao cả options, đã thêm aria-label rồi verify 53 UI đạt; harness API đổi đúng /query/GET workspace, native fixture chuẩn hóa SKU hoa rồi chạy lại toàn bộ đạt. Log UI lẻ ban đầu giữ lịch sử, không phải kết quả cuối. Chưa kiểm DB/máy vật lý/router/OAuth khách.

## Lịch sử bàn giao — LOCAL 0.1.1, build lại 23/10/2026

- ĐÃ thay folder/ZIP E:\outputt\Oufeidun-Local-0.1.1, gồm toàn bộ sửa doanh thu và snapshot report/workspace ngày 23/10. Máy chủ/API trước rồi app mọi máy; giữ data/config, không migration MySQL mới riêng cho sửa này.
- ZIP 373.891.813 byte, SHA256 9C94B1C9A7D2C19BA6CEDF96118314103299443B45C95753AA2B4628A57E8F2D. Setup 174.964.224 byte, SHA256 2E404D91FB8E09138B21B2ADEF726B45993E95C871F63BE592179E18ADE2FB99. Audit đủ 1.162 file folder/ZIP đạt; ba guide khớp nguồn, không config riêng. Bộ trước giữ tại E:\outputt\_BACKUP\Oufeidun-0.1.1-before-revenue-20261023-115243; ZIP 0.2.18 giữ nguyên.
- Verify 48 data/51 UI/Electron/build/audit, server 7/7, MySQL thật, native Admin/staff qua HTTPS/discovery (khách số 0/An-Ân, mã/màu, 11 stock rows và báo cáo/Excel đối chiếu DB 7 đơn synthetic = 9.740.000đ/phí 30.000 sau hủy/trả/giao bổ sung) đều đạt. Staff không đọc vốn; stock/cost không đổi khi xuất. Cài đè cùng version và default launcher đúng app mới đạt. Logs .local/release-011-*-20261023.* exit 0.
- Harness native ban đầu timeout screenshot vì cửa sổ APP_TEST_DATA ẩn; tắt background throttling/show trước capture rồi chạy lại sau installer đạt. Không bỏ kiểm tra nghiệp vụ. Hướng dẫn mới deployment/customer/BAT-DAU-0.1.1.txt; chi tiết/hash/giới hạn tại docs/RELEASE-0.1.1-2026-10-23.md.

## Lịch sử sửa source trước khi đóng gói ngày 23/10/2026

- Rà soát tiếp theo yêu cầu: báo cáo LOCAL dùng một snapshot read-only để số đơn/doanh thu/phí/tồn không lệch khi máy khác bán đồng thời; period chặn ngày tự rollover và tối đa366 ngày tính đủ2đầu. Test MySQL cố ý xác nhận đơn3dòng giữa các SELECT và đối chiếu tất cả tổng đơn/nháp/giao/tiền/tồn. Chi tiết docs/CROSS-MODULE-AUDIT-2026-10-23.md; chưa đóng gói.
- Workspace cũng dùng `core.readSnapshot` như report; tránh total cũ/paid mới/items mới khi giao bổ sung và thu tiền đồng thời. Test MySQL chủ động deliver+payment giữa SELECT workspace đạt: lần đọc cũ nhất quán, lần sau đủ dữ liệu mới.

- Yêu cầu: doanh thu/số đơn đúng ngày đặt, không tính nháp/ngày mai, không phụ thuộc thu tiền. Sửa LOCAL report dùng COALESCE(ordered_at,confirmed_at,created_at) và trạng thái bán rõ ràng; trước dùng confirmed_at khác danh sách đơn. Không thể khẳng định nháp thực khách bị tính trực tiếp vì chưa có DB khách, nháp NULL confirmed_at vốn đã loại.
- Doanh thu tổng gồm sản phẩm đã giao sau trả + phí đúng một lần; product_revenue tách sản phẩm. App/Excel dùng reportTotals tương thích API cũ, nhãn giải thích ngày đặt/không phụ thuộc thanh toán. Không schema MySQL, không sửa config/data, không đổi Supabase online. Demo có demo-report-order-date.sql.
- Tests mới: report-order-date.test.ts, UI report-order-date.spec.ts và khối cuối local-api.integration.cjs. Dữ liệu synthetic 8 đơn = 11.050.000đ + nháp ngày mai, 0đ/mẫu/thiếu/phí/thu tiền/ngày/return/cancel/supplement và quyền; không phải DB khách. Kết quả hoàn chỉnh tại docs/REPORT-REVENUE-2026-10-23.md.
- CHƯA đóng gói lại EXE/ZIP. Bộ E:\outputt\Oufeidun-Local-0.1.1 ngày 21/10 chưa có sửa doanh thu này. Khi build cần cập nhật API và app, giữ data/config.

## Bản bàn giao mới nhất — LOCAL 0.1.1, ngày 21/10/2026

- Người dùng yêu cầu đúng số 0.1.1: đã đổi root/server package và lockfiles, không rollback tính năng. Folder/ZIP E:\outputt\Oufeidun-Local-0.1.1 tạo riêng; giữ 0.2.18. Source hiện tại là 0.1.1 có đầy đủ sửa khách 0, mã báo cáo, màu app và backup Drive trước đó.
- ZIP SHA256 ED5BCDCFE643D6DAC8C4B6ACAA4B8F79ED119B18C7262C707893C5130A05B7D5 (373.887.050 byte). Setup SHA256 C8C85A4CE6B794F7E8B7E64185544111D07069DAFD6B34123CBDC3BB54F2D1D3 (174.961.664 byte). 1.162 file folder/ZIP audit đạt; hướng dẫn nguồn deployment/customer/BAT-DAU-0.1.1.txt.
- Verify 46 data/50 UI/Electron/build/audit, MySQL, EXE Admin/staff HTTPS/discovery, cài đè 0.2.18 và mở mặc định đúng app-0.1.1 đều đạt; `.local/release-011-*-20261021.*`. Readiness dùng capability để không bỏ qua version/discovery vì version thấp; `tests/server-health-version.ps1` và deployment-config đạt. Native tests phải bỏ ELECTRON_RUN_AS_NODE của môi trường công cụ; APP_TEST_DATA riêng.
- Khách cập nhật máy chủ/API trước, migrations đến 010 nếu thiếu, rồi app mọi máy. Không reset/config lại. Bộ 0.2.18 giữ nguyên hash ngày 21/10. Chi tiết docs/RELEASE-0.1.1-2026-10-21.md; chưa nghiệm thu dữ liệu/máy vật lý/Google account khách.

## Lịch sử bàn giao — LOCAL 0.2.18, ngày 21/10/2026

- Theo yêu cầu khách đã kiểm thử toàn app lần nữa sau bàn giao: 46 data/50 UI/Electron/build/audit, API unit 6/6, MySQL integration, LAN, packaged Admin/staff/customer-report, backup/Drive/config/relocation và installer đều đạt; xem docs/FULL-RETEST-2026-10-21.md, `.local/full-retest-20261021-*`. ZIP không đổi, 1.162 checksum đạt. Harness Admin dùng port 8798 riêng (8787 có dịch vụ cũ), OUFEIDUN_SMOKE_LAN=1 và OUFEIDUN_SMOKE_ORDER_DETAILS=1; không dùng staff branch cũ giới hạn quyền. Google OAuth/task registration vẫn mock, chưa nghiệm thu khách thực/hai máy vật lý.
- ĐÃ thay folder/ZIP E:\outputt\Oufeidun-Local-0.2.18 với sửa khách số 0 bị ghi đè. Migration MySQL 010 đổi unique phone sang identity_key (phone toàn 0 thêm tên, phân biệt dấu Việt), phục hồi tên/địa chỉ từ nhiều đơn bị gộp và sửa liên kết, giữ snapshot/tiền/tồn/version/thời gian. Không phục hồi khách chủ động xóa hoặc đoán phone/giá riêng. Trang Khách hàng tự tải khi mở/mỗi 10 giây.
- ZIP SHA256 8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C (373.888.902 byte). Setup SHA256 A1EA9E4216516B86881114D02A7873E37933182EE35FD0E67AFC77BFF5942A5A (174.961.664 byte). Backup bộ 20/10: E:\outputt\_BACKUP\Oufeidun-0.2.18-before-customer-identity-20261021-173959. Hash/trạng thái các mục ngày cũ bên dưới là lịch sử.
- Verify 46 dữ liệu/50 UI/Electron/build/audit đạt, MySQL integration phục hồi/rerun/An-Ân giữ đơn và tồn đạt. tests/local-report.electron.cjs --customers kiểm EXE mới HTTPS/MySQL Admin/staff, khách dùng chung 0 và chia sẻ danh sách, báo cáo Excel/mã đơn/màu/quyền đạt. Installer cài đè và audit 1.162 file folder/ZIP đạt; log .local/customer-identity-*20261021* và .local/release-20261021-* exit 0. Chi tiết docs/CUSTOMER-IDENTITY-2026-10-21.md.
- Cần máy chủ chạy 01-MAY-CHU\CAP-NHAT.bat trước để backup/API/migration 010, kiểm tra/xuất client rồi cập nhật app mọi máy. Giữ config, không reset hoặc nhập lại DB; chưa truy cập DB/máy vật lý khách. Demo parity có migration riêng, không triển khai Supabase online.

## Lịch sử bàn giao — LOCAL 0.2.18, ngày 20/10/2026

- ĐÃ cập nhật folder và ZIP E:\outputt\Oufeidun-Local-0.2.18 theo yêu cầu khách. Bộ mới có API báo cáo dùng mã tự nhập cho mọi đơn và màu SKU trong app/Excel báo cáo. Các hash/trạng thái 19/10 bên dưới là lịch sử, không dùng để xác định bộ hiện tại.
- ZIP SHA256 8DAA8CA300A95D01578EE601A4F6D1E6978E03D59FF516F79BF236129B67488A (373.889.894 byte); setup SHA256 97B3A1044717EE63F859111FD7D8FBD0D79C14048F351FBC00AE1AEC9E38E579 (174.964.736 byte).
- Make LOCAL, package audit, tests/local-report.electron.cjs Admin/staff qua HTTPS/MySQL, installer cài đè 0.2.18 và audit 1.161 file folder/ZIP đạt. Log .local/release-20261020-* exit 0; verify gần nhất .local/recheck-20261020-verify.log: 45 dữ liệu/49 UI/Electron/build/audit đạt. Backup bộ trước E:\outputt\_BACKUP\Oufeidun-0.2.18-before-report-colors-20261020-173946. Không thay 0.2.17/data/config khách.
- Khách cập nhật API máy chủ trước bằng 01-MAY-CHU\CAP-NHAT.bat, kiểm tra/xuất bộ nhân viên rồi cập nhật app mọi máy dù cùng version. Hướng dẫn mới nằm trong ZIP. Không reset DB/cài lại MySQL hoặc đổi config. Chưa nghiệm thu dữ liệu/hai máy vật lý của khách.

## Lịch sử kiểm thử source 20/10/2026 trước đóng gói

- Sửa báo cáo kho LOCAL dùng order_code tự nhập (899) thay DH nội bộ; biến động trả hàng cũng liên kết đúng đơn. Không schema/data/config mới. App và Excel báo cáo cùng màu SKU: Full viền đen, CNT vàng đậm, Không viền xanh.
- Verify exit 0: 45 dữ liệu/49 UI/Electron/build/audit; MySQL integration 1/1, API unit 6/6. Test dữ liệu giới hạn hai tiến trình để tránh V8 OOM, không bỏ ca. Chi tiết docs/REPORT-CODE-APP-COLORS-2026-10-20.md.
- Kiểm lại lần hai: verify 45 dữ liệu/49 UI đạt; API unit 6/6, LAN 1/1, audit server 0 lỗ hổng; MySQL mã 000899/prefix DH/dấu/nháy/gạch chéo và đối chiếu từng biến động đạt. tests/local-report.electron.cjs chạy EXE package mới qua HTTPS/MySQL cả Admin/staff, so 11 dòng Excel thật với DB, màu/chữ số 0 đầu/quyền vốn/tồn đạt. Log .local/recheck-20261020-* đều exit 0. Package ở out dùng cho test, không phải bộ khách.
- Trạng thái ở thời điểm kiểm thử source: bộ 19/10 chưa chứa sửa ngày 20/10. Đã được thay bằng bộ mới theo mục bàn giao 20/10 ở đầu file; không sửa data/config khách.

## Lịch sử bàn giao — LOCAL 0.2.18, ngày 19/10/2026

- **Build lại mới nhất: Google Drive và màu chứng từ**, ghi đè cùng folder/ZIP 0.2.18. Full viền đen, CNT vàng đậm, Không viền xanh nước biển trên XLSX/PNG/PDF; thêm ba BAT cài/backup/kiểm tra Drive trong máy chủ. Cập nhật cả API và app, dù cùng version. Google consent cần khách thực hiện một lần.
- Verify mới 44 data/49 UI, tool Drive real rclone với remote filesystem cô lập (OAuth/task registration mock), MySQL concurrency 4 lượt sau sửa deadlock mã đơn, EXE màu/quyền staff, installer cài đè và 1.161 checksum folder/ZIP đạt. Không login/upload Google thật hoặc đăng ký task trên máy phát triển/khách trong test.
- **Hash mới ưu tiên:** ZIP `8BF5CB3CA40B2EB037F2901327E33043921169EC6B12A999B501D0CBC73FB8DD`; setup `55AF24CDECC58E4F2DA8755928FED6E9F03B055E2FCB1CDB771566E676D4B527`. Bộ trước nằm ở `E:\outputt\_BACKUP\Oufeidun-0.2.18-before-drive-colors-20261019-223335`. Chi tiết tại docs/BACKUP-DRIVE-AND-COLORS-2026-10-19.md và nhật ký checklist; các hash 0.2.18 phía dưới là đợt build đầu, đã được thay trong bộ đang gửi.

- Thay trạng thái chưa đóng gói bên dưới: hai sửa lỗi 19/10 đã có trong `E:\outputt\Oufeidun-Local-0.2.18` và ZIP cùng tên; app/API cùng 0.2.18. Bộ 0.2.17 không bị thay đổi.
- Verify version mới 43 dữ liệu/48 UI, MySQL integration thật, build LOCAL, packaged Admin/Nhân viên và installer nâng version đều exit 0; audit 1.154 file folder/ZIP đạt. Xem nhật ký release 0.2.18 trong FEATURE-CHECKLIST.md và `.local/release-018-*`.
- ZIP SHA256 `8F80808119FE44C2B5B855D1815F2D3B8D0999116C6A627D84DFE32B78DF5671`; setup SHA256 `55205E2248A171828A34E0D035B28EA74EE4913C00AD73A5A06ABFABE26160D6`.
- Cửa hàng cần `01-MAY-CHU\CAP-NHAT.bat` để backup/API/migration 009 trước, kiểm tra/xuất client rồi cập nhật app mọi máy. Giữ DB/data/config/account/ảnh/CA/discovery, không clean-data/cài lại MySQL. Hướng dẫn trong BAT-DAU-O-DAY.txt. Chưa nghiệm thu hai máy vật lý/router/UAC/reboot tại khách.

## Bổ sung source ngày 19/10/2026 — chưa đóng gói lại

- Khách báo không đổi được SKU chưa bán và không dùng lại được mã nháp đã xóa. Source LOCAL/demo đã sửa: nhập kho/tồn đầu/nháp không khóa SKU; từng xác nhận bán vẫn khóa, kể cả đã hủy/trả. Giữ product ID, tồn, vốn và snapshot chứng từ cũ.
- Mã nháp xóa mềm được dùng lại; giữ nguyên mã/ID/lịch sử nháp cũ. MySQL cần migration `009_reuse_deleted_draft_codes.sql` cùng API mới: generated column chỉ giữ mã của đơn chưa xóa và unique index tương ứng. Đơn chưa xóa vẫn không trùng mã kể cả hai máy gửi đồng thời.
- Không áp dụng migration lên DB khách hoặc Supabase online trong lần sửa source này. Bằng chứng kiểm thử nằm ở nhật ký 19/10 trong `FEATURE-CHECKLIST.md` và `.local/edit-unused-codes-*`; kiểm tra trạng thái thật trước khi tiếp tục.
- **Folder/ZIP/installer 0.2.17 ngày 17/10 nêu dưới đây chưa chứa hai sửa lỗi này.** Khi được yêu cầu bàn giao, kiểm thử và đóng gói lại cả API/migration lẫn client theo quy trình, không chỉ gửi EXE cũ.

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
