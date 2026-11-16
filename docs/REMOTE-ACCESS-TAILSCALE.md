# Hướng dẫn test Oufeidun từ xa qua Tailscale

Gói này dùng cho **máy chủ Windows tại cửa hàng** và **laptop Windows của chủ cửa hàng**. Laptop mở app Oufeidun và xem dữ liệu trực tiếp qua kết nối Tailscale tới máy chủ. Dịch vụ Oufeidun tại cửa hàng dùng HTTPS cổng 443.

## 1. Chuẩn bị trước khi test

- Máy chủ cửa hàng đã chạy Oufeidun bình thường, có Internet và luôn bật trong thời gian test.
- Laptop có Internet, đã cài app Oufeidun LOCAL của cửa hàng hoặc có cả thư mục app portable.
- Có quyền Administrator trên máy chủ để cấu hình Windows Firewall.
- Có tài khoản Tailscale do chủ cửa hàng quản lý. Cả hai máy tham gia cùng mạng Tailscale. Nếu dùng hai tài khoản, người quản trị mạng mời tài khoản còn lại vào cùng mạng và cho phép truy cập giữa hai thiết bị.
- Có tài khoản Oufeidun riêng cho chủ cửa hàng, với quyền xem các báo cáo cần dùng. Tài khoản Tailscale tạo đường kết nối, tài khoản Oufeidun xác định quyền xem dữ liệu.
- Laptop cần public profile `server-profile.json` của đúng cửa hàng. Nếu app trên laptop đã dùng profile này, công cụ tự đọc bản lưu trong `%APPDATA%\Oufeidun`.

Với laptop mới, lấy `server-profile.json` từ thư mục `02-MAY-CLIENT` đã được máy chủ xuất. Người quản trị có thể dùng `TAO-BO-MAY-NHAN-VIEN.bat` trong bộ LOCAL đang vận hành để xuất lại bộ máy nhân viên. Chép file public profile vào thư mục laptop sau khi giải nén gói test, ghi lại đường dẫn để nhập ở bước cấu hình. Profile này chứa CA, public key và nhận diện công khai của cửa hàng.

Hai máy dùng Windows 10/11 và cần có `curl.exe` để kiểm tra HTTPS. Máy chủ cần có Caddy/API/MySQL đang hoạt động như mô hình LOCAL hiện tại.

## 2. Giải nén và chuyển đúng thư mục

Giải nén ZIP bằng chuột phải, chọn **Extract All / Giải nén tất cả**, rồi mở thư mục vừa giải nén.

```text
Oufeidun-Tailscale-Test-<ngay>/
    HUONG-DAN-DAY-DU.txt
    PHIEU-KIEM-TRA.txt
    SHA256SUMS.txt
    01-MAY-CHU/
        BAT-DAU-MAY-CHU.txt
        KET-NOI-TU-XA.bat
        remote-access.ps1
    02-LAPTOP-CHU/
        BAT-DAU-LAPTOP.txt
        KET-NOI-TU-XA.bat
        remote-access.ps1
```

- Chép cả `01-MAY-CHU` sang máy chủ cửa hàng, ví dụ đặt trên Desktop.
- Chép cả `02-LAPTOP-CHU` sang laptop của chủ cửa hàng.
- Hai file BAT và PowerShell phải đặt cạnh nhau. Chạy BAT từ thư mục đã giải nén.
- Đọc hướng dẫn riêng trong từng thư mục trước khi chọn chức năng.

## 3. Cài và đăng nhập Tailscale trên cả hai máy

Thực hiện lần lượt trên máy chủ và laptop.

1. Nhấp đúp `KET-NOI-TU-XA.bat`, gõ **1**, nhấn Enter.
2. Nếu đã cài Tailscale, công cụ mở ứng dụng để đăng nhập. Nếu chưa cài, công cụ mở trang tải chính thức.
3. Tải bộ cài Windows, mở bộ cài và hoàn tất cài đặt. Chấp nhận UAC khi Windows yêu cầu quyền cài.
4. Mở biểu tượng Tailscale ở góc dưới bên phải màn hình, chọn đăng nhập và hoàn tất đăng nhập trên trình duyệt.
5. Đảm bảo Tailscale đang kết nối trên cả hai máy và hai thiết bị xuất hiện trong cùng mạng quản lý.
6. Chạy lại BAT, chọn **6** để xem IP Tailscale của chính máy đang thao tác. Ghi hai IP vào phiếu kiểm tra.

Ví dụ để phân biệt hai máy, IP thực tế do Tailscale cấp sẽ khác.

| Máy | IP minh họa |
| --- | --- |
| Máy chủ cửa hàng | 100.100.10.20 |
| Laptop của chủ | 100.100.10.30 |

