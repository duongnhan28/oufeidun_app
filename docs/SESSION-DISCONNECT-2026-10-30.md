# Điều tra app về đăng nhập gần 17h — 30/10/2026

Khách xác nhận có đúng một máy chủ và một máy nhân viên: máy nhân viên còn cửa sổ nhưng quay về đăng nhập, máy chủ bình thường. Không có nhóm nhiều máy nhân viên để so đồng thời. Chưa có log/DB/máy vật lý khách. Ưu tiên kiểm tra Wi-Fi/LAN, sleep/thu nhỏ và phiên máy nhân viên; giảm khả năng máy chủ ngừng hoàn toàn nhưng không loại trừ lỗi máy chủ chỉ ảnh hưởng LAN. Không kết luận Wi-Fi chắc chắn có lỗi.

## Phát hiện đã xác minh

1. App trước sửa gọi touch phiên mỗi 25 giây và setData(null) với mọi lỗi. Đã thực thi callback cũ với SERVER_UNAVAILABLE, AbortError, HTTP_500 và SESSION_REQUIRED: cả bốn đều về đăng nhập. Chỉ một request mạng lỗi cũng đủ gây triệu chứng, không cần phiên thật sự hết hạn.
2. server/src/auth.cjs kiểm thời gian từ session_last_seen, mặc định 90 giây. Không dùng giờ trong ngày/giới hạn ca 8 giờ. Kiểm thử chính module auth với clock/DB mock: 09:00, 16:59:59, 17:00, 17:01, 23:00; tuổi phiên 25/89 giây hợp lệ, 91 giây bị 401 ở tất cả các giờ.
3. Electron trước sửa dùng mặc định backgroundThrottling=true. Timer có thể chậm khi chạy nền/thu nhỏ; đây là nguy cơ với lease ngắn, chưa phải bằng chứng đã xảy ra ở cửa hàng. Tham chiếu [Electron WebPreferences](https://www.electronjs.org/docs/latest/api/structures/web-preferences#webpreferences-object).
4. Không thấy lịch chủ động thoát 17h trong source: backup local mặc định 23h; Drive mỗi giờ từ lúc cài +5 phút. Backup dùng mysqldump single-transaction, không stop/restart API. API/HTTPS tasks tạo với ExecutionTimeLimit=0. Tuy nhiên tool giữ tác vụ cũ nếu đã có, và chưa xác minh settings/history tại khách. Battery/sleep, lịch riêng Windows/router, đồng bộ giờ hoặc tải máy chủ vẫn cần kiểm tra nếu log chỉ ra.

## Sửa và ảnh hưởng

### Bổ sung: phải đăng nhập nhiều lần sau khi bị out/đăng xuất

- Source request cũ dùng một biến accessToken chung: request của phiên A nhận401 muộn sẽ xóa biến dù B đã đăng nhập. Cleanup logout A cũng luôn xóa biến khi request xong, kể cả sau B. Workspace A thành công muộn còn có thể đưa dữ liệu cũ lên UI.
- Logout UI trước sửa đợi request thành công mới đóng màn hình; releaseOnlineSession lại xóa token trong finally ngay cả khi mạng lỗi. Vì vậy có nhánh màn hình còn mở nhưng không token, nút logout gọi promise không bắt lỗi. Đây là các lỗi tái hiện trong source, chưa phải bằng chứng chi tiết từng lần ở cửa hàng.
- Sửa LOCAL: request giữ token lúc gửi và từ chối phản hồi khác phiên bằng SESSION_STALE, không đụng token mới. Login không gửi Bearer cũ/không bị invalidation của token cũ hủy kết quả login. Logout chỉ xóa token khớp token mình gửi. UI logout đóng trong finally và chạy qua run/busy/error chung; nút khóa lúc busy. Giữ xác nhận bỏ giỏ chưa lưu, không tự gửi lại password/mutation.
- tests/client-session-races.test.ts chạy chính source client qua TypeScript transpile/VM, chỉ mock transport/env:401 muộn;workspace muộn;login đang chờ khi token cũ hết hạn;logout muộn thành công/lỗi;401 hiện tại;logout mạng lỗi và đăng nhập lại. Test server xác nhận cùng device được login ngay, device khác đang active vẫn409; không tăng lease/nới bảo vệ một phiên.
- tests/local-session-relogin.electron.cjs kiểm UI staff LOCAL với profile/API mock:5vòng logout/login mỗi vòng đúng1request login,401 cũ đến sau login mới,logout lỗi mạng và login lại ngay. Kết quả cuối ở FEATURE-CHECKLIST.md.
- Đã chạy đạt: verify58data/56UI/Electron/build/audit0; nhóm race cập nhật cuối5/5;server unit+authmock9/9;build LOCAL/native staff exit0. Native chờ401 cũ hoàn tất rồi mới kiểmheartbeat phiên mới, không bỏ assertion. Logs .local/session-relogin-*-20261030.*. Chưa tạo EXE/ZIP app và chưa xác minh trực tiếp dữ liệu/máy khách.

- Tách heartbeat thành src/lib/session-heartbeat.ts; chỉ bốn lỗi phiên/tài khoản rõ ràng mới về đăng nhập. Lỗi khác giữ giao diện, cảnh báo một lần mỗi đợt, thử lại sau 25 giây; không tự chốt hoặc gửi lại giao dịch.
- Chặn request touch chồng. Kết quả đang chờ của phiên đã hủy không được đưa phiên mới về login.
- Electron backgroundThrottling=false: có thể duy trì thêm timer/render/polling khi thu nhỏ, tăng nhẹ hoạt động máy/mạng; không thay chế độ điện hoặc ngăn sleep.
- Không đổi server timeout 90 giây, giới hạn phiên, quyền, giá/tồn/báo cáo/chứng từ hoặc DB/migration/config. Mất liên lạc quá lease, sleep hoặc thu hồi phiên vẫn có thể phải đăng nhập lại đúng chính sách.
- Cần cập nhật app các máy; chưa đóng gói lại, ZIP 29/10 vẫn là bản trước sửa.

## Lấy bằng chứng tại khách

Giải nén E:\outputt\Oufeidun-ChanDoan-DangXuat-20261030.zip, chạy CHAN-DOAN-DANG-XUAT.bat ngay trên máy nhân viên bị out sau sự cố. Chạy thêm ở máy chủ cùng thời điểm để đối chiếu. Không dừng app/API, không cần cung cấp mật khẩu. Máy nhân viên không có server task là bình thường.

Tool tạo logs/session-diagnostic-yyyyMMdd-HHmmss.txt cạnh BAT: thời gian/timezone, metadata tác vụ Oufeidun (lần chạy/kết quả/trigger/time limit/battery), tối đa 3.000 sự kiện gần nhất mỗi log trong 3 ngày, System/Application lọc 16–18h, cấu hình standby/hibernate. Không ghi event message bodies, task arguments, server.env, token, DB hay dữ liệu đơn. History tắt/không đủ quyền ghi rõ; vắng sự kiện không chứng minh không có lỗi.

Tool cũng ghi trạng thái adapter (không IP/MAC/SSID), tối đa1.000 sự kiện gần nhất mỗi log WLAN/NetworkProfile trong3ngày, lọc16–18h và không message bodies. Ghi thêm ngày/giờ/phút, máy nào bị, một máy hay tất cả cùng lúc, app có thu nhỏ/khóa màn hình/chuyển Wi-Fi/rút điện không. Đối chiếu task/network/power/time events cùng thời điểm. KIEM-TRA-LOI có thể bổ sung tình trạng API/HTTPS hiện tại nhưng không thay lịch sử sự cố.

## Kiểm thử

- Unit heartbeat: lỗi thật, plain-object Supabase, network/5xx/FORBIDDEN; cảnh báo một lần, phục hồi, chống chồng, cleanup/kết quả phiên cũ đến muộn, expiry dừng timer.
- tests/session-expiry.test.cjs: chạy auth source bằng clock/DB mock ở năm mốc giờ và ba tuổi phiên, không đổi thời gian/DB thật.
- tests/local-session-heartbeat.electron.cjs: build LOCAL thật, profile riêng/API mock; thu nhỏ hơn 90 giây bằng thời gian thật, kiểm heartbeat; 503/500/mất mạng/timeout giữ form chưa lưu và phục hồi; 401 về login; không mutation.
- Diagnostic đã chạy trên máy phát triển, không thay tác vụ/config/DB; không đại diện máy khách.
- Kết quả cuối: verify exit0 (54data/56UI/Electron smoke/TypeScript/build/audit0); server unit+auth expiry8/8; build LOCAL và native Electron riêng exit0. Native thu nhỏ >90s có ít nhất4heartbeat; 503/500/network/timeout giữ form rồi phục hồi,401 về login, không mutation. Log .local/session-fix-native-final-20261030.*. Lượt test cũ đọc sai getter Electron, sửa harness dùng getBackgroundThrottling và destroy cửa sổ test khi cleanup, không đổi assertion nghiệp vụ để vượt test. Chưa thể kết luận tác nhân gần17h khi thiếu log khách.
