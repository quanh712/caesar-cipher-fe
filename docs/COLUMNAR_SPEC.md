# Cipher Workbench — Hệ mã hàng (Columnar Transposition) Specification

## 1. Trạng thái và nguồn có thẩm quyền

- Các quyết định về thuật toán, phạm vi và UX trong tài liệu này đã được người dùng chốt.
- Mục 8 là **đề xuất contract Backend**, chưa phải contract được Backend chấp nhận hoặc triển khai.
- Theo [`agents/issue-tracker.md`](agents/issue-tracker.md), spec phải được theo dõi trong GitHub Issue.
  Bản trong repo này cần được đưa lên issue khi có `gh` CLI và quyền truy cập GitHub.
- Trước khi bật tính năng, đối chiếu OpenSpec, consumer guide và runtime Backend đã được chấp nhận;
  cập nhật [`BACKEND_CONTRACT.md`](BACKEND_CONTRACT.md) theo revision mới. Nếu có khác biệt,
  contract Backend đã chấp nhận là nguồn có thẩm quyền cho FE.
- Result production luôn đến từ Backend. FE không tự tính bản mã/bản rõ để thay thế khi API lỗi.

## 2. Mục tiêu và phạm vi

Thêm **Hệ mã hàng** làm thuật toán thứ năm trong `Cipher Workbench`, với mô tả ngắn **Hoán vị
cột** và mã định danh nội bộ `columnar`. Không nhúng trực tiếp `he-ma-hang.html` hoặc tạo router/trang
bài giảng riêng.

Trong phạm vi:

- Mã hóa và giải mã văn bản; xem trước và tải kết quả của file `.txt`.
- Nhập khóa bằng hoán vị số hoặc từ khóa; hiển thị hoán vị số hiệu lực.
- Tùy chọn đệm `x` khi mã hóa, mặc định tắt.
- Tab `Văn bản` và `Phân tích` theo layout các cipher hiện tại. Phân tích tĩnh hiển thị ma trận,
  thứ tự đọc cột và số liệu của chính lần xử lý thành công.
- Theme sáng/tối, responsive, keyboard và screen reader theo chuẩn hiện tại.
- Unit, component, mock API và integration E2E với Backend thật.

Ngoài phạm vi: tự chạy/tua từng bước, tự đoán hoặc tự xóa padding khi giải mã, khôi phục dấu/cách
viết gốc, phá mã, lịch sử xử lý, custom alphabet và local runtime fallback.

## 3. Quy tắc thuật toán

### 3.1 Chuẩn hóa nội dung

- Chuyển `đ/Đ` thành `d/D`, tách và bỏ dấu kết hợp Unicode, chuyển về chữ thường, chỉ giữ ASCII
  `a-z0-9`. Bỏ khoảng trắng, dấu câu và các ký tự khác ở cả hai mode.
- Hiển thị nội dung sau chuẩn hóa và thông báo rõ nếu có ký tự bị loại. Không hứa khôi phục nguyên
  trạng bản rõ ban đầu.
- Nếu nội dung sau chuẩn hóa rỗng, không gửi request xử lý.
- Result hiển thị, sao chép và tải xuống là chuỗi chữ thường liền mạch đúng như Backend trả về;
  không tự thêm nhóm ký tự, khoảng trắng hoặc đổi hoa/thường. Nếu Phân tích nhóm ký tự để dễ đọc,
  phải ghi rõ đó chỉ là định dạng hiển thị.

### 3.2 Khóa

- Hoán vị số có `m` phần tử với `2 <= m <= 20`; mỗi số từ `1` đến `m` xuất hiện đúng một lần.
  Cho phép ngăn bằng dấu phẩy hoặc khoảng trắng, ví dụ `3,6,2,1,5,4`.
- Phần tử ở vị trí `j` là **thứ hạng đọc của cột vật lý `j`**, không phải chỉ số cột được đọc tại
  lượt `j`. Với khóa trên, thứ tự đọc cột (đếm từ 1) là `4,3,1,6,5,2`.
- Từ khóa dài 2–20 chữ cái sau chuyển dấu sang ASCII; không phân biệt hoa/thường. Chữ số, khoảng
  trắng, dấu câu hoặc ký tự không chuyển được thành `a-z` trong khóa là lỗi, không âm thầm bỏ.
- Từ khóa được xếp hạng theo thứ tự chữ cái; chữ trùng nhau nhận hạng theo vị trí từ trái sang
  phải. `BALLOON` tạo hoán vị `2,1,3,4,6,7,5`.
- FE báo lỗi cạnh trường khóa nếu thiếu, trùng, sai phạm vi hoặc sai định dạng; BE vẫn validation
  độc lập. Khóa dài hơn nội dung là hợp lệ; cột trống có độ dài 0 khi không đệm.

### 3.3 Mã hóa

1. Chuẩn hóa bản rõ theo mục 3.1.
2. Nếu bật đệm, thêm đúng số chữ `x` cần để độ dài chia hết cho `m`; nếu đã chia hết thì không
   thêm. Mặc định không đệm.
