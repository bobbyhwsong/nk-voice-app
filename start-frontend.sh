#!/bin/bash

echo "🚀 의료 대화 연습 시스템 Frontend 시작 중..."

# Frontend 디렉토리로 이동
cd frontend

# pnpm 의존성 설치 (필요한 경우)
if [ ! -d "node_modules" ]; then
    echo "📦 pnpm 의존성 설치 중..."
    pnpm install
fi

# 개발 서버 시작
echo "🌐 React 개발 서버 시작 중..."
echo "💡 사용 가능한 명령어:"
echo "   pnpm dev        - 로컬 개발용"
echo "   pnpm dev:ngrok  - 외부 접근용 (ngrok)"
echo ""

pnpm dev:ngrok