Dùng IP hiển thị bởi mục 6 trên từng máy khi cấu hình. [Trang tải Windows chính thức](https://tailscale.com/download/windows).

Trên máy chủ, nhấp phải biểu tượng Tailscale, mở **Preferences**, bật **Run unattended** để Tailscale có thể tiếp tục hoạt động khi người dùng Windows đăng xuất. Kiểm tra lại sau reboot ở bước nghiệm thu. [Hướng dẫn Tailscale chạy unattended](https://tailscale.com/docs/how-to/run-unattended).

## 4. Cấu hình máy chủ cửa hàng

Thao tác trong thư mục `01-MAY-CHU` trên máy chủ.

1. Nhấp phải `KET-NOI-TU-XA.bat`, chọn **Run as administrator** và chấp nhận UAC.
2. Chọn **2**. Màn hình hiển thị IP Tailscale của máy chủ đang thao tác.
3. Khi được hỏi IP laptop, nhập IP lấy bằng mục 6 trên laptop. Theo ví dụ trên là `100.100.10.30`.
4. Chờ thông báo `Da cho phep laptop ... truy cap HTTPS`.
5. Ghi IP Tailscale máy chủ vào phiếu và gửi IP đó sang laptop để cấu hình bước tiếp theo.

Quy tắc firewall tạo/cập nhật có tên `Oufeidun-Tailscale-<IP-laptop>`, chỉ cho laptop đã chọn tới IP VPN máy chủ qua TCP 443 trên interface Tailscale. Chính sách truy cập của mạng Tailscale cũng cần cho phép laptop tới máy chủ qua cổng này.

Nếu nhận thông báo peer offline hoặc chưa xuất hiện, kiểm tra Tailscale của cả hai máy và quyền truy cập thiết bị, rồi chạy lại mục 2.

## 5. Cấu hình laptop của chủ cửa hàng

Thao tác trong thư mục `02-LAPTOP-CHU` bằng tài khoản Windows thường dùng để mở Oufeidun.

1. Lưu đơn nháp đang soạn và đóng app Oufeidun.
2. Nhấp đúp `KET-NOI-TU-XA.bat`, chọn **3**.
3. Nhập IP Tailscale máy chủ lấy từ bước 4. Theo ví dụ là `100.100.10.20`.
4. Nếu được hỏi `server-profile.json`, nhập đường dẫn đầy đủ tới public profile của cửa hàng, ví dụ `C:\Users\TenNguoiDung\Desktop\02-LAPTOP-CHU\server-profile.json`. Khi cache đã có, công cụ dùng cache hiện tại.
5. Chờ kiểm tra HTTPS bằng hostname và CA của cửa hàng, đồng thời xác nhận đúng dịch vụ Oufeidun Local API.
6. Chỉ khi kiểm tra đạt, công cụ lưu IP Tailscale vào profile và báo `HTTPS da dat, ket noi da luu`.
7. Chạy lại BAT, chọn **4**. Công cụ kiểm tra kết nối rồi mở app đã cài. Với portable, nhập đường dẫn tới `Oufeidun.exe` khi được hỏi.
8. Đăng nhập bằng tài khoản Oufeidun riêng của chủ cửa hàng. Mở Báo cáo và chọn kỳ muốn xem.

Khi kiểm tra HTTPS thất bại, đọc thông báo, xử lý theo phần chẩn đoán rồi chạy lại mục 3. Cấu hình trước đó được bảo toàn khi kiểm tra không đạt.

## 6. Test từ mạng bên ngoài

Điền kết quả vào `PHIEU-KIEM-TRA.txt`.

1. Ghi một kỳ báo cáo cố định và số liệu đối chiếu tại cửa hàng, ví dụ doanh thu, công nợ, tồn của một mã. Dùng dữ liệu đã có để đối chiếu.
2. Trên laptop, kết nối Wi-Fi bên ngoài hoặc hotspot 4G/5G từ điện thoại, để laptop dùng đường Internet khác mạng cửa hàng.
3. Giữ Tailscale đang kết nối trên cả hai máy. Máy chủ tại cửa hàng tiếp tục bật và có Internet.
4. Trên laptop, chạy BAT, chọn **4**, đăng nhập Oufeidun.
5. Mở báo cáo cùng kỳ đã ghi, đối chiếu doanh thu, công nợ, tồn kho. Xuất một file Excel và mở file kiểm tra.
6. Tắt kết nối Tailscale trên laptop, chạy BAT chọn 4 để kiểm tra thông báo lỗi. Bật lại Tailscale, đóng/mở lại qua BAT và kiểm tra kết nối hồi phục.
7. Vào thời điểm phù hợp sau khi mọi người lưu công việc, reboot máy chủ để thử dịch vụ Oufeidun và Tailscale tự hoạt động trở lại. Chờ máy chủ online, thử mở báo cáo từ laptop.
8. Trở lại mạng cửa hàng, đóng app trên laptop, chạy BAT chọn **5**, rồi mở app bằng shortcut thông thường để kiểm tra đường LAN.

Một tài khoản Oufeidun đang hoạt động trên thiết bị khác có thể bị chính sách một phiên chặn đăng nhập. Dùng tài khoản riêng cho chủ để test song song.

## 7. Sử dụng sau khi cấu hình

- **Từ xa** — máy chủ và laptop bật Internet/Tailscale, laptop chạy BAT chọn **4** để kiểm tra rồi mở app.
- **Quay lại LAN** — đóng app, chọn **5**, sau đó mở bằng shortcut Oufeidun thông thường.
- **Sau khi đã chuyển LAN và muốn đi xa lại** — đóng app, chạy mục **3** để lưu lại IP Tailscale máy chủ, rồi chọn **4**.
- **Laptop mới hoặc IP Tailscale thay đổi** — lấy IP mới bằng mục 6, cập nhật mục 2 trên máy chủ và mục 3 trên laptop.

Máy chủ cần đang bật, có Internet và dịch vụ Oufeidun/Tailscale đang hoạt động để xem dữ liệu trực tiếp từ xa.

## 8. Cấu hình lưu ở đâu

| Vị trí | Nội dung |
| --- | --- |
| `%APPDATA%\Oufeidun\server-profile.json` | Profile đang dùng trên laptop, gồm IP máy chủ |
| `%APPDATA%\Oufeidun\server-profile.json.before-tailscale.json` | Profile trước lần cấu hình Tailscale đầu tiên |
| Windows Firewall trên máy chủ | Quy tắc `Oufeidun-Tailscale-<IP-laptop>` |

Công cụ giữ hostname, CA, public key và server ID của cửa hàng. Khi cấu hình lặp lại, bản sao LAN ban đầu được giữ. Nhận diện cửa hàng khác với cache/bản sao sẽ bị từ chối để người quản trị kiểm tra lại file profile.

## 9. Chẩn đoán khi test

| Thông báo / hiện tượng | Cách kiểm tra |
| --- | --- |
| `Thieu remote-access.ps1` | Giải nén lại, đặt BAT và PS1 cạnh nhau |
| `Chua cai Tailscale` hoặc `Tailscale chua ket noi` | Chọn 1, hoàn tất cài/đăng nhập và bật kết nối, rồi chạy lại BAT |
| IP không đúng dải hoặc IP của chính máy | Chọn 6 trên từng máy để phân biệt đúng hai IP |
| Peer offline hoặc chưa xuất hiện | Kiểm tra hai máy cùng mạng Tailscale, đang online và được cấp quyền truy cập |
| Yêu cầu Administrator trên máy chủ | Nhấp phải BAT ở máy chủ, chọn Run as administrator rồi chọn 2 |
| Chưa tìm thấy public profile | Lấy server-profile.json từ bộ máy nhân viên do máy chủ xuất, rồi chọn 3 trên laptop |
| `Nhan dien cua hang khac...` | Đối chiếu lại public profile với cửa hàng cần truy cập, nhờ quản trị viên kiểm tra cache/bản sao |
| HTTPS/curl lỗi | Kiểm tra Internet, Tailscale, mục 2 trên máy chủ, quyền mạng TCP 443, Caddy, đồng hồ Windows và CA trong public profile |
| `curl.exe` chưa có hoặc báo tùy chọn không hỗ trợ | Cập nhật Windows/curl, chạy lại kiểm tra HTTPS |
| App đang chạy | Lưu công việc, đóng Oufeidun rồi chọn lại chức năng BAT |
| Chưa tìm thấy app | Cài bộ Oufeidun LOCAL hoặc nhập đúng đường dẫn EXE của portable |
| Đăng nhập bị chặn phiên | Dùng tài khoản Oufeidun riêng cho chủ hoặc đăng xuất thiết bị đang dùng tài khoản đó |
| Không xem được báo cáo | Kiểm tra quyền tài khoản và kỳ lọc trong Oufeidun |

Nếu cần gửi lỗi cho kỹ thuật, ghi bước đang làm, thời điểm, thông báo đầy đủ và kết quả mục 6 trên hai máy.

## 10. Phạm vi kiểm tra của bộ công cụ

Kiểm thử cô lập đã kiểm menu BAT trong đường dẫn có khoảng trắng/ký tự `&`, IP/peer, bảo toàn cấu hình khi HTTPS lỗi, phục hồi LAN, giới hạn firewall và TLS với CA/hostname đúng hoặc sai. Kết nối Tailscale và dữ liệu báo cáo giữa hai máy cửa hàng cần được nghiệm thu theo phiếu.

Lệnh kiểm thử từ source dành cho người phát triển.

```powershell
npx.cmd tsx --test tests/remote-access.test.ts
npm.cmd run verify
```
