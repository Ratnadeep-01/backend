# myTube Backend REST API

![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js)
![Express.js](https://img.shields.io/badge/Express-v5.2-lightgrey?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20Storage-blue?style=for-the-badge&logo=cloudinary)

The backend service for **myTube**, a production-ready Express 5 REST API powering a full-stack video-sharing platform. It manages user authentication, Cloudinary media storage, video streaming, comments, likes, subscriptions, playlists, community tweets, and creator analytics.

---

## 🚀 Key Technical Highlights

- **Express 5 & ES Modules:** Fast, modular HTTP server routing.
- **MongoDB & Mongoose:** Schema definitions, aggregations, dynamic pipelines (`mongoose-aggregate-paginate-v2`).
- **Cloud Media Uploads:** Multipart uploads using `multer` (local temp buffer) streamed directly to `cloudinary` cloud storage.
- **JWT Auth & HttpOnly Cookies:** Dual token system (`AccessToken` & `RefreshToken`) with secure cookie storage.
- **Request Validation & Error Architecture:** Centralized error handling via `ApiError`, standardized JSON outputs via `ApiResponse`, and input validation using `zod`.

---

## ⚡ Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **MongoDB** instance (Local or MongoDB Atlas cluster)
- **Cloudinary** credentials

---

## ⚙️ Environment Variables Setup

Create a `.env` file in `myTube-backend/`:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017
DB_NAME=videotube

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CORS_ORIGIN=http://localhost:3000
```

---

## 📦 Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Server boots on `http://localhost:8000`.

---

## 📂 Project Architecture

```
myTube-backend/
├── package.json
├── Readme.md
├── public/
│   └── temp/                  # Temporary file upload cache for Multer
└── src/
    ├── index.js               # Server bootstrap & database initialization
    ├── app.js                 # Express application middleware & route registrations
    ├── db/
    │   └── index.js           # Database connection logic using Mongoose
    ├── controllers/           # Endpoint business handlers
    │   ├── comment.controller.js
    │   ├── dashboard.controller.js
    │   ├── like.controller.js
    │   ├── playlist.controller.js
    │   ├── subscription.controller.js
    │   ├── tweet.controller.js
    │   ├── user.controllers.js
    │   └── video.controller.js
    ├── models/                # Database models (Mongoose schemas)
    │   ├── comment.model.js
    │   ├── like.model.js
    │   ├── playlist.model.js
    │   ├── subscription.model.js
    │   ├── tweet.model.js
    │   ├── user.model.js
    │   └── video.model.js
    ├── routes/                # Express router declarations
    │   ├── comment.routes.js
    │   ├── dashboard.routes.js
    │   ├── like.routes.js
    │   ├── playlist.routes.js
    │   ├── subscription.routes.js
    │   ├── tweet.routes.js
    │   ├── user.routes.js
    │   └── video.routes.js
    ├── middlewares/           # Custom Express middlewares
    │   ├── auth.middleware.js # JWT verification middleware
    │   ├── multer.middleware.js # File storage handler
    │   └── validate.middleware.js # Zod payload validator
    └── utils/                 # Utility helpers
        ├── ApiError.js        # Standardized error class
        ├── ApiResponse.js      # Standardized response wrapper
        ├── asyncHandler.js    # Async route wrapper
        └── cloudinary.js      # Cloudinary file upload & deletion helper
```

---

## 🔌 API Routes Summary

- **Users:** `POST /api/v1/users/register`, `POST /api/v1/users/login`, `POST /api/v1/users/logout`, `GET /api/v1/users/current-user`, `PATCH /api/v1/users/avatar`, `PATCH /api/v1/users/cover-image`, `GET /api/v1/users/c/:username`, `GET /api/v1/users/history`
- **Videos:** `GET /api/v1/videos`, `POST /api/v1/videos`, `GET /api/v1/videos/:videoId`, `PATCH /api/v1/videos/:videoId`, `DELETE /api/v1/videos/:videoId`, `PATCH /api/v1/videos/toggle/publish/:videoId`
- **Comments:** `GET /api/v1/comments/:videoId`, `POST /api/v1/comments/:videoId`, `PATCH /api/v1/comments/c/:commentId`, `DELETE /api/v1/comments/c/:commentId`
- **Likes:** `POST /api/v1/likes/toggle/v/:videoId`, `POST /api/v1/likes/toggle/c/:commentId`, `GET /api/v1/likes/videos`
- **Subscriptions:** `POST /api/v1/subscriptions/c/:channelId`, `GET /api/v1/subscriptions/u/:subscriberId`
- **Playlists:** `POST /api/v1/playlist`, `GET /api/v1/playlist/user/:userId`, `POST /api/v1/playlist/add/:videoId/:playlistId`, `DELETE /api/v1/playlist/remove/:videoId/:playlistId`
- **Tweets:** `POST /api/v1/tweets`, `GET /api/v1/tweets/user/:userId`
- **Dashboard:** `GET /api/v1/dashboard/stats`, `GET /api/v1/dashboard/videos`

---

## 👤 Author

- **Ratnadeep Kumar**