# 환자 진료 상황 음성 대화 연습 시스템

의료 종사자들을 위한 환자 진료 상황 음성 대화 연습 시스템입니다. FastAPI 백엔드와 React 프론트엔드로 구성되어 있으며, ngrok을 통해 외부 접속이 가능합니다.

## 시스템 개요

이 시스템은 의료 종사자들이 환자와의 대화를 연습할 수 있는 플랫폼을 제공합니다. 음성 인터랙션을 통해 실제 진료 상황과 유사한 환경에서 연습이 가능합니다.

### 주요 기능
- 음성 기반 대화 연습
- 실시간 음성 분석 및 피드백
- 대화 내용 기록 및 분석
- 연습 세션 히스토리 관리
- 치트시트 기능 제공

## 필수 요구사항

### 시스템 요구사항
- Python 3.8 이상
- Node.js 16.0 이상
- pnpm
- ngrok 계정 및 설치
- 마이크 장치

### 환경 설정

1. **Conda 가상환경 생성** [[memory:5446950]]
```bash
conda create -n nk_voice python=3.8
conda activate nk_voice
```

2. **백엔드 설정**
```bash
cd backend
pip install -r requirements.txt
```

3. **프론트엔드 설정**
```bash
cd frontend
pnpm install
```

4. **환경 변수 설정**
`.env` 파일을 backend 디렉토리에 생성하고 다음 내용을 추가하세요:
```
OPENAI_API_KEY=your_api_key_here
```

## 실행 방법

1. **백엔드 서버 실행**
```bash
./start-backend.sh
```
또는
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **프론트엔드 서버 실행**
```bash
./start-frontend.sh
```
또는
```bash
cd frontend
pnpm dev
```

3. **ngrok 실행**
```bash
./start-ngrok.sh
```
또는
```bash
ngrok http 5173
```

## 접속 방법

1. 로컬 접속
   - 프론트엔드: http://localhost:5173
   - 백엔드: http://localhost:8000
   - API 문서: http://localhost:8000/docs

2. 외부 접속
   - ngrok이 제공하는 URL을 통해 접속 (실행 시 표시됨)

## 시스템 사용 방법

1. **연습 세션 시작**
   - 메인 페이지에서 새로운 연습 세션 시작
   - 마이크 권한 허용 필요

2. **대화 연습**
   - 음성으로 환자와 대화
   - 실시간 피드백 확인
   - 필요시 치트시트 참조

3. **결과 확인**
   - 세션 종료 후 분석 결과 확인
   - 음성 녹음 및 대화 내용 저장
   - 피드백 데이터 검토

## 주의사항

1. API 키 보안
   - `.env` 파일에 있는 API 키를 절대 공개하거나 커밋하지 마세요.
   - 필요한 경우 `.env.example` 파일을 참고하여 설정하세요.

2. 데이터 저장
   - 사용자 데이터는 `backend/data` 디렉토리에 저장됩니다.
   - 음성 파일과 채팅 로그는 `backend/logs` 디렉토리에 저장됩니다.

## 문제 해결

1. 오디오 관련 문제
   - 브라우저의 마이크 권한 설정 확인
   - 시스템 오디오 입력 장치 설정 확인

2. 포트 충돌 발생 시
   - 백엔드: `backend/.env` 파일에서 포트 번호 변경
   - 프론트엔드: `vite.config.js`에서 포트 번호 변경

3. CORS 에러 발생 시
   - 백엔드의 CORS 설정 확인
   - ngrok URL이 CORS 허용 목록에 포함되어 있는지 확인

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.