# Tự tìm máy chủ qua mạng dây/Wi-Fi

1. Server tạo nhận diện Ed25519 riêng, lưu private key trong config hiện có; chỉ export public key và CA công khai vào bộ client.
2. UDP trả lời nonce, ký server ID/hostname/port. Client chỉ nhận đúng public key đã đóng trong bộ cửa hàng; IP lấy từ gói trả lời, không lấy từ chuỗi do người khác nhập.
3. Client thử IP cũ/hostname trước, rồi tìm qua broadcast trên từng card IPv4. Kiểm tra HTTPS bằng CA của cửa hàng và hostname, không bỏ xác minh TLS.
4. Trong Electron, proxy giới hạn API/ảnh qua HTTPS có lookup IP động; không sửa hosts hoặc đòi Admin trên máy con chỉ để tìm lại IP. Không tự gửi lại giao dịch ghi khi mất kết nối.
5. Thêm nút Tìm lại máy chủ; tự tìm khi mở hoặc kết nối cũ lỗi. Giữ chế độ cấu hình cũ khi chưa có bộ nhận diện.
6. Export bộ portable cùng nhận diện từ máy chủ; copy folder và chạy MO-APP.bat. Bản bàn giao chung không chứa khóa riêng, config DB hoặc nhận diện máy phát triển.
7. Kiểm thử chữ ký sai/replay, IP thay đổi, HTTPS/hostname sai, nhiều card mạng, timeout, không lặp thao tác bán; verify và build 0.2.13; ghi giới hạn thử LAN/Wi-Fi thực tế.

## Review sau triển khai

- [x] Các bước 1–6 đã triển khai: khóa riêng giữ trên server, public profile riêng từng cửa hàng, HTTPS proxy, tự tìm khi mở/kết nối lỗi, nút tìm lại, BAT portable và giữ kết nối cũ.
- [x] Test chữ ký sai/replay/sai cửa hàng, IP thay đổi, CA/hostname sai, timeout, nhiều card Ethernet/Wi-Fi và không replay mutation đạt.
- [x] Verify: 21 dữ liệu, 26 UI, Electron, TypeScript/build và audit đạt. MySQL integration, Admin/Nhân viên qua HTTPS proxy, PNG/Excel và Cancel Save đạt.
- [x] Package LOCAL và bản cài silent exit 0; app.asar bản cài trùng hash với package; smoke signed discovery/HTTPS và cấu hình ngoài đạt.
- [ ] Nghiệm thu hai máy vật lý tại khách: thử Ethernet + Wi-Fi, đổi IP máy chủ, khóa Windows, reboot và tắt/bật máy chủ. Không thể xác nhận các bước vật lý này bằng fixture trên một máy.
- Bộ chung không chứa cấu hình DB, khóa riêng hoặc CA/IP của máy phát triển. Sau cập nhật, máy chủ khách phải xuất bộ client một lần; không gửi bộ client của máy phát triển cho cửa hàng khác.