3. Ghi chuỗi vào `m` cột theo từng hàng, từ trái sang phải.
4. Đọc toàn bộ từng cột theo thứ hạng trong khóa, từ 1 đến `m`.

Vector chuẩn: `khoacongnghethongtin` + `3,6,2,1,5,4` + không đệm →
`agnonokntioetchghghn`.

### 3.4 Giải mã

- Chuẩn hóa bản mã theo mục 3.1. Chấp nhận cả chữ hoa và khoảng trắng dùng để nhóm bản mã;
  thông báo rõ ký tự nào bị loại. Không đòi độ dài bản mã chia hết cho số cột.
- Với độ dài `n`, số cột `m`, đặt `q = floor(n / m)` và `r = n mod m`. Cột vật lý `j` (đếm từ 0)
  có độ dài `q + 1` nếu `j < r`, ngược lại là `q`. Chia bản mã theo **thứ tự đọc** thành các cột
  với độ dài tương ứng, rồi đọc ma trận theo hàng để lấy bản rõ chuẩn hóa.
- Không tự bỏ `x` ở cuối: đó có thể là ký tự thật. Nếu bản mã được tạo với padding, bản rõ giải mã
  có thể còn các chữ `x` được đệm.
- Bất biến round-trip: không đệm thì `decrypt(encrypt(P, K), K) = normalize(P)`; có đệm thì bằng
  `normalize(P)` cộng các chữ `x` đã thêm, không phải bản gốc trước chuẩn hóa.

## 4. Giao diện và state

- Đăng ký `columnar` trong selector hiện có; tên hiển thị `Hệ mã hàng`, mô tả `Hoán vị cột`.
  Giữ shell, semantic color tokens, typography, light/dark theme và responsive của workbench.
- Giữ hai mode `Mã hóa`/`Giải mã`, nguồn `Văn bản`/`File .txt`, input/output panel, thông báo và
  action như các feature trước. Không thêm stepper, autoplay, reset bước hoặc trang demo riêng.
- Cấu hình khóa có lựa chọn `Hoán vị số`/`Từ khóa`, một trường nhập khóa và phần hiển thị thứ tự
  cột hiệu lực. Checkbox đệm `x` chỉ áp dụng và hiển thị ở mode mã hóa.
- `Tạo ví dụ` chuyển sang mã hóa/văn bản, điền `khoacongnghethongtin`, khóa số
  `3,6,2,1,5,4`, tắt đệm; không tự gọi Backend.
- Draft mode, input, file, loại khóa, khóa và tùy chọn đệm được giữ khi chuyển sang cipher khác
  trong cùng phiên theo hành vi hiện tại. Sửa mode, loại nguồn, nội dung, file, loại khóa, khóa
  hoặc đệm phải xóa result và Phân tích cũ; chỉ hiện Phân tích của request thành công mới nhất.
- Trong lúc request đang chạy, khóa các control có thể thay đổi hoặc gửi lặp. Lỗi API/network
  không được để lại result cũ. Reset toàn app theo hành vi chung.
- Validation có nhãn, helper/error liên kết bằng `aria-describedby`; trạng thái không chỉ thể
  hiện bằng màu. Tab và selector giữ keyboard navigation/focus indicator hiện có.

## 5. File và output

- Giữ validation FE dùng chung: file `.txt` (đuôi không phân biệt hoa/thường), lớn hơn 0 byte,
  tối đa `5 MiB = 5.242.880 byte`. Backend kiểm tra lại độc lập.
- Preview kết quả và tải attachment là hai thao tác/request riêng như các cipher hiện tại. Result
  Backend là nguồn chính thức; tải file không lấy dữ liệu từ phép tính cipher ở FE.
- Phân tích file dùng snapshot của lần xử lý thành công; không tự động render toàn bộ ma trận của
  file lớn. Lỗi đọc file hoặc lỗi API không được hiển thị phân tích giả.

## 6. Tab Phân tích

- `Văn bản` hiển thị nguyên `result` Backend. `Phân tích` hiển thị khóa đã nhập/hoán vị hiệu lực,
  nội dung sau chuẩn hóa, tổng ký tự, số ký tự đệm (khi mã hóa), độ dài từng cột, thứ tự đọc cột
  và ma trận tương ứng với lần xử lý thành công.
- FE dựng Phân tích từ snapshot input/khóa/mode và `result` Backend, chỉ để giải thích; không dùng
  chuỗi do FE tự ghép từ cột làm result hoặc fallback.
- Với tối đa 200 ký tự sau chuẩn hóa, hiển thị toàn bộ ma trận. Với hơn 200 ký tự, chỉ hiển thị
  10 hàng đầu, tổng độ dài và độ dài của từng cột; gắn nhãn **bản xem trước**, không ngụ ý phần
  nhìn thấy tự nó tạo ra toàn bộ result. Không render hàng nghìn/hàng triệu ô DOM.
