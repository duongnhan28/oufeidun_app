# Đổi mã/tên kính sau khi bán — điều tra và phản biện 28/10/2026

Trạng thái cập nhật 28/10: người dùng đã duyệt phương án A; đã triển khai LOCAL/demo và kiểm thử. Các mục hiện trạng bên dưới giữ làm hồ sơ trước thay đổi. Kết quả triển khai tại [PRODUCT-RENAME-TEST-2026-10-28.md](archive/PRODUCT-RENAME-TEST-2026-10-28.md). Không truy cập DB thật của cửa hàng, chưa thay EXE/ZIP đã bàn giao. Tính năng mật khẩu bảo vệ là yêu cầu riêng, chưa triển khai.

## 1. Yêu cầu thực tế trong ảnh

Khách nói thêm hậu tố vào RM 13 thành RM 13 (REDMI 13), vẫn cùng một mã hàng về mặt nghiệp vụ, không phải mặt hàng khác. Điều này cần được hiểu là sửa nhãn nhận diện của cùng product_id, không tạo sản phẩm hoặc tồn mới.

Giới hạn hiện tại: app dùng cùng trường SKU làm cả mã tra cứu và nhãn in trên chứng từ. SKU bị khóa khi từng xác nhận bán. Nhãn hiện tại không tách khỏi mã gốc; length limit của SKU và sku_snapshot là 50 ký tự, nên hậu tố quá dài cũng cần được xử lý chứ không âm thầm cắt.

Phản biện tình huống "đổi xong tìm mã cũ không ra": nếu chỉ nối thêm hậu tố và giữ nguyên phần cũ, thuật toán tìm trong Bán hàng/Kho hiện tại vẫn match. Đã chạy chính các hàm normalizeProductSearch/containsProductSearch lấy từ App.tsx: 4 ca tìm RM13, RM 13, cả mã cũ và REDMI13 trong tên thêm hậu tố đều match; thay hẳn RM 13 bằng REDMI 13 hoặc SKU-A thành SKU-B thì không match mã cũ. Probe 6 ca tại `.local/assess-product-rename-20261028.cjs`, không dùng DB. Không suy từ probe này rằng mọi bộ lọc/dữ liệu/máy khách đều đã được kiểm thử.

## 2. Những gì source thực sự đang làm

| Phần | Hiện trạng | Hệ quả nếu chỉ bỏ khóa SKU |
|---|---|---|
| Định danh | Các dòng đơn, kho, trả hàng, giá riêng khách liên kết product_id | Có nền tảng giữ cùng hàng/tồn/giá; không cần tạo sản phẩm mới |
| Lưu nháp | save_draft xóa/chèn lại dòng và chưa ghi sku_snapshot | Nháp không giữ tên lúc chọn; lưu lại có thể mất nhãn vừa bổ sung nếu không sửa luồng |
| Giỏ đang soạn | Hiện trực tiếp p.sku; add() gộp theo product_id + item_kind | Tên có thể nhảy theo danh mục khi đồng bộ; cơ chế gộp đúng theo ID đã có |
| Xác nhận | confirm_order luôn ghi đè sku_snapshot = product.sku | Dù đã thêm nhãn nháp, lúc xác nhận vẫn sẽ đổi sang tên mới nếu không sửa |
| Đơn bán/PNG/Excel/PDF | Phần lớn ưu tiên sku_snapshot | Đơn đã bán có thể giữ mã cũ; phải rà cả giỏ/preview/xuất trước xác nhận |
| Giao bổ sung | Lịch sử lấy mã từ snapshot dòng đơn, ghi lượng/giá mỗi đợt | Nên tiếp tục dùng tên của đơn gốc, có thể kèm mã hiện tại để chọn hàng |
| Báo cáo theo mã/tồn/biến động | SELECT/GROUP BY theo p.id nhưng nhãn là p.sku hiện tại | Báo cáo kỳ cũ sẽ hiện tên mới dù chứng từ đơn cũ vẫn tên cũ |
| Lịch sử từng mã | history SELECT p.sku hiện tại | Không phải mọi chỗ đang đóng băng mã theo thời điểm giao dịch |
| Phiếu kho | Có sku_snapshot/name_snapshot khi ghi phiếu | Có dữ liệu để hiển thị lịch sử đúng thời điểm; read paths cần chọn đúng snapshot |
| Nhập Excel | Tìm/create theo SKU; SKU chưa biết tự tạo hàng | File cũ dùng A sau khi đổi B có thể tạo thêm A, tách tồn cùng mặt hàng thành 2 ID |
| Tìm kiếm | Tìm sku/name/models, chưa có bảng alias chuyên dụng | name nội bộ đôi khi còn tên gốc giúp tìm được A, nhưng không lưu đầy đủ A→B→C nên không phải giải pháp đáng tin |
| Nhật ký sửa | Product mutation ghi detail chủ yếu là SKU mới | Chưa đủ lịch sử đổi tên có cấu trúc để phục hồi mọi tên trước đây |
| Mã dùng chung | Client gọi API tra cứu website qua lookupApiUrl | Đổi dữ liệu LOCAL không tự cập nhật danh mục/alias của website |

