# Checklist chức năng và nghiệm thu Oufeidun

File này là nguồn đối chiếu bắt buộc sau mỗi lần phát triển hoặc sửa lỗi. Không được kết luận “đã xong”, chạy build bàn giao hoặc gửi khách khi chưa đọc lại toàn bộ file và hoàn thành phần **Kiểm tra sau thay đổi**.

## Quy tắc mới 03/11/2026 — tồn dự kiến và bàn giao ZIP

- STOCK-01/ORDER-01: dự kiến = thực tế - mọi nháp chưa xóa, không limit500/ngày; số âm/cảnh báo mềm, vẫn lưu; cùng ID/bán-tặng-mẫu; sửa nháp loại phần đã lưu của chính nháp. Không giữ chỗ/trừ kho/tiền khi xem/lưu; xác nhận theo tồn thực tế.
- STOCK-05: tab kho dự kiến/Excel riêng, Hàng đã giao theo kỳ VN mặc định hôm nay là lượng xuất bán gross gồm giao bổ sung, trước hoàn/hủy. Không trừ hàng đã giao lần nữa; ngày chỉ lọc đã giao, tồn/nháp hiện tại. Quyền kho cơ bản xem số lượng, không vốn.
- LOCAL/demo, không Supabase online; cập nhật web hoãn theo yêu cầu. Đóng ZIP gồm cả fixes phiên30/10–03/11/migration013, giữ data/config. Trạng thái/hash ở nhật ký cuối.

## Quy tắc mới 03/11/2026 — tách presence và thời hạn phiên LOCAL

- AUTH-01/02:12h tuyệt đối từ login (SESSION_MAX_SECONDS mặc định43200), không heartbeat gia hạn;90s chỉ dùng khi máy khác claim. Mất mạng/sleep lâu vẫn nối lại nếu token chưa hết hạn/thu hồi, không replay mutation; giữ sửa client30/10.
- AUTH-03/USER-01/02: reset password, khóa/xóa hoặc token bị thay vẫn vô hiệu ngay; same-device relogin ngay, khác device active bị409. Touch bị đổi token giữa SELECT/UPDATE không được đi tiếp.
- DB-03: migration013 additive session_expires_at; token cũ NULL login một lần, không đổi account/quyền/đơn/tiền/tồn; rerun bảo toàn dữ liệu. API trước rồi app; không Supabase online, không tồn dự kiến, chưa EXE/ZIP.

## Quy tắc mới 30/10/2026 — giữ phiên khi lỗi kết nối tạm thời

- AUTH-01/02 và UI-01: heartbeat không coi network/timeout/5xx là mất phiên. Giữ form/giỏ, cảnh báo một lần mỗi đợt, thử lại; chỉ lỗi phiên/tài khoản rõ ràng mới về login. Chống request chồng và kết quả cũ sau cleanup.
- Electron duy trì timer khi thu nhỏ; không đổi lease 90 giây, quyền API hoặc ngăn Windows sleep. Hết lease/thu hồi thật vẫn đăng nhập lại. Không phát lại mutation.
- Chưa xác định tác nhân gần 17h ở máy khách. BAT CHAN-DOAN-DANG-XUAT lấy metadata đọc-only, không config/token/DB. Source sửa, EXE/ZIP 29/10 chưa chứa sửa này.

## Quy tắc mới 29/10/2026 — phân quyền riêng từng tài khoản

- AUTH-03/USER-01: hai role giữ nguyên, Admin cấp bảy quyền riêng, nhân viên mới cơ bản; legacy giữ nghiệp vụ trừ quản trị tài khoản chỉ Admin. Quyền kiểm tại API mỗi request, revoke chặn cả replay idempotency; version/audit khi cấp quyền.
- STOCK-01/02/03/04, PRODUCT-01, PRICE-02, ORDER-06, REPORT-03/07/08 và AUDIT-01 theo quyền tương ứng. Staff nhập một mã/Excel hai cột không vốn; bảo toàn giá/vốn cũ, mã mới chờ Admin thiết lập vốn và chưa chốt bán. Không nhập danh mục chín cột/tồn đầu kỳ hoặc giả vốn 0 đã sẵn sàng.
- REPORT-08: từng giao dịch bán/tặng/mẫu, lượng giao/trả/net, khách/Sales/mã đơn thật, nhãn cũ + hiện tại; tổng khớp report theo kỳ, phân trang/xuất đủ, không lộ vốn. DB-03: migration 012 giữ quyền cũ và dữ liệu; cấu hình/DB cửa hàng không được thay khi test.
- Các mục 17–28/10 bên dưới là lịch sử. Quy tắc mới này ưu tiên khi có khác biệt.

## Quy tắc mới 28/10/2026 — đổi mã sau bán

- PRODUCT-01/02/03 thay khóa sau bán bằng lịch sử tên theo product_id; alias không tái sử dụng cho sản phẩm khác. AUTH-03 giữ nguyên ngoại lệ vốn/nhập hàng.
- ORDER-01/02/03/06/07, IMAGE-01/02/03, EXCEL-01: nháp/đơn/chứng từ giữ nhãn cũ; thêm cùng hàng gộp theo ID + loại; giao/trả/hủy theo ID.
- STOCK-01/02/03/04: tìm/nhập Excel bằng tên cũ về cùng hàng; trùng alias trong file rollback, chống tranh chấp/gửi lặp; rename giữ tồn/vốn/giá.
- REPORT-03/04/06/07, AUDIT-01, DB-03: tổng hợp mã hiện tại + mã cũ; lịch sử mã snapshot + mã hiện tại; migration 011 giữ dữ liệu/chạy lại an toàn. Quy tắc mới ưu tiên hơn nhật ký 19/10.

## Sửa lỗi source LOCAL/demo 19/10/2026

- Kiểm thử toàn bộ lần hai theo yêu cầu khách: verify exit 0 (43 dữ liệu, 48 UI, Electron/build/audit); API unit 6/6, MySQL integration 1/1 và LAN 1/1 không skip; server audit 0 lỗ hổng. Cấu hình đổi thư mục và backup SQL/ảnh/checksum trên DB test đạt. Sau verify đã build LOCAL và chạy Electron Admin, staff, quyền dùng chung qua HTTPS/discovery/MySQL thật đều exit 0. Đã xem ảnh kho staff, không có giá vốn. Chưa đóng gói EXE/ZIP hoặc nghiệm thu máy cửa hàng; chi tiết và giới hạn trong `docs/TEST-REPORT-2026-10-19.md`.
- ID ảnh hưởng: PRODUCT-01/03, ORDER-01/02/08, STOCK-01, AUTH-03 và DB-03; bảo toàn snapshot/chứng từ, giá vốn, tồn, quyền và lịch sử.
- Nhập kho/tồn đầu kỳ hoặc tham chiếu từ nháp không còn khóa sửa SKU. Chỉ khóa nếu từng xác nhận bán, kể cả đã hủy/trả. Thông báo lỗi nêu đúng điều kiện.
- Mã nháp đã xóa được dùng lại, giữ nguyên ID/mã/dòng hàng/lịch sử nháp cũ. API chỉ kiểm tra mã đơn chưa xóa; migration MySQL 009 thay unique index bằng generated active_order_code để chống trùng đồng thời. Demo có partial unique tương đương; không áp dụng Supabase online.
- Nhật ký xác minh 19/10: đã đọc lại toàn bộ checklist. `npm.cmd run verify` exit 0: 43/43 dữ liệu, 48/48 UI, Electron smoke, TypeScript/build, audit 0 lỗ hổng. Local API syntax/migrator và unit 6/6 đạt; MySQL integration thật 1/1 đạt trên database test cô lập.
- Ca mới: nhập kho/tồn đầu rồi đổi SKU; đổi khi có nháp sống hoặc nháp đã xóa; quyền staff/Admin và giữ vốn; snapshot phiếu nhập giữ mã cũ; reload rồi dùng lại mã nháp; Excel dùng mã mới; chốt bán chỉ trừ kho một lần; SKU đã bán/hủy bị khóa; mã của đơn chưa xóa vẫn bị giữ; hai máy tạo mã khác hoa/thường chỉ một thành công; migration chạy lại sau gián đoạn và giữ dữ liệu cũ.
- Log `.local/edit-unused-codes-verify.log`, `edit-unused-codes-data.log`, `edit-unused-codes-mysql.log`, `edit-unused-codes-ui.log`, các file `.exit` bằng 0. Không sửa DB/config/dịch vụ khách. Chưa tạo lại EXE/folder/ZIP 0.2.17; khi phát hành cần cập nhật API cùng migration 009, không chỉ thay EXE.

## Quyền LOCAL đã chốt 17/10/2026

- AUTH-03, USER-01, PRODUCT-01/04, PRICE-01/02/03/04, ORDER-01/02/05/07/09/10/11, CUSTOMER-01/02/03, REPORT-01/02/07, AUDIT-01 và UI-01: nhân viên có cùng quyền nghiệp vụ với Admin, kể cả đơn người khác tạo; không xem/sửa vốn và giá nhập, không nhập hàng/Excel danh mục/tồn đầu kỳ.
- STOCK-01/02/03/04: giữ quyền nhập cho Admin; staff được xuất/điều chỉnh/ghi nhận lỗi và trả hàng. Sản phẩm staff tạo tồn 0; sửa giữ nguyên vốn, Admin bổ sung vốn cho mã mới.
- Báo cáo/Excel staff không xuất lợi nhuận, tổng vốn hoặc giá trị tồn theo vốn; tài khoản Admin không thể bị staff đặt lại mật khẩu để vượt quyền xem vốn. Không thay role, dữ liệu, schema hoặc config của khách.
- Phạm vi LOCAL + demo; Supabase online giữ phân quyền cũ, chưa triển khai RPC mới. Folder/ZIP final 0.2.17 đã cập nhật ngày 17/10 sau verify, kiểm thử EXE và installer; bộ cũ được sao lưu. Kết quả chi tiết trong Nhật ký xác minh.

## Quy trình bắt buộc

1. Trước khi code, đọc `BA-SPEC.md` và file này; xác định những dòng chức năng bị ảnh hưởng.
2. Cập nhật đồng thời giao diện, nghiệp vụ, database/migration, kiểu dữ liệu và phân quyền nếu thay đổi có liên quan.
3. Thêm hoặc sửa kiểm thử theo hành vi người dùng; không hardcode dữ liệu chỉ để test chạy qua.
4. Chạy kiểm thử phù hợp trong lúc phát triển.
5. Khi code xong, **mở và đọc lại toàn bộ file này**, đối chiếu từng dòng trong bảng chức năng.
6. Chạy `npm.cmd run verify`. Không bàn giao nếu có test lỗi, build lỗi hoặc audit lỗi.
7. Kiểm tra profile build: TEST dùng Supabase test; PRODUCTION dùng PHP API/MySQL. Không được phát hành nhầm cấu hình.
8. Chỉ build `.exe` sau khi tất cả mục liên quan đạt. Cập nhật phiên bản, nhật ký xác minh, tên file và SHA256.

## Điều kiện để một tính năng được coi là hoàn thành

- Có giao diện thao tác được và nội dung tiếng Việt dễ hiểu.
- Dữ liệu được lưu thật, tải lại ứng dụng vẫn còn và nhiều máy nhìn thấy cùng dữ liệu khi dùng backend online.
- Admin/nhân viên nhìn thấy và thao tác đúng quyền; nhân viên không đọc được giá vốn.
- Giao dịch kho/đơn hàng dùng transaction hoặc RPC an toàn, không trừ kho hai lần.
- Trạng thái tải, rỗng, lỗi và dữ liệu `null` được hiển thị rõ ràng.
- Có kiểm thử cho luồng thành công và quy tắc nghiệp vụ quan trọng.
- Các chức năng cũ không bị lỗi lại.
- File xuất Excel mở được và chứa đúng dữ liệu thực tế.

## Nhật ký xác minh 04/11/2026 — cảnh báo tồn dự kiến rõ ràng

- ID ảnh hưởng: STOCK-04/05, ORDER-01/02/07 và UI-01. Thẻ bán hàng có nhãn đỏ khi hết/thiếu dự kiến và nhãn Hết hàng khi tồn thực tế 0. Thêm hoặc tăng lượng vượt dự kiến hỏi xác nhận; hủy không thay giỏ; bán/tặng/mẫu tính chung và loại phần của chính nháp đang sửa.
- Không sửa API/schema/config, công thức báo cáo hoặc Excel. Người dùng đã duyệt phát hành online sau kiểm thử; tăng version 0.1.4, push main qua CI rồi tag v0.1.4 để publish bằng workflow hiện có. Trạng thái thực tế trong docs/RELEASE-0.1.4-2026-11-04.md.
- Đã đọc lại checklist, đối chiếu các ID trên và luồng báo cáo/Excel/quyền. npm.cmd run verify đạt exit 0: 69 unit, 61 UI, Electron smoke, TypeScript/build và production audit 0 lỗ hổng. Log .local/stock-warning-verify-final-20261104.log/.exit. Ca tồn đúng 19/nháp 19 chạy cho Admin/staff; đóng hộp thoại không thêm, tăng/hủy giữ số cũ, bán/tặng/mẫu cộng chung; nhãn không tràn. Đã xem ảnh thẻ và hộp thoại thực tế.
- Bộ kiểm tra an toàn CI/CD scripts/release/release.test.cjs đạt 7/7. Một lượt verify đầu dừng vì test đặt thiếu chưa xác nhận hộp thoại mới; cập nhật test theo hành vi đã duyệt, giữ nguyên assertion số lượng/Excel/layout; rerun toàn bộ đạt. Chưa đóng bộ cài hoặc publish thay đổi này; version giữ 0.1.3 cho source, khi phát hành cần version cao hơn feed.
- Build LOCAL đạt, dist đúng local/API. Electron source qua HTTPS/MySQL test thật đạt exit 0: nháp người khác, xác nhận cảnh báo rồi lưu, loại phần chính nháp, đọc workbook thật, xác nhận/xóa và refresh không trừ hàng đã giao hai lần; log .local/stock-warning-native-pass-20261104.log/.exit. Helper điền ngày đặt VN rõ ràng khi dùng clock giả. Không chạy dữ liệu hoặc hai máy vật lý của khách. Chi tiết docs/STOCK-WARNINGS-2026-11-04.md.

## Danh sách chức năng chuẩn

| ID | Chức năng cần giữ đúng | Tiêu chí kiểm tra | Trạng thái nền |
| --- | --- | --- | --- |
| AUTH-01 | Đăng nhập bằng tên đăng nhập và mật khẩu | Không bắt buộc email; có lưu tên đăng nhập; thông báo tiếng Việt | Đã có |
| AUTH-02 | Một tài khoản chỉ có một phiên hoạt động | LOCAL: deadline12h, presence90s; khác device đang hoạt động bị chặn, được claim khi mất liên lạc và vô hiệu token cũ; cùng device đăng nhập lại ngay | Cập nhật03/11/2026 |
| AUTH-03 | Hai vai trò và quyền theo tài khoản | Admin độc quyền vốn/lợi nhuận/quản trị; staff có bảy quyền riêng, tài khoản mới cơ bản, legacy giữ nghiệp vụ; API kiểm tra mỗi request và chặn replay sau thu hồi | Cập nhật 29/10/2026 |
| USER-01 | Quản lý nhân viên và cấp quyền | Chỉ Admin thêm/sửa/khóa/xóa/reset tài khoản khác, cấp/thu hồi từng quyền với version chống xung đột và audit | Cập nhật 29/10/2026 |
| USER-02 | Chủ cửa hàng cập nhật tài khoản | Đổi tên và mật khẩu nhưng vẫn giữ vai trò Admin | Đã có |
| PRODUCT-01 | Quản lý kính | Thêm, sửa, xóa an toàn; LOCAL/demo đổi mã cả sau bán/hủy/trả, giữ cùng ID/tồn/giá; mã cũ tìm/nhập Excel được và không cấp lại cho hàng khác; nháp/đơn/chứng từ giữ snapshot; ảnh, hãng/loại và hãng điện thoại tự thêm | Cập nhật 28/10/2026 |
| PRODUCT-02 | Mã máy dùng chung | Mã chính liên kết nhiều model; tìm model dùng chung trả đúng sản phẩm thay thế và có nhãn rõ | Đã có |
| PRODUCT-03 | Hiển thị mã kính | Bỏ ô tên sản phẩm/tên riêng trên đơn; UI và chứng từ dùng SKU; giữ dữ liệu tên cũ trong DB để đối chiếu | Cập nhật theo yêu cầu 08/10/2026 |
| PRODUCT-04 | Phân loại kính/phụ kiện | Full viền/Chống nhìn trộm/Full viền cao cấp/Phụ kiện khác; giữ Không viền cao cấp cũ, full_border và clear lọc chung; bỏ Full viền cao cấp khỏi bộ lọc tìm kiếm, giữ dữ liệu; Excel cũ/mới, lọc và giá hàng loạt nhất quán | Bổ sung 14/10/2026 |
| PRICE-01 | Giá lẻ, giá sỉ và giá vốn | Chọn loại khách tự gợi ý đúng giá; người bán được sửa giá thực tế theo từng dòng đơn; giá vốn chỉ Admin được xem/sửa | Đã có |
| PRICE-02 | Giá chung theo nhóm kính | Cần manage_prices cho giá danh mục tương lai/mọi máy; giữ vốn/mức giá còn lại/giá khách/đơn đã bán; sửa giá riêng trên đơn vẫn là nghiệp vụ bán | Cập nhật 29/10/2026 |
| PRICE-03 | Giá riêng theo khách sỉ | Mỗi khách sỉ có thể có giá riêng theo SKU; thiếu giá riêng thì dùng giá sỉ mặc định; đơn cũ giữ snapshot | Đã có |
| PRICE-04 | Giá tùy chỉnh trên đơn | Admin/Nhân viên sửa giá thực tế từng SKU hoặc toàn bộ sản phẩm cùng loại kính trong draft; lưu lại vẫn còn; xác nhận chụp đúng giá; ghi audit; không sửa danh mục hoặc hồi tố đơn cũ | Đã có |
| STOCK-01 | Nhập/xuất/điều chỉnh tồn | Nhập theo receive_stock; chỉnh/xuất/lỗi theo adjust_stock, lý do/version/retry, không âm tồn; giữ ledger/giá/vốn | Cập nhật 29/10/2026 |
| STOCK-02 | Nhập kho/danh mục Excel | Admin dùng mẫu chín/tám/ba cột như trước; staff có quyền nhận mẫu hai cột SKU/Số lượng, chặn giá/vốn và catalog; alias resolve cùng ID, mã mới pending vốn; transaction/retry/rollback | Cập nhật 29/10/2026 |
| STOCK-03 | Tải Excel mẫu theo quyền | Admin mẫu danh mục chín cột; staff được nhập tải đúng hai cột không có giá/vốn, .xlsx mở/đọc lại được | Cập nhật 29/10/2026 |
| STOCK-04 | Kho hàng chung | Lọc Tất cả/Kính/Phụ kiện; số mã và tổng tồn/tồn riêng/sắp hết theo danh sách lọc; kính: tấm, phụ kiện: sản phẩm; nhãn Thương hiệu | Bổ sung 14/10/2026 |
| CUSTOMER-01 | Danh mục khách hàng | Lưu tên, SĐT, địa chỉ, loại khách, ghi chú; thêm/sửa/xóa; tự lưu từ đơn | Đã có |
| CUSTOMER-02 | Lọc khách hàng | Combobox Tất cả/Khách lẻ/Khách sỉ; số lượng và kết quả đúng; ghi chú trống hiện `null` | Đã có |
| CUSTOMER-03 | Tìm khách khi lên đơn | Tên không dấu/SĐT kể cả phân nhóm, tối đa 3 gợi ý, bàn phím, Khách mới; điền đúng thông tin và giữ giá sửa theo lựa chọn | Bổ sung 14/10/2026 |
| ORDER-01 | Đơn nháp | LOCAL Admin/Nhân viên sửa/xác nhận nháp mọi người ngay trong chi tiết; giữ đơn khác nhập dở, chưa trừ kho khi lưu; thứ tự hàng bán giữ theo lựa chọn, tặng/mẫu theo quy tắc 16/10 | Cập nhật 17/10/2026 |
| ORDER-11 | Xem chung đơn hàng | LOCAL Admin/Nhân viên xem và xử lý đơn mọi người tạo, không lộ vốn; tự tải danh sách mỗi 10 giây khi mở | Cập nhật 17/10/2026 |
| ORDER-02 | Xác nhận bán | Chỉ trừ kho một lần; chặn vượt tồn; lưu snapshot tên, giá bán và giá vốn | Đã có |
| ORDER-03 | Đơn đủ/thiếu hàng | Giữ ghi chú thiếu sau xác nhận khi các dòng giao đủ; chi tiết/Excel thống nhất; chỉ hoàn tất ghi chú khi không còn dòng chờ giao; thiếu số lượng thực tế tự hoàn tất sau giao bổ sung đủ | Đã có |
| ORDER-04 | Sales phụ trách | Chọn Sales độc lập với người thao tác; hiển thị trên đơn, Excel và báo cáo kho | Đã có |
| ORDER-05 | Thanh toán và công nợ | Tiền mặt/chuyển khoản/COD/kết hợp; nhiều lần thanh toán; đúng trạng thái | Đã có |
| ORDER-06 | Hủy, trả và đổi hàng | Cần manage_returns để xử lý mọi đơn; theo ID dòng, không trả quá lượng giao, không lặp kho/tiền; exchange giữ quan hệ và giỏ | Cập nhật 29/10/2026 |
| ORDER-07 | Hàng bán, hàng tặng, hàng mẫu | Cùng SKU có các dòng riêng theo loại, tự chọn số lượng, không tự 10+1; hàng tặng/mẫu 0đ vẫn trừ kho/vốn; giao/trả theo ID dòng, tổng stock dùng chung và retry không lặp. Chốt 16/10: hàng bán giữ thứ tự chọn, tặng cùng mã ngay dưới bán, tặng không có mã bán sau nhóm bán-tặng, mọi mẫu cuối; giỏ/nháp/đơn/PNG/Excel/PDF thống nhất | Cập nhật 16/10/2026 |
| ORDER-08 | Mã đơn hàng tự nhập | Bắt buộc, tối đa 50 ký tự, không trùng không phân biệt hoa/thường giữa đơn chưa xóa; LOCAL/demo dùng lại mã nháp đã xóa, giữ nguyên mã/lịch sử nháp cũ; đơn đã bán/hủy vẫn giữ mã; chặn hai máy tạo cùng mã | Cập nhật 19/10/2026 |
| ORDER-09 | Ngày giờ đặt đơn tự nhập | Giờ Việt Nam; lưu/sửa/lọc/chứng từ thống nhất; version/quyền; giữ thời gian thao tác thực tế riêng | Bổ sung 10/10/2026 |
| ORDER-10 | Chi phí khác | Tiền nguyên đồng không âm, nội dung; tổng/công nợ gồm phí, giao bổ sung không cộng phí lại, báo cáo tách khoản thu khác | Bổ sung 10/10/2026 |
| IMAGE-02 | Xem/tải ảnh bản nháp và ghi chú chứng từ | Chi tiết nháp xem/tải PNG không trừ kho; máy dùng chung, ghi chú dòng/đơn, phí, ngày đặt đầy đủ trên PNG/Excel/PDF | Bổ sung 10/10/2026 |
| IMAGE-01 | Ảnh xác nhận đơn tại màn Bán hàng | Tải PNG có mã đơn, khách, SĐT, địa chỉ, Sales, thời gian, tình trạng, mặt hàng và tổng tiền; tên file dễ nhận biết | Đã có |
| IMAGE-03 | Màu chữ mã hàng trên chứng từ | Excel/PNG/PDF: Full viền đen, CNT vàng đậm, Không viền xanh nước biển; giữ thứ tự bán/tặng/mẫu, số lượng và số tiền; loại danh mục ưu tiên, SKU dự phòng khi không có loại | Bổ sung 19/10/2026 |
| EXCEL-01 | Xuất đơn hàng | Đơn đang tạo và danh sách đơn đều tải được Excel một sheet; có khách, SĐT, địa chỉ, Sales, thời gian, số đơn, tình trạng, mặt hàng và tổng tiền | Đã có |
| REPORT-01 | Kỳ báo cáo | Người dùng chọn Từ ngày–Đến ngày; doanh thu/số đơn theo ngày đặt VN như danh sách đơn; gồm đủ hai ngày, tối đa 366 ngày; ngày sổ kho giữ thời điểm thao tác | Cập nhật 23/10/2026 |
| REPORT-02 | Tổng quan bán hàng | Chỉ đơn xác nhận, loại nháp/xóa/hủy; doanh thu sản phẩm đã giao sau trả + phí đúng một lần, không phụ thuộc thanh toán; staff không nhận vốn/lợi nhuận/giá trị tồn theo vốn | Cập nhật 23/10/2026 |
| REPORT-03 | Báo cáo theo sản phẩm | Cần view_reports; Admin có vốn/lợi nhuận, staff không nhận các trường này; nút Chi tiết theo ID kể cả đổi mã/xóa mềm | Cập nhật 29/10/2026 |
| REPORT-04 | Nhập–xuất–tồn | Tồn đầu, hàng vào, hàng ra, tồn cuối; bỏ bộ lọc hãng máy theo phạm vi kính iPhone | Đã có |
| REPORT-05 | Giá trị tồn theo vốn | Tính tồn hiện tại theo vốn hiện hành; Admin thấy cảnh báo/số mã chưa thiết lập vốn, không coi vốn 0 chưa cấu hình là số liệu đầy đủ | Cập nhật 29/10/2026 |
| REPORT-06 | Chi tiết kho | Thời gian, mã kính, loại giao dịch, thay đổi, tồn sau, Sales, mã đơn tự nhập; thêm cột cuối lý do phiếu kho/điều chỉnh, giữ cột mã đơn | Cập nhật 24/10/2026 |
| REPORT-07 | Xuất báo cáo Excel | Bốn sheet tổng quan/bán hàng/nhập xuất tồn/chi tiết kho, staff không vốn/lợi nhuận; thêm file chi tiết từng sản phẩm xuất đủ kỳ | Cập nhật 29/10/2026 |
| REPORT-08 | Chi tiết bán từng sản phẩm | Ngày VN/mã đơn thật/khách/Sales/nhãn snapshot/loại/đặt-giao-trả-net/giá/thành tiền; loại nháp/hủy, khớp tổng hợp; 200 dòng/trang, Excel đủ kỳ và không vốn staff | Bổ sung 29/10/2026 |
| AUDIT-01 | Lịch sử thao tác và cấp quyền | Xem theo view_audit; có người/thời gian/mã/đối tượng/lý do; lưu thay đổi quyền và đổi SKU, không mật khẩu | Cập nhật 29/10/2026 |
| UI-01 | Giao diện desktop | Không tràn, chữ và thành phần vừa màn hình, popup không đẩy bố cục | Đã có |
| UI-02 | Nhận diện Oufeidun | Logo, tên công ty, ảnh đăng nhập và icon ứng dụng đúng | Đã có |
| DB-01 | Backend TEST | Build test chỉ gọi Supabase test và các bảng/RPC riêng của AppBanHang | Đã có |
| DB-02 | Backend PRODUCTION | Build production chỉ gọi PHP API kết nối MySQL; phải chặn build nếu URL chưa hợp lệ | Chờ thông tin hosting thật |
| DB-03 | Backend LOCAL | Nghiệp vụ gọi Node API + MySQL qua HTTPS LAN; Mã dùng chung gọi API website/Supabase; không mở MySQL trực tiếp; có backup/restore | Đã cài máy chủ; chờ xác nhận máy LAN thứ hai |
| DB-04 | Tự tải backup Google Drive | BAT tự tải rclone chính thức/kiểm SHA256, OAuth một lần, folder mặc định/link có sẵn; token ACL ngoài bundle/Git; copy/check backup hoàn tất, không xóa cloud, chạy SYSTEM sau backup/thử lại mỗi giờ, chống trùng, lỗi upload không hỏng local, trạng thái/log | Bổ sung 19/10/2026 |

## Kiểm tra sau thay đổi

Mỗi lần làm xong một tính năng, người thực hiện phải tạo một mục kiểm tra mới và đánh dấu từng dòng sau:

- [ ] Đã đọc lại toàn bộ `FEATURE-CHECKLIST.md` sau khi code xong.
- [ ] Đã đối chiếu yêu cầu khách hàng và ghi rõ các ID chức năng bị ảnh hưởng.
- [ ] Đã kiểm tra lưu dữ liệu thật sau khi tải lại ứng dụng.
- [ ] Đã kiểm tra quyền Admin và Nhân viên.
- [ ] Đã kiểm tra dữ liệu rỗng, `null`, lỗi mạng và dữ liệu không hợp lệ.
- [ ] Đã kiểm tra các file Excel liên quan bằng cách mở và đọc lại nội dung.
- [ ] Đã chạy `npm.cmd run verify` và tất cả bước đều đạt.
- [ ] Đã kiểm tra đúng profile TEST/PRODUCTION trước khi build.
- [ ] Nếu bàn giao: đã tăng phiên bản, build lại, kiểm tra file cài và tạo SHA256.

