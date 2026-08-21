# Space Mail – Đã sửa lỗi + Hướng dẫn nhận thư thật

## Vì sao trước đây không nhận được thư?

Đây **không phải lỗi code**, mà do thiếu mắt xích quan trọng nhất: **domain + dịch vụ nhận mail**.

Email hoạt động thế này: ai đó gửi thư tới `abc@domain.com` → DNS tra MX record của `domain.com` →
thư được chuyển tới server mail được chỉ định. App của bạn (chạy trên Vercel) **không phải** là một
mail server, nó chỉ là web/API bình thường. Vercel không cung cấp tính năng nhận email.

Code cũ hardcode domain là `@vercel.app` — nhưng bạn không sở hữu DNS của `vercel.app` nên không thể
trỏ MX record về đâu cả → không có cách nào thư thật đến được hệ thống của bạn.

`api/webhook.js` chỉ là nơi **lưu** thư vào Firebase khi có ai gọi POST tới nó — nó cần một dịch vụ
nhận mail thật sự đứng trước để gọi vào đây mỗi khi có thư đến.

## Những lỗi code đã sửa

1. **`nodemailer` thiếu trong `package.json`** → `api/send.js` sẽ crash lỗi 500 khi deploy (module not found). Đã thêm vào dependencies.
2. **`api/send.js` hardcode tài khoản Gmail giả** (`your-email@gmail.com`) → giờ đọc từ biến môi trường `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`.
3. **`api/webhook.js` không có xác thực** → bất kỳ ai cũng có thể POST giả thư vào hộp thư người khác. Đã thêm kiểm tra header `x-webhook-secret` khớp với biến môi trường `WEBHOOK_SECRET` (tùy chọn, chỉ bật khi bạn set biến này).
4. **`firebase.js` hardcode API key trong code** → giờ ưu tiên đọc từ biến môi trường, fallback về giá trị cũ nếu chưa set (không phá vỡ khi test local).
5. **`public/index.html`** hardcode domain deploy cũ (`server-mail-nnmq.vercel.app`) và domain email `@vercel.app` → giờ dùng `window.location.origin` (tự nhận domain hiện tại) và biến `MAIL_DOMAIN` để bạn đổi 1 chỗ duy nhất khi có domain thật.

## Cách để nhận được thư THẬT (bắt buộc phải làm)

### Bước 1: Mua một domain riêng
Domain rẻ (~100–300k/năm): Namecheap, Porkbun, Name.com, PA Vietnam... Chọn domain nào cũng được,
ví dụ `mailcuaban.com`.

### Bước 2: Dùng Cloudflare Email Routing (miễn phí) để nhận thư
1. Thêm domain vào Cloudflare (đổi nameserver trỏ về Cloudflare).
2. Vào **Email → Email Routing**, bật tính năng này.
3. Tạo 1 **Cloudflare Email Worker** — nhận email, đọc nội dung (from/to/subject/body), rồi gọi:
   ```
   POST https://<domain-vercel-cua-ban>/api/webhook
   Headers: x-webhook-secret: <WEBHOOK_SECRET của bạn>
   Body: { "to": "...", "from": "...", "subject": "...", "body": "..." }
   ```
   (Cloudflare có sẵn template Worker để parse email, chỉ cần thêm đoạn `fetch()` gọi webhook.)

*Lựa chọn thay thế đơn giản hơn nếu ngại code Worker*: dùng **Mailgun Inbound Routes** hoặc
**ImprovMX + Zapier/Make** — các dịch vụ này có thể forward email dạng POST JSON trực tiếp tới
webhook mà không cần viết Worker.

### Bước 3: Cấu hình biến môi trường trên Vercel
Vào **Project Settings → Environment Variables**, thêm:
- `WEBHOOK_SECRET` – chuỗi bí mật tự đặt, dùng để xác thực webhook.
- `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT` – nếu muốn dùng chức năng gửi thư.
- (Tùy chọn) các biến `FIREBASE_*` nếu muốn tách khỏi hardcode.

### Bước 4: Đổi `MAIL_DOMAIN` trong `public/index.html`
Đổi dòng:
```js
const MAIL_DOMAIN = 'vercel.app';
```
thành domain thật của bạn, ví dụ `'mail.mailcuaban.com'`.

### Bước 5: Deploy lại và test
Gửi thử 1 email tới `test@domain-cua-ban.com`, kiểm tra Firebase xem message đã được lưu vào
`messages/<accountId>` chưa, và log trên Vercel (`vercel logs`) xem webhook có được gọi không.

## Lưu ý bảo mật
- File `.env` hiện tại **không nên commit lên Git public** vì chứa Firebase key thật — dù key đã
  được set làm mặc định trong code để không phá vỡ hệ thống, bạn nên chuyển hẳn sang Environment
  Variables trên Vercel và xoá giá trị cứng khỏi `firebase.js` khi đã ổn định.
- Chức năng gửi thư qua Gmail SMTP cần **App Password** (16 ký tự), không dùng mật khẩu Gmail
  thường (Google đã chặn "less secure app" từ lâu).
