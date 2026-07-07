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

## 4. AI Service Deployment (Flask + ONNX Runtime)
**Recommended Hosting**: [Render](https://render.com/) (Web Service with Python) or [Railway](https://railway.app/).

1. Navigate to the `ai_service/` directory.
2. Ensure the `model/road_damage_filter_model.onnx` file is included in your repository.
3. Deploy as a Python service.
4. Set the following environment variables if deploying on Render's Free tier:
   - `DISABLE_CLIP=true`
     > [!IMPORTANT]
     > Render's free tier has a 512 MB RAM limit. Loading the 600 MB CLIP model (Stage 2) alongside PyTorch will exceed this limit and cause the Gunicorn worker to crash (`Worker was sent SIGKILL! Perhaps out of memory?`). Setting `DISABLE_CLIP=true` forces the service to bypass CLIP and run only the lightweight, 30 MB ONNX road damage detector.
5. If running on a higher-resource tier (>= 1 GB RAM) with `DISABLE_CLIP=false`, optimize deployment build by running:
   - Build Command: `pip install -r requirements.txt && python -c "from transformers import pipeline; pipeline('zero-shot-image-classification', model='openai/clip-vit-base-patch32')"`
     > [!TIP]
     > Pre-downloading the model weights during the build phase prevents Gunicorn request timeouts (`WORKER TIMEOUT`) on the first request.
6. Start Command: `gunicorn --bind 0.0.0.0:$PORT --timeout 120 app:app`.

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