## Nhật ký xác minh

### 2026-11-03 — Bàn giao ZIP tồn dự kiến và phiên12h

- Đọc/đối chiếu checklist STOCK-01/05, ORDER-01/02/03/07, AUTH-01/02/03, USER-01/02, PRODUCT-01/02/03, REPORT-01..08, EXCEL-01, UI-01, DB-03/04. Tồn dự kiến đã duyệt; cập nhậtweb hoãn. Không thay công thức tiền/tồn thực tế hoặc đơn cũ.
- Source verify cuối63data/58UI/Electron/build/productionaudit0 exit0 (.local/forecast-verify-release-20261103.*). MySQL501draft không giới hạn500, delete/save/confirm/cancel/negative/period/staff no-cost; business/permissions/session;unit10/10 exit0. UI Admin/staff đọc XLSX thật/self-exclusion/softsave; đã xem ảnh actual UI và packaged.
- Hai lượt source cũ fail do assertiontd cần chọn actualbadge khi thêmforecasttext và startupPGLitebudget5s không giống fixture45s; giữ kiểmactualexact4tấm, thêmforecastassertion, không bỏtest/businessassertions. Lượtmake đầu ASAR28byte rỗng do globlegacy dùng minimatch11; tách @electron/asar build-onlyglob7.2.0/minimatch3.1.5, Excelruntime11, productionaudit0; regressionASARpackage.json+glob/XLSX pass vàmake/audit lại. Không gửi bản lỗi.
- MakeLOCAL/auditASAR; EXEthật HTTPS/MySQL:forecast/Excel/save/self-exclusion/confirm80/delete/period không trừhai lần;sessionoffline2phút/30phút/4giờ, ngắtAPI/phục hồi giữ form/deadline,expiry401;relogin5vòng/late401/logoutmạnglỗi;permissions/report/customer0/revenue/mã/màu/stockreason/rename/PNG/XLSX đều exit0. Installer càiđè/defaultlauncher đúngasar mới đạt. Logs .local/forecast-release-*-20261103.*; orchestration-final exit0.
- Đã thay E:\outputt\Oufeidun-Local-0.1.1 và ZIP374.526.066byte, SHA256 A0F14CF1FB72740A2EFCDAC9E30B883E1DB20C8F1A49BB689A0534449B37930F; Setup175.265.792byte SHA256 F4A861EAA5CC40C43BDB7A33793E45D63530F4581118FFF5677DB57CEE9ABE54. Audit1.171file folder/ZIP/source/API/migrations/setup/asar/PS/privateconfig pass;3guides khớp03/11.
- Bộ29/10 giữbackup E:\outputt\_BACKUP\Oufeidun-0.1.1-before-forecast-20261103-223043; hashZIPcũ DDA8B5F36212B662C5FB0A97B2CAF6BEEA3CD058695D0D18724982979E830C5B không đổi.0.2.18 không thay. API/migration013 trước app mọi máy, giữdata/config/loginlại1lần. Không DB/máy vật lý khách/updaterweb/pushGit. Chi tiết docs/RELEASE-0.1.1-2026-11-03.md.

### 2026-11-03 — Hoàn tất source phiên12h, tồn dự kiến tiếp tục chờ duyệt

- Đọc/đối chiếu checklist, ưu tiên AUTH-01/02/03, USER-01/02, ORDER-01, DB-03/04 và UI-01. Tách presence90s khỏi deadline12h tuyệt đối. Giữ khóa/reset/xóa/revoke/one-token, chống token thay giữa đọc/touch. Không sửa kho dự kiến/tiền/đơn/giá/quyền hoặc Supabase online; config cũ nhận mặc định, không sửa file khách.
- MySQL013 additive deadline nullable; legacy token NULL login một lần, không tự gia hạn. Re-run2lần giữ tất cả account rows và snapshots đơn/tồn/giá. Config SESSION_MAX_SECONDS43200 optional300–86400, không heartbeat gia hạn. Chi tiết docs/SESSION-LIFETIME-2026-11-03.md.
- Unit auth10/10 và MySQL integration mới1/1 không skip đạt:offline120/1800/14400s,deadline12h không kéo dài,legacyNULL/expiry/logout/reset/disable/enable/delete; same-device relogin ngay;2device tranh claim chỉ1thắng, token cũ401; giữ dữ liệu nghiệp vụ. Hồi quy MySQL cũ và permissions/report riêng1/1 mỗi suite đều exit0. Logs .local/session-lifetime-unit/api-regression/permissions/mysql-final-20261103.*.
- Verify cuối exit0 (.local/session-lifetime-verify-release-20261103.*):60data/56UI/Electron smoke/TypeScript/build/audit production0. Lượt đầu1toast assertion nháp lỗi dù đơn đã bán; chạy riêng pass và các lượt full sau56/56, không sửa test/app hoặc tăng timeout. Lượt thứhai chức năng pass nhưng audit mới chặn8moderate do minimatch; giữ log thất bại.
- Đã pin minimatch11.0.1 chỉ trong dependency subtree ExcelJS, giữ ExcelJS4.4.0 và API. Theo GHSA-g3hv-75wg-m249; compatibility test nén glob chọn2file+XLSX write/read giữ SKU/lượng/tiền, bản cuối1/1 pass. Root/server audit --omit=dev đều0; không tuyên bố audit toàn bộ dev dependencies sạch. Package-lock được cập nhật; không audit fix --force/downgrade ExcelJS/ẩn cảnh báo.
- Build LOCAL exit0; native Electron source thật qua signed HTTPS/MySQL test exit0 (.local/session-lifetime-native-20261103.*):giả lập mất liên lạc2phút/30phút/4giờ bằng last_seen, giữ cùng token/deadline/form; ngắt upstream API thật rồi bật lại, không login và giữ form;deadline thật hết thì login. Native relogin source5vòng đúng1request/vòng,401 muộn/logout mạng lỗi cũng exit0. Không cho máy phát triển sleep hoặc truy cập máy/DB khách.
- PS installer parse pass, thêm cấu hình mặc định cho cài mới; update cũ không cần edit config. Chưa EXE/installer/ZIP hoặc thay release29/10; cần API+migration013 trước rồi app các máy để nhận cả fixes30/10. Không commit/push. Tồn dự kiến vẫn chờ khách xác nhận.

### 2026-10-30 — Bổ sung lỗi phải đăng nhập nhiều lần

- Đọc lại/đối chiếu AUTH-01/02/03, USER-02, UI-01, ORDER-01, DB-03 và các quy tắc đang có. Tiền/tồn/quyền/chứng từ/schema không đổi. Chi tiết bổ sung ở docs/SESSION-DISCONNECT-2026-10-30.md.
- Request LOCAL trước sửa có thể nhận401 cũ rồi xóa token mới, hoặc workspace cũ tải muộn đưa dữ liệu phiên trước lên màn hình. Logout cũ cũng luôn xóa token khi kết thúc; logout mạng lỗi khiến UI còn màn làm việc nhưng token đã mất và promise không bắt lỗi.
- Sửa request giữ token lúc gửi, SESSION_STALE bỏ kết quả cũ, không đụng token mới. Login không gửi Bearer cũ/không phụ thuộc token cũ bị clear trong lúc chờ. Logout chỉ clear token của mình; UI luôn đóng trong finally, gọi qua run và khóa nút khi busy, giữ xác nhận bỏ giỏ.
- Verify exit0:58data/56UI/Electron smoke/TypeScript/build/audit0 (.local/session-relogin-verify-20261030.*). Ca mới bổ sung sau lượt data được chạy lại riêng toàn bộ nhóm5/5 exit0 (.local/session-relogin-races-20261030.*), thực thi client source transpile/VM với transport mock, không mirror helper. Server unit+auth mock9/9 exit0; cùng device login ngay, khác device active vẫn409.
- Build LOCAL và native Electron staff exit0 (.local/session-relogin-local-build-20261030.*; session-relogin-native-20261030.*):5vòng logout/login, mỗi vòng đúng1request login; chủ động giữ401 cũ đến sau login mới và chờ response hoàn tất, heartbeat mới vẫn hợp lệ;logout lỗi mạng vẫn thoát local và login lại đúng1lần. Không giao dịch kho/đơn hoặc dùng account/DB khách.
- Chưa build lại EXE/ZIP hoặc thay release29/10. Đây là các lỗi đã tái hiện/sửa trong source; cần cập nhật app để khách nhận. Chưa có log thực tế để khẳng định từng lần khách bị do cùng nguyên nhân hoặc giải thích giờ17h.

### 2026-10-30 — Điều tra app quay về đăng nhập gần 17h

- Đối chiếu AUTH-01/02/03, USER-01/02, UI-01, ORDER-01 và DB-03; đọc lại quy tắc/checklist, không thay nghiệp vụ tiền/tồn/đơn/chứng từ. Chi tiết docs/SESSION-DISCONNECT-2026-10-30.md.
- Tái hiện callback cũ: SERVER_UNAVAILABLE/AbortError/HTTP_500 cũng setData(null) như SESSION_REQUIRED. Sửa heartbeat chỉ expiry rõ ràng mới về login, lỗi mạng giữ form/giỏ và thử lại. Chặn overlap/kết quả phiên cũ sau cleanup. Electron backgroundThrottling=false.
- Không thấy lịch thoát17h trong source. Auth chạy clock/DB mock trước/sau17h và09h/23h có cùng lease90s; 25/89s hợp lệ, 91s bị401. Backup default23h/Drive mỗi giờ không stop API; tác vụ thực tế khách chưa được truy cập.
- npm.cmd run verify exit0:54data/56UI/Electron smoke/TypeScript/build/audit0. Server unit+auth expiry8/8 exit0, không skip. Build LOCAL exit0. Logs .local/session-fix-verify-20261030.* và session-fix-server-20261030.*.
- BAT diagnostic parse/chạy trên máy phát triển đạt, không thay task/config/DB hoặc đọc token. Có thêm metadata WLAN/NetworkProfile và adapter không SSID/IP/MAC. Bộ chẩn đoán riêng E:\outputt\Oufeidun-ChanDoan-DangXuat-20261030.zip chỉ BAT+script, không app/config/DB.
- Native LOCAL Electron đạt exit0 (.local/session-fix-native-final-20261030.*): thu nhỏ thật >90s vẫn >=4 heartbeat; API mock503/500/network/timeout giữ form chưa lưu và tự phục hồi;401 về login; không mutation. Lượt đầu test đọc sai getLastWebPreferences, sửa harness dùng getBackgroundThrottling được khai báo Electron API, không đổi app/giảm assertion; cleanup destroy cửa sổ test tránh prompt đơn chưa lưu. Giữ log thất bại cũ.
- Khách xác nhận đúng1máy chủ+1máy nhân viên; chỉ nhân viên out. Chưa build EXE/ZIP app, release29/10 chưa có sửa30/10; chưa truy cập máy/dữ liệu khách hoặc xác định tác nhân đúng17h. Ưu tiên chạy diagnostic trên máy nhân viên rồi đối chiếu máy chủ cùng thời điểm.

### 2026-10-29 — Đóng gói LOCAL 0.1.1 theo yêu cầu gửi khách

- Đã đối chiếu checklist và BA mới về AUTH/USER/PRODUCT/PRICE/STOCK/ORDER/REPORT/AUDIT/IMAGE/EXCEL/UI/DB-03. Không sửa logic sau hai lượt verify source cuối đạt 52 data/56 UI mỗi lượt. Cập nhật guide đúng quyền/alias/pending vốn/chi tiết report/migrations 011–012, giữ version 0.1.1.
- LOCAL/Forge Squirrel make đạt. Package audit đúng profile/version/discovery/lookup và không source/tests/private config. EXE vừa build qua HTTPS/MySQL test đạt quyền mới/default/cấp-thu hồi/nhập lượng/Excel/pending/bán-tặng-mẫu/Excel chi tiết; Admin/staff report/customer/mã/màu/11 biến động; chỉnh tồn/history/audit/Excel; đổi mã/alias/nháp/PNG/XLSX. Installer cài đè cùng version exit 0, installed asar khớp package; default launcher đúng app mới trong profile test.
- Đã thay E:\outputt\Oufeidun-Local-0.1.1 và ZIP. Audit 1.167 checksum/từng entry ZIP trước/sau promotion, API/source/migrations/setup/asar/PowerShell và guide ba nơi khớp. Không config/DB/chứng chỉ riêng. Bộ cũ nguyên vẹn tại E:\outputt\_BACKUP\Oufeidun-0.1.1-before-permissions-20261029-130649, hash ZIP cũ 84292CB412D6FA1809DA309BF68734D18A75669A32A54D39570DE6B3165662C2; 0.2.18 không đổi.
- ZIP 373.913.857 byte, SHA256 DDA8B5F36212B662C5FB0A97B2CAF6BEEA3CD058695D0D18724982979E830C5B. Setup 174.969.344 byte, SHA256 BE7CF5853FDEADC6966454C602BDF644B6B385F3195C322CD3B7BADD0F401ABF. Logs .local/release-011-*-20261029.* exit cuối 0, metadata artifacts JSON/progress có PASS.
- Cập nhật API/migration trước rồi app mọi máy, giữ data/config; không clean/reset/nhập lại DB. Chưa DB/hai máy vật lý/router/UAC/reboot/OAuth khách, installer chưa ký thương mại. Chi tiết docs/RELEASE-0.1.1-2026-10-29.md.

### 2026-10-29 — Phân quyền tài khoản, nhập lượng không vốn và chi tiết bán sản phẩm

- Đã đọc lại checklist và đối chiếu AUTH-01/02/03, USER-01/02, PRODUCT-01..04, PRICE-01..04, STOCK-01..04, CUSTOMER-01..03, ORDER-01..11, IMAGE-01/02/03, EXCEL-01, REPORT-01..08, AUDIT-01, UI-01/02 và DB-03. Quy tắc mới đầu BA-SPEC/checklist ưu tiên hơn lịch sử quyền 17/10.
- Admin cấp bảy quyền theo account, version/audit, API kiểm từng request/replay; staff mới cơ bản, legacy giữ nghiệp vụ trừ quản trị tài khoản chỉ Admin. Nhập staff một mã/Excel hai cột không vốn, bảo toàn giá/vốn cũ; mã mới pending vốn, chưa chốt bán trước Admin thiết lập. MySQL 012 bổ sung quyền/version/cost_configured; không đổi role/tiền/tồn/config.
- Chi tiết từng sản phẩm theo ID, nhãn snapshot/current, từng đơn/Sales/khách/bán-tặng-mẫu/đặt-giao-trả-net/giá/thành tiền; phân trang 200 và xuất đủ kỳ. API đối chiếu 204 dòng = 200+4, export đủ, net doanh thu khớp tổng hợp, loại nháp, giao thiếu/giao bổ sung/trả/đổi mã, staff không vốn/lợi nhuận. Đọc cùng snapshot.
- Đã sửa lỗi report reset theo polling workspace 10 giây và xuất khi busy: tách dependency tải report khỏi dữ liệu polling, refresh report có revision riêng, khóa xuất khi chưa sẵn sàng. Test thật qua 11 giây dùng MutationObserver và đọc workbook; không tăng timeout hoặc bỏ test màu/Excel đã phát hiện lỗi.
- **Hai lượt cuối đầy đủ đều exit 0**: mỗi lượt verify 52 data/56 UI/Electron smoke/TypeScript/build/root production audit 0, server unit 7, MySQL integration cũ + API quyền/report mới không skip, LAN, LOCAL build và bốn bộ Electron nguồn HTTPS/MySQL (quyền/nhập/Excel chi tiết; report/khách/mã/màu; chỉnh tồn; đổi SKU). Đã xem ảnh popup rộng/đủ cột/staff không vốn. Server audit cuối 0.
- Backup thật cả hai lượt có SQL/ảnh/config/checksum, cột/dữ liệu quyền và cờ vốn/alias/snapshot; mock upload lỗi vẫn giữ local hoàn tất. CLEAN cả hai lượt preview/rollback/bảng lạ/chạy lại và giữ mọi trường account/quyền/version/session/migrations. Thêm hai bảng alias vào allowlist CLEAN cho schema mới; không chạy dọn trên DB khách.
- Logs `.local/staff-permissions-final-*-20261029.*`: mọi exit bằng 0, progress có ALL TWO ROUNDS PASS. Dist cuối LOCAL. Chưa thay EXE/ZIP ngày 24/10 (hash cũ giữ nguyên), chưa installer/DB khách/Supabase online/hai máy vật lý/OAuth/restore DB. Hướng dẫn, bằng chứng và giới hạn: docs/STAFF-PERMISSIONS-AND-PRODUCT-REPORT-2026-10-29.md.

### 2026-10-28 — Đổi mã sau bán, alias và nhãn chứng từ

- Đã đọc lại checklist/đối chiếu PRODUCT-01/02/03, AUTH-03, PRICE-01..04, ORDER-01/02/03/06/07, STOCK-01..04, REPORT-01..07, AUDIT-01, IMAGE-01/02/03, EXCEL-01 và DB-03. Áp dụng phương án A đã duyệt; quy tắc mới và phạm vi ở đầu BA-SPEC/checklist.
- MySQL 011 thêm alias/lịch sử, seed tên hiện tại và snapshot NULL, không hồi tố tiền/tồn hoặc ghi đè nhãn có sẵn. Nháp/đơn/chứng từ giữ mã cũ, danh mục/dòng mới dùng mã mới; alias resolve cho tìm kiếm và cả hai loại Excel; chống trùng tên/ID, rollback/concurrency/idempotency. Quyền vốn/nhập giữ nguyên.
- Verify exit 0: 51 data/54 UI/Electron smoke/TypeScript/build/audit production 0; server unit 7/7; MySQL thật không skip đạt. LOCAL build và Electron nguồn + HTTPS/discovery/MySQL Admin/staff, native workbook/PNG, alias/nháp/lịch sử/tồn/giá/vốn đạt. Đã xem ảnh native staff không có vốn.
- Backup thật chứa alias/lịch sử/snapshot, SQL/ảnh/config/checksum; giả lập cloud lỗi vẫn giữ local hoàn tất. Không thử OAuth khách/restore DB lần này. Bộ regression và ca mới chi tiết tại docs/PRODUCT-RENAME-TEST-2026-10-28.md.
- Đã trả dist về LOCAL. Chưa thay EXE/ZIP bàn giao 24/10 hoặc DB máy khách, không Supabase online. Khi phát hành cần API/migration và mọi client; chưa ép phiên bản client tối thiểu. Mật khẩu bảo vệ là yêu cầu riêng chưa triển khai.

### 2026-10-24 — Điều chỉnh số lượng tồn có lý do

- Đã đọc lại checklist, đối chiếu STOCK-01/04, PRODUCT-01, PRICE-01/04, ORDER-01/02/03/05/07, AUTH-03, AUDIT-01, REPORT-01..07, EXCEL-01, IMAGE-01/02/03 và DB-03. Chi tiết ảnh hưởng/thiết kế: docs/STOCK-ADJUSTMENT-2026-10-24.md.
- Đưa nút Điều chỉnh tồn lên đầu trang, thêm Chỉnh tồn từng mã. Giảm/tăng/tồn thực tế, xem trước/sau, bắt buộc lý do. Dùng adjustment/stock_version/idempotency hiện có, không ghi thẳng tồn qua form sửa sản phẩm. API đọc thêm lý do trong history/report và audit nhận adjustment; Excel thêm cột lý do thứ 8, giữ mã đơn cột 7. Không migration MySQL mới.
- MySQL integration thật 1/1 không skip đạt: giảm/tăng/0, lý do trống/khoảng trắng, số âm/lẻ/quá giới hạn, thiếu/stale stock_version, retry không lặp, hai yêu cầu đồng thời chỉ một thành công, thiếu tồn chặn bán/rollback, tăng đủ bán nháp cũ được; giá/vốn/price_version/đơn/nháp/doanh thu giữ nguyên. History/audit/report đủ lý do/người; nhân viên điều chỉnh được nhưng không nhập hàng hoặc xem vốn.
- `npm.cmd run verify` exit 0: 50 data/53 UI/Electron smoke/TypeScript/build/audit production 0. UI Admin/staff giảm 48→45, tăng 47, kiểm kê 0, reload, reason/history/audit và workbook thật đạt. Đã xem ảnh form; không tràn. Server unit 7/7 và audit server 0.
- Audit phát hiện cảnh báo thư viện mới: pin Zod 4.6.6 rồi chạy lại verify; server multer 2.5.0/body-parser 2.4.0 rồi chạy lại unit/MySQL/upload thật/ảnh giả. Cả root và server audit production 0; không `audit fix --force` hoặc cập nhật hàng loạt.
- Build LOCAL/Forge Squirrel đạt; native HTTPS/discovery/MySQL Admin/staff điều chỉnh phụ kiện 10→7→9→0, chặn thiếu lý do/vượt tồn, history/audit/Excel thật có lý do, giữ giá/vốn và mọi mã không liên quan. Native report regression vẫn đúng 7 đơn synthetic/9.740.000đ/phí 30.000, mã/màu/11 biến động, khách 0/An-Ân và quyền. Lượt đầu fixture native dùng SKU viết thường trong khi API chuẩn hóa hoa; sửa fixture, chạy lại đủ assertions cả hai vai trò đạt.
- Installer cài đè cùng 0.1.1 exit 0, installed asar khớp package; default launcher mở đúng app mới, profile test riêng. Logs `.local/stock-adjustment-*-20261024.*` và `.local/release-011-*-20261024.*`; các lượt cuối bắt buộc bằng 0. Không thử trên DB/hai máy vật lý khách, không OAuth Google thực tế.
- Đã thay folder/ZIP E:\outputt\Oufeidun-Local-0.1.1. Audit đủ 1.162 checksum file folder/ZIP/source/API/migrations/asar/installer/PowerShell, không config riêng, ba guide khớp nguồn. ZIP 373.905.305 byte, SHA256 84292CB412D6FA1809DA309BF68734D18A75669A32A54D39570DE6B3165662C2; Setup 174.963.712 byte, SHA256 D4A62266ABCA518905E7A7258AA7A975D8AFB6D516304989EBD85C638CB7C6B5.
- Giữ folder/ZIP 23/10 tại E:\outputt\_BACKUP\Oufeidun-0.1.1-before-stock-adjustment-20261024-144708, hash ZIP cũ không đổi; 0.2.18 giữ nguyên. Hướng dẫn mới ngày 24/10: cập nhật API trước rồi app mọi máy, không reset/config lại. Chi tiết docs/RELEASE-0.1.1-2026-10-24.md.

### 2026-10-23 — Đóng gói lại LOCAL 0.1.1 sau sửa doanh thu

- Đã đọc lại checklist và đối chiếu REPORT-01..07, ORDER-01/02/03/05/06/07/09/10, STOCK-01, AUTH-03, EXCEL-01, IMAGE-01/02/03, PRODUCT-01 và DB-03. Verify 48 data/51 UI/Electron/build/audit 0, server 7/7, MySQL integration và cả hai ca ghi xen kẽ report/workspace đều đạt như nhật ký trước.
- Build LOCAL/Forge Squirrel đạt. Native Admin/staff HTTPS/discovery/MySQL kiểm khách số 0/An-Ân, mã đơn/màu/quyền, 11 biến động và XLSX khớp DB. Thêm kiểm doanh thu/Excel theo ngày đặt sau hủy/trả/giao bổ sung: 7 đơn synthetic/9.740.000đ/phí 30.000, không cộng hai lần hoặc theo tiền thu. Đọc/xuất giữ toàn bộ tồn/vốn. Đã xem ảnh Admin/staff, staff không vốn/lợi nhuận.
- Screenshot đầu timeout do cửa sổ test ẩn; harness bật background rendering/show trước capture, chạy lại sau installer đạt cả hai vai trò. Lần đầu gọi PS vướng execution policy; gọi lại process riêng `-ExecutionPolicy Bypass` đạt, không thay policy hệ thống. Không sửa nghiệp vụ hoặc bỏ assertion để vượt test.
- Installer silent cài đè cùng 0.1.1 exit 0, installed asar khớp package; default Update.exe mở đúng app 0.1.1 với profile test riêng. Tất cả lượt cuối `.local/release-011-*-20261023.exit` bằng 0.
- Đã thay E:\outputt\Oufeidun-Local-0.1.1 và ZIP. Audit 1.162 checksum từng file folder/ZIP, source API/migrations/asar/installer, PowerShell parse, không cấu hình riêng và ba bản guide khớp đạt. ZIP 373.891.813 byte, SHA256 9C94B1C9A7D2C19BA6CEDF96118314103299443B45C95753AA2B4628A57E8F2D; Setup 174.964.224 byte, SHA256 2E404D91FB8E09138B21B2ADEF726B45993E95C871F63BE592179E18ADE2FB99.
- Giữ folder/ZIP trước tại E:\outputt\_BACKUP\Oufeidun-0.1.1-before-revenue-20261023-115243, ZIP cũ không đổi hash; 0.2.18 không thay. Cập nhật API máy chủ trước rồi app mọi máy dù cùng version; giữ data/config. Chưa kiểm trực tiếp DB/máy vật lý/OAuth Google khách. Chi tiết docs/RELEASE-0.1.1-2026-10-23.md.

### 2026-10-23 — Rà chéo các phần tính tiền/ngày và dữ liệu đọc đồng thời

- Đã đọc lại checklist và đối chiếu ORDER-01/02/03/05/06/07/09/10, PRICE-04, STOCK-01, IMAGE-01/02, EXCEL-01, REPORT-01..07, AUDIT-01, AUTH-03 và DB-03; chi tiết docs/CROSS-MODULE-AUDIT-2026-10-23.md.
- Sửa thêm report và workspace đọc cùng snapshot chỉ đọc (`REPEATABLE READ`, `WITH CONSISTENT SNAPSHOT, READ ONLY`), commit/rollback/release ở mọi nhánh. Trước đó tổng đơn/số đơn/phí/tồn/dòng hàng/thu tiền có thể thuộc những thời điểm khác nhau khi hai máy cùng thao tác. Không đổi các transaction ghi hoặc dữ liệu/config khách.
- Period chặn ngày lịch không tồn tại và tối đa366 ngày tính đủ2đầu (trước có thể367). Giữ ngày đặt cho doanh thu/chứng từ và ngày thao tác thực tế cho sổ kho/lịch sử.
- MySQL integration thật 1/1 không skip đạt: cố ý bán một đơn3dòng giữa các SELECT report; cố ý giao bổ sung/thu đủ giữa SELECT workspace; lần đọc giữ nguyên trạng thái cũ đầy đủ và lần sau thấy đủ thay đổi. Đối chiếu mọi đơn/nháp: tổng dòng+phí, tiền thu+còn thu, lịch sử giao; nháp không xuất kho, từng mã đầu+tăng-giảm=cuối. Giữ đầy đủ các ca hồi quy cũ.
- `npm.cmd run verify` exit0:48data/51UI/Electron smoke/TypeScript/build/audit0. Server unit7/7 đạt, gồm ngày không nhuận/rollover/đảo/366vs367ngày. Logs `.local/cross-audit-*-20261023.*`.
- Chưa có thêm lỗi cộng nháp/lấy tiền thu làm doanh thu trong các ca đã rà. Chứng từ gốc vẫn giữ tổng gốc khi có trả; báo cáo thuần và sổ kho theo hai mốc ngày có chủ đích. Danh sách tối đa500 đơn không phải nguồn cộng tổng báo cáo.
- Chưa tạo lại EXE/ZIP, chưa truy cập dữ liệu/máy vật lý khách; cập nhật cần API và app, giữ config/data.

### 2026-10-23 — Doanh thu đúng ngày đặt, loại nháp, không theo tiền thực nhận

