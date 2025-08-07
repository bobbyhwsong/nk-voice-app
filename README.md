# NK Voice App - 제곱 계산기

Frontend에서 숫자를 입력하면 Backend에서 제곱을 계산해서 돌려주는 웹 애플리케이션입니다. ngrok tunnelling을 사용하여 로컬 개발 환경에서 외부 접근이 가능합니다.

## 🏗️ 프로젝트 구조

```
NK_Voice_App/
├── backend/          # FastAPI Backend
│   ├── main.py       # FastAPI 서버
│   └── requirements.txt
├── frontend/         # React Frontend (pnpm)
│   ├── src/
│   │   ├── App.jsx   # 메인 컴포넌트
│   │   ├── App.css   # 스타일
│   │   └── main.jsx  # 진입점
│   ├── index.html
│   ├── package.json  # pnpm 스크립트
│   ├── .env.local    # Frontend 환경변수
│   └── vite.config.js
├── .env              # Backend API 키들
├── start-backend.sh  # Backend 실행 스크립트
├── start-frontend.sh # Frontend 실행 스크립트
└── README.md
```

## 🔑 환경변수 설정

### 1. Backend API 키 설정 (프로젝트 루트의 .env)

```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Key
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 2. Frontend 환경변수 설정 (frontend/.env.local)

```bash
# FastAPI 기본 주소 (로컬 개발용)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Ngrok 주소 (외부 접근용)
NEXT_PUBLIC_API_BASE_URL_NGROK=https://helpful-elf-carefully.ngrok-free.app #각자 본인 환경에 맞게 변경

# Ngrok 사용 여부 (dev:ngrok 스크립트에서 true로 설정됨)
NEXT_PUBLIC_USE_NGROK=false
```

## 🚀 실행 방법

### 1. Backend 실행

```bash
cd backend

# Python 가상환경 생성 (선택사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
```

Backend 서버가 실행되면:
- 로컬 서버: http://localhost:8000
- API 문서: http://localhost:8000/docs
- 환경변수 확인: http://localhost:8000/env-info
- ngrok 터널링 URL이 콘솔에 표시됩니다

### 2. Frontend 실행 (pnpm 사용)

```bash
cd frontend

# 의존성 설치 (처음 한 번만)
pnpm install

# 로컬 개발용
pnpm dev

# 외부 접근용 (ngrok)
pnpm dev:ngrok
```

Frontend가 실행되면:
- 로컬 서버: http://localhost:3000

## 📡 API 엔드포인트

### POST /api/square
숫자를 받아서 제곱을 계산합니다.

**요청:**
```json
{
  "number": 5
}
```

**응답:**
```json
{
  "original": 5,
  "squared": 25,
  "message": "5의 제곱은 25입니다."
}
```

### GET /api/square/{number}
URL 파라미터로 숫자를 받아서 제곱을 계산합니다.

**예시:** `GET /api/square/5`

### GET /health
서버 상태를 확인합니다.

### GET /env-info
환경변수 설정 상태를 확인합니다.

## 🌐 ngrok Tunnelling

이 프로젝트는 ngrok을 사용하여 로컬 서버를 외부에서 접근할 수 있도록 합니다.

### ngrok 설정
1. ngrok이 설치되어 있는지 확인
2. ngrok.yml 파일이 올바르게 설정되어 있는지 확인
3. Backend 서버 실행 시 자동으로 ngrok 터널링이 시작됩니다

### Frontend에서 Backend 연결
1. Backend 서버 실행 후 콘솔에 표시되는 ngrok URL을 복사
2. Frontend의 "Backend URL" 필드에 ngrok URL 입력
3. 숫자를 입력하고 "제곱 계산" 버튼 클릭

## 🛠️ 기술 스택

### Backend
- **FastAPI**: 현대적이고 빠른 Python 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **Pydantic**: 데이터 검증
- **python-dotenv**: 환경변수 관리
- **ngrok**: 터널링 서비스

### Frontend
- **React**: 사용자 인터페이스 라이브러리
- **Vite**: 빠른 빌드 도구
- **pnpm**: 빠르고 효율적인 패키지 매니저
- **Axios**: HTTP 클라이언트
- **CSS3**: 모던한 스타일링

## 📱 기능

- ✅ 숫자 입력 및 제곱 계산
- ✅ 실시간 결과 표시
- ✅ 에러 처리 및 사용자 피드백
- ✅ 반응형 디자인
- ✅ ngrok 터널링을 통한 외부 접근
- ✅ API 문서 자동 생성 (Swagger UI)
- ✅ 환경별 실행 모드 (로컬/ngrok)
- ✅ 환경변수 관리 및 확인

## 🔧 개발 환경 설정

### 필수 요구사항
- Python 3.8+
- Node.js 16+
- pnpm (자동 설치됨)
- ngrok

### 설치 명령어
```bash
# Backend 의존성 설치
cd backend
pip install -r requirements.txt

# Frontend 의존성 설치
cd frontend
pnpm install
```

## 🚀 빠른 시작

### 스크립트 사용
```bash
# Backend 실행
./start-backend.sh

# Frontend 실행 (새 터미널)
./start-frontend.sh
```

### 수동 실행
```bash
# Backend
cd backend && python main.py

# Frontend (로컬)
cd frontend && pnpm dev

# Frontend (외부 접근)
cd frontend && pnpm dev:ngrok
```

## 🔍 환경변수 확인

### Backend 환경변수 확인
```bash
curl http://localhost:8000/env-info
```

### Frontend 환경변수 확인
브라우저에서 개발자 도구 콘솔에서 확인:
```javascript
console.log(import.meta.env)
```

## 🚨 문제 해결

### ngrok 연결 실패
- ngrok이 설치되어 있는지 확인
- ngrok.yml 파일이 올바르게 설정되어 있는지 확인
- 방화벽 설정 확인

### CORS 오류
- Backend의 CORS 설정이 올바른지 확인
- Frontend URL이 Backend CORS 설정에 포함되어 있는지 확인

### API 연결 실패
- Backend 서버가 실행 중인지 확인
- ngrok URL이 올바른지 확인
- 네트워크 연결 상태 확인

### pnpm 관련 문제
- `pnpm install`로 의존성 재설치
- Node.js 버전 확인 (16+ 필요)

### 환경변수 문제
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `frontend/.env.local` 파일이 있는지 확인
- API 키가 올바르게 설정되었는지 확인
