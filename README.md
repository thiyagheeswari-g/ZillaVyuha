---
title: ZillaVyuha
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# 🏥 ZillaVyuha

> **Next-Generation Real-Time Health Administration & Intelligence System**

![Live Demo](https://img.shields.io/badge/Live_Demo-Online-success?style=for-the-badge&logo=huggingface)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)

## 🌐 Live Application

Experience the live deployment of ZillaVyuha directly here:  
**🔗 [ZillaVyuha Live Demo](https://thiyagheeswari-zillavyuha.hf.space)**

*(Note: The application is hosted on Hugging Face Spaces free tier. If the space is asleep, it may take 1-2 minutes to spin up upon your first visit).*

---

## 📖 Overview

**ZillaVyuha** is an AI-powered, multi-agent health telemetry and operations dashboard designed to empower district and state health officials. By ingesting massive amounts of daily operational data from Primary Health Centres (PHCs) and Community Health Centres (CHCs), ZillaVyuha synthesizes clinical, operational, and resource metrics into actionable insights in real-time.

Built with a lightning-fast **React (Vite)** frontend and a robust **FastAPI** backend, the system utilizes a **Multi-Agent Flow** architecture powered by advanced LLMs to detect anomalies, optimize resources, and generate comprehensive, localized reports.

## ✨ Key Features

- **🤖 Multi-Agent Intelligence:** Dedicated AI agents (Operations Coordinator, Clinical Intelligence, Resource Optimization, Quality & Compliance) autonomously analyze telemetry data step-by-step.
- **🌍 Multilingual Dynamic Reports:** Generate comprehensive PDF reports natively translated into localized languages (English, Hindi, Tamil) for inclusive administrative dissemination.
- **📊 Interactive Real-Time Dashboard:** A responsive, dark-mode-first user interface with vital alerts, facility mapping, and AI-driven recommendations.
- **🔒 Secure Data Validation:** Built-in safeguards automatically sanitize and validate incoming CSV datasets to prevent prompt-injection or malformed telemetry.
- **🚀 Scalable Docker Deployment:** Packaged seamlessly via Docker for rapid deployment on Hugging Face Spaces or any containerized environment.

---

## 🛠️ Architecture

ZillaVyuha follows a modern, decoupled architecture:
- **Frontend:** React, TypeScript, TailwindCSS, Vite, Zustand (State Management), React-i18next (Multilingual), html2pdf.js (Client-side Report Rendering)
- **Backend:** Python 3.12, FastAPI, Uvicorn, Google GenAI SDK
- **Data Flow:** CSV Uploads ➔ Agentic Pipeline (Validation ➔ Operations ➔ Clinical ➔ Resource) ➔ Final Analytics & PDF Generation.

---

## 🚀 Getting Started (Local Development)

To run this project locally, you will need to install dependencies for both the Python backend and the Node.js frontend.

### ⚡ Quick Setup (Windows)

For the fastest setup, run the included PowerShell script in your terminal from the root directory:

```powershell
.\setup_project.ps1
```

This will automatically create your virtual environment, install Python requirements, and download Node.js packages.

### 🔧 Manual Setup

**1. Setup the Python Backend**
```bash
cd zillavyuha
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

**2. Setup the React Frontend**
```bash
cd frontend
npm install
```

### 🏃 Running the Application

You will need two terminal windows running simultaneously.

**Terminal 1 (Backend):**
```bash
cd zillavyuha
uv run python -m zillavyuha.fast_api_app
```
*Backend runs on `http://localhost:8090`*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🤝 Contributing & License

Built with ❤️ for communities to empower accessible, data-driven healthcare administration. 
