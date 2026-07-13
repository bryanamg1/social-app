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
- `POST /api/auth/google`

Variables de entorno requeridas:

- `MAIL_PROVIDER`
- `MAILTRAP_API_TOKEN`
- `MAILTRAP_API_URL`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_USER`
- `MAIL_FROM`
- `MAIL_FROM_NAME`
- `PASSWORD_RESET_TOKEN_EXPIRES_MINUTES`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`

Variables requeridas solo para SMTP:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_USER`
- `MAIL_PASSWORD`

SQL manual requerido:

Aplicar el script versionado en `password-reset-tokens.sql` antes de probar el flujo completo.

SQL manual requerido para Google Sign-In:

Aplicar el script versionado en `google-auth-users.sql` antes de habilitar `POST /api/auth/google`.

Provider recomendado en produccion:

- `MAIL_PROVIDER=gmail_api`

Variables requeridas para Gmail API:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_USER`
- `MAIL_FROM`
- `MAIL_FROM_NAME`

Diagnostico operativo:

- SMTP con Gmail puede fallar en Railway por conectividad saliente (`ETIMEDOUT` en etapa `CONN`)
- Para este proyecto, `gmail_api` es la opcion recomendada en produccion cuando no hay dominio propio
- `mailtrap_api` sigue disponible como provider HTTP alternativo

Diagnostico seguro en errores de Mailtrap API:

- Log previo de envio con banderas `hasApiToken`, `hasApiUrl`, `hasFrom`, `fromDomain` y `hasRecipient`
- Log de error con `status`, `statusText` y respuesta sanitizada del provider
- Nunca se imprimen `MAILTRAP_API_TOKEN`, `MAIL_PASSWORD`, el token de recuperacion ni la URL completa del reset

Provider opcional para local/dev:

- `MAIL_PROVIDER=smtp`
- `MAIL_PROVIDER=mailtrap_api`

Configuracion recomendada para Gmail SMTP:

- Opcion A: `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=465`, `MAIL_SECURE=true`
- Opcion B: `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_SECURE=false`
- Para Gmail en `587`, el backend habilita `requireTLS=true`
- El transporte SMTP agrega `tls.servername` con el host configurado

Diagnostico seguro para SMTP:

- Log previo de envio con `host`, `port`, `secure`, `requireTLS`, `hasUser`, `hasPassword` y `fromDomain`
- Log de error con `code`, `command`, `responseCode`, `response`, `reason`, `message` y `stage`
- Nunca se imprimen `MAIL_PASSWORD`, App Password, el token de recuperacion ni la URL completa del reset

Script opcional de verificacion local:

```bash
npm run check:mail-provider
```

Variables utiles para el script:

- `TEST_MAIL_TO` para enviar un correo de prueba opcional despues de `verify()`
- No usar este script como parte del flujo de produccion por request

Provider Gmail API HTTP:

- Token endpoint: `https://oauth2.googleapis.com/token`
- Send endpoint: `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
- El backend construye el email como MIME `raw` codificado en base64url
- Se usa `refresh_token` para obtener `access_token` en cada envio
- Nunca se imprimen `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `access_token`, el token de recuperacion ni la URL completa del reset

Configuracion manual de Gmail API:

1. Crear un proyecto OAuth en Google Cloud
2. Habilitar Gmail API
3. Obtener `GMAIL_CLIENT_ID` y `GMAIL_CLIENT_SECRET`
4. Autorizar el scope de envio de Gmail para la cuenta soporte
5. Obtener y guardar `GMAIL_REFRESH_TOKEN`
6. Configurar Railway con `MAIL_PROVIDER=gmail_api` y las variables anteriores

Google Sign-In:

- El frontend usa Google Identity Services para obtener un ID token
- El backend valida ese ID token con `google-auth-library`
- No se guardan access tokens ni refresh tokens de Google
- Solo se usa `GOOGLE_CLIENT_ID` en backend para validar la audiencia del token
- Si el email de Google no esta verificado, el backend rechaza el login
- Si el email coincide con un usuario local existente, se vincula `google_sub`
- Si el usuario no existe, se crea una cuenta nueva con `auth_provider=google`

Variables para Google Sign-In:

- Backend: `GOOGLE_CLIENT_ID`
- Frontend: `VITE_GOOGLE_CLIENT_ID`

Diagnostico operativo:

- SMTP con Gmail puede fallar en Railway por conectividad saliente (`ETIMEDOUT`)
- Google Sign-In no usa SMTP ni Gmail API de correo
- Para login social se recomienda Google Identity Services + validacion server-side del ID token

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