- Phân tích mã hóa cho thấy thứ tự đọc cột; phân tích giải mã cho thấy cách phân bổ bản mã vào
  cột rồi đọc lại theo hàng. Đây là nội dung tĩnh, không có điều khiển từng bước.
- Khi input/khóa/mode thay đổi, xóa snapshot và Phân tích cũ để tránh giải thích nhầm dữ liệu mới.

## 7. Cấu trúc FE dự kiến

- Feature riêng dưới `src/features/columnar/` cho component, hook, service, type, validation,
  chuẩn hóa và phân tích; không nhúng script/CSS từ HTML tham chiếu.
- Tích hợp vào `src/shared/config/cipherAlgorithms.ts` và `src/app/App.tsx`. Chỉ mở rộng
  abstraction transport chung khi khớp contract thật; không tổng quát hóa sớm các cipher khác.
- Dùng proxy `/api` và same-origin production như hiện tại; không hard-code Backend URL.
- Chỉ đưa thẻ `Hệ mã hàng` lên giao diện khi contract BE, implementation và integration tests đã
  sẵn sàng. Có thể xây FE sau test boundary/mock trước đó, nhưng không đánh dấu production-ready.

## 8. Đề xuất contract Backend — chờ BE chấp nhận

Theo quy ước API hiện hành, đề xuất:

```text
POST /api/columnar/encrypt
POST /api/columnar/decrypt
Content-Type: application/json

encrypt: {"text":"khoacongnghethongtin","key":"3,6,2,1,5,4","key_type":"permutation","pad":false}
decrypt: {"text":"agnonokntioetchghghn","key":"3,6,2,1,5,4","key_type":"permutation"}

POST /api/columnar/file
Content-Type: multipart/form-data

file=<binary .txt>
key=<raw user input>
key_type=permutation|keyword
action=encrypt|decrypt
response_mode=content|file
pad=true|false                 # chỉ khi action=encrypt
```

- BE nhận khóa gốc cùng `key_type`, tự chuẩn hóa/xếp hạng và tính result; FE không đổi từ khóa
  thành hoán vị số trước khi gửi. `pad` chỉ có ý nghĩa ở encrypt, mặc định `false`; decrypt không
  có tùy chọn tự bỏ padding.
- Text và file `response_mode=content` trả JSON thành công `{ "success": true, "result": "..." }`.
  Lỗi trả `{ "success": false, "message": "..." }` với HTTP status phù hợp. File
  `response_mode=file` trả attachment `text/plain`; preview/download là hai request riêng.
- BE validation độc lập cho khóa 2–20 cột, chuẩn hóa nội dung, file và padding. FE không suy đoán
  kết quả hoặc phân nhánh business logic theo chuỗi `message`.
- Không yêu cầu BE trả ma trận/trace. FE chỉ dựng lớp minh họa tĩnh và cần kiểm thử parity với BE.
- BE OpenSpec/consumer guide cần chốt thêm status và thứ tự lỗi, unknown/duplicate field,
  UTF-8/BOM, tên attachment và cách serialize field multipart `pad` trước khi FE nối thật.

## 9. Kế hoạch kiểm thử và tiêu chí hoàn thành

### Unit

- Chuẩn hóa tiếng Việt (`đ/Đ`, dấu), chữ hoa, số, dấu câu và input rỗng sau chuẩn hóa.
- Hoán vị số thiếu/trùng/sai phạm vi; giới hạn 2 và 20; khóa dài hơn nội dung.
- Xếp hạng từ khóa có chữ lặp theo vị trí trái sang phải; từ chối số/khoảng trắng trong khóa.
- Vector chuẩn ở mục 3.3, cả hai mode; độ dài không chia hết cho số cột; padding bật/tắt; giữ
  `x` khi giải mã.
- Phân tích dùng snapshot/result BE, ngưỡng 200 ký tự và preview 10 hàng.

### Component và E2E

- Selector, `Tạo ví dụ`, hai kiểu khóa, checkbox đệm, validation và thông báo ký tự bị loại.
- Encrypt/decrypt text, file preview và download; payload chỉ gồm field đã chốt.
- Đổi draft/mode/cipher xóa stale result đúng quy tắc; loading lock và error recovery.
- Light/dark, keyboard, screen reader và mobile 320 px không horizontal overflow toàn trang.
- Integration E2E dùng Backend thật, kiểm tra vector chuẩn, round-trip chuẩn hóa, file và lỗi;
  không dùng runtime mock hoặc local cipher fallback để giữ test xanh.

**Definition of Done:** FE và BE thống nhất contract đã accepted; endpoint chạy thật; Hệ mã hàng
được bật như thuật toán thứ năm; tất cả kiểm thử liên quan, format/lint/typecheck/build đạt;
`README.md` và [`BACKEND_CONTRACT.md`](BACKEND_CONTRACT.md) được cập nhật theo revision BE đã
chấp nhận; spec được theo dõi trong GitHub Issue theo quy ước repo.
