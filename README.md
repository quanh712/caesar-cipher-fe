# Cipher Workbench Frontend

React/Vite frontend cho Caesar, Vigenère và Playfair. Cả ba thuật toán gọi Backend thật theo contract được ghim tại
[`docs/BACKEND_CONTRACT.md`](docs/BACKEND_CONTRACT.md); yêu cầu riêng của giao diện nằm tại
[`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md).

## Chạy với Backend thật

Khởi động Backend tại `http://localhost:8000`, sau đó:

```bash
npm install
npm run dev
```

Mở `http://localhost:5173`. Vite chuyển tiếp `/api` sang Backend ở cổng `8000`; không cần CORS và
runtime code không ghi cứng Backend URL.

Với Playfair, tab **Phân tích** có thể gợi ý bỏ các ký tự `X/Q` sau khi giải mã. Đây chỉ là
phỏng đoán vì `X/Q` cũng có thể là ký tự gốc; kết quả chính thức từ Backend, thao tác sao chép và
tải xuống đều giữ nguyên bản rõ chuẩn hóa có filler.

Swagger và schema Backend:

- <http://localhost:8000/docs>
- <http://localhost:8000/openapi.json>

## Docker production

Production chạy FE/Nginx và FastAPI trong hai container, cùng origin qua Nginx:

```bash
cp .env.deploy.example .env.deploy
docker compose --env-file .env.deploy up -d --build
```

Mặc định ứng dụng chỉ bind tại `http://127.0.0.1:8080`; Backend không công khai
cổng `8000`. Hướng dẫn VPS, HTTPS, rate limit, kiểm tra và rollback nằm tại
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Kiểm tra

```bash
npm run check
npm run test:e2e
```

Integration test tự build và khởi động Backend sibling bằng Docker tại cổng riêng `18000`:

```bash
npm run test:e2e:integration
```

Khi production Compose stack đang chạy tại `127.0.0.1:8080`:

```bash
npm run test:e2e:production
```

`test:e2e` và `test:e2e:integration` đều gọi Backend thật qua Vite proxy. Cổng `18000` tránh dùng
nhầm service dev đang chạy ở `8000`. Có thể đổi đường dẫn sibling bằng `BACKEND_CONTEXT` và cổng
bằng `BACKEND_INTEGRATION_PORT`; script sẽ dọn container integration khi Playwright kết thúc.