Nguồn: server/src/mutations.cjs (save_draft/confirm_order/product), workspace.cjs, reports.cjs, import-products.cjs; src/App.tsx (save/openDraft/add/giỏ/export), src/lib/catalog.ts và order-item-order.ts; src/data/client.ts; server/mysql/001_schema.sql.

## 3. So sánh các hướng thay đổi

### A. Giữ tên đã dùng trên chứng từ; danh mục dùng tên mới — đề xuất

- Cùng một product_id. Đổi A→B ghi lịch sử đổi tên, giữ A làm mã tra cứu cũ; lần sau B→C vẫn tìm A/B/C. Đổi tên không tự nhập/xuất tồn, không đổi giá/vốn/loại hàng/đơn vị hay số lượng.
- Đơn đã bán giữ nhãn chốt; giao bổ sung/trả/hủy tiếp tục liên kết dòng đơn bằng ID. Đơn đổi mới dùng nhãn danh mục hiện tại.
- Với nháp đã lưu, giữ nhãn lần chọn nếu đã chốt quy tắc này, hiển thị phụ "mã hiện tại B". Tìm A/B rồi thêm cùng sản phẩm/cùng loại sale/gift/sample thì tăng dòng cũ tại đúng vị trí, không thêm hàng trùng hoặc tự đổi giá đã chỉnh. Nháp mới dùng B.
- Mọi đường xuất nháp/giỏ/đơn phải dùng cùng quy tắc nhãn. Không được chỉ sửa màn chi tiết rồi để PNG/Excel/PDF lấy danh mục mới.
- Báo cáo tổng hợp gộp theo product_id và hiển thị mã hiện tại, kèm mã cũ/đã dùng để đối chiếu. Chi tiết giao dịch hiển thị mã tại lúc ghi + mã hiện tại khi cần. Việc một hàng có tên A/B không làm phát sinh hai kho hoặc hai lần doanh thu.

Điểm cần chốt: giữ nhãn cũ trên nháp là lựa chọn nghiệp vụ để đối chiếu báo giá đã gửi, không phải điều kiện bắt buộc để tính đúng tồn. Nếu khách muốn nháp luôn hiện tên mới vì chỉ bổ sung mô tả, có thể chọn nháp theo tên hiện tại và vẫn tìm bằng alias; khi đó cần chấp nhận ảnh/Excel nháp đã gửi trước đây có nhãn khác lần xuất lại. Không nên tự đổi quy tắc này ngầm.

### B. Mọi màn hình/đơn cũ hiển thị tên hiện tại, không ghi đè dữ liệu lịch sử

Có thể làm bằng lớp hiển thị đọc product_id → tên hiện tại, giữ snapshot gốc trong DB và cung cấp cột tên gốc. Không tự làm sai tiền nếu giữ đúng ID/giá/lượng, nhưng khi xuất lại đơn cũ, tên sẽ khác file khách đã nhận. Cần sửa thống nhất đơn/giao/trả/PNG/PDF/Excel/báo cáo để không chỗ A chỗ B. Khả năng khôi phục tốt hơn cách ghi đè vì snapshot vẫn còn; vẫn phải có alias cho tìm kiếm/Excel.

