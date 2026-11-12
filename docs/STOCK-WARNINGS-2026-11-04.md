# Cảnh báo tồn dự kiến — 04/11/2026

Phản hồi khách: còn 19, đã lưu nháp 19, tạo đơn mới cùng mã vẫn chọn được và không thấy hết hàng. Chính sách tồn dự kiến vẫn là cảnh báo mềm, không giữ hàng. Thay đổi làm cảnh báo rõ hơn trước khi tăng nhu cầu.

## Hành vi

- Thẻ Bán hàng: tồn thực tế 0 hiện Hết hàng, giữ khóa chọn hàng hiện có. Nháp bằng tồn thực tế hiện Hết tồn dự kiến; nháp vượt tồn hiện Thiếu tồn dự kiến, kèm số lượng đang trong nháp. Nhãn tự xuống dòng trong thẻ.
- Thêm qua ảnh/nút +, thêm tặng/mẫu, tăng bằng nút hoặc nhập số lượng: nếu tổng nhu cầu sau thao tác vượt tồn dự kiến, hỏi Cảnh báo tồn dự kiến. Hiện mã, tồn thực tế, các nháp khác, tổng lượng đơn này và số thiếu. Vẫn thêm vào đơn mới áp dụng; đóng/X/Escape giữ nguyên giỏ.
- Tăng đến vừa đủ thì không hỏi. Giảm số lượng không hỏi. Tính chung bán/tặng/mẫu theo product_id. Sửa nháp đã lưu loại lượng của chính nháp đó, tránh trừ hai lần.
- Đây là snapshot tư vấn, không phải khóa/đặt giữ hàng; máy khác vẫn có thể thay đổi nhu cầu. Kiểm tra tồn thực tế và transaction khi xác nhận bán giữ nguyên. Nháp không tạo doanh thu hoặc trừ kho. Không sửa công thức Excel/báo cáo, API, DB, phân quyền hoặc cấu hình.

## Kiểm tra

- UI Admin và nhân viên: tồn 19 → nháp 19 → đơn mới hiện cảnh báo; hủy không thêm, đồng ý mới thêm. Tăng lượng hủy giữ số cũ, đồng ý nhận số mới; bán/tặng/mẫu cộng chung; sửa nháp không tự cảnh báo vì lượng chính mình; tồn thực tế không đổi.
- Hồi quy tồn dự kiến âm, lưu nháp, tải workbook thật, sửa nháp, báo thiếu tự động, các luồng đơn hàng/báo cáo/quyền qua npm run verify. Test shortage-layout được bổ sung bước xác nhận mới, giữ nguyên các đối chiếu số lượng/chứng từ/layout.
- npm run verify đạt exit 0: 69 unit, 61 UI, Electron smoke, TypeScript/build, production audit 0. Bộ an toàn phát hành đạt 7/7. Đã xem ảnh thật thẻ/hộp thoại, nhãn không tràn.
- Build LOCAL và Electron source qua HTTPS/MySQL thật đạt exit 0: nháp người khác, xác nhận cảnh báo rồi lưu, loại chính nháp, workbook, xác nhận/xóa/refresh và hàng đã giao không trừ lần hai. Helper điền ngày đặt VN rõ ràng với clock giả; không sửa logic ngày trong app. Log .local/stock-warning-native-pass-20261104.log/.exit. Không kiểm thử máy vật lý/dữ liệu khách hoặc bộ cài mới trong lượt này.

## CI/CD

Đã đọc .github/workflows/app-release.yml, scripts/release/ci.cjs và docs/APP-RELEASE-CICD.md. Main/PR chạy test và build LOCAL; main ký kiểm chứng nhưng không upload hosting. Tag vX.Y.Z trùng package version, thuộc main, mới xuất bản qua environment app-production. Bản mới phải tăng hơn feed hiện hành, không tái dùng 0.1.3. Workflow này chỉ cập nhật client; không migration hoặc cập nhật API tại cửa hàng.

Đã phát hành tag v0.1.4 bằng CI/CD hiện có, giữ nguyên khóa ký. Feed và tải bằng AppUpdates đã xác minh; chi tiết tại docs/RELEASE-0.1.4-2026-11-04.md. Đã trình diễn case 19 trên executable 0.1.4 đã cài trong cửa sổ/profile/DB test riêng và giữ hộp thoại cho người dùng xem.
