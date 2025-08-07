#!/bin/bash

echo "🚀 NK Voice App Backend 시작 중..."

# Backend 디렉토리로 이동
cd backend

# uvicorn으로 서버 시작 (친구 방식)
echo "🌐 FastAPI 서버 시작 중..."
echo "💡 ngrok은 별도 터미널에서 'ngrok start'로 실행하세요"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000