- Đã đọc lại checklist và đối chiếu REPORT-01/02/03/04/06/07, ORDER-03/05/06/07/09/10, AUTH-03, STOCK-01 và DB-03. Không đổi dữ liệu lịch sử/config/migration MySQL hoặc bộ phát hành cũ.
- Nguyên nhân: report dùng confirmed_at trong khi danh sách dùng ordered_at; cùng một ngày lọc hai tập đơn khác nhau. Thẻ doanh thu cũ không bao gồm phí. Chưa có DB khách để kết luận đơn nháp cụ thể có bị đổi trạng thái hay không; nháp chưa xác nhận vốn NULL confirmed_at.
- API và demo thống nhất ngày đặt, trạng thái xác nhận rõ ràng, doanh thu gồm sản phẩm thực giao sau trả và phí một lần. App/Excel dùng chung tổng tương thích API cũ, không cộng phí lặp. Không truy vấn tiền đã thu để tính doanh thu.
- `npm.cmd run verify` exit 0: 48/48 data, 51/51 UI, Electron smoke, TypeScript/build, audit 0 vulnerabilities. Đã build:local lại sau verify, runtime local-mysql. MySQL integration thật 1/1 không skip và server unit 6/6 đạt; logs `.local/report-fix-*-20261023.*`.
- MySQL tái hiện bằng 8 đơn synthetic theo số tiền trong ảnh = 11.050.000đ + nháp ngày mai; nháp cùng ngày/xóa, 0đ/mẫu/thiếu/phí, ba mức thanh toán, ngày VN biên 00:00/23:59, đơn bán ngày mai, lọc hai ngày, sửa ngày, hủy/trả/giao bổ sung, quyền Admin/staff và bất biến tồn/đơn đều đạt. Không sử dụng DB thật của khách.
- UI tải/đọc workbook thật đối chiếu số đơn/tiền sản phẩm/phí/tổng chính xác; ngày mai có nháp vẫn 0. Đã xem screenshot `test-results/report-business-date.png`, bố cục rõ, không tràn.
- Không đóng gói EXE/ZIP trong lần này. Bộ 0.1.1 ngày 21/10 chưa có sửa này; cần đóng gói và cập nhật API + app để khách nhận đủ. Chi tiết: docs/REPORT-REVENUE-2026-10-23.md.

### 2026-10-21 — Build 0.1.1 theo yêu cầu, giữ nguyên 0.2.18

- Đổi metadata app/API/lockfiles sang 0.1.1, giữ toàn bộ sửa lỗi hiện tại và dữ liệu/config. Không đổi migration nghiệp vụ. Readiness cần khớp phiên bản kể cả số thấp: dùng capability discovery để nhận diện API hiện đại, giữ fallback cho legacy thật; kiểm discovery dựa trường health thay mốc 0.2.13. Tests/server-health-version.ps1 có bảy tình huống và deployment-config đạt.
- Verify 46 dữ liệu/50 UI/Electron/build/audit đạt; MySQL integration, make LOCAL và package audit đạt. EXE cả Admin/staff trên HTTPS/discovery/MySQL kiểm khách 0/An-Ân, danh sách chia sẻ, 11 biến động và Excel/mã/màu/quyền/tồn/vốn đạt. Log .local/release-011-*-20261021.* exit 0.
- Installer 0.1.1 cài đè 0.2.18 thành công, installed asar khớp package; đường mở Update.exe mặc định chạy đúng app-0.1.1. Lượt test launcher đầu chịu ELECTRON_RUN_AS_NODE của môi trường công cụ; bỏ flag riêng trong fixture rồi kiểm lại đạt, không sửa app. Chưa kiểm trên máy vật lý/dữ liệu khách.
- Tạo riêng folder/ZIP E:\outputt\Oufeidun-Local-0.1.1, 1.162 checksum folder/ZIP đúng source API/migrations/setup/asar, PowerShell parse/private config và ba hướng dẫn đạt. Bộ 0.2.18 không đổi, ZIP vẫn hash 8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C.
- ZIP 373.887.050 byte, SHA256 ED5BCDCFE643D6DAC8C4B6ACAA4B8F79ED119B18C7262C707893C5130A05B7D5. Setup 174.961.664 byte, SHA256 C8C85A4CE6B794F7E8B7E64185544111D07069DAFD6B34123CBDC3BB54F2D1D3. Khách cập nhật API máy chủ trước rồi app, giữ config/DB. Chi tiết docs/RELEASE-0.1.1-2026-10-21.md.

### 2026-10-21 — Kiểm thử lại toàn bộ sau khi bàn giao, theo yêu cầu khách

- Không sửa logic app hoặc thay ZIP. Verify chạy lại đạt 46 dữ liệu/50 UI/Electron/build/audit; API syntax/unit 6/6, MySQL integration thật và LAN 1/1, server audit 0 lỗ hổng. Các luồng khách 0/khôi phục/rerun migration, giá/quyền/nháp/bán-tặng-mẫu/giao thiếu/trả/hủy/chứng từ đều được chạy lại.
- Packaged Admin qua HTTPS/MySQL đạt luồng bán/tặng/mẫu/giữ giỏ/nháp cũ, ngày/phí/ghi chú/model, PNG/Excel thật/Cancel, tồn, nhập catalog 3/9 cột và giá chung/thử lại sau lỗi mạng. Packaged staff đạt sửa mã giữ vốn, giá chung, chốt/trả/đổi đơn Admin, đủ trang, không nhập/tồn đầu/đọc vốn; đã xem ảnh kho/báo cáo staff. EXE hai role kiểm riêng khách 0/An-Ân và chia sẻ danh sách, 11 biến động báo cáo khớp XLSX/DB, giữ mã/màu/quyền và toàn bộ tồn/vốn.
- Backup SQL/ảnh/config/checksum và cloud hook lỗi đạt; rclone filesystem remote thật, retry/khóa/chống backup hỏng/không xóa cloud đạt. Setup Drive OAuth/task mock đạt. Cấu hình/relocation/copy/ACL và các ca lỗi/hủy/rollback/clean orchestration đều đạt trong fixture. Cài đè 0.2.18 đạt, installed asar khớp package.
- Harness cũ trùng cổng 8787 với dịch vụ cũ và thiếu cờ tạo chi phí: chuyển test sang 8798, bật LAN và ORDER_DETAILS=1 cho đúng fixture; không thay app hoặc dừng dịch vụ cũ để vượt test. Console lỗi mạng/checksum/upload trong ca giả lập là dự kiến, không phải lỗi chưa xử lý.
- Tất cả lượt cuối `.local/full-retest-20261021-*.exit` bằng 0. Audit 1.162 file folder/ZIP đạt; ZIP vẫn SHA256 8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C. Không kiểm tài khoản Drive/hai máy vật lý/dữ liệu thực khách. Báo cáo đầy đủ: docs/FULL-RETEST-2026-10-21.md.

### 2026-10-21 — Bàn giao lại LOCAL 0.2.18, sửa danh mục khách hàng

- Đã ghi đè E:\outputt\Oufeidun-Local-0.2.18 và ZIP, giữ version theo bộ hiện tại. Bộ 20/10 nằm ở E:\outputt\_BACKUP\Oufeidun-0.2.18-before-customer-identity-20261021-173959; backup folder và ZIP đối chiếu checksum đạt. Bộ 0.2.17 không đổi.
- Verify 46 dữ liệu/50 UI/Electron/build/audit exit 0 (.local/customer-identity-verify-20261021.log); MySQL integration phục hồi An/Ân, migration chạy lại và bảo toàn đơn/tiền/tồn/vốn đạt. Make LOCAL maker-squirrel exit 0 (.local/release-20261021-make.log).
- Package audit đúng LOCAL/version/discovery/lookup, không source/test/private config. tests/local-report.electron.cjs --customers kiểm EXE mới trên HTTPS/discovery/MySQL thật cả Admin/staff: ba khách cùng 0 được tách kể cả An/Ân, staff thấy khách Admin mới tạo; đọc Excel thực tế, 11 biến động kho, mã đơn, màu SKU và quyền vốn/tồn không đổi đều đạt (.local/release-20261021-customers.log exit 0). Cài đè cùng 0.2.18 exit 0, installed asar khớp package (.local/release-20261021-installer.log).
- Audit 1.162 file staging/folder/ZIP, source API/migration 010/setup/asar khớp build; parse PowerShell, loại private config và ba hướng dẫn khớp nguồn đều đạt (.local/release-20261021-stage.log exit 0). Hướng dẫn yêu cầu backup/cập nhật API và migration 010 trên máy chủ trước, rồi app mọi máy; giữ config, không reset dữ liệu. Không thử trên dữ liệu/máy vật lý khách.
- ZIP 373.888.902 byte, SHA256 8E1AF631BFF5BB849220D306E7D5778670B6DE89260AE0846F951EE72589945C. Setup 174.961.664 byte, SHA256 A1EA9E4216516B86881114D02A7873E37933182EE35FD0E67AFC77BFF5942A5A.

### 2026-10-21 — Sửa khách hàng dùng số điện thoại 0

- ID ảnh hưởng CUSTOMER-01/02/03, ORDER-01/08, PRICE-03, AUTH-03, DB-03, UI-01. Unique phone/upsert cũ ghi đè khách cùng 0. MySQL 010 dùng khóa nhận diện tên+phone cho số toàn 0 (phân biệt dấu Việt), phone thật giữ nhận diện cũ; cập nhật theo ID đúng, tranh chấp cùng khách không trùng và khách khác không gộp. Khách hàng tự tải khi mở/mỗi 10 giây, giữ guard busy/modal/hidden.
- Recovery bảo thủ: nhiều tên trên đơn chưa xóa cùng customer_id tạm 0 còn active mới phục hồi từ snapshot/latest address và sửa liên kết. Giữ ID đơn/snapshot/tiền/tồn/vốn/version/updated_at; không làm sống khách chủ động xóa, không sao chép giá riêng hoặc tự đoán phone thật. Không tự phục hồi tên cũ chỉ vì người dùng chủ động đổi tên hồ sơ. Migration chạy lại sau gián đoạn đạt. Demo parity SQL riêng, không áp dụng Supabase online.
- Unit dữ liệu riêng và MySQL integration thật exit 0: tái hiện gộp khách 0, phục hồi cả An/Ân, nhiều khách/lưu lại nháp/đổi khách trên nháp/sửa trực tiếp hồ sơ, phone thật, cạnh tranh cùng/khác tên, staff, hai lần chạy migration và so toàn bộ số tiền/version/thời gian/tồn/vốn. Log .local/customer-identity-data-20261021.log và customer-identity-mysql-20261021.log. API syntax và unit 6/6 đạt.
- Verify cuối exit 0: 46 dữ liệu/50 UI/Electron/TypeScript/build/audit 0 lỗ hổng (.local/customer-identity-verify-20261021.log). Ca UI mới kiểm ba khách 0, An/Ân, lưu nhiều lần, reload, staff và nháp; lượt đầu script gặp selector Khách mới và toast cũ khi lưu lần hai, sửa script chọn Đơn mới và chờ hết busy trước thao tác tiếp, không sửa guard lưu giỏ để vượt test.
- Chỉ dùng database test tự tạo; không truy cập DB khách. Hướng dẫn 21/10 nêu API/migration 010 trước rồi app mọi máy, không đổi config/reset dữ liệu. Tình trạng đóng gói và hash sẽ được ghi ở mục bàn giao khi hoàn tất.

### 2026-10-20 — Cập nhật bộ bàn giao 0.2.18 và ZIP

- Đã đọc lại checklist và đối chiếu các mục báo cáo/màu mã hàng, AUTH-03, ORDER-07/08, IMAGE-03, REPORT-03/04/06/07, UI-01 và DB-03. Giữ 0.2.18 theo yêu cầu cập nhật bộ hiện có; không thay đổi logic sau verify 45 dữ liệu/49 UI/Electron/build/audit exit 0 ở .local/recheck-20261020-verify.log.
- Make LOCAL maker-squirrel đạt (.local/release-20261020-make.log). App đúng profile LOCAL/discovery/lookup, không chứa source/test/private config. Kiểm lại chính package mới bằng tests/local-report.electron.cjs: Admin và staff qua HTTPS/MySQL, đối chiếu 11 biến động trong XLSX thật, mã 899 và mã chữ/số 0 đầu, màu chữ, quyền vốn, giữ toàn bộ tồn/vốn đều đạt (.local/release-20261020-packaged-report.log). 899 là dữ liệu tự tạo trên DB test, không truy cập DB khách.
- Installer cài đè cùng version 0.2.18 exit 0; installed app.asar khớp package (.local/release-20261020-installer.log). Không sửa DB/config/dịch vụ khách. Hướng dẫn 20/10 ghi rõ máy chủ cập nhật API trước, sau đó xuất bộ client và cập nhật app mọi máy; riêng báo cáo/màu chữ không thêm migration mới.
- Đã ghi đè E:\outputt\Oufeidun-Local-0.2.18 và ZIP; giữ bộ trước tại E:\outputt\_BACKUP\Oufeidun-0.2.18-before-report-colors-20261020-173946. Backup folder/ZIP đối chiếu hash đạt. Audit staging/folder và đủ 1.161 entry ZIP khớp checksum/source API/migrations/setup/asar, PowerShell parse và loại private config đạt (.local/release-20261020-stage.log, exit 0). Bộ 0.2.17 giữ nguyên. Ba hướng dẫn trong bộ khớp nguồn.
- ZIP 373.889.894 byte, SHA256 8DAA8CA300A95D01578EE601A4F6D1E6978E03D59FF516F79BF236129B67488A. Setup 174.964.736 byte, SHA256 97B3A1044717EE63F859111FD7D8FBD0D79C14048F351FBC00AE1AEC9E38E579. Chưa kiểm trên dữ liệu/hai máy vật lý của khách; cần cập nhật đủ máy chủ/client tại cửa hàng.

### 2026-10-20 — Kiểm tra lại lần hai theo phản hồi khách

- Đã đọc lại checklist và đối chiếu AUTH-03, PRODUCT-03/04, ORDER-07/08, IMAGE-03, REPORT-03/04/06/07, UI-01, DB-03. Không phát hiện thêm lỗi nghiệp vụ trong các ca bổ sung; thay đổi lần này là kiểm thử và tài liệu, không đổi schema/data/config khách.
- Verify chạy lại exit 0: 45 dữ liệu/49 UI, Electron, TypeScript/build và audit 0 lỗ hổng (.local/recheck-20261020-verify.log). UI bổ sung tài khoản staff kiểm màu trên thẻ sản phẩm/kho/báo cáo và đọc XLSX không vốn. API unit 6/6, LAN 1/1, server audit 0 lỗ hổng.
- MySQL integration thật exit 0 (.local/recheck-20261020-mysql.log): thêm 000899, DH-CUSTOM-899 và mã có dấu/nháy đơn/dấu gạch chéo; đối chiếu từng biến động với database, không mất/trùng dòng; giữ 899 trên giao đầu/giao bổ sung/trả, hủy đúng mã và legacy null dự phòng đúng DH.
- Build LOCAL + electron-forge package phục vụ kiểm thử, package audit đạt: runtime LOCAL, không private config/source/test. tests/local-report.electron.cjs chạy packaged app qua HTTPS/discovery/MySQL thật, cả Admin/staff đều exit 0 (.local/recheck-20261020-packaged-report.log). Đối chiếu chính xác 11 dòng kho gồm tồn đầu/giao đầu/giao bổ sung/hủy/trả với XLSX tải từ EXE; mã có số 0 đầu giữ kiểu String trong Excel, 899 không đổi, màu CSS/XLSX đúng, staff không có cột vốn; toàn bộ tồn/vốn trước và sau xem/xuất giữ nguyên. Lượt đầu script chờ toast tải báo cáo không tồn tại; đã sửa script chờ file và mở XLSX thực tế, không sửa hành vi app để vượt test.
- EXE kiểm thử ở out/Oufeidun-win32-x64, app.asar SHA256 0A5ADD15FD25E5F842E3B1589A832C220F4D91C2049B2914B6E1918FECB83E22. Chưa make installer, thử cài nâng cấp hoặc thay bộ khách. ZIP E:\outputt\Oufeidun-Local-0.2.18.zip vẫn hash 8BF5CB3CA40B2EB037F2901327E33043921169EC6B12A999B501D0CBC73FB8DD; chưa có sửa ngày 20/10. Chưa nghiệm thu trên dữ liệu/hai máy vật lý của khách.

### 2026-10-20 — Mã đơn báo cáo và màu chữ trong app

- Đọc lại checklist sau code; đối chiếu PRODUCT-03/04, ORDER-07/08, IMAGE-03, REPORT-03/04/06/07, AUTH-03, UI-01 và DB-03. Mã 899 không còn bị thay bằng DH nội bộ trong báo cáo LOCAL; bổ sung liên kết đơn cho biến động trả hàng. Không migration hoặc sửa dữ liệu/config khách.
- Màu SKU trong thẻ sản phẩm, giỏ, kho, chi tiết đơn, giao/trả và báo cáo dùng chung Full viền đen/CNT vàng đậm/Không viền xanh; áp dụng cả Excel báo cáo. Giữ tiền/tồn/thứ tự và quyền vốn. Đã xem ảnh bản in test-results/order-category-colors-pdf.png.
- MySQL integration thật cô lập 1/1 đạt: mã tự nhập trên bán/giao bổ sung/trả/hủy, nhập kho không gắn đơn, legacy null dự phòng DH, Admin/staff không lộ vốn; kiểm tra tồn/doanh thu không đổi. API syntax/unit 6/6 đạt. UI riêng đọc XLSX thật và CSS/canvas/PDF đạt.
- npm.cmd run verify exit 0: 45 dữ liệu, 49 UI, Electron smoke, TypeScript/build và audit 0 lỗ hổng; .local/verify-20261020-report-colors.log. Lượt đầu gặp thiếu bộ nhớ V8; giới hạn test-concurrency=2 rồi chạy lại toàn bộ đạt, không bỏ test.
- Chưa đóng gói lại EXE/folder/ZIP 0.2.18. Khi phát hành cần cả API máy chủ và client; giữ DB/account/config. Xem docs/REPORT-CODE-APP-COLORS-2026-10-20.md.

### 2026-10-19 — Google Drive và màu chứng từ, build lại 0.2.18

- Đã đối chiếu lại checklist và các ID IMAGE-01/02/03, EXCEL-01, ORDER-01/02/07/08, DB-03/04, AUTH-03, UI-01. Giữ version 0.2.18 theo yêu cầu; bộ trước được backup trước khi thay. Màu từ loại danh mục dùng chung Excel/PNG/PDF, không đổi tiền/tồn/thứ tự. Đã xem ảnh thực `test-results/order-category-colors-pdf.png`.
- Verify exit 0: 44 dữ liệu, 49 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng; `.local/verify-018-drive-colors.log`. UI mới đọc lại font trong XLSX thật, bắt màu chữ canvas khi xuất PNG, kiểm tra bản in/PDF; tổng 77.000đ giữ đúng.
- Rclone chính thức v1.75.2 đã tải/kiểm SHA256/chạy thật. `tests/drive-backup.ps1` exit 0: copy/check tới remote filesystem cô lập, chỉ bản hoàn tất, checksum sai/traversal/link giả bị chặn, mất mạng/quota/token giả lập không đánh dấu thành công, retry khôi phục, khóa chạy trùng, giữ cloud-only và upload bản hợp lệ dù có backup cũ hỏng. `tests/drive-setup.ps1` exit 0: mặc định/link, đăng nhập no-output, task SYSTEM theo giờ, copy hook, chạy lại giữ account/config; OAuth và đăng ký task Windows dùng mock, không đăng nhập Google thật.
- Backup MySQL test thật gồm SQL/ảnh/config/checksum và PassThru đạt; thêm hook upload exit 1 vẫn tạo đủ bản local và trả đúng một object. PowerShell parse và cấu hình đổi folder/hostname/port đạt. Không chạy đăng ký task, OAuth hay upload dữ liệu khách.
- Hồi quy MySQL phát hiện deadlock khi hai máy tạo cùng mã do SELECT LOWER/FOR UPDATE quét rộng. Bỏ khóa ở bước kiểm tra trước; unique index migration 009 vẫn là chốt chống trùng. INSERT/UPDATE thua cạnh tranh trả ORDER_CODE_EXISTS/409. Bổ sung 12 cặp đồng thời (cùng/khác sản phẩm, khác hoa/thường) và chạy 4 lượt integration liên tiếp đều đạt; log `.local/drive-colors-mysql.log` và `drive-colors-race-1/2/3.log`. API syntax/unit 6/6 và LAN 1/1 đạt; không thêm migration mới.
- Đã build LOCAL/maker-squirrel, package audit, EXE mới HTTPS/MySQL kiểm màu XLSX/PNG/PDF và kho giữ nguyên khi nháp; packaged staff hồi quy quyền/giá chung/xác nhận/trả/đổi/báo cáo không vốn đạt. Log `.local/packaged-018-document-colors.log`, `packaged-018-drive-colors-staff.log` exit 0. Installer cài đè cùng version exit 0 và installed asar khớp package; `.local/installer-018-drive-colors.log`.
- Đã ghi đè folder/ZIP `E:\outputt\Oufeidun-Local-0.2.18`; bản trước giữ tại `E:\outputt\_BACKUP\Oufeidun-0.2.18-before-drive-colors-20261019-223335` (folder và ZIP). Audit 1.161 hash folder và từng entry ZIP, API/migration/installer/asar, PS parse, không private config/rclone token đạt; `.local/stage-018-drive-colors.log` exit 0. Hướng dẫn đủ ba BAT và bước chạy Google consent một lần, giữ DB/config/ảnh/account.
- ZIP 373.888.195 byte, SHA256 `8BF5CB3CA40B2EB037F2901327E33043921169EC6B12A999B501D0CBC73FB8DD`. Setup 174.964.224 byte, SHA256 `55AF24CDECC58E4F2DA8755928FED6E9F03B055E2FCB1CDB771566E676D4B527`. Bộ 0.2.17 giữ nguyên. Google consent/tải tới tài khoản khách, UAC/task SYSTEM/reboot/hai máy vật lý cần kiểm tra tại cửa hàng; kiểm thử không dùng tài khoản/dữ liệu khách và không đăng ký task thật.

### 2026-10-19 — Bàn giao LOCAL 0.2.18

- Theo yêu cầu tăng version app/API lên 0.2.18; giữ nguyên bộ 0.2.17. Đã đọc lại toàn bộ checklist, đối chiếu PRODUCT-01/03, ORDER-01/02/08, STOCK-01, AUTH-03, DB-03 và hồi quy toàn bộ bảng chức năng. Hướng dẫn riêng `deployment/customer/BAT-DAU-0.2.18.txt` có hai sửa lỗi, bắt buộc cập nhật máy chủ/migration 009 rồi app mọi máy, giữ dữ liệu/config/account/ảnh.
- Verify với version mới exit 0: 43 dữ liệu, 48 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng; `.local/release-018-verify.log`. MySQL integration thật không skip exit 0, gồm hai sửa lỗi, dữ liệu cũ, migration chạy lại và tranh chấp mã; `.local/release-018-mysql.log`.
- Build LOCAL/maker-squirrel và package audit đạt, đúng version/lookup/discovery, không chứa source/test/private config. `.local/release-018-make.log` exit 0. Packaged staff HTTPS/discovery/MySQL đạt quyền dùng chung, giá chung/sửa sản phẩm giữ vốn, xác nhận/trả/đổi nháp Admin, báo cáo Excel không vốn, không nhập/tồn đầu; `.local/release-018-packaged-staff.log` exit 0.
- Packaged Admin hồi quy bán/tặng/mẫu đúng nhóm và vị trí, lưu/detail/mở nháp, xác nhận nháp cũ giữ giỏ khác, PNG/read Excel/Cancel, xác nhận/tồn, Excel 3/9 cột và lưu giá chung đạt; `.local/release-018-packaged-admin.log` exit 0. Lỗi fetch giả lập là ca cố ý kiểm tra giữ modal/giỏ rồi thử lại, không phải lỗi phát sinh ngoài dự kiến.
- Installer silent nâng lên 0.2.18 exit 0, installed app.asar khớp package; `.local/release-018-installer.log`. Không sửa DB/dịch vụ khách; chưa nghiệm thu hai máy vật lý, Wi-Fi/router/UAC/reboot tại cửa hàng; installer chưa ký Authenticode thương mại.
- Folder `E:\outputt\Oufeidun-Local-0.2.18`, ZIP cùng tên. Audit 1.154 checksum và từng entry ZIP, API/migration/installer/asar khớp source/build, parse PowerShell, loại config riêng đạt; `.local/release-018-stage.log` exit 0. ZIP 373.869.792 byte, setup 174.958.080 byte. ZIP 0.2.17 giữ nguyên hash trước phát hành.
- ZIP SHA256 `8F80808119FE44C2B5B855D1815F2D3B8D0999116C6A627D84DFE32B78DF5671`; setup SHA256 `55205E2248A171828A34E0D035B28EA74EE4913C00AD73A5A06ABFABE26160D6`.

### 2026-10-17 — Bản final LOCAL 0.2.17, đủ ba nhóm quyền nhân viên

- Người dùng yêu cầu mở giá chung, trả/đổi/hủy và khách hàng/báo cáo/nhân viên/lịch sử cho staff rồi test/build final. Giữ các quyền nghiệp vụ đã chốt, ngoại lệ nhập hàng và giá vốn/giá nhập. Đối chiếu bảng checklist và nhật ký, nhất là AUTH-03, USER-01/02, PRICE-01/02/03/04, ORDER-01/05/06/11, STOCK-01/02/03, CUSTOMER-01/02/03, REPORT-01 đến REPORT-07, AUDIT-01, UI-01 và DB-03.
- Bổ sung nút Tạo đơn đổi trong lịch sử trả cho cả hai role; tái dùng mutation có khóa/idempotency và liên kết phiếu trả, mở lại đơn đổi đã có. Nếu giỏ có sửa chưa lưu thì qua lựa chọn lưu/bỏ thay đổi trước khi mở. Không đổi công thức tiền/hoàn/tồn hoặc schema. Cập nhật câu xác nhận giá 0 cho đúng phần vốn chỉ Admin thấy.
- [x] Verify cuối exit 0: 42 data/47 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng (.local/verify-final-permissions-20261017.log). UI mới thao tác staff lưu giá chung, bỏ giỏ chưa lưu rồi Admin vẫn nhận giá, vốn giữ đúng; staff trả/tạo đơn đổi/hủy đơn Admin. Một lượt test đầu thiếu thao tác Bỏ thay đổi ở cảnh báo giỏ chưa lưu; sửa test theo luồng thực tế, chạy lại toàn bộ đạt. Không bỏ guard lưu nháp để làm test qua.
- [x] MySQL integration thật cô lập không skip đạt (.local/final-permissions-mysql.log), gồm staff đổi hàng và gọi lại không tạo đơn thứ hai. Server syntax/unit 6/6 đạt. Không sửa DB/dịch vụ/customer config hoặc Supabase online.
- [x] Build LOCAL + make chỉ maker-squirrel và audit package đạt (.local/build-final-permissions-20261017.log). Giữ 0.2.17 theo folder bàn giao hiện tại; runtime LOCAL API, lookup oufeidun.vn, discovery; không private config/source/test trong EXE.
- [x] EXE đóng gói staff qua HTTPS/discovery/MySQL đạt giá danh mục chung, sửa mã giữ vốn, xác nhận/trả/tạo đơn đổi cho đơn Admin, đủ trang quản lý và Excel báo cáo không vốn; nhập/tồn đầu kỳ vẫn vắng. Log .local/packaged-final-permissions-staff.log exit 0. EXE Admin hồi quy bán/tặng/mẫu/thứ tự, nháp cũ giữ giỏ khác, PNG/Excel/Cancel, xác nhận/tồn và nhập Excel 3/9 cột đạt; .local/packaged-final-permissions-admin.log exit 0. Simulated connection failure là lỗi mạng cố ý trong test giá chung; modal/giỏ giữ nguyên, thử lại thành công.
- [x] Installer silent cài đè cùng version exit 0; installed asar khớp package (.local/installer-final-permissions-20261017.log). Đây là kiểm thử local cô lập, chưa nghiệm thu hai máy vật lý/router/UAC/reboot tại khách.
- [x] Đã thay folder và ZIP E:\outputt\Oufeidun-Local-0.2.17 sau backup folder tại E:\outputt\_BACKUP\Oufeidun-0.2.17-before-final-permissions-20261017-122211; ZIP cũ cũng giữ trong _BACKUP. Đối chiếu 1.153 checksum folder và từng entry ZIP, API/migrations/installer/asar, parse PowerShell và loại private config đạt; .local/stage-final-permissions-20261017.log và .local/zip-final-permissions-20261017.log exit 0. Hướng dẫn nguồn và ba bản trong bundle cùng hash.
- ZIP 373.875.149 byte, SHA256 3538EEACD031D61CBF2E454DA2CC2DB514AF2D54C53EB7470D19E2588BA43158. Setup 174.963.200 byte, SHA256 6EB61470A1FBA3FE5A7DAA25E4B1F009BCDAAEE9578A8F6898724548416AA244.
- Khi gửi khách: cập nhật API máy chủ trước, kiểm tra/xuất bộ client rồi cập nhật app mọi máy. Không chỉ thay EXE; giữ DB/data/config/account/ảnh/CA/discovery, không clean-data hoặc cài lại MySQL. Riêng sửa phân quyền không có migration mới, bộ tổng hợp vẫn chạy 007/008 còn thiếu. Installer chưa ký Authenticode thương mại.

### 2026-10-17 — Quyền nghiệp vụ chung, giữ riêng nhập hàng và giá vốn

