# RoadWatch Deployment Guide

This guide provides step-by-step instructions for deploying the **RoadWatch** platform, including the Frontend, Backend, and AI Service.

---

## 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **Supabase Account** (for Database & Auth)
- **Vercel/Netlify** (for Frontend)
- **Render/Railway** (for Backend & AI Service)

---

## 2. Supabase Configuration (Database)
1. Create a new project on [Supabase](https://supabase.com/).
2. Run the SQL scripts provided in `backend/sql/` in the Supabase SQL Editor to set up your tables and policies.
3. Obtain your `SUPABASE_URL` and `SUPABASE_ANON_KEY` from project settings.

---

## 3. Backend Deployment (Node.js)
**Recommended Hosting**: [Render](https://render.com/) or [Railway](https://railway.app/).

1. Navigate to the `backend/` directory.
2. Set the following Environment Variables in your hosting provider:
   - `PORT=4000`
   - `SUPABASE_URL=your_supabase_url`
   - `SUPABASE_KEY=your_supabase_service_role_key` (for admin bypass)
   - `JWT_SECRET=your_secure_random_string`
   - `CLIENT_URL=your_frontend_url` (to allow CORS)
3. Deploy command: `npm install && npm start`.

---

## 4. AI Service Deployment (Flask + Keras)
**Recommended Hosting**: [Render](https://render.com/) (Web Service with Python) or [Railway](https://railway.app/).

1. Navigate to the `ai_service/` directory.
2. Ensure the `model/road_damage_filter_model.keras` file is included in your repository.
3. Deploy as a Python service.
4. Build Command: `pip install -r requirements.txt`.
5. Start Command: `gunicorn --bind 0.0.0.0:$PORT app:app`.
   > [!NOTE]
   > Use `gunicorn` for production instead of the built-in Flask server.

---

## 5. Frontend Deployment (React + Vite)
**Recommended Hosting**: [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/).

1. Link your repository to the hosting provider.
2. Set the following Environment Variables:
   - `VITE_API_BASE_URL=https://your-backend-url.com`
   - `VITE_AI_SERVICE_URL=https://your-ai-service-url.com`
   - `VITE_SUPABASE_URL=your_supabase_url`
   - `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`
3. Build Command: `npm run build`.
4. Output Directory: `dist`.

---

## 6. Local Testing for Deployment
To test a "production-like" environment locally:
1. Build the frontend: `npm run build`.
2. Serve the build: `npx serve -s dist`.
3. Ensure your Backend and AI Service are running and accessible from the production-like frontend.

---

## 7. Troubleshooting
- **CORS Errors**: Ensure the `CLIENT_URL` in the backend matches your deployed frontend URL exactly.
- **Model Load Failures**: Ensure the Keras/TensorFlow versions in `requirements.txt` match your training environment.
- **SSL/HTTPS**: If the frontend is on HTTPS, the Backend and AI Service MUST also be on HTTPS.