Mức ảnh hưởng cao hơn A đối với chứng từ và quy trình đối chiếu. Chỉ phù hợp khi khách chủ động chấp nhận việc chứng từ cũ được in lại bằng tên hiện tại.

### C. Ghi đè tên/mã vào toàn bộ đơn và lịch sử đã lưu

Không đề xuất. Có thể làm kỹ thuật nếu update đúng từng product_id, nhưng mất dấu nhãn lúc giao dịch, thay đổi chứng từ tái xuất, audit khó giải thích và rollback phức tạp nếu đã đổi nhiều lần/có giao dịch mới. File Excel/ảnh/PDF đã gửi, file trên máy khác và backup cũ không được đổi theo.

Không được dùng tìm-thay chuỗi toàn DB: RM13 có thể là một phần của mã khác hoặc xuất hiện trong ghi chú, tài liệu và dữ liệu không thuộc sản phẩm này. Nếu bắt buộc chỉnh chứng từ lịch sử, nên là thao tác sửa có mục tiêu, lý do và bản lưu trước/sau, không gộp vào nút đổi tên danh mục.

### D. Chỉ bổ sung mô tả/dòng máy, giữ mã gốc

Nhẹ hơn nếu nhu cầu chỉ là thêm REDMI13. App đã có dòng máy dùng chung và ghi chú; thêm thông tin ở đó không cần đổi mã. Tuy nhiên, hiện mô tả này không tự trở thành chính dòng tên in trên mọi chứng từ và snapshot model của đơn bán cũ vẫn là dữ liệu cũ. Không thể coi phương án này là đã đáp ứng yêu cầu sửa tên hiển thị nếu khách muốn thấy hậu tố ngay trong tên.

## 4. Những điều bắt buộc để phương án A an toàn

1. Danh sách mã hiện tại/mã cũ thuộc một không gian tên thống nhất. Chặn đổi sang mã hiện tại hoặc alias của sản phẩm khác; giữ mã cũ đã dùng để tránh tái cấp nhầm sang hàng khác. Hai máy đổi/tạo/nhập cùng tên phải có ràng buộc DB, không chỉ kiểm tra frontend.
2. Alias là mã đầy đủ cũ, không tùy tiện dùng tên dòng máy chung như "RM13" làm định danh duy nhất cho cả kính trong/CNT/nhiều thương hiệu. Tìm gần đúng có thể nhiều kết quả; không tự chọn/gộp dựa vào tên na ná.
3. Ghi nhãn trên nháp từ lúc lưu/chọn; giữ qua save_draft đang xóa/chèn lại dòng và qua confirm_order đang ghi đè snapshot. Có thể tái sử dụng trường snapshot hiện có sau khi thống nhất ngữ nghĩa; phải kiểm cả giỏ chưa lưu và xác nhận nháp trực tiếp.
4. Bắt buộc sửa cả hai loại nhập: danh mục chín cột và nhập kho ba cột. Mã cũ A phải resolve đúng ID của B trước khi create. Nếu một file chứa cả A và B cùng trỏ một hàng, báo trùng trước khi ghi; không âm thầm nhập đôi hoặc chọn một giá để ghi đè.
5. Đổi tên không tăng price_version/stock_version nếu giá/tồn không đổi; chỉ cập nhật version danh mục/audit phù hợp. Giữ giá riêng theo khách và giá đã chỉnh trong giỏ/nháp.
6. Kho và báo cáo gộp theo ID, có chỉ dẫn đổi tên rõ ràng; không GROUP BY chỉ theo nhãn lịch sử khiến tổng tồn tách giả. Chi tiết phiếu lấy snapshot đúng nguồn (bán/trả/nhập/điều chỉnh) thay vì tất cả cùng lấy p.sku.
7. Giao/trả/hủy và ghép bán–tặng–mẫu dùng ID dòng/product_id + loại. Đổi tên không làm gộp hàng mẫu vào hàng bán, mất thứ tự chọn hoặc phân bổ tồn lại.
8. Nhật ký đổi tên có old/new/actor/time/reason, giữ dữ liệu cũ. Không nhét alias vào models hoặc item_note để tránh làm sai ghi chú/dòng máy tương thích trên chứng từ.
9. Rà tra cứu website riêng. Alias LOCAL không tự đồng bộ sang oufeidun.vn; không tự tuyên bố mọi chức năng tra cứu đã được bao phủ.
10. Bảo toàn giới hạn tên: SKU/snapshot đang 50 ký tự; nếu muốn dài hơn cần đổi đồng bộ validation/UI/SQL/import/export hoặc tách mô tả hiển thị, không chỉ tăng độ dài ô nhập.