- Đối chiếu lại bảng chức năng và nhật ký sau thay đổi: AUTH-01/02/03, USER-01/02, PRODUCT-01/02/03/04, PRICE-01/02/03/04, STOCK-01/02/03/04, CUSTOMER-01/02/03, ORDER-01 đến ORDER-11, IMAGE-01/02, EXCEL-01, REPORT-01 đến REPORT-07, AUDIT-01, UI-01/02 và DB-03. BA-SPEC ghi quyết định mới ưu tiên các quyền cũ.
- LOCAL: mở quyền nghiệp vụ cho staff ở cả UI và API; xử lý đơn/nháp của mọi người, sản phẩm/thương hiệu/khách/giá chung, báo cáo/lịch sử và tài khoản staff. Giữ version, trạng thái, khóa transaction, idempotency và kiểm tra tồn. Không nâng role thành Admin; staff không thể khóa/reset/xóa Admin để đọc vốn.
- Chặn nhập hàng/tồn đầu kỳ/Excel danh mục tại API, không chỉ giấu nút. Staff thêm mã tồn 0; không có ô giá vốn/giá nhập/nhập ban đầu. Sửa mã cũ hoặc bảng giá giữ vốn. Admin bổ sung vốn cho mã mới trước nhập hàng. Báo cáo và file Excel loại cả vốn và các số suy ra vốn như lợi nhuận/giá trị tồn.
- [x] MySQL integration thật cô lập đạt, không skip: sửa/xác nhận/xóa/sửa ngày nháp Admin, thu tiền, hủy/trả/giao bổ sung đơn Admin; sản phẩm mới/cũ, giá nhóm, khách/thương hiệu/tài khoản staff; chặn nhập/Excel/tồn đầu kỳ, sửa vốn và đổi mật khẩu/khóa Admin. Kiểm tra báo cáo/history/workspace không có trường vốn. Log .local/permissions-mysql.log, exit 0. Server syntax và unit 6/6 đạt.
- [x] Demo migration chạy lại hai lần đạt; foreign writes, giá nhóm, giữ vốn, chống lặp trừ kho và ẩn báo cáo đạt. Excel exporter phòng thủ không xuất vốn/lợi nhuận dù nhận object chưa lọc. Các test migration cũ vẫn giữ kỳ vọng lịch sử, test mới kiểm tra chính sách mới.
- [x] npm.cmd run verify exit 0: 42 data/45 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng. Log .local/verify-shared-operations-20261017.log. UI kiểm tra đủ trang cho hai role, cost/input/receipt/stock opening, sửa/tạo mã staff, Admin đọc lại vốn không đổi, Excel thực tế; hồi quy đơn, giá, khách, nháp, thiếu/giao/trả và chứng từ đạt.
- [x] Build LOCAL đúng profile; Electron SOURCE qua HTTPS/discovery/MySQL cô lập đạt sửa mã giữ vốn, staff xác nhận nháp Admin, báo cáo/Excel không vốn, nút nhập/tồn đầu kỳ vắng mặt. Đã xem ảnh test-results/local-staff-permissions-stock.png và local-staff-permissions-report.png; log .local/permissions-local-smoke.log exit 0. Đây chưa phải kiểm thử installer/packaged EXE hay hai máy vật lý.
- Không thay DB/schema/config/dịch vụ khách hoặc Supabase online; Supabase giữ chính sách cũ và UI vẫn dựa trên role cũ. Không đóng gói installer/ZIP, không ghi đè folder/ZIP 0.2.17 đã gửi. Khi đóng gói cần cập nhật cả Local API và client; không chỉ thay EXE.

### 2026-10-16 — Hàng tặng kề dưới mã bán, hàng mẫu cuối

- Chốt mới thay quy tắc ngày 15/10: giữ thứ tự hàng bán, ghép tặng bằng product ID (SKU/snapshot dự phòng cho chứng từ cũ); tặng không có mã bán sau nhóm bán-tặng; tất cả mẫu cuối, thứ tự tương đối ổn định. Không sắp chữ cái. Xóa/thêm lại mã bán tự di chuyển hàng tặng về đúng nhóm.
- Đối chiếu ORDER-01/02/03/06/07, IMAGE-01/02, EXCEL-01, UI-01, DB-03; đọc lại checklist sau code. Dùng cùng hàm cho giỏ/detail/giao/trả/PDF/Excel/PNG. Chỉ tạo mảng hiển thị mới; giữ reference dòng, mảng gốc, line_position, ID, giá, số lượng và phân bổ tồn. Không đổi API/schema/config hoặc viết lại lịch sử.
- Unit riêng 4/4 đạt: nhóm mã bán/tặng/mẫu chọn lộn xộn, tặng riêng, mẫu có/không có bán, mã legacy khác chữ hoa/thường, thiếu mã, nhiều dòng cùng ID và khác ID nhưng giống SKU; ổn định khi sắp lại và không mất/trùng dòng, giá/tồn không đổi. PostgreSQL lưu vị trí cũ vẫn đúng.
- [x] UI/file thực tế đạt: 7 dòng/3 mã, thêm lộn xộn, xóa/thêm lại mã bán, nhóm tặng riêng và mẫu cùng mã; lưu/reload/mở nháp, detail/PDF, đọc Excel và capture chữ PNG trước/sau xác nhận đều đúng cùng thứ tự. Tổng 55.000đ/7 tấm, tồn từng mã 33/45/31 giữ đúng. Đã xem ảnh thực .local/grouped-gifts-sold-confirmation-20261016.png. Lỗi thử nghiệm ban đầu chỉ là selector nút Excel chưa dùng aria-label Tải Excel + mã, đã chỉnh selector và kiểm tra lại đạt.
- [x] npm.cmd run verify exit 0: 40 data/44 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng; .local/verify-017-gift-pairing-20261016.log. Hồi quy giá chung/xem chung đơn/xác nhận nháp, thiếu/giao/trả, ngày/phí/khách và chứng từ đều đạt. Giữ version 0.2.17 theo bộ bàn giao hiện tại.
- [x] Build LOCAL/make chỉ maker-squirrel và audit package đúng profile/version/discovery/lookup, không private config/source/test. Packaged Admin/Nhân viên với HTTPS/discovery/MySQL thật cô lập: bán/tặng theo nhóm, tặng riêng và mẫu cuối qua lưu/detail/reopen, Excel đọc lại theo sale-gift-sample, ảnh PNG, Cancel Save, xác nhận/tồn, giữ giỏ khác khi chốt nháp cũ đều đạt. Giá chung/polling/xem chung đơn và Admin import Excel 3/9 cột hồi quy đạt; .local/packaged-017-gift-pairing-admin/staff-20261016.log exit 0. Lỗi fetch giả lập trong kiểm tra giá chung là trường hợp dự kiến, giữ modal/giỏ rồi thử lại thành công.
- [x] Cài đè silent cùng 0.2.17 exit 0, installed asar khớp package; .local/installer-017-gift-pairing-20261016.log. Không đổi database/dịch vụ khách. Chưa nghiệm thu hai máy vật lý/router/UAC/reboot tại cửa hàng.
- [x] Cập nhật folder/ZIP E:\outputt\Oufeidun-Local-0.2.17, backup folder trước tại _BACKUP\Oufeidun-0.2.17-before-gift-pairing-20261016, ZIP trước cũng giữ trong _BACKUP. Audit sau stage/nén đạt 1.152 checksum và từng file ZIP; API/migrations/installer/asar khớp source/build, PS parse và loại private config đạt. .local/zip-017-gift-pairing-20261016.log exit 0. Hướng dẫn mới ghi đúng quy tắc 16/10.
- ZIP 373.865.532 byte, SHA256 2E7D880B9E736712BA4AE8F03EA3D73FBA874DCF28F2A4C589934C98E901AFD0. Setup 174.957.056 byte, SHA256 133C9C0A988F36153AAAD88E5D37B845A57FA96A1C092326AE474679550CC0E9. Riêng thay đổi thứ tự chỉ cần cập nhật app mọi máy, không migration/API/config mới; máy chủ chưa có các cập nhật 0.2.17 trước đó vẫn theo quy trình máy chủ/client trong hướng dẫn. Giữ nguyên dữ liệu và account.

### 2026-10-15 — ZIP 0.2.17 gộp toàn bộ cập nhật đã chốt

- Người dùng yêu cầu nén để gửi khách sau khi xác nhận đủ chức năng. Không sửa source/API/EXE; dùng bộ đã qua verify 38 data/44 UI, packaged Admin/Nhân viên, polling giá chung và installer cài đè. Gồm xác nhận trực tiếp nháp, giữ thứ tự click, giá chung danh mục, xem chung đơn và các cập nhật kính/phụ kiện trước đó.
- Folder và từng file ZIP đối chiếu đủ 1.152 checksum; source/API/migrations/installer/asar khớp, PowerShell parse và loại private config đạt. .local/zip-017-shared-price-final.log exit 0. ZIP cũ giữ trong E:\outputt\_BACKUP trước khi thay.
- ZIP: E:\outputt\Oufeidun-Local-0.2.17.zip, 373.867.586 byte, SHA256 CD05A9731D2BC84E7AD1D9291ADD0ACA94A445FE658DB691EDA974B0808E9B52. Setup giữ SHA256 47AF3CFF214908CB339538B28CA5ECC6EBBB9E44E4F6CF9B2CA5E83CD8358E4D.
- Máy chủ chạy CAP-NHAT.bat trước để backup/API/migration 007/008 còn thiếu, kiểm tra/xuất client rồi cập nhật app mọi máy kể cả cùng version. Giữ DB/ảnh/account/config/CA/discovery; không clean-data hoặc cài lại MySQL. Hướng dẫn nằm trong BAT-DAU-O-DAY.txt; giới hạn nghiệm thu hai máy vật lý/UAC/router/reboot tại cửa hàng vẫn giữ nguyên.

### 2026-10-15 — Giá danh mục chung từ dòng đơn, 0.2.17

- Đã đọc lại checklist sau code; đối chiếu AUTH-03, PRODUCT-04, PRICE-01/02/03/04, ORDER-01/02/07, AUDIT-01, UI-01 và DB-01/03; hồi quy Excel/PNG/PDF, nháp, kho và thanh toán qua verify. Người dùng đã chốt giá chung dùng cho đơn sau/mọi máy, thay quyết định hoãn trước đó.
- Admin có hai scope lưu giá lẻ/sỉ chung ở popup dòng hàng. API chỉ cập nhật mức đã chọn và cùng nhóm active, clear/full_border nhận chung; giữ vốn, giá còn lại, giá khách và lịch sử. Giỏ hiện tại áp giá cho hàng bán, tặng/mẫu giữ 0, sửa không đổi vị trí; nhân viên vẫn chỉ sửa giá đơn. Giá riêng khách sỉ tiếp tục ưu tiên cho đơn mới, có chú thích trên UI/hướng dẫn.
- Bán hàng/Kho tải danh mục lúc mở và mỗi 10 giây khi visible, không busy/modal; giữ giỏ, không tự cập nhật giá dòng đơn/nháp khác. MySQL không đổi schema; sửa thứ tự gán UPDATE để price_version tăng đúng khi giá đổi, không tăng khi gửi lại cùng giá. Demo và Supabase 034 RPC tương đương, chạy lại an toàn trên DB cô lập, không áp dụng Supabase online.
- Kiểm thử riêng đạt: Demo/Supabase hai schema, migration chạy lại, cả hai mức giá, alias full_border, loại khác/inactive, lịch sử đơn đã bán/giá khách/vốn không đổi; giá âm/lẻ/quá giới hạn/field/nhóm sai và staff bị chặn. MySQL integration thật đạt đọc từ phiên staff khác, audit/price_version/tồn/cost/history giữ đúng. Server syntax và 6/6 unit đạt. Không sửa DB/dịch vụ khách.
- UI kiểm tra hủy không ghi, đổi nhóm hiện có/mã chưa thêm/đơn sau/đổi staff, tặng/mẫu 0, không quyền scope chung, tách sỉ/lẻ và xác nhận giá 0. Đã xem ảnh popup thực test-results/shared-category-price-editor.png. Hai assertion câu hướng dẫn cũ được đổi sang kiểm tra option/phân quyền, giữ kiểm tra bố cục.
- [x] npm.cmd run verify cuối exit 0: 38 data, 44 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng; .local/verify-017-shared-category-price-final.log. Cả hai assertion hướng dẫn cũ và kiểm tra 0đ đã đạt sau cập nhật. Giữ version 0.2.17 và ZIP cũ. Cần cập nhật API máy chủ lẫn app mọi máy, không đổi config.
- [x] Build LOCAL/make chỉ maker-squirrel và audit package đạt, đúng version/profile/discovery/lookup, không private config/source/tests. Packaged Admin/Nhân viên qua HTTPS/discovery/MySQL cô lập đạt: staff đang ở Bán hàng tự nhận giá Admin đổi qua phiên API riêng; Admin lưu giá chung thật ngay từ giỏ, kiểm tra DB giữ vốn/giá sỉ. Giả lập lỗi fetch trước request không đổi giỏ/danh mục; giữ modal và báo lỗi, thử lại thành công. Do Electron dùng protocol riêng, page.route không chặn được; thay bằng fetch giả lỗi ở renderer trong script test, không sửa source ứng dụng. Log .local/packaged-017-shared-price-staff.log và admin-final.log đều exit 0.
- Hồi quy packaged cùng đợt: giữ thứ tự click nhiều SKU/bán/mẫu/tặng qua lưu/detail/reopen; chốt nháp cũ không mất giỏ khác chưa đủ SĐT; PNG/read Excel/Cancel/xem ảnh, confirm/stock và Admin nhập Excel 3/9 cột đều đạt. Không sửa dữ liệu/dịch vụ cửa hàng. Chưa nghiệm thu hai máy vật lý/router/UAC/reboot tại khách.
- [x] Installer silent cài đè 0.2.17 exit 0, installed asar khớp package (.local/installer-017-shared-price.log). Folder trước giữ tại E:\outputt\_BACKUP\Oufeidun-0.2.17-before-shared-price-20261015. Đã thay E:\outputt\Oufeidun-Local-0.2.17; audit cuối sau khi copy hoàn tất đạt 1.152 checksum, source/API/migrations/installer/asar khớp, PS parse/private config exclusion; .local/audit-017-shared-price-folder-final.log exit 0. Ba hướng dẫn cùng hash với source.
- Setup 174.959.104 byte, SHA256 47AF3CFF214908CB339538B28CA5ECC6EBBB9E44E4F6CF9B2CA5E83CD8358E4D. Không tạo/cập nhật ZIP, giữ SHA256 F7A56CE3B692EB66EE1308A8D73E92F2A422F510433A6FCB1189BE9B48A06C47; ZIP cũ chưa có sửa mới. Cập nhật cửa hàng: CAP-NHAT.bat máy chủ trước rồi app mọi máy, giữ config/DB/ảnh/account/CA/discovery. Riêng giá chung không thêm bảng/cột MySQL; bộ tổng hợp vẫn cần 007/008 nếu máy chủ chưa có. Supabase 034 chưa áp dụng online. Installer chưa ký Authenticode thương mại.

### 2026-10-15 — Giữ thứ tự chọn, xác nhận nháp trực tiếp — folder 0.2.17

- Phạm vi đã chốt: làm hai phần trên, hoãn phần giá cùng loại ở danh sách trái. ID AUTH-03, ORDER-01/02/03/05/06/07/10/11, IMAGE-01/02, EXCEL-01, UI-01, DB-03. Mục này thay cách sắp mã/gom tặng-mẫu trước đó.
- MySQL 008/Demo/Supabase 033 thêm line_position, gán từ mảng items trong transaction lưu nháp. Đọc workspace/lịch sử giao theo vị trí, giữ UI/export theo cùng mảng. Không xếp theo SKU/UUID cho đơn mới; tăng số lượng/sửa loại giữ chỗ, xóa-thêm lại ở cuối. Đơn cũ chưa ghi vị trí giữ thứ tự đọc hiện có và ID/dữ liệu cũ, không tự suy đoán lịch sử click.
- Kiểm thử dữ liệu riêng đạt: migration demo và Supabase chạy lại hai lần; trước/sau migration đọc đơn cũ không đổi; tạo/cập nhật/retry/version và thứ tự sale/gift/sample theo mảng được giữ. MySQL integration cô lập đạt gồm chạy lại 008 khi mất version, staff lưu/cập nhật, confirm/retry/tồn và lịch sử giao đúng thứ tự. Chưa áp dụng migration vào DB/dịch vụ khách.
- [x] UI riêng 4/4 đạt: 7 dòng/3 SKU chọn không theo mã, đổi loại, xóa-thêm lại, lưu/reload/mở nháp, chi tiết/Excel đọc lại/capture chữ PNG/PDF và xác nhận tồn đúng. Đã xem PNG thật .local/selection-order-confirmation.png. Admin và nhân viên chốt nháp cũ mà không mất giỏ khác nhập dở, cancel giữ nguyên; nháp đang sửa chưa lưu bị chặn, lưu rồi chốt đúng giỏ.
- [x] Đọc lại toàn bộ checklist và đối chiếu các ID trên sau thay đổi. npm.cmd run verify cuối exit 0: 36 data, 41 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng; log .local/verify-017-selection-confirm-final.log. Server syntax/unit 6/6 và MySQL integration cô lập đạt. Hồi quy quyền, đơn thiếu/giao bổ sung/trả, giá/khách/phí/ngày và chứng từ đạt.
- Sửa thêm trường hợp bấm nhanh sau lưu: khóa nút Chi tiết/Excel trên danh sách khi busy để không tạo modal giữ callback của trạng thái đang lưu. Test xác nhận chính nháp sau lưu chạy không chèn chờ busy nhân tạo đã đạt trong verify cuối.
- [x] Build LOCAL/make chỉ maker-squirrel và audit package đúng version/profile/discovery/lookup, không private config/source/test. EXE cuối Admin/Nhân viên qua HTTPS/discovery/MySQL: lưu/reopen nháp nhiều SKU bán/mẫu/tặng đúng thứ tự chọn; xuất PNG/read Excel; Cancel/Confirm trực tiếp nháp cũ giữ mã/ghi chú/SĐT trống và giỏ khác nhập dở; thanh toán/confirm/stock đúng. Staff thấy đơn Admin mới qua polling nhưng chỉ đọc; Admin import Excel 3/9 cột tiếp tục đạt. Log packaged-017-selection-confirm-staff-final/admin-final đều exit 0.
- [x] Installer silent cài đè 0.2.17 exit 0, installed asar khớp package. Cập nhật E:\outputt\Oufeidun-Local-0.2.17 sau backup bộ trước tại _BACKUP\Oufeidun-0.2.17-before-selection-confirm-20261015. Đủ 1.152 checksum, API/mysql008/installer/asar khớp source/build, PS parse và loại private config đạt; log .local/audit-017-selection-confirm-folder.log. Ba bản hướng dẫn đồng nhất và manifest đã tạo lại sau sửa hướng dẫn.
- Setup 174.961.152 byte; SHA256 34123F6C01BB263D425F423BDAC6EDB824B54573963C3D58D283259A79835250. Không tạo/cập nhật ZIP, ZIP cũ giữ SHA256 F7A56CE3B692EB66EE1308A8D73E92F2A422F510433A6FCB1189BE9B48A06C47 và chưa có hai sửa mới.
- Cần chạy CAP-NHAT.bat máy chủ để backup/migration 008/API, rồi cập nhật app mọi máy, kể cả đang cùng version 0.2.17. Giữ dữ liệu/tài khoản/config/ảnh/CA/discovery. Không tự áp dụng migration vào DB/dịch vụ khách; Supabase 033 chỉ kiểm thử cô lập. Phần giá cùng loại bên trái hoãn. Chưa nghiệm thu hai máy vật lý/UAC/reboot/router khách; installer NotSigned.

### 2026-10-15 — Xác nhận trực tiếp nháp (source)

- ID liên quan AUTH-03, ORDER-01/02/03/05/07/10/11, IMAGE-01/02 và UI-01. Đọc lại checklist và BA-SPEC; không thay server/schema/config, chưa đóng gói EXE/folder/ZIP.
- Nút Xác nhận bán trong chi tiết nháp dùng đơn/tồn tải mới nhất, đúng quyền chủ đơn/Admin. Không gọi save() cho giỏ khác; giữ khách, số lượng, ngày, phí, ghi chú và trạng thái chưa lưu. Đóng/cancel không ghi dữ liệu.
- Đơn đang mở có sửa chưa lưu thì yêu cầu lưu chính đơn đó trước khi xác nhận; sau xác nhận chính nháp đang mở mới dọn giỏ. Trường hợp đơn khác, giữ giỏ nguyên trạng. Hàng thiếu dùng trạng thái và ID dòng của đơn cũ; thanh toán/giao/trừ kho qua nghiệp vụ hiện có.
- Đang kiểm thử và chờ chốt hai lựa chọn về thứ tự click so với nhóm tặng/mẫu, và phạm vi giá cùng loại ở danh sách sản phẩm chưa chọn. Chưa sửa hai phần này hoặc kết luận cả gói phản hồi hoàn tất.
- [x] Kiểm thử riêng 3/3 đạt: Admin đơn đủ, nhân viên đơn thiếu với cùng SKU bán/tặng/mẫu; đơn khác nhập dở thiếu SĐT vẫn giữ mã/khách/ngày/số lượng/phí/ghi chú qua cancel và confirm. Đơn cũ ghi tổng 76.000 hoặc 26.000 đúng, tồn 43 hoặc 47 đúng; không tự lưu đơn đang soạn. Chính nháp đang mở có sửa bị chặn, lưu rồi xác nhận dọn đúng giỏ.
- [x] npm.cmd run verify exit 0: 37 data, 41 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng. Log .local/verify-confirm-saved-draft.log. Shared-orders regression kiểm tra nhân viên không có nút xác nhận nháp người khác. Chưa kiểm tra packaged/MySQL cho nút mới, chưa thay bộ bàn giao 0.2.17.

### 2026-10-15 — Sắp xếp dòng bán/tặng/mẫu 0.2.17

- Đã đọc lại toàn bộ checklist sau code. Đối chiếu ORDER-01/02/03/06/07, IMAGE-01/02, EXCEL-01, UI-01 và DB-03. Giữ version 0.2.17, chỉ cập nhật folder, không tạo ZIP cho thay đổi này.
- Chung một hàm sắp xếp bản sao hiển thị: bán rồi tặng cùng product ID; tặng không có dòng bán sau nhóm bán; mọi mẫu ở cuối. Mã theo thứ tự tự nhiên ổn định qua reload, nhận legacy sale/kind export/snapshot và sản phẩm thiếu catalog. Không đổi mảng nguồn phân bổ tồn hoặc payload ghi; API/schema/config giữ nguyên.
- Unit mới 3/3 đạt: đầu vào đảo/xáo trộn, tặng/mẫu trước bán, bỏ dòng bán, tặng/mẫu riêng, null/rỗng/legacy, ID khác mã giống, thứ tự số, reference/metadata/quantity/price bất biến; allocation/available/supplemental không bị thay đổi.
- UI mới đạt: 7 dòng/3 SKU thêm lộn xộn, đổi bán sang tặng, bỏ/thêm lại dòng bán, lưu/reload/mở nháp, chi tiết, Excel đọc lại, capture chữ và xem PNG thật, PDF và xác nhận tồn. 55.000đ/7 tấm, tồn đúng từng mã 33/45/31. PNG .local/sorted-lines-confirmation.png.
- [x] npm.cmd run verify exit 0: 37 bài dữ liệu, 38 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng. Log .local/verify-017-item-order.log. Hồi quy quyền Admin/Nhân viên, xem chung đơn, bán/giao bổ sung/trả, giá/khách/nháp và chứng từ đều đạt.
- [x] Build LOCAL/make chỉ maker-squirrel exit 0, package audit đúng version/profile/discovery/lookup, không private config/source/test. Packaged Admin và Nhân viên trên HTTPS/discovery/MySQL cô lập: thêm nhiều mã, tặng cùng mã, mẫu cuối, xóa cha làm tặng riêng xuống dưới; lưu nháp/PNG/read Excel theo sale-gift-sample/Cancel/xem ảnh/xác nhận/stock đạt. Polling đơn Admin sang staff vẫn đạt; Admin nhập Excel 3/9 cột tiếp tục đạt. Log packaged-017-item-order-admin/staff, exit 0. Không sửa DB/dịch vụ khách.
- [x] Cài đè silent cùng 0.2.17 exit 0, installed asar khớp package. Folder trước giữ tại E:\outputt\_BACKUP\Oufeidun-0.2.17-before-item-order-20261015. Stage SkipZip cập nhật E:\outputt\Oufeidun-Local-0.2.17; đủ 1.151 checksum, API/migrations/installer/asar khớp source/build, PowerShell parse/private config exclusion đạt. Log .local/audit-017-item-order-folder.log, exit 0.
- Setup 174.961.664 byte, SHA256 48359421C3196EB5B42A3E866A7BEA42BAE83C5BC679C1443D66547693DC026F. Giữ nguyên ZIP cũ SHA256 F7A56CE3B692EB66EE1308A8D73E92F2A422F510433A6FCB1189BE9B48A06C47; ZIP chưa chứa sửa thứ tự. Hướng dẫn trong folder và hai bản máy chủ/client đã cập nhật.
- Riêng thay đổi sắp xếp chỉ cần cập nhật app; không migration/API/config mới. Nếu chưa cập nhật sửa xem chung đơn trước đó, vẫn cần CAP-NHAT.bat máy chủ như hướng dẫn. Chưa nghiệm thu hai máy vật lý/router/UAC/reboot tại khách; installer NotSigned.

### 2026-10-15 — Nén ZIP 0.2.17 mới nhất theo yêu cầu

- Không sửa source/app/API; nén folder 0.2.17 đã qua verify 34 data/37 UI, packaged hai vai trò, polling đơn Admin sang staff và cài đè. Giữ ZIP cũ trong _BACKUP trước khi thay.
- Folder và từng entry ZIP đối chiếu đủ 1.151 checksum; API/migrations/installer/asar khớp source/build, PowerShell parse/private config exclusion đạt. Log .local/zip-017-shared-orders.log, exit 0.
- ZIP E:\outputt\Oufeidun-Local-0.2.17.zip, 373.867.181 byte; SHA256 F1DB995355115BC54CCC0DAC8DE9CBDDC23125CEAC6F6B7AA6BBBD957A2F569B. Setup giữ E21C0687FB374CC84A18F76DF10AEE920C5415936F663D928BA48ABB095D13D8.
- ZIP này thay ZIP cũ và đã có các sửa đơn vị, bộ lọc, ba khách, xem chung đơn và polling. Cần cập nhật API máy chủ qua CAP-NHAT.bat rồi app các máy, giữ DB/config/dữ liệu hiện có.

### 2026-10-15 — 0.2.17 nhân viên xem đơn tạo từ máy chủ

- [x] Đọc lại toàn bộ checklist sau sửa, đối chiếu AUTH-03, ORDER-01/02/03/04/05/09/11, IMAGE-01/02, EXCEL-01, UI-01 và DB-03. BA-SPEC ghi phạm vi xem chung, sửa theo chủ đơn; giữ version/folder 0.2.17 theo yêu cầu, chưa tạo ZIP.
- API workspace bỏ điều kiện chỉ lấy o.created_by bằng actor cho staff; danh sách/chi tiết, thanh toán/giao hàng/model/ghi chú/phí cùng xuất hiện, giới hạn 500 đơn gần nhất giữ nguyên. Không đổi các guard lockOrder hoặc quyền ghi; staff vẫn không đọc vốn, tài khoản nội bộ, audit hoặc báo cáo quản trị.
- UI đơn người khác chỉ xem/in/PNG/Excel/PDF, có ghi rõ người tạo và quyền chỉ xem. Ẩn mở/xóa nháp, sửa ngày, thu tiền, giao bổ sung và hoàn tất thiếu của người khác. Đơn mình vẫn xử lý như cũ, Admin giữ toàn quyền. Màn đơn/nháp tải lại lúc mở và mỗi 10 giây khi visible, không busy/modal; không gửi lại mutation, bỏ kết quả polling cũ khi rời màn/logout.
- [x] MySQL integration thật cô lập đạt: staff thấy admin draft/sale, dữ liệu không chứa vốn/password, sửa/xóa/xác nhận/ngày/thu tiền đơn khác bị 403 với payload hợp lệ; staff tạo đơn mình và Admin thấy lại. Server syntax/unit 6/6 đạt. Không sửa DB/dịch vụ phát triển hoặc dữ liệu khách.
- [x] Demo migration và Supabase 032 cập nhật riêng các function đọc, giữ guard ghi và ACL, chạy lại hai lần đạt. Supabase có wrapper đọc nên cập nhật cả function đọc nền trước product-delete, không bỏ kiểm tra quyền wrapper. Cả workspace/order extras/business extras đã kiểm tra staff thấy đơn và bị chặn ghi. Chưa áp dụng migration online. LOCAL không thêm migration/schema mới.
- [x] npm.cmd run verify exit 0: 34 data, 37 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng; log .local/verify-017-shared-orders-final.log. UI tạo Admin draft/sale, đổi staff xem/tải Excel đọc lại/PNG, kiểm tra không có nút ghi; staff xử lý nháp mình, Admin thấy nháp staff đạt. Các hồi quy đơn vị tấm/sản phẩm, lọc category/ba khách, Excel, phí/ngày, giỏ và giao bổ sung tiếp tục đạt.
- [x] Build LOCAL/make chỉ maker-squirrel đạt; package đúng local API/lookup/discovery/version, không chứa private config/source/tests. Packaged staff mở màn Đơn nháp, Admin tạo đơn mới qua API phiên riêng khi màn đang mở: đơn tự xuất hiện trong 25 giây, mở chi tiết chỉ xem đạt. Admin xóa nháp test của mình đúng quyền. Packaged Admin/Nhân viên đều lưu nháp, mixed sale/gift/sample, PNG/read Excel/Cancel/preview/confirm/stock đạt; Admin nhập 3/9 cột tạo/cập nhật giá/tồn đạt. Log packaged-017-shared-orders-staff/admin, cả hai exit 0.
- [x] Cài đè silent 0.2.17 exit 0, installed asar khớp package. Bộ trước giữ tại E:\outputt\_BACKUP\Oufeidun-0.2.17-before-shared-orders-20261015. Đã cập nhật E:\outputt\Oufeidun-Local-0.2.17 gồm API/client/hướng dẫn. Audit 1.151 checksum, source/API/migrations/installer/asar và PS parse/private config exclusion đạt; log .local/audit-017-shared-orders-folder.log.
- Setup 174.961.152 byte; SHA256 E21C0687FB374CC84A18F76DF10AEE920C5415936F663D928BA48ABB095D13D8. ZIP không tạo/cập nhật, vẫn SHA256 D15547DD50E56AC4646DCA4BA569F06F6F4B62211D23913F72AAE48E1D21A73B và chưa có sửa đổi mới.
- Cần chạy 01-MAY-CHU\CAP-NHAT.bat để nạp API mới cả khi máy chủ đã 0.2.17, sau đó cập nhật app mọi máy. Giữ DB/tài khoản/tồn/ảnh/config/CA/discovery, không clean-data hoặc cài lại MySQL. Chưa nghiệm thu hai máy vật lý/router/UAC/reboot tại khách; installer NotSigned. Không cam kết kết quả tại máy khách trước khi họ áp dụng cập nhật.

