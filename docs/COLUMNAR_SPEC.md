# Cipher Workbench — Hệ mã hàng (Columnar Transposition)

## Trạng thái và nguồn có thẩm quyền

Spec FE theo [GitHub Issue #1](https://github.com/quanh712/caesar-cipher-fe/issues/1). Phần contract dưới đây đã được đối chiếu với [consumer guide BE tại commit `c0a1927`](https://github.com/kiendt2312/caesar-cipher-be/blob/c0a1927b397926dbf89d62a4b0270d4ec0fb71d7/repo_docs/frontend-integration.md), OpenSpec, runtime và các vector test. BE `main` đã trỏ đến commit này khi nối API thật. Nếu BE đổi contract, đối chiếu lại với [`BACKEND_CONTRACT.md`](BACKEND_CONTRACT.md).

Hệ mã hàng khả dụng trong Workbench ở cả dev và production. Văn bản, file preview và file download đều gọi BE same-origin qua `/api/columnar/*`; FE không dùng mock làm fallback khi API lỗi.

## Phạm vi và giao diện

- Hệ mã hàng là feature `columnar` trong Workbench hiện có, không nhúng script/CSS từ `he-ma-hang.html`, không thêm trang riêng, stepper hay animation tự chạy.
- Giữ mode Mã hóa/Giải mã, nguồn Văn bản/File .txt, panel đầu vào/kết quả, hai tab Văn bản/Phân tích, Tạo ví dụ, thông báo, theme sáng/tối, responsive và keyboard navigation như các feature khác.
- Một trường **Khóa cột** tự nhận dạng hoán vị số hoặc từ khóa; hiển thị hoán vị và thứ tự đọc cột hiệu lực. Không có công tắc loại khóa hoặc checkbox padding.
- Tạo ví dụ chỉ điền `khoacongnghethongtin` với khóa `3,6,2,1,5,4`; không tự gọi API.
- Đổi draft, file, mode hoặc khóa xóa result/phân tích cũ. Khóa draft khi đọc file hoặc xử lý. Preview file và download là hai request riêng.
- Phân tích chỉ giải thích snapshot thành công, không tạo result thay BE. <=200 Unicode code point: hiện toàn bộ ma trận; >200: hiện tối đa 10 hàng đầu và đoạn đầu mỗi cột, gắn nhãn bản xem trước bằng số hàng thực tế đã hiển thị / tổng số hàng (có thể ít hơn 10 nếu khóa rộng). Ký hiệu hiển thị giúp nhìn thấy dấu cách, CR/LF/tab và BOM; tab Văn bản/copy/download giữ nguyên chuỗi thật.

## Thuật toán và validation

BE hoán vị **nguyên vẹn từng Unicode code point**; không chuẩn hóa, không đổi hoa/thường, không bỏ dấu/khoảng trắng/ký tự điều khiển, không đệm, không tự cắt hậu tố khi giải mã. Round-trip chính xác `decrypt(encrypt(P,K),K) = P` cho mọi nội dung hợp lệ. JavaScript phải chia chuỗi bằng `Array.from` hoặc `for...of`, không index theo UTF-16 code unit.

- Khóa là một chuỗi thô, trim **chỉ** khoảng trắng ASCII ở hai đầu (`SP`, tab, CR, LF, FF, VT); tối đa 2048 code point sau trim. Không tự bỏ dấu từ khóa. Hint của trường khóa phải giải thích giới hạn 2–256 cột và quy tắc trim ASCII này.
- Hoán vị số có 2–256 phần tử, mỗi số nguyên ASCII từ 1 đến m đúng một lần, không số 0 đầu, dấu âm/dương hay số thập phân. Phân cách bằng dấu phẩy/khoảng trắng ASCII; có thể bọc đúng một cặp `{...}`. Phần tử thứ j là thứ hạng đọc của cột vật lý j.
- Từ khóa là 2–256 ký tự `[A-Za-z]`, xếp hạng không phân biệt hoa/thường, ký tự lặp theo thứ tự trái sang phải. `BALLOON` → `[2,1,3,4,6,7,5]`.
- Text endpoint cần chuỗi không rỗng, nhưng chỉ khoảng trắng vẫn hợp lệ. JSON có surrogate lẻ bị từ chối. File `.txt` không phân biệt hoa/thường, >0 byte và <=5 MiB byte gốc, UTF-8 nghiêm ngặt. BOM UTF-8 đầu file bị tách khỏi nội dung logic và được giữ lại ở attachment; BOM-only file cho phép kết quả logic rỗng. U+FEFF không ở đầu vẫn là dữ liệu.
- Khóa dài hơn nội dung hợp lệ, cột trống có độ dài 0. Với n code point và m cột: cột vật lý j (0-based) có độ dài `floor(n/m) + (j < n % m ? 1 : 0)`. Mã hóa điền theo hàng rồi đọc theo thứ hạng; giải mã phân bổ bản mã theo thứ hạng và độ dài cột, rồi đọc theo hàng.

Các vector BE chính:

| Bản rõ                 | Khóa          | Bản mã                 |
| ---------------------- | ------------- | ---------------------- |
| `khoacongnghethongtin` | `3 6 2 1 5 4` | `agnonokntioetchghghn` |
| `ABCDE`                | `3 1 4 2`     | `BDAEC`                |
| `MEET ME AT NOON`      | `BALLOON`     | `EAM NETT EO NMO`      |
| `A B\r\nC!`            | `2 1 3`       | ` \nA\r!BC`            |
| `😀A𝄞é`                | `2 1 3`       | `A😀é𝄞`                |
| `XY`                   | `3 1 2 4`     | `YX`                   |

## Contract BE đã nhập main

```text
POST /api/columnar/encrypt
POST /api/columnar/decrypt
Content-Type: application/json
{"text":"ABCDE","key":"3 1 4 2"}

POST /api/columnar/file
Content-Type: multipart/form-data
file=<binary .txt>
key=<raw user input>
action=encrypt|decrypt
response_mode=content|file  # tùy chọn; mặc định content
```

Text và file preview trả `{ "success": true, "result": "..." }`; `response_mode=file` trả attachment `text/plain`. Không gửi `key_type`, `pad` hoặc field dư/lặp: BE trả 422. FE gửi khóa gốc, không chuyển từ khóa thành hoán vị trước request. Dùng same-origin `/api`, không hard-code URL BE. Tên attachment do server quyết định; FE dùng tên từ response.

## Kiểm thử và điều kiện phát hành

- Unit và integration: parser khóa ở biên 2/256 cột, 2048 code point, ngoặc nhọn, khoảng trắng ASCII, từ khóa lặp và ký tự không hợp lệ; vector BE và round-trip Unicode chính xác; UTF-8/BOM, file giới hạn byte, ma trận và ngưỡng preview.
- Component/integration: draft/stale result, loading lock, lỗi API không fallback, payload không field cũ, preview/download tách request, keyboard và mobile 320px.
- Selector production và adapter API thật đã được nối sau khi BE feature nhập `main`. Trước deploy phải chạy integration E2E với BE revision được ghim và xác nhận deployment dùng đúng revision đó.
