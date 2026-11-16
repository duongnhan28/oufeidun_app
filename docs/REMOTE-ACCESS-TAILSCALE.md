# Dùng Oufeidun từ xa trên laptop qua Tailscale

Máy chủ cửa hàng và laptop của chủ kết nối cùng mạng Tailscale. Laptop chạy app Windows và đọc dữ liệu từ API của cửa hàng qua HTTPS. Bộ công cụ hiện hỗ trợ máy chủ dùng HTTPS 443 và public profile có nhận diện cửa hàng.

## Bộ file gửi khách

Copy cả thư mục `deployment/customer/remote/`, gồm hai file đặt cạnh nhau.

- `KET-NOI-TU-XA.bat` mở menu thao tác.
- `remote-access.ps1` kiểm tra Tailscale, cấu hình firewall hoặc profile của laptop và mở app.

Windows 10/11 cần có `curl.exe`, app Oufeidun LOCAL và public profile `server-profile.json` của đúng cửa hàng. Nếu laptop đã chạy app với public profile trước đó, công cụ tự đọc bản lưu trong `%APPDATA%\Oufeidun`. Với laptop mới, lấy file public này từ bộ máy nhân viên được xuất tại máy chủ.

## Cấu hình lần đầu

1. Chạy BAT trên cả hai máy và chọn **1**. Nếu Tailscale đã cài, menu mở Tailscale để đăng nhập. Nếu chưa cài, menu mở trang tải Windows chính thức. Cài, đăng nhập và đưa hai máy vào cùng mạng Tailscale. [Trang tải Tailscale](https://tailscale.com/download/windows).
2. Trên mỗi máy, chạy BAT và chọn **6** để xem IP Tailscale của máy đó. Ghi lại IP máy chủ và IP laptop.
3. Trên **máy chủ**, nhấp phải BAT, chọn **Run as administrator**, rồi chọn **2**. Nhập IP Tailscale của laptop. Công cụ tạo/cập nhật quy tắc Windows Firewall cho TCP 443, giới hạn đúng IP laptop, IP VPN của máy chủ và card mạng Tailscale.
4. Trên **laptop**, lưu đơn nháp rồi đóng Oufeidun. Chạy BAT bằng tài khoản Windows đang sử dụng app, chọn **3**, nhập IP Tailscale máy chủ. Nếu chưa có public profile, nhập đường dẫn file `server-profile.json` của cửa hàng khi được hỏi.
5. Công cụ kiểm tra HTTPS bằng hostname và CA trong public profile, xác nhận đúng dịch vụ Oufeidun rồi lưu IP kết nối. Nếu kiểm tra lỗi, xử lý nguyên nhân và chạy lại bước 4.
6. Trên laptop, chạy BAT, chọn **4**. Đăng nhập app bằng tài khoản Oufeidun riêng của chủ cửa hàng và xem báo cáo theo quyền tài khoản.

## Sử dụng hằng ngày

Bật máy chủ, kết nối Internet/Tailscale ở cả hai máy. Trên laptop chạy BAT và chọn **4**. Mỗi lần mở qua BAT đều kiểm tra kết nối và HTTPS trước khi mở app. Hai máy cần được chính sách Tailscale cho phép liên lạc qua TCP 443.

Khi trở lại cửa hàng và muốn dùng đường LAN, đóng app, chạy BAT chọn **5**, rồi mở app bằng shortcut thông thường. Công cụ khôi phục public profile trước lần cấu hình Tailscale đầu tiên. IP LAN đã thay đổi sẽ được cơ chế discovery có chữ ký của app tìm lại.

## Cấu hình được lưu

| Vị trí | Nội dung |
| --- | --- |
| `%APPDATA%\Oufeidun\server-profile.json` | Public profile, IP máy chủ được chọn |
| `%APPDATA%\Oufeidun\server-profile.json.before-tailscale.json` | Public profile trước lần cấu hình Tailscale đầu tiên |
| Windows Firewall trên máy chủ | Quy tắc `Oufeidun-Tailscale-<IP-laptop>` |

Profile giữ hostname, CA, public key và server ID của cửa hàng. Công cụ từ chối đổi sang nhận diện cửa hàng khác khi cache hoặc bản sao LAN đã tồn tại. Thao tác cấu hình lặp lại dùng lại bản sao LAN ban đầu.

## Kiểm tra tại cửa hàng

- Dùng Wi-Fi bên ngoài hoặc hotspot điện thoại trên laptop để xác nhận kết nối thực tế từ xa.
- Kiểm tra đăng nhập, báo cáo theo ngày, doanh thu, công nợ, tồn kho và xuất Excel.
- Tắt Tailscale trên laptop để kiểm tra thông báo lỗi, bật lại và thử kết nối.
- Thử mục 5 khi ở cửa hàng và xác nhận app tìm lại máy chủ LAN.
- Kiểm tra sau reboot máy chủ, bao gồm trạng thái đăng nhập Tailscale và dịch vụ Oufeidun.

Máy chủ cần đang bật và có Internet để đọc báo cáo trực tiếp. Chính sách một phiên hoạt động của tài khoản Oufeidun vẫn áp dụng. Chủ nên dùng tài khoản riêng khi tài khoản hiện tại đang được dùng ở cửa hàng.

## Chẩn đoán

| Hiện tượng | Kiểm tra |
| --- | --- |
| Tailscale chưa kết nối | Mở mục 1, đăng nhập và bật kết nối rồi chạy lại BAT |
| IP ngoài dải / IP của chính máy đang thao tác | Lấy đúng IP của máy còn lại bằng mục 6 |
| Peer chưa xuất hiện hoặc offline | Kiểm tra hai máy cùng mạng Tailscale, đang bật và quyền truy cập thiết bị |
| HTTPS lỗi | Kiểm tra mục 2 trên máy chủ, Caddy HTTPS 443, chính sách Tailscale và public profile đúng cửa hàng |
| App đang chạy | Lưu đơn nháp, đóng app rồi chọn lại mục cần dùng |
| Chưa tìm thấy app | Cài bộ cài Oufeidun LOCAL hoặc chọn đường dẫn Oufeidun.exe trong bản portable |

## Kiểm thử nguồn

```powershell
npx.cmd tsx --test tests/remote-access.test.ts
npm.cmd run verify
```

Kiểm thử Windows bao gồm menu BAT trong đường dẫn có khoảng trắng/ký tự `&`, IP/peer, bảo toàn cấu hình khi HTTPS lỗi, phục hồi LAN, phạm vi firewall và HTTPS với CA đúng/sai, hostname đúng/sai. Firewall được mô phỏng trong kiểm thử, kết nối TLS dùng máy chủ thử riêng. Kết nối Tailscale giữa hai máy thật cần được nghiệm thu theo danh sách phía trên.