### 2026-10-14 — Folder 0.2.17 đổi đơn vị kính/phụ kiện, chưa tạo ZIP

- [x] Đọc lại toàn bộ checklist; đối chiếu PRODUCT-01/04, STOCK-01/02/04, ORDER-01/03/07, IMAGE-01/02, EXCEL-01, REPORT-04, UI-01 và DB-03. BA-SPEC cập nhật đơn vị mới, giữ version 0.2.17 theo yêu cầu.
- [x] Kính clear/full_border/privacy/matte/premium_borderless dùng tấm; phụ kiện other dùng sản phẩm. Kho/thẻ hàng/giỏ/cảnh báo thiếu/chi tiết và lịch sử giao/PDF/Excel/PNG hiển thị theo từng mặt hàng. Tổng hỗn hợp tách số lượng từng đơn vị, kính trước phụ kiện, không phụ thuộc thứ tự dòng DB. Trường nhập số lượng dùng nhãn chung; không quy đổi hoặc sửa giá/tồn/số lượng trong DB.
- [x] Chỉ bỏ Full viền cao cấp/matte khỏi chip và combobox bộ lọc tìm kiếm Bán hàng/Kho. Form/danh mục/import giữ nhóm và dữ liệu cũ; vẫn xem sản phẩm đó trong Tất cả. Full viền alias cũ/mới vẫn một lựa chọn; ba gợi ý khách giữ nguyên.
- [x] npm.cmd run verify cuối exit 0: 33 data, 36 UI, Electron demo, TypeScript/build, dependency audit 0 lỗ hổng; log .local/verify-017-product-units-final.log. Unit kiểm tra từng loại, tổng mixed/empty; UI nhập Excel kính/phụ kiện, reload, đơn mixed 1 tấm + 1 sản phẩm, đọc ĐVT Excel, capture chữ PNG và xem PDF/chi tiết đạt. Đã xem ảnh thật test-results/mixed-product-units.png. Hồi quy đơn thiếu/giao bổ sung/nhập ban đầu/khách/Sales/giá và quyền tiếp tục đạt. Sửa kỳ vọng test cũ còn miếng và thứ tự tổng mixed, không bỏ assertion giá/tồn.
- [x] Build LOCAL và make chỉ maker-squirrel đạt, không gọi maker-zip. Audit package đúng 0.2.17/local API/lookup/discovery và loại private config/source/test. Packaged Admin/Nhân viên qua HTTPS/discovery/MySQL cô lập kiểm tra phụ kiện 4 sản phẩm, giỏ mixed 1 tấm + 1 sản phẩm, filter không matte, ba khách; mixed sale/gift/sample/lưu nháp/PNG/read Excel/Cancel/preview/confirm/stock đạt. Admin nhập Excel 3/9 cột/cập nhật giá và tồn đạt. Log packaged-017-product-units-admin-final/staff đều exit 0. Tool smoke LOCAL đổi kỳ vọng ĐVT tương ứng.
- [x] Cài đè silent cùng 0.2.17 exit 0, installed asar khớp package. Bản folder trước copy vào E:\outputt\_BACKUP\Oufeidun-0.2.17-before-product-units-20261014. Stage dùng SkipZip, cập nhật E:\outputt\Oufeidun-Local-0.2.17. Audit cuối 1.151 checksum, source/API/migrations/installer/asar khớp, PS parse/private config exclusion đạt; log .local/audit-017-product-units-folder.log.
- Setup mới 174.962.176 byte; SHA256 A34888E02DFF375A7AD7466CB68A796DB34E3F2746CFF7B9E284CE0993AA8B4D. Không tạo/cập nhật ZIP: ZIP cũ giữ SHA256 D15547DD50E56AC4646DCA4BA569F06F6F4B62211D23913F72AAE48E1D21A73B, chưa chứa sửa đơn vị này.
- Không thêm migration, không sửa API/database/config từ bộ 0.2.17 trước, không tác động dữ liệu cửa hàng. Giới hạn hai máy vật lý/UAC/reboot/router khách chưa nghiệm thu; installer NotSigned. Máy đang API 0.2.17 chỉ cập nhật app; máy 0.2.15 vẫn theo quy trình máy chủ/client trước đó.

### 2026-10-14 — Ghi đè bộ LOCAL 0.2.17 sau phản hồi Full viền/ba khách

- Theo yêu cầu người dùng, giữ phiên bản 0.2.17 và thay EXE/portable/folder/ZIP; ID PRODUCT-04, STOCK-04, CUSTOMER-03, UI-01. Checklist đã đọc lại trong bước sửa; verify-category-customer-fix exit 0 (32 data/36 UI, Electron/build/audit) trước khi make LOCAL.
- make:local và audit-local-package đạt; đúng version/local API/lookup/discovery, không chứa private config/source/test. Packaged Admin/Nhân viên qua HTTPS/discovery/MySQL cô lập: 4 khách khớp chỉ hiện 3, tìm chính xác một khách; Admin kiểm tra Full viền chỉ một option. Lưu nháp, mixed sale/gift/sample, PNG/read Excel/Cancel/preview/confirm/stock đạt; Admin import Excel 3/9 cột tiếp tục đạt. Log packaged-017-category-customer-admin/staff, cả hai exit 0.
- Cài silent đè cùng 0.2.17 exit 0; installed asar khớp package mới. Bản bàn giao cũ được giữ và kiểm tra đủ 1.151 checksum tại E:\outputt\_BACKUP\Oufeidun-0.2.17-before-category-customer-20261014-131730. Folder bị giữ mở khiến Move-Item không xóa được thư mục rỗng, đã stage riêng rồi copy bộ mới vào đúng đường dẫn, không dừng tiến trình người dùng.
- Đã thay E:\outputt\Oufeidun-Local-0.2.17 và ZIP cùng tên. Audit cuối đủ 1.151 checksum/từng entry ZIP, API/migrations/asar/installer khớp source/build, PowerShell parse/private config exclusion đạt; log .local/audit-017-category-customer.log exit 0.
- ZIP SHA256 D15547DD50E56AC4646DCA4BA569F06F6F4B62211D23913F72AAE48E1D21A73B; setup SHA256 B9AA5A8EA1692E90E4AD096DBE9CBC50D8511DBE9C1F44913D0F8A028056F5E5. ZIP 373.858.058 byte, setup 174.953.472 byte.
- Không thêm migration hoặc sửa API/config/data từ bộ 0.2.17 trước. Máy đã cập nhật API 0.2.17 chỉ cần cập nhật app; máy đang 0.2.15 vẫn làm đủ quy trình cập nhật máy chủ/client migration 007 như hướng dẫn. Giữ dữ liệu production. Chưa nghiệm thu hai máy vật lý/UAC/reboot/router khách; installer chưa ký Authenticode thương mại.

### 2026-10-14 — Sửa Full viền lặp và giới hạn ba gợi ý khách

- [x] Đọc lại toàn bộ checklist, đối chiếu PRODUCT-04, STOCK-04, CUSTOMER-03, UI-01; cập nhật BA-SPEC.
- [x] Bộ lọc kho dùng danh sách category chuẩn thay danh sách nhãn chứa alias. Chỉ một Full viền; vẫn tìm cả clear và full_border, giữ nguyên dữ liệu phân loại và tồn cũ. Không sửa API hoặc thêm migration.
- [x] Tìm trên toàn bộ khách đang hoạt động trước khi lấy tối đa 3 kết quả. Giữ tìm tên không dấu/SĐT, Khách mới, chọn bằng Enter và trạng thái không khớp. Không xóa/bỏ bớt khách trong DB.
- [x] Unit thử 200 khách (query trống/rộng/chính xác, số điện thoại, inactive, không khớp). UI tạo/lưu 4 khách thật trong PGlite, chỉ hiện 3, tìm/chọn khách ngoài 3 ban đầu bằng điện thoại, no-match và Khách mới đạt. UI Excel import legacy tồn 4 và clear cùng xuất hiện dưới một lựa chọn Full viền đạt.
- [x] npm.cmd run verify exit 0: 32 data tests, 36 UI tests, Electron smoke, TypeScript/build, audit 0 vulnerabilities. Log .local/verify-category-customer-fix.log. Regression Admin/Nhân viên, lưu/reload nháp, Excel đọc lại và PNG tiếp tục đạt.
- Chỉ sửa source, chưa tạo EXE mới hoặc thay folder/ZIP 0.2.17 đã bàn giao. Không thay config hoặc dữ liệu cửa hàng; kiểm thử dùng dữ liệu cô lập.

### 2026-10-14 — LOCAL 0.2.17, kho hàng và dòng bán/tặng/mẫu

- Đã đọc lại toàn bộ checklist sau code. Đối chiếu PRODUCT-01/02/03/04, PRICE-01/02/03/04, STOCK-01/02/03/04, CUSTOMER-01/02/03, ORDER-01/02/03/04/05/06/07/09/10, IMAGE-01/02, EXCEL-01, REPORT-01/02/07, AUTH-01/03, UI-01/02 và DB-01/03. BA-SPEC ghi phạm vi mới; app/Local API cùng 0.2.17.
- SKU/loại hàng thành khóa dòng; MySQL 007 tạo unique mới trước khi bỏ unique cũ để giữ index khóa ngoại. Kiểm thử chạy lại khi migration bị ngắt trước ghi version đã đạt. Giữ các dòng/đơn/tồn cũ; không tự thêm hàng tặng hoặc quy đổi hộp. Chặn trùng loại, stock chung mọi dòng, rollback khi tổng giao vượt tồn; retry xác nhận/giao/trả không lặp.
- save_draft có sale_details lưu khách/Sales/giá/ghi chú cùng transaction, thay chuỗi gọi từng bước có thể lưu dở dang. Client dùng ngay workspace của lần write, bỏ refresh thừa sau commit. Giá sỉ danh mục lưu cùng product mutation; demo bỏ trả thành công giả, lưu giá/khách/giá khách vào DB thật PGlite.
- API staff trả riêng Sales tối thiểu đang hoạt động; users vẫn rỗng và fixed_cost không xuất cho staff. Khách tìm tên không dấu/SĐT có hoặc không dấu cách; gợi ý tối đa 10, hỗ trợ bàn phím/Khách mới. Unit thử 200 khách, khách inactive/không khớp; UI chọn theo tên/SĐT và lưu Sales khác đạt.
- Lọc Full viền nhận cả clear/full_border cũ, đủ các category; label matte Full viền cao cấp và other Phụ kiện khác. Excel nhận tên cũ/new. Kho hàng có số mã/tổng tồn/tồn kính/tồn phụ kiện/sắp hết theo lọc; Combo không cắt chữ sau kiểm tra ảnh thực. UI import LEGACY-4 tồn 4, ACCESSORY-6 tồn 6, PREMIUM-5 tồn 5, lọc đúng và reload giữ dữ liệu đạt.
- npm.cmd run verify cuối exit 0: 32 data, 35 UI, Electron demo, TypeScript/build, audit 0 lỗ hổng; log .local/verify-catalog-sales-handoff.log. Server syntax/unit 6/6, MySQL integration và deployment-config (đổi folder/có khoảng trắng/hostname-port riêng/secret exclusion) đạt. PostgreSQL 031 áp dụng hai lần trên schema cô lập, atomic cùng mã bán/tặng và tổng 38.000 đạt; chưa áp dụng online.
- MySQL thật cô lập: cùng SKU ba dòng, giá khách 19.000 lưu thật, invalid Sales/trùng dòng rollback; xác nhận 12 khi tồn 11 và giao bổ sung nhiều dòng vượt stock đều rollback; giao đủ đúng tồn/tổng, retry không lặp. Trả dòng tặng hoàn 0, trả một dòng bán hoàn 19.000, hoàn kho riêng; trả vượt bị chặn. Lưu nháp/mở lại/Lưu nháp và tiếp tục và giá đồng loạt regression đạt.
- Đã xuất/read lại Excel có nhãn Hàng tặng/Hàng mẫu và xem PNG thật test-results/catalog-sale-gift-confirmation.png: 10 bán + 1 tặng + 1 mẫu, 12 miếng, tiền sản phẩm 250.000; đây là dữ liệu test tự chọn, không phải luật khuyến mại.
- Build/make LOCAL và package audit đạt: endpoint lookup oufeidun.vn, LAN discovery, đúng version, không source/test/private config. Packaged Admin/Nhân viên qua HTTPS/discovery/MySQL cô lập cùng đơn mixed có phí 5.000: 3 dòng, tổng 255.000, tồn 12 về 0; lưu nháp/PNG/read Excel/Cancel/xem ảnh/xác nhận đạt. Staff chọn Sales Admin được. Admin nhập Excel 3/9 cột/tạo-cập nhật mã/giá/model/receipt đạt. Log .local/mixed-packaged-admin-017.log và .local/mixed-packaged-staff-017.log.
- Cài silent 0.2.17 exit 0, installed app.asar khớp package. Folder/ZIP E:\outputt\Oufeidun-Local-0.2.17; giữ các bộ 0.2.15/0.2.16. 1.151 checksum và từng entry ZIP khớp, source/migrations/API/installer/asar/PowerShell parse/private config exclusion đạt; log .local/audit-catalog-017.log.
- ZIP SHA256 4302E6F0B7199A0B7F78D66E4094937C75DDDB2E71F06947CC69512768A6E522. Setup SHA256 8A91D3D79D2F31E65FE0D72AB66CC149BA85E6B8544B56C3DF76F63FFF083D6F.
- Cần cập nhật máy chủ bằng CAP-NHAT.bat (backup/migration 007/API), kiểm tra/xuất client rồi cập nhật mọi app. Giữ DB/ảnh/account/config/CA/discovery; không clean-data. Không áp dụng migration lên DB máy phát triển/cửa hàng trong lần này. Chưa nghiệm thu hai máy vật lý, UAC/reboot/router khách; installer chưa ký Authenticode thương mại. Bug 4 miếng được thử trên dữ liệu cô lập theo phân loại cũ, chưa đọc DB thật của khách để kết luận nguyên nhân cụ thể từng mã.

### 2026-10-13 — Client LOCAL 0.2.16 đổi URL Mã dùng chung

- [x] Đã đọc lại toàn bộ FEATURE-CHECKLIST sau thay đổi và đối chiếu PRODUCT-02, DB-03, UI-01; regression AUTH-01/03, đơn/kho/PNG/Excel. Theo yêu cầu chỉ sửa bản app gửi khách, không cập nhật Local API, MySQL, website hoặc dữ liệu cửa hàng.
- [x] Client 0.2.16 dùng https://oufeidun.vn/api/glass-lookup; ảnh lookup lấy cùng origin mới. Nghiệp vụ giữ https://oufeidun.home.arpa/api/app/v1 và cấu hình kết nối ngoài/discovery cũ. Không đổi profile TEST/Supabase hoặc PRODUCTION/PHP; Local API tiếp tục 0.2.15.
- [x] npm.cmd run verify exit 0: data tests (gồm hai test cấu hình client mới), 32 UI, Electron demo, TypeScript/build và audit production 0 lỗ hổng. Suite kiểm tra Admin/Nhân viên, lưu nháp/reload, dữ liệu không hợp lệ, Excel đọc lại và lỗi/trạng thái UI; không sửa database cửa hàng.
- [x] Build/make LOCAL exit 0; package audit xác nhận local/api/version 0.2.16, URL mới, LAN discovery và không chứa source/test/private config. Packaged Electron lookup A12 và render ảnh HTTPS thật đạt; màn login và xóa session cũ đạt. Không đăng nhập hoặc gửi giao dịch ghi tới máy chủ khách trong smoke này.
- [x] Installer metadata 0.2.16; PowerShell staging parse đạt. Bộ client-only E:\outputt\Oufeidun-Client-0.2.16 và ZIP cùng tên có installer, App portable, BAT cập nhật/mở/kiểm tra, hướng dẫn và SHA256SUMS. 79 checksum folder và từng entry ZIP khớp; không kèm server, .env, profile/CA/IP riêng máy phát triển. Giữ nguyên bộ LOCAL 0.2.15.
- Setup SHA256: B5F090A6D5F903722E06D92F5FC5A5AA9C7842D2B4AEBB4F84F7698ACAE84E80. ZIP SHA256: C09AA6D21F9236BEFEDF6D484FB5DA096F1B653BF57B8A18FD4A7F84D0AF4BB2.
- Cập nhật máy đã cài: đóng app và chạy CAP-NHAT.bat; giữ AppData/Oufeidun, tài khoản và kết nối. Portable dùng cả folder App/MO-APP.bat; máy mới cần public profile cửa hàng từ bộ client cũ/máy chủ hiện có. Không cài lại server/MySQL, không chạy migration hoặc clean-data cho lần đổi URL này.
- Giới hạn: installer NotSigned (chưa ký Authenticode thương mại); chưa cài thử installer mới hoặc nghiệm thu hai máy vật lý/router khách trong lần này. Kết quả packaged smoke không thay thế kiểm tra cập nhật trên máy khách.

### 2026-10-10 — Bàn giao LOCAL 0.2.15

- Đã đọc lại toàn bộ checklist và đối chiếu ORDER-01/02/03/05/06/09/10, IMAGE-01/02, EXCEL-01, PRODUCT-02/03, STOCK-01/02/03, PRICE-01/04, REPORT-01/02/07, AUTH-01/03, UI-01/02, DB-01/03. App và Local API cùng version 0.2.15; giữ nguyên bộ 0.2.14 trước đó.
- npm.cmd run verify exit 0: 27 data, 32 UI, Electron demo, TypeScript/build, audit 0 lỗ hổng; log .local/verify-release-0.2.15.log. Server syntax/unit 6/6, MySQL integration và audit server đạt. Deployment-config đạt với folder di chuyển/có khoảng trắng, hostname/port riêng và loại cấu hình bí mật.
- Build LOCAL/make và package audit đạt: local/api, version đúng, có LAN discovery, không chứa source/test/private config. Packaged Admin/Nhân viên qua HTTPS/discovery thật với MySQL cô lập: ngày đặt 09/10/2026 00:15, phí 5.000, ghi chú, lưu nháp, PNG/Excel đọc lại, hủy hộp thoại Save, xem/tải ảnh, xác nhận và trừ kho đạt. Admin nhập Excel chín cột/tạo-cập nhật mã/giá/model/nhập số lượng đạt.
- Cài silent exit 0; installed app-0.2.15 app.asar khớp package. Installed Admin qua HTTPS/discovery/MySQL cô lập hoàn thành cùng luồng bán hàng và Excel chín cột; không sửa data cửa hàng.
- Folder E:\outputt\Oufeidun-Local-0.2.15 và ZIP cùng tên. Đủ hai folder 01-MAY-CHU/02-MAY-CLIENT, BAT và hướng dẫn mới; 1.150 checksum và toàn bộ entry ZIP khớp, API/migrations/installer/asar khớp source/build, PowerShell parse và loại private config đạt. Log .local/audit-bundle-0.2.15.log.
- ZIP SHA256: 3DE677A227BE890D272A954BE78D195CF4F17397D6F2924E50018366A06C7730. Setup SHA256: 4A54F2FF3A290607530B557348E5CF1B891469FB3ACCD267F39C1FC8A96CBBB3.
- Cửa hàng cần chạy 01-MAY-CHU/CAP-NHAT.bat trước để backup/thay API/migration MySQL 006, kiểm tra, xuất bộ client rồi cập nhật app mọi máy. Giữ DB/ảnh/account/config/IP/hostname/CA/discovery; không cài lại MySQL, không clean-data. Chỉ gửi EXE không đủ cho lần này. Migration 006 đã áp dụng trên máy phát triển sau backup trước lúc mở source; chưa thực hiện trên máy chủ khách. Supabase 030 chưa áp dụng online trong bản LOCAL.
- Giới hạn: chưa nghiệm thu UAC/reboot/router và hai máy vật lý tại cửa hàng; EXE chưa có chữ ký Authenticode thương mại. Hướng dẫn BAT-DAU-O-DAY.txt ghi rõ các bước và giới hạn.

### 2026-10-10 — Thiết kế lại ảnh xác nhận đơn hàng

- Đã đọc lại toàn bộ checklist; ID ảnh hưởng IMAGE-01/02, PRODUCT-02/03, ORDER-03/09/10 và UI-01. PNG chia hai khối thông tin khách/đơn, vùng tình trạng hàng, bảng mã kính, ghi chú và bảng tiền riêng. Mã kính in đậm, số tiền căn phải, tổng tiền nổi bật; nhãn nhân viên và ngày đặt rõ nghĩa.
- Tên khách, địa chỉ, mã kính, máy dùng chung, ghi chú dòng/đơn, nội dung chi phí và mô tả hàng thiếu được đo bằng cùng font khi vẽ, xuống dòng theo từ và tăng chiều cao. Mã dài không có dấu cách vẫn xuống dòng; không dùng dấu ba chấm để cắt mô tả thiếu hàng. Trường hợp không có dòng hàng cũng căn ghi chú đúng.
- Đã xuất và xem PNG thật với một mặt hàng, tám mặt hàng giao một phần/tên khách và địa chỉ dài/ghi chú nhiều dòng, dữ liệu không ghi chú và không phí. Kiểm tra tọa độ text trong canvas và tổng tiền đạt; mẫu .local/order-confirmation-redesign.png và .local/order-confirmation-long.png. Tiền mẫu 123.213 + 188 = 123.401đ.
- npm.cmd run verify exit 0: 27 data, 32 UI, Electron smoke, TypeScript/build và audit 0 lỗ hổng. Log .local/verify-image-layout.log. Luồng UI lưu nháp/reload, PNG xem/tải, Excel/PDF, xác nhận và kho tiếp tục đạt. Không sửa API/migration, dữ liệu, phân quyền hoặc công thức tiền trong lần thiết kế này.
- Chưa tạo EXE hoặc ghi đè bộ bàn giao; chuẩn bị source LOCAL để người dùng kiểm tra.

### 2026-10-10 — Ngày đặt, ghi chú chứng từ, chi phí khác và ảnh nháp

- Đã đọc lại toàn bộ checklist; đối chiếu ORDER-01/02/03/05/06/09/10, IMAGE-01/02, EXCEL-01, PRODUCT-02/03, REPORT-01/02/07, AUTH-03, AUDIT-01, UI-01, DB-01/03. Kế hoạch ORDER-FEEDBACK-2026-10-10.md và BA-SPEC cập nhật theo bốn mục đã được xác nhận.
- Ngày đặt theo giờ Việt Nam lưu riêng ordered_at, chỉnh trong nháp hoặc thao tác order_date cho đơn đã bán/đã trả. Kiểm tra quyền chủ đơn/Admin, version, idempotency và ngày lịch hợp lệ; ngày lọc/hiển thị/chứng từ thống nhất. Thời gian tạo/xác nhận/giao/thu/hoàn thực tế không bị đổi; báo cáo vẫn theo thời gian xác nhận thực tế.
- Chi phí khác và nội dung lưu ở nháp; tổng hàng đặt cộng phí. Xác nhận cộng phí đúng một lần với hàng thực giao, giao bổ sung chỉ tăng tiền sản phẩm; thu tiền/công nợ gồm phí. Báo cáo và Excel báo cáo tách khoản thu khác khỏi lãi sản phẩm. Trả hàng hoàn tiền sản phẩm, hủy loại đơn/phí khỏi thống kê.
- Snapshot máy dùng chung chụp khi xác nhận. PNG/Excel/PDF có máy dùng chung, ghi chú từng dòng/đơn, ngày đặt và phí. PNG tự tăng chiều cao/xuống dòng; Excel wrapText/chiều cao dòng. PDF sửa số lượng/thành tiền theo thực giao cho đơn đã bán. Chi tiết nháp xem/tải PNG không xác nhận hoặc trừ kho. Đã xem PNG thật test-results/draft-order-details.png và đọc Excel tải về; ghi chú hai dòng và tổng 25.000 + 5.000 = 30.000 đúng.
- MySQL migration 006 thêm ordered_at/extra_cost/extra_cost_note/models_snapshot, giữ tổng tiền cũ và phí mặc định 0; Postgres/demo/Supabase 030 tương đương, chạy lại an toàn trên DB cô lập. Migration chưa áp dụng lên Supabase hoặc dịch vụ/DB cửa hàng. Đơn cũ chưa có snapshot model dùng danh mục hiện có; không thể khôi phục danh mục lịch sử không được lưu.
- npm.cmd run verify cuối exit 0: 27 data/32 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng. Log .local/verify-order-details-final.log. Đã cập nhật bài test Excel cũ đọc SKU ở dòng đầu vì cột mã nay có mô tả dùng chung; vẫn đối chiếu giá từng SKU và kiểm tra model thật.
- MySQL integration đạt: phí mới/nháp/confirm/giao bổ sung/thu tiền, retry không cộng phí hai lần, date/version/quyền/invalid calendar, snapshot model, report other_charges. Server unit 6/6 và syntax, deployment-config thư mục di chuyển/có khoảng trắng/hostname-port riêng đạt; không sửa DB cửa hàng khi test.
- Build LOCAL và Electron SOURCE + MySQL thật qua HTTPS/discovery: Admin/Nhân viên nhập ngày 09/10/2026 00:15, ghi chú và phí 5.000, lưu nháp, PNG, đọc lại Excel có note/model/ngày/phí/tổng30.000, hủy Save, xem/tải ảnh và xác nhận/trừ kho đạt. Profile dist là local/api. Không phải kiểm thử bộ EXE đã đóng gói hay hai máy vật lý.
- Chưa tăng version, tạo EXE hoặc thay folder/ZIP bàn giao. Khi phát hành cần cập nhật cả migration/API máy chủ lẫn app clients, không chỉ đổi EXE; giữ cấu hình, ảnh và dữ liệu.

### 2026-10-08 — Mẫu Excel tám cột theo ảnh khách (0.2.14)

