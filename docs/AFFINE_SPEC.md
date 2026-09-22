# Cipher Workbench — Frontend Affine Cipher Specification

## 1. Trạng thái và quyền ưu tiên

Tài liệu này định nghĩa phạm vi, hành vi giao diện và kế hoạch triển khai Affine ở Frontend. Nó
không phải API contract và không được dùng để suy đoán hành vi Backend.

Contract có thẩm quyền vẫn được ghim tại [`BACKEND_CONTRACT.md`](BACKEND_CONTRACT.md). Tại thời
điểm lập spec, Backend chưa có contract Affine được chấp nhận. Các endpoint và payload được nhắc
trong mục 8 chỉ là dependency FE cần Backend xác nhận trước khi bật tích hợp production.

Nếu spec này khác completed OpenSpec, consumer guide hoặc runtime Backend đã được chấp nhận thì
nguồn Backend có thẩm quyền cao hơn và spec FE phải được cập nhật.

## 2. Mục tiêu và phạm vi

Affine trở thành thuật toán thứ tư trong `Cipher Workbench`, ngang hàng với Caesar, Vigenère và
Playfair.

Trong phạm vi:

- mã hóa và giải mã văn bản;
- preview và download file `.txt`;
- hai khóa nguyên `a` và `b`;
- validation khóa ở FE trước khi gửi;
- hiển thị khóa chuẩn hóa, `gcd(a, 26)`, nghịch đảo modulo và công thức đang áp dụng;
- visualization bảng ánh xạ A–Z và phân tích kết quả;
- theme sáng/tối, responsive, keyboard và screen reader theo chuẩn hiện tại;
- unit test, component test, mock E2E và Backend integration E2E.

Ngoài phạm vi:

- nhúng hoặc render trực tiếp `affine-cipher.html`;
- thêm router hoặc một trang lý thuyết độc lập;
- dùng kết quả mã hóa do FE tự tính làm kết quả production;
- brute-force, phá mã hoặc tự động tìm khóa;
- hỗ trợ alphabet tùy chỉnh, Unicode alphabet hoặc modulus khác 26;
- lưu lịch sử, tài khoản hoặc database.

## 3. Mô hình thuật toán dùng để giải thích UI

FE dùng các quy tắc sau cho validation và visualization. Backend vẫn là nguồn có thẩm quyền cho
kết quả mã hóa/giải mã.

```text
A = 0, B = 1, ..., Z = 25

Encrypt: E(x) = (a × x + b) mod 26
Decrypt: D(y) = a⁻¹ × (y - b) mod 26
Valid a: gcd(a, 26) = 1
```

Hành vi mong đợi:

- chỉ ASCII letter `A-Z` và `a-z` được biến đổi;
- giữ nguyên hoa/thường;
- Unicode, chữ số, dấu câu, khoảng trắng và line ending được giữ nguyên;
- `a` và `b` được chuẩn hóa về khoảng `0..25` để visualization;
- `a` hợp lệ khi giá trị đã chuẩn hóa nguyên tố cùng nhau với 26;
- các giá trị `a` chuẩn hóa hợp lệ là `1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25`;
- `b = 0` hợp lệ; `a = 1, b = 0` là phép biến đổi đồng nhất;
- ví dụ chính thức của FE: `HELLO` với `a = 5`, `b = 8` cho kết quả `RCLLA`;
- với `a = 5`, nghịch đảo modulo hiển thị là `21`.

## 4. Kiến trúc và state

- Vẫn dùng một workspace và selector `caesar | vigenere | playfair | affine`; không thêm router.
- Affine có hook, validation, service, type và component riêng trong `src/features/affine/`.
- Draft Affine gồm mode, nguồn input, text, file, `a` và `b`; draft được giữ khi chuyển sang cipher
  khác trong cùng phiên.
- Đổi mode, nguồn input, nội dung, file, `a` hoặc `b` phải xóa result, output analysis và notice cũ.
  Bảng ánh xạ là visualization cấu hình trực tiếp nên được tính lại từ draft hiện tại.
- Đổi cipher xóa result/notice cũ của các workspace theo hành vi hiện tại; không xóa draft input và
  khóa của từng cipher.
- `Làm mới` ở header reset toàn bộ cipher và đưa selector về Caesar như hành vi hiện tại.
- Trong lúc request Affine đang chạy, khóa mọi control có thể thay đổi hoặc gửi lại request; nút
  theme vẫn hoạt động.
- Submit phải xóa result cũ trước khi request. Lỗi API, network hoặc download để result rỗng và cho
  phép thử lại.
