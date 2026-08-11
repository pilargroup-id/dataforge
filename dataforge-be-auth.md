# Template Backend Auth - PilarGroup Child App

Template ini adalah baseline backend reusable untuk project child app PilarGroup berikutnya.

## 1. Struktur Root

```txt
template-backend-express/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.js
│   │   │   └── database.config.js
│   │   ├── controllers/
│   │   │   └── auth.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── error.middleware.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   └── index.js
│   │   ├── services/
│   │   │   └── auth.service.js
│   │   ├── utils/
│   │   │   └── response.util.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── frontend/
└── TEMPLATE_BACKEND_AUTH.md
```

`frontend/` sengaja kosong. Template ini fokus ke backend/auth.

---

## 2. Auth Architecture

Template memakai flow central auth PilarGroup tanpa query langsung ke database central.

```txt
Frontend
  ↓ Bearer JWT PilarGroup
Child App Backend
  ↓ verify JWT dengan JWT_SECRET shared
PilarGroup GET /api/auth/me
  ↓ current/fresh user profile
req.user
  ↓
requireApp(APP_SLUG)
```

Prinsip penting:

```txt
- JWT digunakan untuk validasi token.
- /api/auth/me PilarGroup menjadi source of truth current user.
- req.user.apps dipakai untuk app access.
- Jangan percaya apps/department/company/job level dari JWT kalau data fresh tersedia dari /api/auth/me.
- Child app tidak perlu CENTRAL_DB_* hanya untuk auth.
- Transaction domain cukup simpan user_id + snapshot jika diperlukan.
```

---

## 3. Setup Project Baru

Copy folder template lalu ubah nama project.

```bash
cp -r template-backend-express my-new-project
cd my-new-project/backend
cp .env.example .env
npm install
```

Isi minimal `.env`:

```env
APP_NAME=my-new-project
APP_SLUG=my-new-project
APP_PORT=3000
NODE_ENV=development

JWT_SECRET=SHARED_SECRET_FROM_PILARGROUP
PILARGROUP_URL=https://pilargroup.id
CORS_ORIGIN=http://localhost:5173
AUTH_ME_TIMEOUT_MS=10000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=my_new_project
DB_CONNECTION_LIMIT=10
```

`APP_SLUG` harus sama dengan slug app yang dikembalikan PilarGroup di `req.user.apps`.

---

## 4. Endpoint Bawaan

### Health

```http
GET /health
```

Tidak perlu token.

### Current User

```http
GET /api/auth/me
Authorization: Bearer <PILARGROUP_JWT>
```

Backend:

1. verify JWT;
2. request profile terbaru ke `PILARGROUP_URL/api/auth/me`;
3. simpan hasil sebagai `req.user`;
4. return profile tersebut.

### Protected Example

```http
GET /api/protected
Authorization: Bearer <PILARGROUP_JWT>
```

Endpoint ini membutuhkan:

```txt
authenticate
requireApp(APP_SLUG)
```

Hapus endpoint contoh setelah module nyata sudah dibuat.

---

## 5. Standard Route Protection

Semua route domain child app gunakan:

```js
const config = require('../../config');
const { authenticate, requireApp } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp(config.app.slug),
  Controller.index
);
```

Kalau route perlu minimum job level:

```js
const { authenticate, requireApp, requireJobLevel } = require('../../middleware/auth.middleware');

router.get(
  '/',
  authenticate,
  requireApp(config.app.slug),
  requireJobLevel(3),
  Controller.index
);
```

`requireJobLevel()` hanya helper dasar. Business permission spesifik project sebaiknya dibuat middleware/service sendiri berdasarkan schema permission project tersebut.

---

## 6. Auth Error Codes

Template menghasilkan kode umum:

```txt
TOKEN_MISSING
TOKEN_EXPIRED
TOKEN_INVALID
TOKEN_INVALID_PAYLOAD
TOKEN_REVOKED / kode 401 dari PilarGroup
USER_NOT_FOUND
USER_INACTIVE
APP_FORBIDDEN
JOB_LEVEL_FORBIDDEN
AUTH_FORBIDDEN
AUTH_UPSTREAM_ERROR
AUTH_UPSTREAM_TIMEOUT
INTERNAL_SERVER_ERROR
```

FE recommended handling:

```txt
401 → clear token + redirect login
403 → tampilkan forbidden / no access
5xx → tampilkan server/upstream error
```

---

## 7. Response Standard

Gunakan helper `src/utils/response.util.js` saja.

```js
R.ok(res, data, 'Message');
R.created(res, data, 'Message');
R.paginated(res, data, meta, 'Message');
R.badRequest(res, message, errors);
R.unauthorized(res, message, errors);
R.forbidden(res, message, errors);
R.notFound(res, message);
```

Success:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Forbidden",
  "errors": {
    "code": "APP_FORBIDDEN"
  }
}
```

---

## 8. Project Database

`database.config.js` hanya untuk database domain project.

```js
const { db } = require('../../config/database.config');
```

Template sengaja tidak membuat tabel user lokal dan tidak membuat koneksi `centralDb` untuk auth.

Jika `DB_NAME` dikosongkan, backend masih bisa start untuk auth-only development dan akan menampilkan warning bahwa database project disabled.

---

## 9. Menambah Module Baru

Pattern recommended:

```txt
src/controllers/<module>/<submodule>.controller.js
src/services/<module>/<submodule>.service.js
src/models/<module>/<submodule>.model.js
src/routes/<module>/<submodule>.routes.js
src/routes/<module>/index.js
```

Root aggregator:

```js
router.use('/auth', require('./auth.routes'));
router.use('/master', require('./master'));
router.use('/request', require('./request'));
```

Jangan mount route yang file/module-nya belum ada.

---

## 10. Security Rules

```txt
1. Jangan log Bearer token/JWT.
2. Jangan commit .env.
3. JWT_SECRET harus sama dengan central auth PilarGroup dan disimpan via secret/env production.
4. req.user wajib berasal dari /api/auth/me setelah token diverifikasi.
5. requireApp wajib cek req.user.apps, bukan app claim stale dari JWT.
6. Jangan otomatis percaya user_id dari request body untuk authorization.
7. Permission domain harus divalidasi backend, bukan hanya hide menu di FE.
8. Jangan membuat FK database child app ke database central PilarGroup.
9. Untuk historical transaction, simpan ID + snapshot nama/jabatan/department yang memang diperlukan.
10. Tambahkan rate limit / audit log sesuai kebutuhan project; jangan dipaksakan kalau project belum punya requirement/schema.
```

---

## 11. Test Cepat

```bash
npm run check
npm run dev
```

Health:

```bash
curl http://localhost:3000/health
```

Auth me:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/auth/me
```

Protected + app access:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/protected
```

---

## 12. Checklist Reuse

Sebelum mulai domain module project baru:

```txt
[ ] Ganti APP_NAME
[ ] Ganti APP_SLUG
[ ] Set APP_PORT
[ ] Set JWT_SECRET
[ ] Set PILARGROUP_URL
[ ] Set CORS_ORIGIN
[ ] Set database project
[ ] npm install
[ ] npm run check
[ ] test GET /health
[ ] test GET /api/auth/me
[ ] test GET /api/protected
[ ] pastikan user tanpa APP_SLUG mendapat 403 APP_FORBIDDEN
[ ] baru mulai implement domain module
```
