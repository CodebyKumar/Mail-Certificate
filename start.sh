#!/bin/bash

# Certificate Mailing Machine - Setup and Startup Script

echo "[*] Certificate Mailing Machine - Setup & Start"
echo ""

# Function to check and install uv
check_uv() {
    if ! command -v uv &> /dev/null; then
        echo "[*] Installing uv package manager..."
        if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -LsSf https://astral.sh/uv/install.sh | sh
            export PATH="$HOME/.cargo/bin:$PATH"
        else
            echo "[!] Please install uv manually: https://github.com/astral-sh/uv"
            exit 1
        fi
    else
        echo "[✓] uv is installed"
    fi
}

# Function to check and install bun
check_bun() {
    if ! command -v bun &> /dev/null; then
        echo "[*] Installing bun package manager..."
        if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -fsSL https://bun.sh/install | bash
            export BUN_INSTALL="$HOME/.bun"
            export PATH="$BUN_INSTALL/bin:$PATH"
        else
            echo "[!] Please install bun manually: https://bun.sh"
            exit 1
        fi
    else
        echo "[✓] bun is installed"
    fi
}

# Check and install package managers
echo "[*] Checking package managers..."
check_uv
check_bun

# Install backend dependencies
echo ""
echo "[*] Installing backend dependencies..."
cd backend
if [ ! -f "uv.lock" ]; then
    uv sync
else
    echo "[✓] Backend dependencies already installed"
fi
cd ..

# Install frontend dependencies
echo ""
echo "[*] Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    bun install
else
    echo "[✓] Frontend dependencies already installed"
fi
cd ..

# Start the application
echo ""
echo "[*] Starting Certificate Mailing Machine..."
echo ""

# Start backend
echo "[*] Starting FastAPI backend on http://localhost:8000..."
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "[*] Starting React frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "[✓] Certificate Mailing Machine is running!"
echo ""
echo "[>] Backend API: http://localhost:8000"
echo "[>] Frontend UI: http://localhost:5173"
echo "[>] API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for Ctrl+C and cleanup
trap "echo ''; echo '[*] Shutting down services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