- Result production luôn lấy từ Backend. Hàm Affine local nếu có chỉ phục vụ test fixture hoặc
  visualization và không được dùng làm fallback khi API lỗi.

State controller tối thiểu:

```text
mode, inputType
text, file, fileText
a, b
result, notice
isLoading, processingStatus
inputError, aError, bError
normalizedA, normalizedB, inverseA
canSubmit
```

Action tối thiểu:

```text
setMode, setInputType
setText, setFile
setA, setB
processCipher, downloadResult
loadExample, resetInput, clearResult, resetAll
```

## 5. Validation phía Frontend

### 5.1 Input

- Text không hợp lệ duy nhất khi `length === 0`; whitespace-only vẫn hợp lệ.
- File dùng validation chung: đuôi `.txt` không phân biệt hoa thường, lớn hơn 0 byte và tối đa
  `5 MiB = 5.242.880 byte`.
- FE chỉ preview file có thể đọc; Backend quyết định UTF-8 hợp lệ và precedence lỗi cuối cùng.

### 5.2 Khóa

- `a` và `b` là hai text control riêng để không làm mất độ chính xác trước validation.
- Sau khi trim, mỗi khóa phải khớp toàn bộ biểu thức `[+-]?\d+`.
- Không chấp nhận số thập phân, số mũ, `NaN`, `Infinity` hoặc chuỗi chỉ có dấu.
- FE parse khóa bằng `BigInt`, sau đó chuẩn hóa modulo 26; không parse sớm bằng `Number`.
- `a` không hợp lệ nếu `gcd(normalizedA, 26) !== 1`.
- `b` không có điều kiện nguyên tố cùng nhau; mọi số nguyên đều hợp lệ.
- Với nguồn file, giới hạn token khóa cần khớp contract Backend sau khi được chấp nhận. Trước thời
  điểm đó không tự đặt giới hạn khác với Caesar.
- Thông báo lỗi xuất hiện cạnh đúng control và được liên kết bằng `aria-describedby`.
- Không hiển thị lỗi required khi control chưa từng được nhập; nút action vẫn bị vô hiệu hóa.

Thông báo dự kiến:

```text
a phải là số nguyên.
b phải là số nguyên.
a không hợp lệ vì gcd(a, 26) phải bằng 1.
```

`canSubmit` chỉ đúng khi không loading, input hợp lệ, cả hai khóa parse được và `a` thỏa điều kiện
nghịch đảo modulo.

## 6. Giao diện và nội dung

### 6.1 Cấu trúc

```text
┌──────────────────────────────────────────────────────────────┐
│ Caesar       Vigenère       Playfair       Affine            │
└──────────────────────────────────────────────────────────────┘

[ Mã hóa ] [ Giải mã ]                         [ Tạo ví dụ ]

┌────────────────────────────┬─────────────────────────────────┐
│ Nội dung đầu vào           │ Kết quả                         │
│ Text / File                │ Văn bản / Phân tích             │
└────────────────────────────┴─────────────────────────────────┘

Khóa Affine
┌────────────────┐  ┌────────────────┐
│ a              │  │ b              │
│ 5              │  │ 8              │
└────────────────┘  └────────────────┘

E(x) = (5 × x + 8) mod 26
gcd(5, 26) = 1 · a⁻¹ = 21 · Khóa hợp lệ

[ Mã hóa ]
```

### 6.2 Design direction

- Dùng nguyên semantic color token, typography, border, focus và theme hiện có; không nhập CSS
  xanh đậm từ file HTML thử nghiệm.
- Điểm thị giác riêng duy nhất của Affine là khối công thức động nối trực tiếp hai khóa với phép
  biến đổi. Các panel khác giữ yên để feature trông thuộc cùng sản phẩm.
- Không đưa toàn bộ bài giảng Affine vào workspace. Copy chỉ giải thích điều cần thiết để nhập khóa,
  hiểu lỗi và đọc kết quả.
- Desktop giữ input/output hai cột. Selector thuật toán dùng bốn cột ở màn hình rộng, `2 × 2` ở
  tablet và một cột ở mobile.
- Cụm khóa dùng hai cột ở desktop và một cột trên mobile; không gây horizontal scroll toàn trang.
- Công thức dùng monospace hiện có, không tải thêm font hoặc dependency UI.
- Không thêm animation trang trí. Chỉ giữ transition theme và toast; tôn trọng
  `prefers-reduced-motion`.

### 6.3 Nội dung thao tác

