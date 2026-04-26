# 🚦 RoadWatch – Smart City Incident Management System

RoadWatch is a full-stack web application built to simplify how cities track and manage road issues like potholes, damage, and public hazards. It brings everything into one place so administrators can quickly understand what’s happening, what needs attention, and what’s already resolved.

---

## 📌 What this project does

Instead of scattered reports and slow responses, RoadWatch provides a clear system where incidents are visible, prioritized, and manageable in real time.

It helps answer questions like:
- What issues are critical right now?
- Where are they located?
- What has already been assigned or resolved?

---

## 🎯 Core Features

- 🗺️ **Live Map View**  
  See all reported incidents visually, making it easy to understand problem areas instantly  

- ⚡ **Command Center**  
  A real-time dashboard showing active issues, priorities, and quick actions  

- 📊 **Reports Management**  
  Search, filter, and track incidents based on severity, status, and time  

- 🚨 **Priority System**  
  Clearly distinguish between critical, high, and resolved cases  

- 🔄 **End-to-End Flow**  
  From reporting → assigning → resolving, everything is structured and trackable  

---

## ⚙️ Tech Stack

- **Frontend:** React.js + Tailwind CSS  
- **Backend:** Node.js + Express.js  
- **Database & Auth:** Supabase  

---

## 🚀 Running the Project

```bash
npm install
npm run dev:ai
npm run server
npm run dev
```

The local AI upload service is expected at `http://127.0.0.1:5000`.
If uploads say the AI service is unreachable, run:

```bash
python -m pip install -r ai_service/requirements.txt
npm run dev:ai