- Đã đọc lại toàn bộ checklist sau code; đối chiếu PRODUCT-01/02/03, PRICE-01/04, STOCK-01/02/03, AUTH-03, AUDIT-01, UI-01, DB-01/03. Giữ version 0.2.14 theo yêu cầu ghi đè.
- Mẫu tải về có tám cột, không có tên sản phẩm/số lượng. Máy dùng chung tách dấu phẩy/xuống dòng, không tách dấu /. Dòng ghi chú trong ảnh không được thêm vào template. Loại kính kiểm tra theo danh mục; giá nguyên đồng, ô bắt buộc, kết quả công thức đã lưu; chặn SKU rỗng/trùng/dài, file hỏng/quá giới hạn.
- API import_products chỉ Admin, transaction và idempotency chung. Tạo SKU/hãng kính mới, cập nhật metadata và cả ba giá SKU cũ; giữ nguyên tồn/stock_version, ảnh, active, tên nội bộ và lịch sử. Giá thay đổi cập nhật price_version. SKU xóa mềm bị chặn. Không tạo phiếu kho vì mẫu không có số lượng; file ba cột cũ vẫn nhập số lượng như trước.
- MySQL integration thật ở DB test đạt: giá, tồn, concurrency, gửi lặp, staff, archived, rollback cả mã/hãng mới khi dòng sau lỗi. Demo/PGlite và migration 028 chạy lại an toàn; chưa áp dụng vào Supabase đang vận hành. Không thêm bảng/cột MySQL.
- UI nhập workbook thật, đọc lại tám tiêu đề, thêm mã, cập nhật mã cũ/ba giá/model, nhập lại và reload giữ tồn đạt; đã xem ảnh form. Sửa hồi quy wholesale fallback của dữ liệu demo cũ, không thay dữ liệu cửa hàng.
- npm.cmd run verify exit 0: dữ liệu 25/25, UI 31/31, Electron demo, TypeScript/build và audit 0 lỗ hổng. Server syntax/unit 6/6, MySQL integration 1/1, server audit 0 lỗ hổng. Kiểm thử config portable/custom hostname/port/secret exclusion đạt. Log .local/verify-excel-catalog-final.log.
- Build LOCAL/make và audit package đạt. Packaged Electron + MySQL/HTTPS/discovery: Admin nhập cả file ba cột và tám cột, tạo/cập nhật mã, ba giá, model tách đúng, giữ tồn đạt; Admin/Nhân viên lưu nháp, tải/đọc PNG/Excel, hủy Save, xem/tải ảnh, xác nhận bán/trừ kho đạt. Cài silent cùng version exit 0, installed asar khớp; installed config ngoài có BOM và HTTPS/discovery thật đạt.
- Đã ghi đè E:\outputt\Oufeidun-Local-0.2.14 và ZIP; bản trước giữ tại E:\outputt\_BACKUP\Oufeidun-Local-0.2.14-before-excel-20261008. Kiểm tra 1.148 checksum, mọi file ZIP, API/installer/asar khớp source/build, PowerShell parse, không chứa private config đạt.
- Setup SHA256: 9C83945EE5D81A2ABB6642233274BFC1C85403FF182A32342F04BE05FAAFD772. ZIP SHA256: 12E870E253A2EE2A1AAB3B08BD4025077858EEDC7F4A703972493236964FE839.
- Hướng dẫn đã cập nhật trong BAT-DAU-O-DAY.txt và hai folder máy chủ/client. Cần cập nhật API máy chủ rồi app các máy, dù vẫn hiện 0.2.14; giữ DB/ảnh/account/config/chứng chỉ. Chưa nghiệm thu hai máy vật lý/UAC/reboot tại cửa hàng; installer chưa ký Authenticode thương mại. Kiểm thử dùng workbook tạo theo ảnh, chưa có file Excel gốc của khách.

### 2026-10-07 — Bàn giao LOCAL 0.2.14

- Đã đối chiếu checklist và đóng gói các sửa đổi hãng Android, Excel nhập kho, đơn thiếu theo ghi chú và CSS form sản phẩm. Version app và Local API cùng `0.2.14`; profile `local-mysql`.
- Verify đạt: dữ liệu 22/22, UI 29/29, Electron demo smoke, TypeScript/build và audit app 0 lỗ hổng. Local API syntax, unit 6/6, MySQL integration 1/1 và audit server 0 lỗ hổng đạt.
- Package audit đạt: đúng version/profile, có discovery, không chứa source/test/private config. Packaged và installed smoke nhận URL cấu hình ngoài, gửi đăng nhập tới đúng server; HTTPS/discovery có chữ ký đạt.
- Cài silent exit 0; hash app.asar đã cài khớp package. Packaged Electron + MySQL test cô lập: Admin và Nhân viên đều lưu nháp, tải PNG, đọc Excel, hủy Save, xem ảnh và xác nhận bán/trừ kho thành công với khách đã tồn tại. Không sửa dữ liệu cửa hàng đang dùng.
- Bộ bàn giao PowerShell parse đạt, API/migration khớp source, đủ hướng dẫn đúng version; 1.147 checksum file khớp, ZIP đọc được và có updater/installer. Không chứa IP/config/CA/private key của máy phát triển.
- Folder: `E:\outputt\Oufeidun-Local-0.2.14`; ZIP: `E:\outputt\Oufeidun-Local-0.2.14.zip`.
- Installer SHA256: `2E87EB0568E7A95ACA144D6CCF726A1ECE758FF30F8D13062B5CD613910AF5A4`; ZIP SHA256: `E58B269DE0292875E7BBE1EC95755C482A1B4854C5A2569443F3C48EB3542EBE`.
- ZIP 371.984.941 byte. Windows Defender custom scan hoàn tất; không có detection gắn với bộ 0.2.14.
- Cập nhật máy chủ bằng `01-MAY-CHU/CAP-NHAT.bat`, kiểm tra rồi xuất client mới. Máy nhân viên chạy portable từ folder mới hoặc chạy `CAP-NHAT.bat` để cập nhật bản đã cài. Giữ DB/ảnh/account/config/chứng chỉ; không cài lại MySQL, không clean-data. Không thêm bảng/cột MySQL so với 0.2.13.
- Giới hạn: chưa nghiệm thu UAC/update/reboot và hai máy vật lý tại cửa hàng. Installer chưa ký Authenticode thương mại. Workbook cụ thể của khách chưa được cung cấp; ghi chú đơn bị bản cũ xóa không tự khôi phục.

### 2026-10-07 — Đồng bộ ô Loại kính và Hãng điện thoại

- ID ảnh hưởng: `UI-01`, `PRODUCT-01`. Đã đọc lại toàn bộ checklist và đối chiếu form thêm/sửa mã kính.
- Hai control dùng chung nền trắng, chiều cao, padding, viền, font và mũi tên. Hãng điện thoại vẫn cho chọn gợi ý hoặc nhập hãng mới; giữ chỉ báo focus khi thao tác bàn phím.
- Kiểm thử đo computed style của hai ô, kiểm tra focus và lưu Tecno/reload/gợi ý lại đạt; đã xem ảnh `test-results/phone-brand-selector-style.png`.
- `npm.cmd run verify` đạt: dữ liệu 22/22, UI 29/29, Electron smoke, TypeScript/build và audit 0 lỗ hổng. Log: `test-results/verify-selector-style.log`.
- Chưa tăng phiên bản hoặc đóng gói EXE trong lần sửa giao diện này.

### 2026-10-07 — Hãng Android, nhập Excel và giữ trạng thái đơn thiếu

- ID ảnh hưởng: `PRODUCT-01`, `STOCK-01`, `STOCK-02`, `STOCK-03`, `ORDER-02`, `ORDER-03`, `EXCEL-01`, `UI-01`, `DB-01`, `DB-03`. Đã đọc lại toàn bộ checklist sau thay đổi, cập nhật BA-SPEC và kế hoạch CUSTOMER-FEEDBACK-2026-10-07.md.
- Hãng điện thoại chọn/nhập bằng combobox; tên hãng lưu trong sản phẩm và được gợi ý lại từ dữ liệu kho. Bỏ hardcode Apple khi lưu, không sửa hàng loạt dữ liệu cũ. UI lưu Tecno, reload, mở sửa giữ nguyên; Apple/Samsung có gợi ý. Quyền sửa sản phẩm vẫn chỉ Admin.
- Excel: parser cũ cố định sheet/cột đầu và Number(cell.value), không nhận kết quả công thức hoặc text 12.000 đúng cách. Parser mới tìm theo tiêu đề, nhận số nguyên có phân nhóm/kết quả công thức đã lưu, chặn thiếu giá, số lẻ, SKU trùng, file hỏng/.xls và quá 100 dòng trước khi ghi. InputError chỉ cho các thông báo kiểm tra nhập liệu rõ ràng đi qua lớp friendly, không mở lộ lỗi SQL/API.
- UI nhập workbook thật có sheet hướng dẫn trước, cột đảo, giá text 12.000 và công thức quantity: file lỗi dòng 3 không cộng kho; file đúng cộng 2 miếng, reload vẫn từ 48 lên 50. Unit bao phủ template trống, ô trống, số lẻ/số lượng 0/giới hạn số dòng, formula không có cached result, trùng mã và định dạng sai.
- Đơn thiếu theo ghi chú: confirm giữ trạng thái short khi tất cả dòng hiện có giao đủ, giữ missing_summary, hiển thị trong chi tiết và Excel. Thêm resolve_shortage kiểm tra quyền chủ đơn/Admin, version và idempotency; chặn khi còn dòng chưa giao đủ. Hoàn tất ghi chú không thay tồn/tổng tiền/thu tiền. Đơn thiếu số lượng thực tế vẫn tự complete sau giao bổ sung đủ.
- `npm.cmd run verify` đạt: dữ liệu 22/22, UI 29/29, Electron demo smoke, TypeScript/build và audit 0 lỗ hổng. Local API syntax, server unit 6/6, MySQL integration 1/1 đạt; test DB và dataDir ảnh cô lập, không sửa dữ liệu đang dùng.
- `npm.cmd run build:local` đạt. Electron + MySQL qua HTTPS/discovery fixture đạt: đăng nhập, khách cũ, lưu nháp, tải PNG, đọc lại Excel, xác nhận và trừ kho. Đây là kiểm thử source trên máy phát triển, không phải nghiệm thu hai máy vật lý.
- Supabase migration `026_preserve_manual_shortage.sql` đạt trên schema cô lập; chưa áp dụng lên Supabase đang vận hành. LOCAL chỉ đổi source API, không thêm bảng/cột MySQL.
- Chưa nhận workbook/thông báo lỗi chính xác của khách nên chưa xác nhận cùng lỗi với file khách. Không tự khôi phục ghi chú bị bản cũ xóa. Chưa tăng version/đóng gói EXE/bàn giao; bộ 0.2.13 cũ chưa chứa sửa đổi này. Phát hành phải cập nhật cả API máy chủ và app client, giữ config/DB/ảnh/account.

### 2026-10-06 — BAT dọn dữ liệu thử, giữ nguyên account

- ID đối chiếu: `DB-03`, `AUTH-01`, `AUTH-03`, `STOCK-01`, `ORDER-01`, `CUSTOMER-01`, `AUDIT-01`. Công cụ bổ sung chỉ chạy trên máy chủ, không thay EXE hoặc tự xóa khi cập nhật.
- Hiển thị DB/folder/số bản ghi, cần nhập đúng câu xác nhận. Dừng API và xác minh cổng không còn nghe; backup thành công mới xóa. Không TRUNCATE/DROP; DELETE 16 bảng nghiệp vụ trong transaction InnoDB; giữ nguyên mọi trường tài khoản và migration. Ảnh cũ chuyển vào backup, lỗi SQL khôi phục ảnh; API được chạy lại trong finally.
- MySQL test đạt: preview không ghi, lỗi giữa chừng rollback toàn bộ và bật lại FK, schema lạ bị chặn, xóa hết dữ liệu nghiệp vụ, account/mật khẩu/quyền/session và migration giống nguyên trạng, chạy lại an toàn. Không chạy xóa database đang dùng của người dùng.
- PowerShell orchestration 5/5 đạt với task/DB/backup giả: Cancel, backup lỗi, cổng còn nghe, SQL lỗi/khôi phục ảnh, thành công/chuyển ảnh vào backup. Đường dẫn có khoảng trắng; không gọi task hoặc xóa dữ liệu máy thật.
- Backup thật trên database test, dataDir cô lập: dump SQL, ZIP ảnh, checksum, metadata PassThru đạt. Tên backup thêm milliseconds/UUID để tránh ghi đè hai lượt cùng giây.
- Đã đọc lại checklist. `npm.cmd run verify` đạt: dữ liệu 21/21, UI 26/26, Electron smoke, TypeScript/build và audit 0 lỗ hổng. Không đổi nghiệp vụ xuất Excel/PNG hoặc profile EXE 0.2.13 đã bàn giao.
- Source đã đăng ký task `Oufeidun Backup` lúc 23:00 theo đồng hồ Windows máy chủ, StartWhenAvailable; cần kiểm tra task/LastRunTime/LastTaskResult và file backup thực tế trên máy khách. Backup hiện nằm trên cùng máy, không phải bản sao ngoài máy.
- Giới hạn: không thực thi thao tác xóa và UAC/service thật trên database đang dùng; chỉ kiểm thử SQL thật ở DB test và orchestration với mocks. Bộ bổ sung BAT/scripts được bàn giao riêng, giữ nguyên ZIP 0.2.13 cũ.
- Gói bổ sung: `E:\outputt\Oufeidun-Clean-Data-0.2.13.zip`; SHA256 `6C65C0183F74CF296D7EE6C5297592B5F39D2807313F2F07ACE6A3A5C06E776B`. Chép gộp nội dung 01-MAY-CHU vào bộ máy chủ đang dùng; không cần cập nhật/cài lại máy nhân viên.

### 2026-10-05 — LOCAL 0.2.13, tự tìm máy chủ trên Wi-Fi/LAN

- ID ảnh hưởng: `DB-03`, `AUTH-01`, `UI-01`. Bộ client có public profile riêng của cửa hàng; thử kết nối cũ trước, rồi tìm IP bằng broadcast IPv4 có nonce/chữ ký Ed25519. HTTPS vẫn xác minh CA/hostname, không bỏ TLS và không sửa hosts trong chế độ mới.
- Server giữ khóa riêng ngoài source, giới hạn quyền Windows, chỉ xuất public key/CA. Bộ mới có App portable và MO-APP.bat; client không cần MySQL/Node hoặc Admin. Bộ chưa có profile tiếp tục dùng cấu hình cũ.
- Kiểm thử chữ ký sai, replay, sai cửa hàng, CA/hostname sai, đổi IP, timeout, nhiều card mạng Ethernet/Wi-Fi, không tự gửi lại giao dịch ghi: đạt. Electron đã gửi đăng nhập qua HTTPS thật với CA thử và tìm lại qua broadcast trên máy phát triển.
- `npm.cmd run verify` đạt: 21/21 dữ liệu, 26/26 UI, Electron demo smoke, TypeScript/build, audit 0 lỗ hổng. Local API unit 6/6 và MySQL integration 1/1 đạt; audit server 0 lỗ hổng.
- Electron + MySQL cô lập qua proxy HTTPS/discovery: Admin lưu nháp, tải PNG, đọc lại Excel, hủy Save không báo lỗi, xem/tải ảnh xác nhận, chốt bán và tồn giảm đúng một lần: đạt. Các test dùng database kiểm thử, không sửa dữ liệu khách.
- Tài khoản Nhân viên cũng hoàn thành cùng luồng trên Electron/MySQL qua kết nối mới; packaged smoke được kiểm tra sau build.
- Đã đọc lại toàn bộ checklist. Bộ bàn giao và hash được ghi sau kiểm tra package.
- Package LOCAL audit đạt: đúng 0.2.13, có module discovery, không chứa source/server/test/config riêng. Cài silent exit 0; app.asar đã cài khớp hash package mới. Installed smoke HTTPS/discovery và URL cấu hình cũ đạt; packaged Electron/MySQL hoàn thành lưu nháp, PNG, Excel và chốt bán.
- Folder: `E:\outputt\Oufeidun-Local-0.2.13`; ZIP: `E:\outputt\Oufeidun-Local-0.2.13.zip` (371.974.547 byte). Script trong bộ bàn giao parse đạt, Local API khớp source, không có mật khẩu/khóa riêng/public profile máy phát triển.
- Setup SHA256: `4D650759C038A5D068E8F8A23D958C1E73D2F3FCBB69867D137C1CF7C0956121`; ZIP SHA256: `93B769D1C340153B9D753768CD308D1E5380628F7169C5C0BFB0A7E4CE3B5F2C`.
- Giới hạn: chưa nghiệm thu hai máy vật lý, router Wi-Fi khách, UAC toàn bộ server installer hay reboot. Wi-Fi Guest/Client Isolation hoặc firewall chặn vẫn cần sửa mạng. Chưa có ký số Authenticode thương mại.

### 2026-10-05 — LOCAL 0.2.12, menu cập nhật và nhận cấu hình cũ

- ID ảnh hưởng: `DB-03`, `AUTH-01`, `UI-01`; giữ toàn bộ thay đổi bán hàng/đơn thiếu/ảnh/Excel và hãng Apple đã xác minh.
- Bộ máy chủ có menu BAT cập nhật, chạy, khởi động lại, kiểm tra, sửa cấu hình, backup, xuất client. Tìm dataDir qua server-info hoặc Scheduled Task; chọn thư mục cũ nếu không tìm thấy. Không gắn cứng ổ đĩa; script sửa khởi động không viết lại hostname/chứng chỉ.
- Cập nhật kiểm tra DB và backup DB/ảnh/cấu hình trước khi thay source/migration. Giữ bản code cũ; không tự rollback database sau migration lỗi. Khởi động kiểm tra version API để không nhận nhầm tiến trình cũ.
- Client LOCAL đọc connection.json ngoài ở AppData/Oufeidun, giữ URL HTTPS và cập nhật CSP đúng origin; profile Supabase không nhận override LOCAL. Client tách cập nhật app khỏi sửa IP/chứng chỉ.
- Kiểm thử cấu hình đạt: folder có dấu cách, bộ cập nhật chuyển chỗ, server-info cũ không còn đúng đường dẫn, tìm qua task, custom hostname/port và không lộ mật khẩu trong metadata. MySQL đang cài được kiểm tra read-only; backup thật thành công tại `E:\OufeidunServerData\backups\daily\2026-10-05_213652`.
- Đã đọc lại toàn bộ checklist. Verify đạt 21/21 dữ liệu, 26/26 UI, Electron smoke, TypeScript/build và audit app/server 0 lỗ hổng; MySQL integration 1/1 đạt.
- Build LOCAL và packaged smoke cấu hình ngoài đạt. Cài silent trên máy phát triển trả mã 0; installed smoke xác minh file JSON có BOM, URL ngoài, CSP và yêu cầu đăng nhập gửi đúng hostname cấu hình. Request hostname thử được mock trong smoke; kết nối MySQL thật được kiểm tra riêng.
- Bundle PowerShell parse đạt; không chứa config/mật khẩu/chứng chỉ/IP riêng máy phát triển; không còn đường dẫn ổ C/E gắn cứng trong script/runtime được bàn giao.
- Folder: `E:\outputt\Oufeidun-Local-0.2.12`; ZIP: `E:\outputt\Oufeidun-Local-0.2.12.zip`.
- Setup SHA256: `38F69DB1EB36AB56CB2CFA443221E54BE3C9B7F39F2C3CF2121A71BA335BAAAA`; ZIP SHA256: `41A98F92BB418D7288BE79074E84721C0937B848D327B33C36DBE60688B3B15F`.
- Giới hạn kiểm thử: chưa chạy đầy đủ cập nhật/khởi động dịch vụ với UAC, reboot Windows hoặc máy LAN thứ hai trong lần này. Installer chưa ký Authenticode (`NotSigned`).

### 2026-10-05 — Hãng điện thoại cố định Apple

- ID ảnh hưởng: `PRODUCT-01`, `REPORT-04`, `UI-01`. Theo yêu cầu cửa hàng chỉ sản xuất kính iPhone, bỏ combobox hãng điện thoại tại Bán hàng/Kho kính và bộ lọc hãng máy ở Báo cáo.
- Form thêm/sửa mã kính hiển thị Apple chỉ đọc và gửi Apple khi lưu. Vẫn giữ hãng kính và dòng máy dùng chung. Thanh tìm kiếm desktop chuyển thành hai cột tìm kiếm/hãng kính, không chừa cột trống.
- Không xóa sản phẩm, chứng từ hoặc sửa hàng loạt dữ liệu lịch sử. Báo cáo vẫn tổng hợp đủ dữ liệu hiện có.
- Đã đọc lại checklist. Kiểm thử tạo sản phẩm, nhập tồn ban đầu, mở form sửa với Apple, quyền nhân viên, bố cục desktop/mobile và báo cáo đạt. `npm.cmd run verify` đạt: dữ liệu 21/21, UI 26/26, Electron smoke, TypeScript/build và audit 0 lỗ hổng.
- Chạy source LOCAL để kiểm tra; chưa đóng gói EXE.

### 2026-10-05 — Ảnh lớn, tự tính hàng thiếu và bố cục giao bổ sung

- ID ảnh hưởng: `UI-01`, `ORDER-01`, `ORDER-03`, `ORDER-05`. Ảnh trong giỏ tăng lên 88px, có nút Xem ảnh mở bản lớn; chi tiết đơn cũng có ảnh sản phẩm.
- Khi đơn còn thiếu hàng, tự tính mã kính và số miếng thiếu theo lượng đặt/tồn kho, cập nhật khi đổi số lượng và lưu cùng đơn. Nếu kho đủ nhưng dự kiến giao sau, vẫn nhập ghi chú thủ công được; bỏ mô tả tự động cũ khi hết thiếu.
- Tách cảnh báo thiếu khỏi hàng số lượng/thành tiền. Popup giao bổ sung chia rõ từng sản phẩm, số còn thiếu, số giao, tiền hàng, công nợ và thu tiền cùng lần giao. Sửa thêm lỗi tổng tiền đè lên nút sửa dòng hàng trên mobile.
- Kiểm thử tự động hai mã thiếu, thay đổi số lượng, lưu nháp, mở ảnh lớn, cửa sổ 1000x700 và mobile đạt. Đã xem trực quan ảnh giỏ và popup giao bổ sung; không tràn ngang, control thẳng hàng.
- Đã đọc lại toàn bộ checklist. `npm.cmd run verify` đạt: dữ liệu/ngày giờ 21/21, UI 26/26, Electron smoke, TypeScript/build và dependency audit 0 lỗ hổng.
- Chạy source LOCAL để người dùng kiểm tra; chưa tạo EXE hoặc folder bàn giao.

### 2026-10-05 — Lịch sử chỉ hiển thị bán hàng và nhập hàng

- ID ảnh hưởng: `AUDIT-01`, `UI-01`, `DB-03`. Theo yêu cầu, chỉ hiển thị xác nhận bán, giao bổ sung, nhập hàng và nhập ban đầu; không hiện đăng nhập, lưu nháp, sửa giá, cập nhật khách, thanh toán riêng hoặc xuất/điều chỉnh kho.
- Client lọc các nhóm trên trước khi tạo bộ lọc nhân viên và đếm kết quả. Local API lọc trước giới hạn 100 log để các log hệ thống không đẩy lần bán/nhập ra khỏi danh sách. Các log khác vẫn lưu nguyên trong database.
- Lịch sử giao bổ sung hiển thị mã đơn và tên khách; nhập kho có tên thao tác riêng rõ ràng. Bộ lọc ngày Việt Nam và người thực hiện vẫn hoạt động.
- Đã đọc lại toàn bộ checklist sau thay đổi. MySQL integration 1/1 đạt, xác minh workspace chỉ trả đúng nhóm hiển thị và log sửa giá vẫn tồn tại nội bộ.
- `npm.cmd run verify` đạt: dữ liệu/ngày giờ 21/21, UI 25/25, Electron smoke, TypeScript/build và audit 0 lỗ hổng. Test UI đối chiếu từng dòng thao tác với nhóm được phép hiển thị.
- Chạy source LOCAL để người dùng kiểm tra; chưa tạo installer.

### 2026-10-05 — Lọc ngày bán, chữ trong đơn hàng và thu tiền khi giao bổ sung

- ID ảnh hưởng: `ORDER-02`, `ORDER-03`, `ORDER-05`, `UI-01`, `DB-01`, `DB-03`, `AUDIT-01`.
- Sửa lỗi so sánh chuỗi ISO khác offset: lọc bằng timestamp số theo khoảng ngày Việt Nam, bao gồm đủ ngày cuối. Danh sách/chi tiết đơn đã bán dùng thời gian xác nhận bán, nháp dùng thời gian tạo. Regression bao phủ đơn 05/10 lúc 20:21 với `+07:00` và UTC, 00:00, 23:59:59.999 và ranh giới ngày 6.
- Thống nhất chữ trong bộ lọc, bảng, nhãn trạng thái và chi tiết đơn: nội dung 14px, tiêu đề/thông tin chính 15px, nhãn ngắn 13px; tăng tương phản và giữ phân cấp số tiền.
- Giao bổ sung có tổng tiền hàng cập nhật theo số lượng, số còn phải thu, ô tiền thực nhận và phương thức thanh toán. Mặc định thu 0; giao hàng không tự đánh dấu đã trả. Backend ghi giao, kho, tổng tiền, thanh toán và audit trong một transaction, có idempotency.
- MySQL integration cô lập đạt: thu vượt số nợ bị từ chối và toàn bộ giao hàng rollback; gửi lại yêu cầu giao+thu không tạo thêm thanh toán hoặc lần giao. Lưu/tải workspace xác nhận số đã giao, tổng tiền, lịch sử và trạng thái thanh toán.
- UI demo đạt: giao bổ sung một miếng, nhận 50.000đ gồm tiền nợ trước, trạng thái đã thanh toán, không còn Thu thêm và lịch sử có đúng khoản chuyển khoản. Đã xem ảnh thật `test-results/supplemental-delivery-paid.png`.
- Supabase có migration cập nhật RPC `025_delivery_payment.sql`; chưa áp dụng lên Supabase đang vận hành trong lần sửa LOCAL này. Demo cũng cập nhật hàm cho database đã tồn tại.
- Đã đọc lại toàn bộ checklist và đối chiếu yêu cầu. `npm.cmd run verify` đạt: 21/21 bài dữ liệu/ngày giờ, UI 25/25, Electron smoke, TypeScript/build, audit 0 lỗ hổng. Local API syntax và MySQL integration 1/1 đạt.
- Chạy source LOCAL để kiểm tra; chưa đóng gói EXE/bàn giao.

### 2026-10-03 — Bàn giao LOCAL 0.2.10

- Phạm vi: đóng gói thay đổi `PRODUCT-01`, `STOCK-01`, `AUDIT-01`, `UI-01` cùng các sửa lỗi Local API đã xác minh trước đó.
- Version ứng dụng và Local API: `0.2.10`; build `local-mysql` hợp lệ, ứng dụng gọi `https://oufeidun.home.arpa/api/app/v1`, mã dùng chung tiếp tục gọi API website.
- Regression trước đóng gói đạt: database 20/20, UI 24/24, Electron smoke, TypeScript/build và audit dependency ứng dụng 0 lỗ hổng. Local API syntax, unit 6/6, MySQL integration 1/1 và audit dependency server 0 lỗ hổng đều đạt.
- Packaged Electron smoke đạt; kiểm tra trong `app.asar` xác nhận đúng version 0.2.10 và có nội dung `Số lượng nhập ban đầu`/`Tồn đầu khi tạo mã kính`.
- Bộ cập nhật có `CAP-NHAT-MAY-CHU.cmd`: sao lưu source Local API cũ, giữ nguyên database/ảnh/tài khoản/cấu hình rồi chạy migration và health check. Client cập nhật bằng `Oufeidun-Setup.exe`; không ghi đè thủ công vào Program Files.
- Folder: `E:\outputt\Oufeidun-Local-0.2.10`; ZIP: `E:\outputt\Oufeidun-Local-0.2.10.zip` (192.848.974 byte), SHA256 `35BE7F1C2DB175013F905DF72DCFF6163A459C7773ABEC70C7FD6CE127021308`.
- Installer SHA256: `41F7227545E46BB8ADF518969B1CF2F924FB88AAF997FCD2C5F355A3065B9138`; Windows Defender không phát hiện mối đe dọa. Installer chưa có chứng thư ký số thương mại (`NotSigned`).

### 2026-10-03 — Nhập tồn ban đầu ngay khi thêm mã kính

- ID ảnh hưởng: `PRODUCT-01`, `STOCK-01`, `AUDIT-01`, `UI-01`.
- Form `Thêm mã kính` có thêm ô `Số lượng nhập ban đầu (miếng)`, mặc định 0 và chỉ nhận số nguyên từ 0 đến 1.000.000. Ô này không xuất hiện khi sửa sản phẩm cũ để tránh cộng tồn lặp.
- Khi số lượng lớn hơn 0, ứng dụng tự tạo phiếu `Tồn đầu kỳ` bằng đúng nghiệp vụ kho hiện có; tồn kho, người thao tác, thời gian và lịch sử biến động vẫn được lưu đầy đủ. Giá trị 0 chỉ tạo danh mục sản phẩm, không tạo biến động kho.
- Kiểm thử giao diện tạo mã `TEST-TON-DAU` với 7 miếng, xác nhận bảng kho hiện 7 miếng, lịch sử có `opening +7` và form sửa không còn ô nhập ban đầu: đạt.
- Regression đầy đủ `npm.cmd run verify` đạt: database 20/20, UI 24/24, Electron smoke, TypeScript/build và audit dependency 0 lỗ hổng.
- Đã đọc lại toàn bộ checklist và đối chiếu các mục bị ảnh hưởng. Chưa build EXE/folder bàn giao trong lần thay đổi này.

