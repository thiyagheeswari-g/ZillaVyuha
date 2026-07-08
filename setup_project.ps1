# ==========================================
# ZillaVyuha - Full Project Setup Script
# ==========================================
# This script will automatically install all dependencies
# for both the Python Backend and the React Frontend.
# Run this script in your PowerShell terminal.

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setting up ZillaVyuha Developer Environment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Setup Backend
Write-Host "`n[1/2] Setting up Python Backend..." -ForegroundColor Yellow
Set-Location -Path "zillavyuha"

Write-Host "Creating Python virtual environment (.venv)..."
python -m venv .venv

Write-Host "Activating virtual environment and installing dependencies..."
# We use the call operator '&' to run the activation script safely
& .\.venv\Scripts\Activate.ps1

# The requirements.txt file contains the list of all packages.
# This single command reads that file and downloads/installs all of them automatically!
pip install -r requirements.txt

Write-Host "Backend setup complete!" -ForegroundColor Green
Set-Location -Path ".."

# 2. Setup Frontend
Write-Host "`n[2/2] Setting up React Frontend..." -ForegroundColor Yellow
Set-Location -Path "frontend"

Write-Host "Downloading and installing Node.js dependencies..."
# This command reads package.json and installs everything for the UI
npm install

Write-Host "Frontend setup complete!" -ForegroundColor Green
Set-Location -Path ".."

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "✅ ALL DONE! The project is ready to run." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "To start the servers, run:"
Write-Host "  Backend: cd zillavyuha; .\.venv\Scripts\Activate.ps1; uv run python -m zillavyuha.fast_api_app"
Write-Host "  Frontend: cd frontend; npm run dev"
