#!/bin/bash

# AI Architectural Design Generator - Start Script
# ==================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           AI Architectural Design Generator                  ║"
echo "║              Starting Application...                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo -e "${RED}✗ .env file not found! Please create one from .env.example${NC}"
    exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-arch_design_generator}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_HOST=${DB_HOST:-localhost}

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}  Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Clean up used ports
echo -e "\n${BLUE}[1/6] Cleaning up ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo -e "${GREEN}✓ Ports $BACKEND_PORT and $FRONTEND_PORT are free${NC}"

# Check PostgreSQL
echo -e "\n${BLUE}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
    if pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL is not running. Attempting to start...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
        else
            sudo systemctl start postgresql 2>/dev/null || true
        fi
        sleep 2
        if pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
        else
            echo -e "${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Create database if not exists
echo -e "\n${BLUE}[3/6] Setting up database...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1 || \
    PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || true
echo -e "${GREEN}✓ Database '$DB_NAME' ready${NC}"

# Install dependencies
echo -e "\n${BLUE}[4/6] Installing dependencies...${NC}"
cd backend && npm install --silent 2>&1 | tail -1
cd ../frontend && npm install --silent 2>&1 | tail -1
cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Seed database
echo -e "\n${BLUE}[5/6] Seeding database...${NC}"
cd backend && node src/seed.js
cd ..
echo -e "${GREEN}✓ Database seeded with sample data${NC}"

# Start application with hot reload
echo -e "\n${BLUE}[6/6] Starting application with hot reload...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Backend:  http://localhost:$BACKEND_PORT  (nodemon - auto reload)${NC}"
echo -e "${GREEN}  Frontend: http://localhost:$FRONTEND_PORT  (vite - hot reload)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Login:    admin@archdesign.com / password123${NC}"
echo -e "${YELLOW}  Press Ctrl+C to stop all services${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Trap to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend with nodemon (hot reload)
cd backend && npx nodemon src/server.js &
BACKEND_PID=$!

# Start frontend with vite (hot reload)
cd frontend && npx vite --port $FRONTEND_PORT --host &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
