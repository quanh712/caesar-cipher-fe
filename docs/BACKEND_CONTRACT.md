# Backend Contract Reference

Frontend tích hợp theo contract chính thức của repo
[`kiendt2312/caesar-cipher-be`](https://github.com/kiendt2312/caesar-cipher-be).

## Phiên bản được ghim

- Consumer guide và Backend implementation: [`c55278f`](https://github.com/kiendt2312/caesar-cipher-be/blob/c55278f207e84811cf26e3a748df612cd6a9915e/repo_docs/frontend-integration.md)
  (`c55278f207e84811cf26e3a748df612cd6a9915e`).
- Nguồn có thẩm quyền: OpenSpec `openspec/changes/add-affine-cipher/` đang active, cùng hai
  completed changes `caesar-cipher-week1-mvp/` và `add-playfair-vigenere-ciphers/` trong repo
  Backend. Guide ở commit trên còn câu mô tả “working tree chưa commit” đã lỗi thời; implementation
  Affine thực tế nằm trong chính commit đó.

Nếu tài liệu FE khác OpenSpec Backend, OpenSpec Backend được ưu tiên và tài liệu FE phải sửa.

## Runtime boundary

- Backend thật chạy tại `http://localhost:8000`.
- FE gọi URL tương đối `/api/...`; Vite proxy `/api` về Backend khi phát triển.
- Production là same-origin; không yêu cầu CORS.
- `/docs` và `/openapi.json` dùng để đối chiếu schema; `GET /health` không thuộc contract.

## Điểm tích hợp phải giữ

- Success JSON chỉ có `success`, `result`; error JSON chỉ có `success`, `message`.
- FE kiểm tra HTTP status và body, hiển thị nguyên văn `message` hợp lệ từ Backend.
- Caesar text gửi key dưới dạng JSON integer thật sự. Vigenère và Playfair gửi key string.
- Affine text gửi đúng `text`, `a`, `b`; hai khóa là JSON integer token không mất precision. File
  Affine gửi đúng `file`, `a`, `b`, `action`, `response_mode`, không gửi `key`.
- Khóa file Affine là signed-decimal string tối đa 32 ký tự sau khi Backend trim; FE gửi nguyên raw
  control value. Backend từ chối field thừa/trùng và kiểm tra theo thứ tự `file → a → b → action →
response_mode`.
- Vigenère key phải khớp `[A-Za-z]+` và không được trim/sửa trước khi gửi.
- Playfair là luồng normalize có mất dữ liệu; UI phải cảnh báo và không tự xóa filler `X/Q`.
- File giới hạn chính xác 5 MiB; preview dùng `response_mode=content`.
- Download file là request thứ hai với `response_mode=file`, dùng attachment của Backend.
- Result server là nguồn có thẩm quyền; không có runtime mock hoặc local cipher result.

Không sao chép lại ma trận lỗi và toàn bộ scenario ở đây. Khi cần chi tiết, đọc handoff và
OpenSpec đã ghim ở trên.