- Helper text: `Chỉ chữ cái ASCII được biến đổi; Unicode, số, dấu câu và khoảng trắng được giữ nguyên.`
- `Tạo ví dụ` chọn nguồn text, mode encrypt, điền `HELLO`, `a = 5`, `b = 8` và làm action sẵn sàng.
- Nút chính hiển thị `Mã hóa`, `Giải mã` hoặc `Đang xử lý…` đúng với state.
- Success notice dùng cùng nội dung với các cipher hiện tại.
- Failure message hợp lệ từ Backend được hiển thị nguyên văn; FE không branch business logic theo
  nội dung message.

## 7. Output và visualization

Output có hai view giống các cipher hiện tại:

### 7.1 Văn bản

- Hiển thị đúng `result` Backend trả về.
- Cho phép sao chép, xóa và tải kết quả khi có result.
- Download text tạo Blob từ result server với tên `ket-qua.encrypted.txt` hoặc
  `ket-qua.decrypted.txt`.

### 7.2 Phân tích

Output analysis được tính ở client từ snapshot của request thành công và không thay đổi result:

- request token `a`, `b` sau khi trim khoảng trắng nhưng vẫn giữ dấu và zero đầu;
- `normalizedA`, `normalizedB`;
- `gcd(normalizedA, 26)`;
- `inverseA`;
- công thức encrypt/decrypt đã thế khóa;
- tổng ký tự, số ASCII letter đã biến đổi và số ký tự được giữ nguyên.

Analysis phải dùng snapshot tại thời điểm request, không dùng draft đã bị chỉnh sau đó. Không cần
hiển thị trace từng ký tự trong checkpoint đầu tiên.

### 7.3 Bảng ánh xạ trực tiếp

- Bảng ánh xạ A–Z là visualization của cấu hình hiện tại, không thuộc output analysis lịch sử.
- Mapping dùng mode, input và cặp khóa hợp lệ trong draft hiện tại; không yêu cầu request thành công.
- Khi sửa draft, mapping được tính lại ngay. Khi khóa thiếu hoặc sai, bảng chuyển về empty state và
  không hiển thị identity mapping giả.
- Các chữ ASCII xuất hiện trong toàn bộ draft text hoặc `fileText` được highlight; Unicode và ký tự
  ngoài A–Z không ảnh hưởng tập highlight.

## 8. Dependency cần Backend xác nhận

FE đề xuất shape dưới đây để thảo luận; chưa coi là contract cho tới khi được accepted ở Backend.

Text:

```text
POST /api/affine/encrypt
POST /api/affine/decrypt
Content-Type: application/json

{"text":"HELLO","a":5,"b":8}
```

File:

```text
POST /api/affine/file
Content-Type: multipart/form-data

file=<binary>
a=5
b=8
action=encrypt|decrypt
response_mode=content|file
```

Các điểm bắt buộc chốt trước khi nối API thật:

- tên endpoint và tên field;
- `a`, `b` của JSON là integer hay decimal token/string;
- Backend nhận raw key hay key đã chuẩn hóa;
- giới hạn độ dài token cho file multipart;
- behavior ASCII/case/Unicode/line ending;
- validation và error precedence;
- response envelope, file size, BOM và attachment filename;
- vector encrypt/decrypt chính thức.

Mặc định FE mong muốn tái sử dụng envelope hiện tại:

```json
{ "success": true, "result": "RCLLA" }
```

và error:

```json
{ "success": false, "message": "..." }
```

Sau khi contract được chấp nhận, cập nhật [`BACKEND_CONTRACT.md`](BACKEND_CONTRACT.md) bằng commit
consumer guide/OpenSpec tương ứng; không để đề xuất trong mục này trở thành nguồn contract thứ hai.

## 9. Cấu trúc triển khai dự kiến

```text
src/features/affine/
├── components/
│   ├── AffineKeyConfig.tsx
│   ├── AffineMap.tsx
│   ├── AffineOutputPanel.tsx
│   └── AffineWorkspace.tsx
├── hooks/
│   └── useAffineCipher.ts
├── services/
│   └── affineApi.ts
├── types/
│   └── cipher.ts
└── utils/
    ├── analysis.test.ts
    ├── analysis.ts
    ├── validation.test.ts
    └── validation.ts
```

Các file tích hợp chính:

- `src/shared/config/cipherAlgorithms.ts`: đăng ký `affine`;
- `src/app/App.tsx`: hook, loading aggregate, reset, clear và workspace map;
- `src/shared/services/cipherApi.ts`: chỉ mở rộng transport chung nếu contract Affine thực sự dùng
  được abstraction chung;
