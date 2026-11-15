# Bộ cập nhật LOCAL cho máy đã cài

> Tài liệu lịch sử được lưu theo mốc phát triển ban đầu. Hướng dẫn hiện tại nằm trong [README của dự án](../../README.md).

1. Nhận lại thư mục dữ liệu từ server-info.json hoặc Scheduled Task hiện có; chỉ hỏi nếu không tìm thấy. Không tạo database khi cập nhật.
2. Gom khởi động, kiểm tra, sửa cấu hình, sao lưu vào menu BAT. BAT gọi scripts qua thư mục của chính nó.
3. Sửa cấu hình: giữ giá trị cũ khi để trống, kiểm tra DB trước khi áp dụng, sao lưu file cấu hình và giữ chứng chỉ/hostname hiện có.
4. Cập nhật: backup DB/ảnh trước, dừng API, copy phiên bản mới, migration, health check; không tự hoàn tác database đã migration bằng code cũ không tương thích.
5. Máy nhân viên giữ hostname đã cài; sửa IP bằng hosts, không cài MySQL/Node. Tách cập nhật app khỏi cài chứng chỉ/kết nối lần đầu.
6. Kiểm tra script ở thư mục có dấu cách, parse PowerShell, test nhận cấu hình cũ, kiểm tra MySQL, regression verify và build LOCAL.
7. Đóng gói 0.2.12 vào folder bàn giao, kiểm tra package/config và SHA256. Không đóng gói server-info/config/ảnh/chứng chỉ/mật khẩu máy phát triển.
8. Review lại checklist và ghi kết quả thật; thử read-only trên máy hiện tại, không tự thay cấu hình DB hoặc khởi động lại Windows đang dùng.

## Kết quả 0.2.12

- Menu/script, nhận cấu hình cũ và cấu hình ngoài client đã triển khai. Không gắn cứng ổ đĩa.
- Config fixture, MySQL thật read-only, backup thật, PowerShell parse, verify 21/26, MySQL integration và audit app/server đạt.
- Build, packaged smoke, cài silent mã 0 và installed smoke cấu hình ngoài đạt.
- Đã tạo hai folder trong bộ bàn giao 0.2.12, ZIP và SHA256; không đóng gói config/ảnh/chứng chỉ của máy phát triển.
- Cần kiểm tra vận hành bằng UAC và reboot/máy LAN thật; lần này không thay cấu hình database máy phát triển hoặc restart Windows.
