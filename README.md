# 🛠️ Social App - Backend API

API backend para una red social full stack desarrollada con Node.js y Express. Provee autenticación con JWT, gestión de usuarios, feed social, follows, comentarios, reacciones, carga de imágenes, notificaciones y conversaciones con mensajes en tiempo real mediante Socket.io.

---

## 📌 Descripción del proyecto

Este repositorio concentra la lógica de negocio y la capa HTTP/Realtime de Social App. La API está orientada a ser consumida por un frontend SPA y trabaja con MySQL como base de datos principal, JWT para autenticación y middlewares de seguridad, logging y rate limiting.

También incorpora soporte para despliegue en Railway y conexión con frontend desplegado en Vercel o ejecutado localmente.

---

## 🚀 Tecnologías utilizadas

- Node.js
- Express 5
- MySQL (`mysql2`)
- JWT (`jsonwebtoken`)
- bcrypt / bcryptjs
- CORS
- dotenv
- Socket.io
- Multer
- Cloudinary
- Redis
- express-rate-limit
- Winston
- Jest
- Supertest

---

## ✅ Funcionalidades implementadas

- Registro e inicio de sesión
- Perfil de usuario autenticado
- Actualización de perfil
- Búsqueda de usuarios
- Feed social
- Creación, lectura y eliminación de publicaciones
- Comentarios por publicación
- Reacciones en publicaciones y comentarios
- Follow / unfollow
- Estado de seguimiento
- Notificaciones
- Upload de imagen de perfil
- Conversaciones entre usuarios
- Lectura y envío de mensajes
- Canal realtime de mensajes con Socket.io

---

## 📚 Módulos principales de API

- `auth`: registro, login, perfil y búsqueda
- `posts`: publicaciones y feed
- `comments`: comentarios por publicación
- `reactions`: reacciones en posts y comentarios
- `follows`: seguimiento entre usuarios
- `image`: carga de avatar
- `notifications`: bandeja y marcado de vistas
- `conversations`: conversaciones, mensajes y acceso realtime
- `monitoring`: métricas básicas

---

## 🧱 Arquitectura del proyecto

La API sigue una estructura modular por capas:

```bash
src/
├── app.js
├── server.js
├── config/
├── controllers/
├── middleware/
├── router/
├── service/
├── sockets/
├── utils/
└── monitoring/
```

---

## 🧩 Arquitectura aplicada

- Rutas desacopladas por módulo
- Controladores para orquestación HTTP
- Servicios para acceso a datos y queries SQL
- Middlewares para auth, rate limit, request id y manejo de errores
- Configuración separada para DB, CORS, Redis, logger y Cloudinary
- Socket.io organizado por namespaces/eventos

---

## 🗃️ Base de datos

La API utiliza **MySQL** como base principal. El acceso se realiza con `mysql2/promise` y una configuración centralizada en `src/config/db.js`.

También existe soporte para base de datos de test vía `NODE_ENV=test`.

---

## 🧾 Tablas principales

Tablas relevantes del sistema social:

- `users`
- `posts`
- `comments`
- `reactions`
- `follows`
- `notifications`
- `refresh_tokens`

Tablas de mensajería implementadas:

- `conversations`
- `conversation_users`
- `messages`
- `password_reset_tokens` (manual, para recuperacion de contrasena)

Relación resumida:

- `conversations` representa una conversación
- `conversation_users` vincula usuarios participantes con cada conversación
- `messages` almacena los mensajes asociados a una conversación mediante `conversation_id` y al emisor mediante `sender_id`

---

## Recuperacion de contrasena

Endpoints agregados:

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Variables de entorno requeridas:

- `MAIL_PROVIDER`
- `MAILTRAP_API_TOKEN`
- `MAILTRAP_API_URL`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_USER`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_FROM_NAME`
- `PASSWORD_RESET_TOKEN_EXPIRES_MINUTES`
- `FRONTEND_URL`

SQL manual requerido:

Aplicar el script versionado en `password-reset-tokens.sql` antes de probar el flujo completo.

Provider recomendado en produccion:

- `MAIL_PROVIDER=mailtrap_api`
- `MAILTRAP_API_URL=https://send.api.mailtrap.io/api/send`

Provider opcional para local/dev:

- `MAIL_PROVIDER=smtp`

---

## 🔌 Endpoints principales

Auth / usuarios:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/users/:id`
- `PATCH /api/auth/update/:id`
- `GET /api/auth/usersSearch`

Posts:

- `POST /api/posts/CreatePost/:id`
- `GET /api/posts/allpost`
- `GET /api/posts/postByUserId/:id`
- `GET /api/posts/postById/:id`
- `DELETE /api/posts/removePost/:id`

Comentarios:

- `POST /api/comments/addComment/:id/:postId`
- `GET /api/comments/readComment/:postId`

Reacciones:

- `POST /api/reactions/toggleReaction/:userId/:postId`
- `GET /api/reactions/reactionsPost/:postId`
- `POST /api/reactions/toggleReactionComment/:userId/:commentId`
- `GET /api/reactions/reactionComment/:commentId`

Follows:

- `GET /api/follows/feed`
- `GET /api/follows/users/:id/status`
- `POST /api/follows/users/:id/follow`
- `POST /api/follows/users/:id/unfollow`

Conversaciones y mensajes:

- `POST /api/conversations/addConversations`
- `GET /api/conversations/myConversations`
- `GET /api/conversations/readMessage/:id/message`
- `POST /api/conversations/sendMessage`

Notificaciones:

- `GET /api/notifications/notifications/user`
- `PATCH /api/notifications/:notificationId/seen`
- `PATCH /api/notifications/seenall`

---

## ⚡ Socket.io / tiempo real

El backend expone un namespace:

```bash
/messages
```

Eventos principales:

- `messages:join`
- `messages:joined`
- `messages:send`
- `messages:new`
- `messages:sent`
- `messages:error`

La conexión usa JWT y valida membresía del usuario en la conversación antes de permitir join o envío.

---

## 🔐 Seguridad y middlewares

- JWT para autenticación
- Helmet
- CORS centralizado
- Rate limiting global, auth y lectura
- Request ID middleware
- Error handler centralizado
- Redis para rate limit/store cuando está disponible
- Winston para logging

---

## ⚙️ Instalación

```bash
npm install
```

---

## ▶️ Ejecutar proyecto

Desarrollo:

```bash
npm run dev
```

Producción:

```bash
npm start
```

Tests:

```bash
npm test
```

---

## 🔐 Variables de entorno

Variables detectadas en el código:

```bash
PORT=
NODE_ENV=
JWT_SECRET=

DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DATABASE_URL=

MYSQLHOST=
MYSQLPORT=
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=
MYSQL_DATABASE=

FRONTEND_URL=
CLIENT_URL=
CORS_ORIGIN=

MAIL_PROVIDER=
MAILTRAP_API_TOKEN=
MAILTRAP_API_URL=
MAIL_API_TIMEOUT_MS=
MAIL_HOST=
MAIL_PORT=
MAIL_SECURE=
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=
MAIL_FROM_NAME=
PASSWORD_RESET_TOKEN_EXPIRES_MINUTES=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

REDIS_URL=

RATE_LIMIT_GLOBAL_WINDOW_MS=
RATE_LIMIT_GLOBAL_MAX=
RATE_LIMIT_AUTH_WINDOW_MS=
RATE_LIMIT_AUTH_MAX=
RATE_LIMIT_READ_WINDOW_MS=
RATE_LIMIT_READ_MAX=
RATE_LIMIT_DEV_BYPASS=
```

---

## 📜 Scripts disponibles

```bash
npm run dev
npm start
npm test
npm run test:watch
npm run test:coverage
```

---

## ☁️ Deploy

- Preparado para despliegue en **Railway**
- Configurado para convivir con frontend local y frontend desplegado
- CORS y Socket.io contemplan origins controlados

---

## 🔗 Frontend relacionado

Este backend sirve la API consumida por el frontend Social App construido con React + Vite, incluyendo integración REST y realtime para mensajes.

---

## 👨‍💻 Autor

**Bryan Marquez**  
Full Stack Developer