### 2026-10-03 — Sửa bốn thao tác Bán hàng trên LOCAL và lỗi script kiểm thử

- ID ảnh hưởng: `CUSTOMER-01`, `ORDER-01`, `ORDER-02`, `IMAGE-01`, `EXCEL-01`, `STOCK-03`, `REPORT-07`, `DB-03`, `UI-01`.
- Lỗi tái hiện trên khách trong ảnh: MySQL trả `ER_TRUNCATED_WRONG_VALUE` do `LAST_INSERT_ID(id)` nhận UUID khi lưu khách đã tồn tại. Đã bỏ phép chuyển ID số và giữ ID khách khi lưu lại; sửa điện thoại theo ID cũng được kiểm thử.
- Thiếu sót kiểm thử trước: integration chưa lưu lại cùng khách và Electron LOCAL chỉ đăng nhập/tải workspace; không đủ kết luận bốn nút bán hàng đã hoạt động.
- Xuất file: dùng IPC giới hạn PNG/XLSX, kiểm tra nguồn gọi, tên/định dạng/dung lượng; Windows cho chọn nơi lưu và chỉ trả thành công sau khi ghi xong. Ảnh xem trước giữ Blob gốc để tải cùng ảnh, không gọi fetch bị CSP chặn. PNG mã hóa trực tiếp để tránh chờ callback canvas khi cửa sổ bị che.
- Lỗi `require is not defined` trong ảnh phản hồi phát sinh từ callback do script test inject vào Electron main. Đã sửa script để không dùng require trong callback; test không còn mở cửa sổ này. Xác minh database ứng dụng không có sản phẩm `SMOKE-%`.
- MySQL integration bổ sung lưu khách cũ bằng điện thoại, bằng ID và đổi điện thoại: đạt. Local API unit 6/6 và syntax check đạt.
- Electron + MySQL cô lập: cả Admin và Nhân viên lưu nháp → tải PNG → tải/đọc lại Excel → mở/tải ảnh xem trước → xác nhận bán; đơn confirmed, tiền 25.000đ, tồn 2 xuống 1 và chỉ có một khách theo điện thoại. Hai vai trò đều đạt; đã xem PNG thực tế.
- `npm.cmd run verify` sau bản sửa cuối đạt: database 20/20, UI 23/23, Electron demo, TypeScript/build và dependency audit 0 lỗ hổng.
- Đã đọc lại toàn bộ checklist và đối chiếu các mục bị ảnh hưởng. API runtime của máy phát triển đã cập nhật và khởi động lại; health HTTPS đạt. Bản source chạy LOCAL; dữ liệu test dùng database riêng.
- Chưa tạo lại EXE/folder bàn giao trong lần sửa này. Bộ bàn giao 0.2.9 cũ chưa chứa bản sửa; khi phát hành tiếp phải cập nhật cả Local API máy chủ và app trên máy dùng công cụ, không áp dụng hướng dẫn chỉ cập nhật client của lần trước.

### 2026-09-29 — Phiên bản 0.1.13, bàn giao Supabase TEST

- Yêu cầu: kiểm tra lại toàn bộ tính năng và tạo bộ cài để gửi khách hàng.
- Phạm vi đối chiếu: toàn bộ `AUTH-01` đến `DB-02`; 34/35 mục đã có, riêng `DB-02` vẫn chờ hosting/API MySQL production thật.
- Đã đọc lại `BA-SPEC.md` và toàn bộ checklist; đã kiểm tra quyền Admin/Nhân viên, dữ liệu rỗng/không hợp lệ, lưu nháp, phiên đăng nhập, các luồng Excel và UI cửa sổ tối thiểu.
- Database: 20/20 bài kiểm thử đạt.
- Giao diện: 21/21 bài kiểm thử đạt.
- Electron smoke, TypeScript, build và audit dependency production: đạt; 0 lỗ hổng đã biết.
- Profile build: `test-supabase`; trình kiểm tra xác nhận đúng Supabase TEST. Không giả mạo thành bản MySQL production.
- Bộ cài đã cài thử với mã thoát 0; phiên bản `app-0.1.13` được tạo và cửa sổ `Oufeidun • Quản lý bán hàng` mở thành công.
- File Excel mẫu đã mở lại: có hai sheet `Nhap kho` và `Huong dan`, đúng ba cột nhập kho.
- Windows Defender quét file bàn giao: đạt. Bộ cài chưa có chứng thư ký số thương mại (`NotSigned`).
- File bàn giao: `Oufeidun-0.1.13-ban-giao.zip`.
- SHA256: `26B2669B4AA6F62AA3617CFE30FC8178DE696139FCEC16E2F6093E9B76D550CC`.

### 2026-09-29 — Kiểm tra toàn bộ UI, chưa đóng gói EXE

- Phạm vi: `PRICE-01`, `UI-01` và regression toàn bộ chức năng.
- Lỗi đã tìm thấy và sửa: Nhân viên có thể nhập giá bán riêng trên dòng đơn; sidebar ở chiều cao cửa sổ tối thiểu làm nút Đăng xuất nằm ngoài màn hình; phần thông tin khách hàng đẩy các nút Xuất Excel/Lưu bản nháp/Xác nhận bán xuống ngoài khung đơn ở cửa sổ 1000×700.
- Bảo vệ giá: UI chỉ hiển thị giá áp dụng; migration `020_lock_order_prices.sql` buộc server lấy giá lẻ/sỉ trong danh mục và đã áp dụng lên Supabase test.
- Audit UI mới: đi qua toàn bộ trang Admin/Nhân viên ở cửa sổ 1000×700; kiểm tra crash, tràn ngang, control thiếu tên và ảnh thiếu alt.
- Database: 20/20 bài kiểm thử đạt.
- Giao diện: 21/21 bài kiểm thử đạt, gồm kiểm tra riêng các nút thao tác bán hàng luôn nằm trong vùng nhìn thấy ở cửa sổ 1000×700.
- Electron smoke, TypeScript, build source/web: đạt.
- Audit dependency production: 0 lỗ hổng.
- Không tạo hoặc cập nhật file `.exe` theo yêu cầu người dùng.

### 2026-09-29 — Phiên bản 0.1.12

- Phạm vi: `CUSTOMER-02` và kiểm tra lại toàn bộ phản hồi khách hàng từ `CUSTOMER-01` đến `REPORT-07`.
- Database: 20/20 bài kiểm thử đạt.
- Giao diện: 18/18 bài kiểm thử đạt.
- Electron smoke: đạt.
- TypeScript/build production: đạt.
- Audit dependency production: 0 lỗ hổng.
- Build bàn giao: Supabase TEST, `Oufeidun-0.1.12-ban-giao.zip`.
- SHA256 ZIP: `C44818D602869680AB6D395666B32FAE3B3A500EFEAD1BD83B63BEE8C76D82FC`.

### 2026-09-29 — Backend MySQL LOCAL

- Yêu cầu: một máy Windows làm server; các máy bán hàng kết nối qua HTTPS LAN; máy chủ có thể khóa bằng `Windows + L` nhưng không Sleep.
- ID ảnh hưởng: toàn bộ `AUTH-01`–`REPORT-07`, `AUDIT-01`, `DB-03`; không thay đổi `DB-01` Supabase TEST và chưa thay thế `DB-02` hosting production.
- Đã tạo schema MySQL 15 bảng/24 FK, Local API, scrypt password, single-session, transaction/idempotency, khóa tồn, ảnh filesystem an toàn, lookup local, backup/restore, profile `local-mysql`, Caddy và script Windows Scheduled Task.
- MySQL cô lập dùng đúng binary 8.0.46: migration chạy lặp hai lần; integration API đạt gồm auth, chặn phiên thứ hai, phân quyền, product, stock, customer, payment, report, lookup, ảnh và hai xác nhận đồng thời chỉ một thành công.
- Backup đã tạo checksum và phục hồi sang database khác: 15 bảng, số sản phẩm nguồn/đích khớp 1/1.
- Regression: database 20/20; UI 21/21; Electron demo và Electron local smoke đạt; build local đạt; audit production app/server đều 0 lỗ hổng.
- Còn lại trước bàn giao: chạy setup có UAC/mật khẩu root trên MySQL chính, kiểm tra reboot/Windows+L, thử máy LAN thứ hai và build bộ cài HTTPS local.


### 2026-09-29 — Local client 0.2.0, chờ cài service máy thật

- Phạm vi đối chiếu: `AUTH-01`–`REPORT-07`, `AUDIT-01`, `UI-01`, `UI-02`, `DB-03`.
- Backend MySQL: unit 6/6 và integration đạt; đã kiểm tra single-session, phân quyền, ảnh, lookup, báo cáo và hai giao dịch tranh chấp tồn chỉ một giao dịch thành công.
- Regression bắt buộc: database 20/20; UI 21/21; Electron smoke, TypeScript/build và audit production đạt; app và server đều 0 lỗ hổng production đã biết.
- Profile build: `local-mysql`; package bên trong trỏ `https://oufeidun.home.arpa`, không chứa Supabase key, server, scripts, `.env` hoặc backup.
- File build: `out/make/squirrel.windows/x64/Oufeidun-Setup.exe`, phiên bản 0.2.0, SHA256 `CB498DFBFD39B74676233DA5586BB4FA5D05F0C705CBA611BCB6411A9CC272C7`.
- Còn lại: người dùng chạy `CAI-MAY-CHU-LOCAL.cmd` trực tiếp để nhập mật khẩu MySQL trong cửa sổ UAC; sau đó kiểm tra service/reboot/Windows+L và máy LAN thứ hai. File EXE chưa ký Authenticode.

### 2026-09-30 — Máy chủ MySQL LOCAL đã cài

- Máy chủ: MySQL 8.0.46, database `oufeidun_local`, Node API loopback `127.0.0.1:8787`, MySQL loopback `127.0.0.1:3306`, Caddy HTTPS LAN `oufeidun.home.arpa:443`.
- Mạng Ethernet đã đặt Private; firewall chỉ cho cổng 443 từ LocalSubnet; Sleep khi cắm điện đặt Never và màn hình được phép tắt sau 5 phút.
- Dữ liệu phát triển: 4 sản phẩm mẫu có giá lẻ, giá sỉ, giá vốn, tồn đầu và mã máy dùng chung.
- Package 0.2.0 đã đăng nhập vào API thật và tải workspace với 4 sản phẩm thành công.
- Backup thật có dump MySQL, uploads và checksum; Scheduled Task backup đã đăng ký lúc 23:00. Windows Defender quét ZIP máy con: không phát hiện mối đe dọa.
- Kiểm tra cuối: database 20/20; UI 21/21; Electron smoke/build/audit đạt; 0 lỗ hổng production đã biết.
- Bộ chia sẻ: `E:\OufeidunServerData\Oufeidun-Client-Test-0.2.0.zip`; SHA256 `9EC1D4EAE986CA7A0EC6941F9EEC17B64670648ACC01982CA95EA7D4A6E2B2F5`.
- Chưa thể tự xác nhận trên cùng một máy: reboot không đăng nhập, Windows+L và một máy LAN thứ hai. Đây là ba bước kiểm tra vật lý sau khi cài máy con.
### 2026-09-30 — Migration Supabase sang MySQL LOCAL

- Phạm vi: dữ liệu nghiệp vụ và ảnh của toàn bộ `AUTH-01`–`REPORT-07`, `AUDIT-01`, `DB-03`; không sửa dữ liệu nguồn Supabase.
- Đã tạo backup trước migration tại `E:\OufeidunServerData\backups\daily\2026-09-30_071417`, snapshot có SHA-256 tại `migration-snapshots\supabase_2026-09-30_072147` và backup sau migration tại `backups\daily\2026-09-30_072500`.
- Đã chuyển 4 tài khoản nguồn (3 còn hiệu lực, 1 xóa mềm), 8 sản phẩm, 3 khách, 17 đơn/38 dòng đơn, 2 lần trả hàng, 4 thanh toán, 11 phiếu kho/15 dòng phiếu, 35 biến động kho, 112 log và tổng tồn 5.185.
- Đã tải và kiểm tra 2/2 ảnh JPEG từ Supabase Storage; EXE local hiển thị đúng 8 sản phẩm và tải cả 2 ảnh từ filesystem máy chủ.
- Hai ảnh là toàn bộ ảnh mà dữ liệu nguồn đang tham chiếu: `IP14PM` và `IP16P-TR`; sáu sản phẩm còn lại không có ảnh ngay trên Supabase.
- Runtime local dùng MySQL/API tại máy chủ cho bán hàng, kho, đơn, khách và tài khoản. Riêng màn `Mã dùng chung` gọi API website dùng dữ liệu Supabase để có đầy đủ 44 SKU, model và ảnh; client không chứa khóa Supabase.
- Không chuyển phiên đăng nhập; loại 73 `mutation_requests` vì là dữ liệu idempotency cũ có thể chứa payload nhạy cảm. Mật khẩu Supabase Auth không thể xuất; admin giữ mật khẩu local đã cấu hình, tài khoản nhân viên dùng mật khẩu tạm để admin đặt lại.
- Kiểm tra API thật: workspace, đơn, khách, tài khoản, lookup mã dùng chung, ảnh và báo cáo đều đạt; báo cáo có 11 đơn xác nhận năm 2026 và tồn 5.185.
- Regression: server unit 6/6, database 20/20, UI 21/21, Electron smoke, TypeScript/build và audit dependency đều đạt; 0 lỗ hổng production đã biết.
- Không build lại bộ cài vì migration chỉ thay dữ liệu máy chủ; package local 0.2.0 hiện tại đã được smoke test trực tiếp với dữ liệu mới.

### 2026-09-30 — Local 0.2.1 dùng kho Mã dùng chung Supabase

- Yêu cầu: nghiệp vụ bán hàng hoạt động trên MySQL local như cũ; riêng màn `Mã dùng chung` dùng kho tra cứu lớn và ảnh trên Supabase.
- ID ảnh hưởng: `PRODUCT-02`, `DB-03`; không thay đổi dữ liệu bán hàng đã migration.
- Đã cho phép profile `local-mysql` dùng hai HTTPS origin: `oufeidun.home.arpa` cho nghiệp vụ và `outfeidun.vercel.app` cho tra cứu.
- API thật: từ khóa `sa` trả 15 kết quả; Electron đóng gói nhận `GNS-T023- SAM A10`, danh sách model dùng chung và ảnh JPEG hợp lệ.
- Regression trước đóng gói: database 20/20, UI 21/21, Electron smoke, TypeScript/build và audit dependency đều đạt.
- Bộ cài local `0.2.1`: `out/make/squirrel.windows/x64/Oufeidun-Setup.exe`; SHA256 `CAC0EC7516BD2B692E4EF81E2A856A968763DCECCA0F2839545BC4E7B46291F3`.
- Bộ gửi máy con: `E:\OufeidunServerData\Oufeidun-Client-Test-0.2.1.zip`; SHA256 `E28A791240B8AC8EFF54A9C633890306B144BEAA6243AAA5AB0DB06A8A622A22`.
- Giới hạn đúng thiết kế: mất Internet không ảnh hưởng bán hàng local, nhưng màn `Mã dùng chung` cần Internet để đọc Supabase.
- Audit toàn bộ kho tra cứu: 44/44 SKU có đúng 2 ảnh, 88/88 ảnh là duy nhất; 88 endpoint trả HTTP 200, đúng MIME và đúng số byte; API lookup của từng SKU trả đúng hai ID ảnh theo thứ tự database.
- Smoke bản Electron đóng gói bắt buộc render đủ hai ảnh cho kết quả đầu tiên; cả hai ảnh đều tải có kích thước thực.

### Mẫu ghi cho lần tiếp theo

```text
Ngày / phiên bản:
Yêu cầu khách hàng:
ID chức năng ảnh hưởng:
Migration/API/UI đã đổi:
Test đã chạy và kết quả:
Profile build:
File bàn giao:
SHA256:
Vấn đề còn lại:
```

### 2026-10-01 — Bộ cài LOCAL 0.2.8 cho máy khách

- Yêu cầu: bỏ phương án ngrok, giữ toàn bộ tính năng hiện tại và đóng gói lại bộ cài MySQL LOCAL gồm máy chủ và máy nhân viên.
- ID đối chiếu: toàn bộ `AUTH-01`–`REPORT-07`, `AUDIT-01`, `UI-01`, `UI-02`, `DB-03`, `IMAGE-01`, `EXCEL-01`.
- Runtime nghiệp vụ dùng `https://oufeidun.home.arpa/api/app/v1`; MySQL và Node API chỉ nghe loopback. Không có ngrok trong source hoặc package. Màn Mã dùng chung tiếp tục đọc API tra cứu HTTPS đã chốt.
- Kiểm thử đạt: database 20/20; UI 22/22; Electron demo smoke; Local API unit 6/6; MySQL integration 1/1; Electron local smoke đăng nhập và tải workspace; TypeScript/build local; dependency audit app/server đều 0 lỗ hổng.
- Đã sửa công cụ Electron local smoke để nhận cổng kiểm thử riêng, tránh nhầm dịch vụ phát triển đang chiếm cổng 8787.
- Installer local 0.2.8: `174039040` byte, SHA256 `EB00E696DFA100834A85F7753ADC367B09D002D680962F336D8FD4132E6F564C`.
- Folder bàn giao: `E:\outputt\Oufeidun-Local-0.2.8`, gồm `01-MAY-CHU`, `02-MAY-CLIENT` và `BAT-DAU-O-DAY.txt`. Chứng chỉ/IP client được sinh trên máy chủ thật của khách.
- ZIP bàn giao: `E:\outputt\Oufeidun-Local-0.2.8.zip`, SHA256 `FDEB6310223AAFE4CAFD0DC58AD95F197272C09CDA5E38C5FA61F7A4C9E1BF58`.
- PowerShell parse và preflight máy chủ đạt; code/migration trong bundle khớp source; Windows Defender không phát hiện mối đe dọa trong installer, Caddy hoặc ZIP.
- Giới hạn: installer chưa ký Authenticode thương mại (`NotSigned`); kiểm tra LAN/Wi-Fi thật và chạy trọn installer máy chủ cần thực hiện trên phần cứng/mạng của khách.

### 2026-10-01 — LOCAL 0.2.9, Excel đơn mới và đổi giá theo loại kính trong đơn

- Yêu cầu: màn Đơn hàng mới giữ tải ảnh và bổ sung tải Excel; sửa giá được chọn riêng một dòng hoặc toàn bộ sản phẩm cùng loại kính trong đơn hiện tại.
- ID đối chiếu: `PRICE-01`, `PRICE-04`, `ORDER-01`, `ORDER-02`, `IMAGE-01`, `EXCEL-01`, `UI-01`, `DB-03`.
- UI: popup dòng hàng có combobox Phạm vi áp dụng giá, ghi rõ không sửa danh mục/đơn cũ. Nút `Tải Excel` nằm cạnh `Tải ảnh xác nhận`; bốn thao tác cuối đơn không tràn ở 1000×700, 1667×1034 và mobile.
- Nghiệp vụ: chọn theo loại kính cập nhật giá cho mọi dòng hàng bán có cùng `glass_type`, không đổi hàng tặng/hàng mẫu hay loại kính khác; từng SKU vẫn được gửi và lưu qua cơ chế giá draft hiện tại, có audit/snapshot phía server.
- Kiểm thử mới xác minh hai SKU kính trong cùng đổi 21.000đ, SKU chống nhìn trộm giữ 45.000đ và file Excel tải xuống chứa đúng ba mức giá. File Excel mở lại bằng ExcelJS thành công.
- Regression đạt: database 20/20, UI 23/23, Electron demo smoke, Local API unit 6/6, MySQL integration 1/1, Electron local smoke, TypeScript/build local và audit dependency app/server 0 lỗ hổng.
- Folder: `E:\outputt\Oufeidun-Local-0.2.9`; ZIP: `E:\outputt\Oufeidun-Local-0.2.9.zip`.
- Installer SHA256: `2380A6AD253052B5C54CAE7CE7B146AC0C699258476CFA3E60EB1B51649E7A3D`; ZIP SHA256: `BB5C13787B6E1883D380529124DDFF427E99328F1716678D146FDBA28AA9DB9B`.
- Code/migration server trong gói khớp source, package không chứa ngrok/secret/source test; PowerShell parse đạt và Windows Defender không phát hiện mối đe dọa trong ZIP.
- Cập nhật cửa hàng đang dùng: chỉ cần đóng app và chạy installer 0.2.9 trên máy chủ nếu máy chủ dùng app, cùng toàn bộ máy client; không chạy lại cài máy chủ hoặc đổi database/chứng chỉ/IP.
- Giới hạn: installer chưa ký Authenticode thương mại (`NotSigned`); kết nối LAN/Wi-Fi thật vẫn phụ thuộc định tuyến và cấu hình router tại khách.

### 2026-09-30 — Local 0.2.3, mã đơn tự nhập và ảnh xác nhận

- Yêu cầu khách hàng: mã đơn do người bán tự nhập; thao tác tại màn Bán hàng tải ảnh PNG để gửi khách kiểm tra thay cho Excel. Xuất Excel ở Đơn hàng/Báo cáo và file mẫu nhập kho vẫn giữ nguyên.
- ID ảnh hưởng: `ORDER-01`, `ORDER-02`, `ORDER-03`, `ORDER-08`, `IMAGE-01`, `EXCEL-01`, `DB-01`, `DB-03` và `UI-01`.
- Database/API: thêm `order_code` tối đa 50 ký tự, bắt buộc với đơn mới và duy nhất không phân biệt hoa/thường. 18/18 đơn MySQL cũ đã có mã kế thừa, không thiếu hoặc trùng. Backup trước migration: `E:\OufeidunServerData\backups\daily\2026-09-30_153405`.
- UI: thêm ô Mã đơn hàng bắt buộc; lưu/mở draft giữ đúng mã; tạo PNG gồm mã đơn, khách, SĐT, địa chỉ, Sales, thời gian, tình trạng, chi tiết hàng và tổng tiền. Nút Excel trong danh sách đơn/báo cáo không bị thay đổi.
- Kiểm thử: database 20/20; UI 21/21; server unit 6/6; MySQL integration đạt gồm chặn mã trùng khác hoa/thường; Electron smoke, TypeScript/build và audit dependency đạt; 0 lỗ hổng production đã biết.
- Profile build: `local-mysql`; bundle gọi `https://oufeidun.home.arpa`, không chứa Supabase key hoặc source server/test/script. Windows Defender không phát hiện mối đe dọa.
- Bộ cài máy nhân viên: `E:\OufeidunServerData\Oufeidun-Client-LAN-WiFi-0.2.3.zip`.
- SHA256 ZIP: `907F89437EF14DCE298F6765FDD6ED17B124B820450AA547F77AAC7221840193`.
- Installer chưa ký Authenticode thương mại (`NotSigned`). Runtime API đã copy code/migration mới nhưng tiến trình Scheduled Task chạy bằng SYSTEM cần chạy `KHOI-DONG-LAI-MAY-CHU.cmd` và chấp nhận UAC để nạp mã mới. Kiểm tra vật lý máy Wi-Fi thứ hai vẫn cần thực hiện tại công ty.

### 2026-09-30 — Bộ triển khai máy chủ/client cho máy khách mới

- Yêu cầu: chia riêng thư mục máy chủ và máy nhân viên; máy chủ khách có IP/MAC riêng, MySQL mới và không dùng chứng chỉ/cấu hình của máy phát triển.
- ID ảnh hưởng: `DB-03` và bước triển khai/vận hành; không thay đổi binary ứng dụng 0.2.3 đã kiểm thử.
- Đã tạo `E:\outputt\01-MAY-CHU` gồm Local API, migration 001–003, thư viện runtime, Caddy, kiểm tra điều kiện, installer máy chủ, backup, tài liệu và script sinh bộ client.
- Đã tạo `E:\outputt\02-MAY-CLIENT` gồm installer 0.2.3, script cài và hướng dẫn. Template cố ý chưa chứa `root.crt` hoặc `server-config.txt`; máy chủ khách tự sinh hai file theo IP/chứng chỉ thật.
- Máy chủ tự phát hiện IPv4/card mạng, bắt buộc IP đã gán trên máy, đọc đúng MAC, cho chọn thư mục dữ liệu và dải mạng được phép; hỗ trợ LAN/Wi-Fi cùng subnet hoặc nhiều CIDR/VLAN đã được router định tuyến.
- Kiểm tra: tất cả PowerShell parse thành công; preflight nhận Node/MySQL/IP; export client cô lập tạo đúng IP/chứng chỉ và checksum; không đóng gói `.env`, mật khẩu/token, IP/MAC hoặc chứng chỉ môi trường phát triển; Defender không phát hiện mối đe dọa.
- Giới hạn nghiệm thu: installer máy chủ chưa thể chạy trọn vẹn trên phần cứng khách trước khi có máy thật, mật khẩu root MySQL và cấu hình router của khách. Sau khi cài cần kiểm tra `/health`, Windows + L và một máy Wi-Fi thực tế.

### 2026-09-30 — Sửa đăng nhập sau khi đổi mật khẩu, phiên bản 0.2.2

- Nguyên nhân phía giao diện: form đổi mật khẩu chỉ nhập một lần nên dễ sai ký tự; khi admin tự đổi mật khẩu, access token cũ vẫn còn trong bộ nhớ client dù server đã hủy phiên.
- Nguyên nhân phụ phía API: bộ giới hạn đăng nhập trước đây tính cả lần đăng nhập thành công, có thể khóa tạm thời người dùng thao tác nhiều lần.
- Đã thêm ô nhập lại mật khẩu và kiểm tra hai giá trị trùng nhau; sau khi admin tự đổi mật khẩu, client xóa token cũ rồi đưa về màn hình đăng nhập; đổi mật khẩu nhân viên không đăng xuất admin.
- API chỉ ghi nhận lần đăng nhập sai vào rate limit và xóa bộ đếm khi đăng nhập thành công.
- Kiểm thử: server unit 6/6; MySQL integration đạt, gồm đổi mật khẩu nhân viên, tự đổi mật khẩu admin, vô hiệu hóa phiên cũ và đăng nhập lại bằng mật khẩu mới; database 20/20; UI 21/21; Electron smoke/build/audit đạt; packaged-local smoke đạt với 8 sản phẩm, 2 ảnh local và 2 ảnh mã dùng chung.
- Bộ cài local `0.2.2`: `out/make/squirrel.windows/x64/Oufeidun-Setup.exe`; SHA256 `BF1EF5662F19ECB29AD32D88835B9A7BAE93210912824200EF51348B3C3C19DB`.
- Bộ gửi máy con: `E:\OufeidunServerData\Oufeidun-Client-Test-0.2.2.zip`; SHA256 `E004D47D4C525B247FA91594D5B30C2A855C4D373BF8D89A15735F7BEBC2DF64`.
- Mã API mới đã copy vào runtime máy chủ. Scheduled Task chạy bằng SYSTEM nên cần chạy `scripts/restart-local-services.ps1` bằng quyền Administrator để nạp thay đổi rate limit; bản sửa client 0.2.2 đã có đầy đủ trong bộ cài.

### 2026-09-30 — Giá bán linh hoạt theo đơn và theo khách sỉ

- Yêu cầu khách hàng: chọn khách hàng/loại khách ngay tại đơn; tự gợi ý giá lẻ hoặc giá sỉ nhưng cho phép người bán sửa giá từng SKU; có thể lưu giá riêng cho khách sỉ; khi đổi khách sau khi sửa giá phải hỏi giữ giá hay áp lại bảng giá.
- ID chức năng ảnh hưởng: `PRICE-01`, `PRICE-03`, `PRICE-04`, `ORDER-01`, `ORDER-02`, `AUDIT-01`, `DB-01`, `DB-03`.
- UI: ô giá bán thực tế sửa được trong popup dòng hàng; hiển thị nguồn giá gợi ý và nhãn giá đã chỉnh; hỗ trợ lưu giá cho khách sỉ; xác nhận riêng khi bán giá 0đ; hộp hỏi giữ/áp lại giá khi đổi khách hoặc loại khách.
- Database/API: thêm bảng giá theo khách và cờ nguồn giá trên MySQL local lẫn migration Supabase test; server tự tính giá gợi ý khi client không đánh dấu sửa; giá tùy chỉnh được lưu vào draft, giữ khi xác nhận và ghi audit; đơn đã xác nhận giữ snapshot.
- MySQL thật: migration `002_flexible_order_prices` đã áp dụng; xác minh đủ bảng `customer_product_prices` và hai cột giá mới. Backup sau migration tại `E:\OufeidunServerData\backups\daily\2026-09-30_142641`.
- Kiểm thử dữ liệu thật cô lập: API MySQL đã kiểm tra lưu giá 19.000đ, tải lại, xác nhận đơn, snapshot tổng tiền và tự dùng lại giá đã lưu cho đơn sau; migration Supabase test kiểm tra cùng quy tắc.
- Kiểm thử: database 20/20; UI 21/21; test UI giá linh hoạt và quyền Nhân viên đạt; server unit 6/6; MySQL integration đạt; TypeScript/build local đạt; `npm.cmd run verify` đạt; audit dependency 0 lỗ hổng.
- Profile đã kiểm tra: TEST dùng Supabase migration `021_flexible_order_prices.sql`; LOCAL dùng Node API/MySQL migration `002_flexible_order_prices.sql`. Không build `.exe` trong lần này.
- Việc vận hành còn lại: runtime API đang chạy bằng Scheduled Task tài khoản SYSTEM nên mã server mới chỉ được nạp sau khi khởi động lại task bằng quyền Administrator hoặc khởi động lại Windows.

