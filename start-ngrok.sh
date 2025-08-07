#!/bin/bash

echo "🌐 ngrok 터널링 시작 중..."
echo "💡 backend와 frontend 터널을 시작합니다"
echo ""

# ngrok 시작 (backend와 frontend 터널 모두 시작)
ngrok start backend frontend