- `src/app/styles.css`: selector bốn thuật toán, key pair, formula và analysis;
- `src/test/setup.ts`: mock API Affine tại test boundary;
- `src/app/App.test.tsx`, `e2e/cipher.spec.ts`, `e2e/backend-integration.spec.ts`: coverage.

Không tổng quát hóa sớm các hook cipher hiện tại chỉ để giảm số dòng. Chỉ trích xuất abstraction
khi Caesar, Vigenère, Playfair và Affine có cùng semantics thật sự.

## 10. Kế hoạch test

### 10.1 Unit

- parse số nguyên có dấu bằng `BigInt`;
- từ chối decimal, exponent và input không hợp lệ;
- chuẩn hóa khóa âm và khóa lớn hơn 26;
- kiểm tra toàn bộ 12 giá trị `a` hợp lệ;
- tính đúng modular inverse;
- validation text/file;
- thống kê và mapping encrypt/decrypt;
- vector `HELLO + (5,8) → RCLLA` chỉ dùng như oracle test/visualization, không làm runtime result.

### 10.2 Component/App

- Affine xuất hiện trong tablist và điều hướng được bằng chuột/bàn phím;
- hai khóa có accessible name và lỗi liên kết đúng;
- action bị khóa với input trống, khóa thiếu hoặc `a` không hợp lệ;
- `Tạo ví dụ` điền đúng dữ liệu;
- mock API result được render, copy và download đúng;
- sửa draft xóa stale result;
- chuyển cipher giữ draft Affine;
- reset toàn app xóa draft Affine;
- loading lock và error recovery;
- theme không bị ảnh hưởng.

### 10.3 E2E

- browser E2E với Backend thật không có horizontal overflow ở desktop và mobile;
- encrypt/decrypt text theo vector đã accepted;
- preview file và download tạo đúng hai request;
- multipart chứa đúng raw key và field đã chốt;
- filename download lấy từ `Content-Disposition`;
- scenario Affine chỉ được thêm vào E2E khi Backend Affine thật đã accepted và có trong test server;
  không thêm runtime fallback để giữ bộ test xanh trước thời điểm đó.

## 11. Accessibility và responsive acceptance

- Tab Affine tuân theo keyboard navigation hiện có: Arrow Left/Right, Home và End.
- Mode dùng radio semantics; input/output tabs và file picker giữ semantics hiện tại.
- Mỗi input khóa có label hiển thị, error association và focus indicator.
- Trạng thái hợp lệ không chỉ truyền đạt bằng màu; luôn có text tương ứng.
- Notification tiếp tục dùng live region hiện có.
- Tất cả action có accessible name nhất quán với nội dung hiển thị.
- Tại chiều rộng 320 px không có horizontal scroll toàn trang; bảng mapping được phép scroll trong
  container riêng.

## 12. Thứ tự triển khai

1. Chấp nhận spec FE và chốt các câu hỏi contract Backend ở mục 8.
2. Xây validation, normalization, analysis và unit test không phụ thuộc API.
3. Xây component, workspace, state hook và mock fetch tests.
4. Đăng ký Affine vào selector và App; hoàn thiện responsive/accessibility.
5. Nối service vào contract Backend đã accepted.
6. Chạy integration E2E với Backend thật và cập nhật tài liệu ghim phiên bản.

Các bước 2–4 có thể thực hiện trước Backend nếu mock chỉ tồn tại ở test boundary và UI không được
đánh dấu production-ready khi endpoint thật chưa có.

## 13. Definition of Done

- Affine là thuật toán thứ tư, không làm regression Caesar, Vigenère hoặc Playfair.
- Encrypt/decrypt text và file dùng result Backend thật; không có local fallback production.
- Validation `a`, `b`, normalization, inverse và stale-state behavior đúng spec.
- Result analysis dùng request snapshot và chỉ đóng vai trò visualization.
- Selector, key pair, formula, output và notification hoạt động ở light/dark, desktop/mobile và bằng
  bàn phím.
- Preview/download file tuân theo contract accepted và tạo đúng request.
- Không có Backend URL hard-code, CORS assumption hoặc runtime mock.
- Format, lint, TypeScript, unit/component test và production build đều đạt.
- Playwright E2E đạt trên desktop/mobile với Backend Affine thật được khởi động từ sibling repo.
- `README.md`, `BACKEND_CONTRACT.md` và tài liệu liên quan được cập nhật bằng version Backend đã
  accepted.
