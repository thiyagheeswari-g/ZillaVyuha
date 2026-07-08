---
title: ZillaVyuha
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# ZillaVyuha

ZillaVyuha is a real-time health administration and intelligence system featuring a React frontend and a FastAPI backend powered by AI agents.

## Getting Started

To run this project locally, you will need to install dependencies for both the Python backend and the Node.js frontend.

### Quick Setup

For the fastest setup, run the included PowerShell script in your terminal from the root directory:

```powershell
.\setup_project.ps1
```

This will automatically create your virtual environment, install Python requirements, and download Node.js packages.

---

### Manual Setup Instructions

If you prefer to set up the project manually, follow these steps:

#### 1. Setup the Python Backend

Navigate to the backend folder, create a virtual environment, activate it, and install the dependencies:

```powershell
cd zillavyuha
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### 2. Setup the React Frontend

Open a new terminal (or navigate back to the root), go into the frontend folder, and install the Node packages:

```powershell
cd frontend
npm install
```

---

## Running the Application

Once everything is installed, you need to start both servers simultaneously in separate terminals.

**Start the Backend:**
```powershell
cd zillavyuha
.\.venv\Scripts\Activate.ps1
uv run python -m zillavyuha.fast_api_app
```
*(The backend will be available at `http://localhost:8090`)*

**Start the Frontend:**
```powershell
cd frontend
npm run dev
```
*(The frontend will be available at `http://localhost:5173`)*
