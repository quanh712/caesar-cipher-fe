# Cipher Workbench — Production Deployment

Tài liệu này triển khai React và FastAPI cùng origin trên một VPS. Docker Compose
chỉ bind ứng dụng vào loopback; Nginx cài trên VPS là cổng Internet duy nhất và
quản lý HTTPS.

## 1. Topology

```text
Internet :80/:443
        │
        ▼
Nginx host + Let's Encrypt
        │ 127.0.0.1:8080
        ▼
Nginx FE container :8080
        ├── /, /assets/*          → React dist
        └── /api, /docs, OpenAPI  → FastAPI container :8000
```

FastAPI không publish cổng `8000`. Stack không cần database, Redis, session,
API key hoặc CORS.

## 2. Chuẩn bị VPS

Yêu cầu Docker Engine, Docker Compose plugin, Nginx, Certbot, `envsubst` (gói
`gettext-base`) và Git. Chỉ mở SSH, HTTP và HTTPS trên firewall; không mở `8000`
hoặc `8080` ra Internet.

Ví dụ với UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Tạo thư mục triển khai và clone hai repo cạnh nhau:

```text
/opt/cipher-workbench/
├── caesar-cipher-fe/
└── caesar-cipher-be/
```

Backend revision có Affine:

```text
c55278f207e84811cf26e3a748df612cd6a9915e
```

Checkout SHA đã duyệt ở từng repo. Không deploy trực tiếp một nhánh đang di chuyển
như `main`. Trước khi build, cả hai lệnh sau phải không in ra nội dung:

```bash
git status --short
git diff --check
```

## 3. Cấu hình và chạy Compose

Trong repo FE:

```bash
cp .env.deploy.example .env.deploy
```

Điền domain thật, SHA FE/BE và đường dẫn `BACKEND_CONTEXT`. Domain phải thuộc
quyền quản lý DNS của người triển khai. Không dùng giá trị mẫu
`cipher.example.com` ngoài tài liệu.

Kiểm tra và khởi động:

```bash
./deploy/verify-revisions.sh .env.deploy
docker compose --env-file .env.deploy config
docker compose --env-file .env.deploy build --pull
docker compose --env-file .env.deploy up -d
docker compose --env-file .env.deploy ps
```

`frontend` chỉ bind `${APP_BIND_ADDRESS}:${APP_HTTP_PORT}`, mặc định là
`127.0.0.1:8080`. Backend chỉ tồn tại trong Docker network. Hai container dùng
`restart: unless-stopped`, log rotation `10 MiB × 3` và health check riêng.

## 4. Kiểm tra local production stack

```bash
./deploy/smoke-test.sh http://127.0.0.1:8080
```

Script kiểm tra UI, OpenAPI, Caesar/Affine text transform, file preview, file download và
filename attachment. Sau đó kiểm thử thủ công trên trình duyệt nếu cần.

Có thể chạy toàn bộ browser integration test trực tiếp vào production stack:

```bash
npm run test:e2e:production
```

## 5. DNS và HTTPS

Tạo bản ghi DNS `A`/`AAAA` của `${APP_DOMAIN}` trỏ tới VPS. Trên VPS, export hai
biến đã điền trong `.env.deploy`:

```bash
set -a
. ./.env.deploy
set +a
```

Tạo ACME webroot và render cấu hình bootstrap:

```bash
sudo mkdir -p /var/www/certbot
envsubst '${APP_DOMAIN} ${APP_HTTP_PORT}' \
  < deploy/nginx/bootstrap.conf.template \
  | sudo tee /etc/nginx/sites-available/cipher-workbench.conf > /dev/null
sudo ln -sfn /etc/nginx/sites-available/cipher-workbench.conf \
  /etc/nginx/sites-enabled/cipher-workbench.conf
sudo unlink /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Xin chứng chỉ:

```bash
sudo certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --domain "$APP_DOMAIN"
```

Sau khi có chứng chỉ, render cấu hình HTTPS production đè lên file bootstrap:

```bash
envsubst '${APP_DOMAIN} ${APP_HTTP_PORT}' \
  < deploy/nginx/production.conf.template \
  | sudo tee /etc/nginx/sites-available/cipher-workbench.conf > /dev/null
sudo nginx -t
sudo systemctl reload nginx
```

Copy `deploy/certbot/reload-nginx.sh` vào
`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`, cấp quyền execute và kiểm
tra renewal:

```bash
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run
```

Chỉ cấu hình HTTPS mới bật HSTS. Không bật HSTS trong bước bootstrap.

## 6. Giới hạn và bảo vệ

- Nginx nhận request tối đa `65m`, để Backend giữ quyền trả lỗi nghiệp vụ 5 MiB
  và trần request 64 MiB.
- Text API giới hạn `10 request/giây/IP`, burst `20`.
- File API giới hạn `2 request/giây/IP`, burst `4`.
- Swagger/OpenAPI giới hạn `5 request/giây/IP`, burst `10`.
- Vượt giới hạn trả JSON HTTP `429` bằng tiếng Việt.
- Chỉ Nginx host được tin là reverse proxy. Nếu thêm Cloudflare, phải cấu hình
  riêng danh sách IP được tin cậy trước khi dùng địa chỉ forwarded để rate-limit.

## 7. Logs và chẩn đoán

```bash
docker compose --env-file .env.deploy ps
docker compose --env-file .env.deploy logs --tail=200 frontend
docker compose --env-file .env.deploy logs --tail=200 backend
sudo journalctl -u nginx --since '30 minutes ago'
```

Backend chưa có `/health` trong contract Week 1, nên health check hiện gọi
`/openapi.json`. Chỉ chuyển sang `/health` sau khi đội BE chấp nhận contract mới
và cung cấp baseline commit mới.

## 8. Update và rollback

Week 1 chấp nhận gián đoạn ngắn khi thay container. Quy trình update:

1. Xác nhận working tree hai repo sạch.
2. Fetch và checkout đúng SHA đã duyệt cho FE và BE.
3. Cập nhật `FRONTEND_REVISION`, `BACKEND_REVISION` và image tag trong
   `.env.deploy`.
4. Chạy lại `build --pull`, `up -d` và toàn bộ smoke test.
5. Ghi lại hai SHA đang chạy trong nhật ký release.

Rollback bằng cách checkout lại cặp SHA release trước, phục hồi các giá trị trong
`.env.deploy`, rebuild và chạy `up -d`. Không có dữ liệu ứng dụng cần backup vì
dịch vụ stateless; chỉ cần bảo vệ cấu hình VPS và chứng chỉ TLS.

## 9. Ngoài phạm vi

- Zero-downtime nhiều replica và load balancer.
- CI/CD hoặc publish image lên registry.
- Database, tài khoản, session và secret ứng dụng.
- Tự động triển khai theo `main`.
- Thêm thuật toán khi chưa có contract Backend được chấp nhận.