## 5. Dữ liệu đã có tại cửa hàng

- Đơn đã xác nhận có snapshot: giữ nguyên, không cần ghi lại doanh thu/tồn.
- Nháp cũ thường chưa có snapshot: chỉ có thể ghi nhận tên danh mục đang có ở thời điểm nâng cấp/trước lần đổi tiếp theo. Không thể hứa khôi phục chính xác tên lúc tạo nháp nếu DB chưa lưu hoặc trước đó đã bị đổi; cần báo rõ giới hạn thay vì đoán.
- Alias lịch sử chưa lưu có cấu trúc: không suy toàn bộ từ product.name hoặc log text rồi tự gán; có thể trùng mã của sản phẩm khác. Seed mã hiện tại, ghi đầy đủ các lần đổi từ khi bật tính năng; dữ liệu cũ chỉ bổ sung khi có nguồn chắc chắn.
- Migration cần thêm nơi lưu alias/lịch sử đổi tên và xử lý snapshot nháp theo chính sách đã chốt. Chạy có kiểm tra xung đột, backup và khả năng chạy lại sau gián đoạn; không reset, không nhập lại sản phẩm hay sửa ID.
- Cập nhật API/migration trước rồi client mọi máy. Không bật tính năng khi vẫn có client cũ có thể lưu nháp làm rơi nhãn hoặc đi đường nhập cũ; cần kiểm soát tương thích theo capability/build, cùng số version 0.1.1 không đủ để phân biệt.

## 6. Mức độ ảnh hưởng và bộ kiểm thử cần có trước khi phát hành

Mức trung bình–cao với A; cao với B; rất cao và khó đảo ngược với C. Không chỉ sửa điều kiện SKU_IMMUTABLE. Dữ liệu tiền/tồn về nguyên tắc giữ nguyên bằng ID, nhưng chỉ giữ được khi mọi nhánh đọc/lưu/import đều dùng cùng chính sách.

- A→B→C, quay lại tên của chính mình, chỉ đổi hoa/thường/khoảng trắng, tên dài, xung đột mã/alias, sản phẩm ngừng bán/xóa mềm, nhiều máy đồng thời.
- Đơn bán trước/sau đổi, nháp cũ/mới/chưa lưu/ngày mai, thêm 5 bằng alias, giá riêng/giá sửa, xóa-thêm lại dòng, sale/gift/sample và thứ tự chọn.
- Lưu/mở lại nhiều lần, xác nhận nháp trực tiếp trong khi đang có giỏ khác, rename giữa lúc mở và lưu/xác nhận, version/idempotency/rollback.
- Giao bổ sung, trả một phần/toàn bộ/hủy, tạo đơn đổi; lượng, giá/vốn/phí/công nợ và quan hệ ID không đổi do rename.
- PNG/PDF/Excel từng đơn và nháp; tổng hợp theo kỳ, nhập–xuất–tồn, biến động, lịch sử mã, ranking; đối chiếu cả mã hiện tại và mã đã dùng, giữ đúng mã đơn khách.
- Nhập Excel cả mã cũ/mới/cả hai trong một file; không tách hàng, nhập đôi, đổi giá sai hoặc tạo lại hàng đã xóa; hai lượt nhập/rename đồng thời.
- Quyền Admin/staff và mật khẩu bảo vệ nếu tính năng đó được chốt triển khai; cache/tải lại nhiều máy; backup/restore chứa alias/snapshot/audit; native EXE và cập nhật từ DB cũ.

Lần điều tra ban đầu chỉ chạy 6 ca tìm kiếm. Sau khi người dùng duyệt, đã triển khai và chạy bộ kiểm thử ghi tại PRODUCT-RENAME-TEST-2026-10-28.md; xem phạm vi và giới hạn thực tế tại đó.