### 2026-09-30 — Supabase TEST 0.2.4 để khách chạy thử qua Internet

- Yêu cầu: do máy nhân viên chưa kết nối được máy chủ LAN, tạo lại bản chạy Supabase để khách thử trước; giữ mã đơn tự nhập và đổi tài liệu xác nhận tại màn Bán hàng từ Excel sang PNG.
- ID đối chiếu: `ORDER-01`, `ORDER-03`, `ORDER-08`, `IMAGE-01`, `EXCEL-01`, `DB-01`, `UI-01`; regression toàn bộ `AUTH-01`–`REPORT-07` và `AUDIT-01`.
- Đã đọc lại `BA-SPEC.md` và toàn bộ checklist. Supabase thật trước đó thiếu migration 022; đã backup 20 dòng `sales_orders` vào `.local/migration-backups`, áp dụng `022_manual_order_code.sql`, xác minh cột `order_code`, unique index và 20/20 đơn có mã.
- Kiểm thử transaction trực tiếp trên Supabase xác nhận `app_ban_hang_order_business` lưu mã tự nhập; transaction được rollback nên không sửa dữ liệu đơn khách.
- Database 20/20; UI 21/21; Electron smoke source, packaged và bản cài đạt. Test PNG kiểm tra đúng tên file, chữ ký PNG và đã xem trực quan đủ mã đơn, khách, SĐT, địa chỉ, Sales, thời gian, tình trạng, hàng và tổng tiền. Excel nhập kho/file mẫu và báo cáo vẫn đạt.
- `npm.cmd run verify` đạt sau thay đổi package; dependency audit 0 lỗ hổng. Profile build được validator xác nhận `test-supabase`; package không chứa local API, MySQL config, `.env`, deployment scripts, hostname local hoặc biến mật khẩu.
- Installer silent test mã thoát 0; app `0.2.4` được cài và mở được màn đăng nhập, tra cứu mã dùng chung hoạt động. Windows Defender quét EXE và ZIP: không phát hiện mối đe dọa.
- Folder bàn giao: `E:\outputt\03-BAN-GUI-KHACH-SUPABASE`.
- Setup SHA256: `3902F52BA8589823A7CC0D2AF9E737A391469202AC964467567119A588D0A866`.
- ZIP bàn giao: `E:\outputt\Oufeidun-0.2.4-Supabase-BAN-GIAO.zip`; SHA256 `71456570056760C6421F022721BA0AA5939F9F5E261232C857486347B6C5841F`.
- Giới hạn: bản này cần Internet và chưa có chữ ký Authenticode thương mại (`NotSigned`).

### 2026-10-01 — Supabase TEST 0.2.5 ngang tính năng LOCAL

- Yêu cầu: giữ nguyên toàn bộ chức năng hiện tại, chỉ chuyển kết nối nghiệp vụ từ MySQL local về Supabase để khách chạy thử; kiểm tra và bổ sung cấu hình Supabase còn thiếu trước khi build.
- ID đối chiếu: toàn bộ `AUTH-01`–`REPORT-07`, `AUDIT-01`, `UI-01`, `UI-02`, trọng tâm `PRICE-03`, `PRICE-04`, `ORDER-03`, `ORDER-04`, `ORDER-08`, `IMAGE-01`, `DB-01`.
- Phát hiện Supabase thật thiếu migration 021 dù UI/source đã có giá linh hoạt. Đã backup `sales_orders`, `sales_order_items`, `products`, `customers` và bốn RPC liên quan vào `.local/migration-backups`, sau đó áp dụng `021_flexible_order_prices.sql` và chạy lại `022_manual_order_code.sql`.
- Audit parity xác minh đủ bảng, cột, index, trigger giá, 18 RPC, bucket ảnh và nội dung RPC phiên bản mới. Đã thêm `npm.cmd run supabase:verify` để kiểm tra lặp lại schema/RPC/storage và nghiệp vụ thật trước mỗi lần build Supabase.
- Transaction smoke trên Supabase thật đạt: tạo nháp, mã đơn tự nhập, chặn mã trùng khác hoa/thường, giá tùy chỉnh 19.001đ, lưu giá riêng khách sỉ, Sales, tình trạng thiếu hàng và báo cáo chi tiết. Toàn bộ dữ liệu test được rollback.
- Regression sau thay đổi: database 20/20; UI 21/21; PNG đúng tên/chữ ký/nội dung; Excel nhập kho, file mẫu và báo cáo đạt; Electron source/packaged/installed smoke đạt; dependency audit 0 lỗ hổng.
- Profile `test-supabase` được validator xác nhận. Package không chứa backend local, `.env`, MySQL config, deployment scripts, hostname local hoặc biến mật khẩu. Installer silent test mã thoát 0; Windows Defender quét EXE và ZIP không phát hiện mối đe dọa.
- Folder bàn giao: `E:\outputt\04-BAN-GIAO-SUPABASE-0.2.5`.
- Setup SHA256: `225AC0D30546A025D4407C1EC189719050A34F14E71B9DA6795BDBF9B0822770`.
- ZIP bàn giao: `E:\outputt\Oufeidun-0.2.5-Supabase-BAN-GIAO.zip`; SHA256 `6344AFBAE9057AC1566F44201AB892DFC0E22CF24D3C69279ADEEC1A112FF957`.
- Giới hạn: bản Supabase cần Internet và installer chưa ký Authenticode thương mại (`NotSigned`).

### 2026-10-01 — Sửa tràn bố cục màn Bán hàng

- Phản hồi: tại kích thước cửa sổ Electron mặc định, cụm ba thao tác cuối đơn bị ép trên một hàng làm nút `Xác nhận bán` tràn khỏi khung và bị cắt chữ; toàn trang chưa khóa cuộn ngang.
- ID đối chiếu: `UI-01`, `UI-02`, `ORDER-01`, `ORDER-03`, `IMAGE-01`.
- Đã đổi hai thao tác `Tải ảnh xác nhận`/`Lưu bản nháp` thành hàng đầu và cho `Xác nhận bán` chiếm trọn hàng dưới; giới hạn chiều rộng root để không phát sinh dịch ngang toàn màn hình.
- Bổ sung kiểm thử hình học thật tại viewport tối thiểu `1000x700` và viewport CSS tương ứng Electron mặc định `1667x1034`: sidebar, main, giỏ và cả ba nút phải nằm trong viewport; nội dung nút không được rộng hơn vùng hiển thị; document không được overflow hoặc có `scrollX`.
- Đã xem trực quan ảnh sau sửa: sidebar và danh mục đầy đủ; cả ba nút rõ chữ, không chồng/cắt.
- `npm.cmd run verify` đạt: database 20/20, UI 21/21, Electron smoke, TypeScript/build và dependency audit 0 lỗ hổng.
- Chưa tạo lại installer trong lần sửa này.
### 2026-10-01 — Supabase TEST 0.2.6 sửa layout Bán hàng

- Tăng phiên bản lên `0.2.6` sau khi sửa cụm thao tác cuối đơn bị tràn/cắt chữ và bổ sung kiểm thử hình học viewport.
- `npm.cmd run verify` đạt: database 20/20, UI 21/21, Electron smoke, TypeScript/build và dependency audit 0 lỗ hổng.
- `npm.cmd run supabase:verify` đạt; kiểm tra schema/RPC/storage và transaction nghiệp vụ thật, dữ liệu smoke đã rollback.
- Profile build `test-supabase` hợp lệ; packaged smoke và installed smoke đạt, đăng nhập và tra cứu đã sẵn sàng. Cài im lặng trả mã 0.
- Audit package xác nhận runtime `test`, API tra cứu `https://outfeidun.vercel.app/api/glass-lookup`, không đóng gói server/deployment/.env/.git.
- Windows Defender quét EXE và ZIP không phát hiện mối đe dọa.
- Folder bàn giao: `E:\outputt\05-BAN-GIAO-SUPABASE-0.2.6`.
- Setup SHA256: `D69DA1C6DED3B4D0A708050CAA4FD0AB04D77054E754B668765D07564F7F0098`.
- ZIP bàn giao: `E:\outputt\Oufeidun-0.2.6-Supabase-BAN-GIAO.zip`; SHA256 `663233ED3B04430448AF1513FB05A9A3EB3EDE0D00DD339FD3BD5FC042CEC960`.
- Giới hạn: installer chưa ký Authenticode thương mại (`NotSigned`).

### 2026-10-05 — LOCAL 0.2.11 portable và quy tắc đơn thiếu hàng

- Phản hồi: máy khách có thể đặt folder bàn giao ở ổ đĩa khác máy phát triển; không được gắn cứng `C:\`/`E:\`. Toàn bộ CMD trong `01-MAY-CHU` chuyển về thư mục của chính nó và gọi `./scripts`; PowerShell lấy `dataDir` từ `server-info.json`, mặc định `OufeidunServerData` nằm cạnh `01-MAY-CHU`. MySQL được tìm qua PATH/ProgramFiles/ProgramData thay vì ổ C cố định.
- `Còn thiếu hàng`: bắt buộc nhập chi tiết sản phẩm/số lượng thiếu; vẫn lưu bản nháp và tải PNG/Excel; client, Local API và migration Supabase đều chặn xác nhận bán/trừ kho cho tới khi chuyển về `Đủ hàng`.
- Kiểm thử: database 20/20; UI 24/24; server unit 6/6; MySQL integration 1/1 gồm lưu đơn thiếu/chặn mô tả rỗng/chặn xác nhận; Electron smoke, TypeScript/build và dependency audit 0 lỗ hổng. PowerShell source và staging parse đạt; audit staging không còn đường dẫn dữ liệu/MySQL gắn cứng.
- Packaged Local smoke đạt trên app 0.2.11: đăng nhập Local API, 9 sản phẩm/2 ảnh local, tra cứu mã dùng chung Supabase trả đủ hai ảnh. Tài khoản smoke được đổi tạm và khôi phục nguyên trạng trong `finally`.
- Folder bàn giao: `E:\outputt\Oufeidun-Local-0.2.11`; ZIP: `E:\outputt\Oufeidun-Local-0.2.11.zip`.
- Setup SHA256: `EC5296FAE90F7269FAD89E798801346163569CD108E22AA60BE9519E58D32C08`; ZIP SHA256: `14C305031CA05A25B9E1785127A07C8C8D9C17A55C2B763D739C9340ABB11EB8`.
- Giới hạn: installer chưa ký Authenticode thương mại (`NotSigned`).
### 2026-10-01 — Supabase TEST 0.2.7 cân đối màn Bán hàng và xem trước PNG

- Yêu cầu: giữ 4 sản phẩm mỗi hàng; khung search thẳng hàng với sản phẩm thứ tư; thu ngắn ô tìm kiếm để hai combobox không che tên; mở rộng nhẹ khung đơn hàng; xem trước ảnh xác nhận trong popup chốt bán và cho tải chính ảnh đang xem.
- ID đối chiếu: `UI-01`, `UI-02`, `ORDER-01`, `ORDER-03`, `ORDER-08`, `IMAGE-01`, `EXCEL-01`.
- Layout desktop rộng: catalog vẫn 4 cột; khung đơn tăng từ 390px lên 430px; search khoảng 541px; hai combobox 180px; mép phải control và sản phẩm thứ tư chênh tối đa 20px do gutter cuộn.
- Popup `Xác nhận bán hàng` có nút `Xem ảnh cho khách kiểm tra trước khi xác nhận`; lightbox hiển thị PNG thật và có `Tải ảnh PNG`. Test xác minh ảnh tải về trùng tên dự kiến và có đúng chữ ký PNG.
- `npm.cmd run verify` đạt: database 20/20, UI 22/22, Electron smoke, TypeScript/build và dependency audit 0 lỗ hổng.
- `npm.cmd run supabase:verify` đạt; packaged smoke, cài im lặng mã 0 và installed smoke 0.2.7 đạt.
- Folder 5 file theo mẫu: `E:\AppBanHang\BAN-GIAO\Oufeidun-0.2.7`; ZIP: `E:\AppBanHang\BAN-GIAO\Oufeidun-0.2.7.zip`.
- Setup SHA256: `4E77D6CA57E81BBC3B0C21CFECE8956021F4C186B76BCF46DFFE6D50CC2D9672`; ZIP SHA256: `F226F54C048A8FB4600A6AB5EC502B5BD589E1D947E53C9885E646359DB3FED2`.
- File Excel mẫu đọc được 2 sheet; Windows Defender không phát hiện mối đe dọa trong EXE/ZIP.
- Giới hạn: installer chưa ký Authenticode thương mại (`NotSigned`).

### 2026-10-05 — Bán đơn thiếu hàng và giao bổ sung (source kiểm tra trước khi đóng gói)

- Yêu cầu: đơn `Còn thiếu hàng` vẫn được xác nhận bán; chỉ số lượng giao thực tế được trừ kho và ghi nhận doanh thu/giá vốn. Phần còn lại được giữ trên đơn để giao bổ sung, tự chuyển `Đủ hàng` khi đã giao hết.
- Dữ liệu: bổ sung `delivered_quantity`; mỗi dòng hiển thị `Đặt / Đã giao / Còn thiếu`. Hủy và trả hàng chỉ xử lý tối đa số đã giao. Migration MySQL `004_partial_fulfillment.sql` đã áp dụng trên database phát triển.
- UI: popup xác nhận cho nhập số giao lần đầu; chi tiết đơn có nút `Giao bổ sung`; số giao không thể vượt hàng còn thiếu hoặc tồn kho. Excel có cột `SL đặt / Đã giao / Còn thiếu`; PNG hiển thị `Giao/Đặt` và thành tiền theo số đã giao.
- Supabase/demo: bổ sung RPC giao thiếu, bỏ unique index từng chặn lần xuất kho bổ sung và bỏ trigger cũ chặn xác nhận đơn thiếu. Migration cô lập đã kiểm tra được cả lần giao đầu và lần giao sau.
- Kiểm thử: database 20/20; UI 24/24; server unit 6/6; MySQL integration 1/1; Electron smoke; TypeScript/build và dependency audit 0 lỗ hổng. Test nghiệp vụ xác nhận đơn 5 khi tồn 3, sau đó giao bổ sung 2 và tự hoàn tất đã đạt.
- Đã đọc lại toàn bộ `FEATURE-CHECKLIST.md` sau thay đổi. Chưa tăng version, chưa tạo installer và chưa tạo folder bàn giao theo yêu cầu; source local đang được mở để người dùng kiểm tra trước.

### 2026-10-05 — Chi tiết số lần giao hàng

- Chi tiết đơn hiển thị `Lịch sử giao hàng (n lần)`. Mỗi lần gồm số thứ tự, thời gian, nhân viên, loại giao ban đầu/giao bổ sung, từng mã kính, số lượng, đơn giá và thành tiền.
- MySQL lưu riêng từng đợt trong `order_delivery_batches` và từng dòng trong `order_delivery_items`; migration `005_order_delivery_history.sql` tự tạo lịch sử lần đầu cho đơn cũ có hàng đã giao.
- Luồng xác nhận và giao bổ sung ghi lịch sử trong cùng transaction với trừ kho. Nếu thao tác thất bại thì cả kho và lịch sử cùng rollback.
- Đã bổ sung tương đương cho demo/Supabase migration và kiểm tra migration cô lập.
- Kiểm thử đạt: database 20/20; UI 24/24, gồm kiểm tra từ 1 lần lên 2 lần giao; server unit 6/6; MySQL integration 1/1 kiểm tra số lần và số lượng từng đợt; Electron smoke; build và dependency audit 0 lỗ hổng.
- Đã đọc lại toàn bộ checklist sau thay đổi. Chưa tạo installer hoặc folder bàn giao.

### 2026-10-05 — Hủy hộp thoại lưu file không còn báo lỗi

- Sửa lớp xuất file dùng chung: kết quả `Cancel` từ hộp thoại lưu của Windows trả về trạng thái không lưu và không bị chuyển thành exception.
- Các nút tải Excel/PNG không hiện cảnh báo lỗi hoặc thông báo tải thành công khi người dùng hủy; lỗi ghi file thật vẫn được báo như trước.
- Electron + MySQL smoke đã thao tác thực tế `Tải Excel → Cancel`, xác nhận không tạo file và không có alert. Regression đạt: database 20/20, UI 24/24, Electron smoke, build và dependency audit 0 lỗ hổng.
- Đã đọc lại toàn bộ checklist sau sửa lỗi. Chưa tạo installer hoặc folder bàn giao.

### 2026-10-05 — Đơn giản hóa UI nhập hàng

- Tách modal `Nhập hàng` thành hai chế độ rõ ràng: `Nhập một mã` và `Nhập bằng Excel`; chỉ hiển thị trường liên quan đến chế độ đang chọn.
- Chế độ một mã có tìm nhanh theo SKU, tên sản phẩm và dòng máy; danh sách kết quả hiển thị tồn hiện tại, số lượng nhập và giá mua trên cùng một màn hình.
- Chế độ Excel có hướng dẫn 3 cột, nút tải template và ô chọn file riêng. Nội dung phụ đề giải thích trực tiếp hai cách nhập.
- Đã xem trực quan modal ở kích thước desktop, không tràn và không cần cuộn để thấy nút xác nhận. Test tìm `SS-A55`, chuyển chế độ và tải template đạt.
- Regression đạt: database 20/20, UI 24/24, Electron smoke, build và dependency audit 0 lỗ hổng. Đã đọc lại toàn bộ checklist; chưa tạo installer.
### 2026-10-05 — Tăng khả năng đọc thẻ sản phẩm tại màn Bán hàng

- ID ảnh hưởng: `UI-01`; không thay đổi dữ liệu, nghiệp vụ giá, quyền truy cập hoặc file Excel.
- Đã tăng và thống nhất cỡ chữ trên thẻ sản phẩm: SKU 16px, tên 14px, máy dùng chung 13px, nhãn tồn kho 13px, giá 22px và nhãn nguồn giá 13px; đồng thời tăng độ đậm, tương phản và khoảng cách nội dung.
- Kiểm thử mới đo trực tiếp kích thước chữ thực tế tại bố cục desktop bốn cột và lưu ảnh đối chiếu `test-results/product-card-readability.png`.
- Đã kiểm tra trực quan tại 1667 × 1034: bốn sản phẩm vẫn thẳng hàng, không tràn ngang, khung đơn hàng giữ nguyên kích thước và nội dung thẻ không bị cắt.
- Đã đọc lại toàn bộ `FEATURE-CHECKLIST.md` sau khi sửa và đối chiếu yêu cầu khách hàng.
- `npm.cmd run verify` đạt: database 20/20, UI 25/25, Electron smoke, TypeScript/build và audit dependency 0 lỗ hổng.
- Chưa build EXE hoặc folder bàn giao trong lần sửa giao diện này.

### 2026-10-07 — Bộ BAT gom thư mục máy chủ 0.2.14

- Đã đọc lại BA-SPEC và toàn bộ FEATURE-CHECKLIST sau thay đổi. ID ảnh hưởng: DB-03 (triển khai/vận hành); kiểm tra bảo toàn AUTH-01 và IMAGE-01. Không sửa nghiệp vụ ứng dụng hoặc tạo lại EXE.
- Bộ riêng gồm GOM-THU-MUC.bat, KHOI-PHUC-NEU-BI-NGAT.bat, scripts và hướng dẫn. Cho chọn ba đường dẫn, mặc định theo SystemDrive; không gắn ổ đĩa máy phát triển. Chặn đường dẫn chồng lấn, junction, đích đã tồn tại, task lạ, thiếu dung lượng và MySQL datadir nằm trong nguồn.
- Sao lưu XML task, dừng API/HTTPS/backup, tạo backup SQL/ảnh/env có checksum; copy đối chiếu SHA256; sửa launcher/env/Caddy/server-info/task trong bản mới. Giữ nguyên thông tin DB, IP, hostname, chứng chỉ và task settings. Không di chuyển MySQL datadir, không tự xóa nguồn. Khi lỗi thử trả task cũ và giữ ảnh mới; BAT phục hồi dành cho lần chuyển bị ngắt.
- Kiểm thử cô lập đạt 14 nhánh orchestration, recovery khi gián đoạn, bảo vệ đường dẫn/junction/XML có khoảng trắng và ampersand; Robocopy/checksum/ACL thật với task/network giả lập; backup MySQL test thật gồm SQL/ảnh/config/checksum. Không chạy relocation trên dữ liệu/dịch vụ đang vận hành.
- npm.cmd run verify mã thoát 0: 22 data tests, 29 UI tests, Electron smoke, TypeScript/build và audit 0 lỗ hổng. Đã chạy lại build:local; dist/server-config.json là local API. PowerShell/JS trong gói parse đạt; hash từng file khớp source và kiểm tra đủ entry ZIP.
- Bàn giao: E:\outputt\Oufeidun-Gom-Thu-Muc-0.2.14.zip. SHA256: 5420E4220BEBB4796948BD5DC1F41AD43C38FE43D5BEA0A6E63D21A18A1DF862.
- Giới hạn: UAC, Scheduled Tasks SYSTEM và kết nối máy nhân viên thật cần kiểm tra tại cửa hàng sau khi chạy. Giữ hai folder nguồn cho đến khi đăng nhập, kho, ảnh, đơn hàng, PNG/Excel và backup mới chạy ổn; đổi shortcut portable nếu có. Công cụ không tự xóa bản cũ.

### 2026-10-08 — 0.2.14 dùng mã kính và Excel tự tạo SKU

- Đã đọc lại toàn bộ FEATURE-CHECKLIST và đối chiếu PRODUCT-01/03, STOCK-01/02/03, AUTH-03, ORDER-01/02/06, PRICE-01/04, IMAGE-01, EXCEL-01, REPORT-03/06/07, UI-01, DB-01/03. Giữ version 0.2.14 và ghi đè bộ bàn giao theo yêu cầu người dùng, thay cho quy tắc tăng version mặc định.
- Bỏ ô tên sản phẩm và tên riêng trên đơn; bán hàng, kho, lịch sử giao, chi tiết/trả hàng, in/PDF, PNG/Excel và báo cáo hiển thị SKU. Cột tên/snapshot trong DB cũ được giữ; sửa sản phẩm cũ không ghi đè tên nội bộ. Bỏ cột tên trong chứng từ, điều chỉnh lại cột/merge/tổng tiền.
- Excel gửi SKU đến server để giải quyết trong transaction nhập kho. Tự tạo SKU chưa có, tên nội bộ = SKU, loại/hãng other, không ảnh/model, giá vốn = giá nhập ban đầu, giá bán/sỉ = 0 cần thiết lập. SKU đã có giữ nguyên tên/giá/vốn/trạng thái. Không tạo lại SKU đã xóa mềm. Chỉ Admin; chặn SKU dài/rỗng/trùng, giá/số lượng sai, gửi SKU kèm ID hoặc dùng SKU cho loại phiếu khác.
- MySQL integration 1/1 đạt: tạo mới, nhập mã cũ giữ giá, gửi lại cùng key không cộng lần hai, trùng SKU/ID bị rollback, lỗi dòng sau không để lại SKU/phiếu trước, hai lượt nhập đồng thời cùng mã chỉ tạo một sản phẩm và đúng tổng tồn, nhân viên bị từ chối. DataDir/DB test cô lập; không sửa dữ liệu cửa hàng.
- Demo/Postgres và migration Supabase 027 tương đương đã kiểm thử cô lập, migration chạy hai lần an toàn. Không áp dụng migration lên Supabase đang vận hành; LOCAL không thêm bảng/cột MySQL.
- npm.cmd run verify đạt, mã thoát 0: dữ liệu 23/23, UI 30/30, Electron demo smoke, TypeScript/build và audit 0 lỗ hổng. Local API syntax/unit 6/6 đạt; server audit 0 lỗ hổng. UI nhập workbook thật có SKU mới/cũ, reload đúng tồn/giá và không còn tên; đã xem ảnh giao diện và PNG thực tế.
- Build LOCAL/make đạt. Packaged Electron + MySQL thật qua HTTPS/discovery: Admin/Nhân viên lưu nháp, tải/đọc PNG/Excel, hủy Save, xem/tải ảnh, xác nhận bán và trừ kho đạt; Admin nhập Excel tạo SKU mới và kiểm tra tồn/vốn ở DB đạt. Excel đơn có đúng tám cột, mã và số tiền đúng, không còn tên.
- Cài đè cùng version 0.2.14 exit 0, hash app.asar đã cài khớp bản mới; installed smoke nhận cấu hình ngoài có BOM, HTTPS/discovery có chữ ký, gửi đăng nhập đến đúng server đạt. Kiểm thử deploy-config với thư mục chuyển chỗ/có khoảng trắng, hostname/port riêng đạt.
- Đã thay E:\outputt\Oufeidun-Local-0.2.14 và ZIP cùng tên. Bản bàn giao trước được giữ tại E:\outputt\_BACKUP\Oufeidun-Local-0.2.14-before-20261008. Không di chuyển folder dữ liệu hoặc dịch vụ đang dùng.
- 1.147 checksum file và từng file bên trong ZIP khớp; API/migrations/installer/asar khớp source/build, PowerShell parse đạt, không chứa private config/CA/IP của máy phát triển. ZIP 371.980.416 byte.
- Installer SHA256: EBB6A0024C491D2709758861C08A3EC19E236A7C805285AF8E7F278F21CBB89A. ZIP SHA256: 3D3C1427EFB717C44904EDBBE0DEF10D5BF26FEEE0FE4D124C68C0F8F7F4B279.
- Cửa hàng cập nhật cả API máy chủ và app các máy dù version vẫn 0.2.14; giữ DB/ảnh/account/config/chứng chỉ. Giới hạn: chưa nghiệm thu UAC/update/reboot và hai máy vật lý tại cửa hàng; installer chưa ký Authenticode thương mại. Chức năng tạo SKU mới chỉ có sau khi cập nhật API, không chỉ thay EXE.
# Kiểm tra bổ sung số lượng Excel — 08/10/2026

- Build LOCAL/make đạt. Packaged Admin workbook chín cột tạo/cập nhật SKU, ba giá, dòng máy và số lượng nhập 6/3 đạt trên MySQL thật cô lập; Admin/Staff bán hàng/PNG/Excel/hủy Save/xem ảnh/trừ kho đạt. Cài đè cùng version exit 0, installed asar khớp; cấu hình ngoài và HTTPS/discovery có chữ ký đạt.
- Đã ghi đè E:\outputt\Oufeidun-Local-0.2.14 và ZIP; bản trước giữ tại _BACKUP\Oufeidun-Local-0.2.14-before-quantity-20261008. Kiểm tra cuối 1.148 hash/từng entry ZIP/API/migrations/installer/asar/PowerShell đạt, không có cấu hình riêng. ZIP SHA256 DA724B0EBD42D3E0C4E10CFFD0CF178FCC56E59B7C5F9A22E7F2F738240B99FE. Cần cập nhật API lẫn clients; chưa nghiệm thu hai máy vật lý/UAC/reboot tại cửa hàng.
- Đã đọc lại toàn bộ checklist, đối chiếu PRODUCT-01/02/03, PRICE-01/04, STOCK-01/02/03, AUTH-03, AUDIT-01, UI-01, DB-01/03 và regression đơn hàng/PNG/Excel.
- Excel danh mục có cột thứ chín Số lượng, là số nhập thêm 0–1.000.000. Cột có nhưng bỏ trống/số âm/lẻ/quá giới hạn bị chặn; mẫu tám cột cũ không cộng kho, mẫu nhập kho ba cột vẫn được hỗ trợ. Mỗi yêu cầu nhập mới cộng thêm; retry cùng idempotency key không cộng hai lần.
- Danh mục/giá/phiếu nhập/sổ kho trong cùng transaction; kiểm thử rollback, đồng thời và quyền Admin đạt trên MySQL cô lập. Không lấy giá vốn cố định làm giá mua thực tế; giá mua để NULL và lưu snapshot giá vốn riêng.
- Kho kính đưa Số lượng tồn sát Mã kính; UI nhập Excel thật, kiểm tra tải lại, tồn mã mới/cũ và nhập 0 đạt, đã xem screenshot. Supabase migration 029 chạy lại an toàn trong môi trường cô lập, chưa áp dụng online; không thay schema MySQL.
- npm.cmd run verify đạt exit 0: 25 kiểm thử dữ liệu, 31 UI, Electron demo, TypeScript/build và audit 0 lỗ hổng. MySQL integration, server unit 6/6 và deployment-config đạt.

