# 환자 진료 상황 음성 대화 연습 시스템

환자들을 위한 진료 상황 대비 음성 대화 연습 시스템입니다. FastAPI 백엔드와 React 프론트엔드로 구성되어 있으며, ngrok을 통해 외부 접속이 가능합니다.

## ⚠️ 중요: Ngrok Static Domain 설정 필요

**이 프로젝트를 사용하기 전에 반드시 다음 설정이 필요합니다:**

1. **Ngrok 계정 생성**: [https://ngrok.com/](https://ngrok.com/)에서 회원가입
2. **Static Domain 생성**: Ngrok Dashboard에서 static domain 생성 (유료 기능)
3. **환경설정**: `frontend/.env` 파일에 static domain 설정 (백엔드용)
4. **코드 수정**: 하드코딩된 URL들을 환경변수로 교체

**🔗 자세한 설정 방법은 아래 "📋 초보자를 위한 상세 설정 가이드" 섹션을 참조하세요.**

## 🚀 빠른 시작 (이미 설정된 경우)

만약 이미 모든 설정이 완료되었다면, 다음 3개 스크립트를 **서로 다른 터미널**에서 순서대로 실행하세요:

```bash
# 터미널 1: 백엔드 서버 실행
./start-backend.sh

# 터미널 2: 프론트엔드 서버 실행  
./start-frontend.sh

# 터미널 3: ngrok 터널 생성
./start-ngrok.sh
```

## 📋 초보자를 위한 상세 설정 가이드

### 1단계: VS Code 설치

1. [VS Code 공식 웹사이트](https://code.visualstudio.com/)에서 다운로드
2. 운영체제에 맞는 버전 선택 (Windows, macOS, Linux)
3. 다운로드한 설치 파일 실행하여 설치
4. 설치 완료 후 VS Code 실행

### 2단계: Conda 설치

#### Windows 사용자:
1. [Anaconda 공식 웹사이트](https://www.anaconda.com/products/distribution)에서 다운로드
2. "Download" 버튼 클릭하여 설치 파일 다운로드
3. 다운로드한 `.exe` 파일 실행
4. "Install for All Users" 선택 (권장)
5. 설치 경로는 기본값 유지
6. "Add Anaconda to PATH" 체크박스 선택
7. 설치 완료 후 재부팅

#### macOS 사용자:
1. [Anaconda 공식 웹사이트](https://www.anaconda.com/products/distribution)에서 다운로드
2. "Download" 버튼 클릭하여 `.pkg` 파일 다운로드
3. 다운로드한 `.pkg` 파일 실행
4. 설치 마법사 따라하기
5. 터미널에서 다음 명령어로 설치 확인:
   ```bash
   conda --version
   ```

### 3단계: 프로젝트 다운로드 및 설정

1. **VS Code에서 프로젝트 열기**
   - VS Code 실행
   - `File` → `Open Folder` 클릭
   - 프로젝트 폴더 선택 후 `Select Folder` 클릭

2. **VS Code 터미널 열기**
   - `Ctrl + `` (백틱) 또는 `View` → `Terminal`
   - 터미널이 하단에 열림

### 4단계: 가상환경 설정

VS Code 터미널에서 다음 명령어들을 순서대로 실행:

```bash
# 1. Conda 가상환경 생성
conda create -n nk_voice python=3.11

# 2. 가상환경 활성화
conda activate nk_voice

# 3. 가상환경이 활성화되었는지 확인 (프롬프트 앞에 (nk_voice) 표시)
# 예: (nk_voice) username@computer:~$
```

### 5단계: Python 패키지 설치

```bash
# 1. backend 폴더로 이동
cd backend

# 2. requirements.txt에 있는 패키지들 설치
pip install -r requirements.txt

# 3. 설치 완료 확인
pip list
```

### 6단계: Node.js 및 pnpm 설치

#### Node.js 설치:
1. [Node.js 공식 웹사이트](https://nodejs.org/)에서 LTS 버전 다운로드
2. 설치 파일 실행하여 설치
3. 설치 완료 후 터미널에서 확인:
   ```bash
   node --version
   npm --version
   ```

#### pnpm 설치:
```bash
# npm을 통해 pnpm 전역 설치
npm install -g pnpm

# 설치 확인
pnpm --version
```

### 7단계: 프론트엔드 의존성 설치

```bash
# 1. frontend 폴더로 이동
cd ../frontend

# 2. 프로젝트 의존성 설치
pnpm install

# 3. 설치 완료 확인
pnpm list
```

### 8단계: API 키 설정

#### OpenAI API 키:
1. [OpenAI 웹사이트](https://platform.openai.com/)에서 계정 생성/로그인
2. `API Keys` 메뉴 클릭
3. `Create new secret key` 클릭
4. API 키 복사하여 안전한 곳에 저장

#### ElevenLabs API 키:
1. [ElevenLabs 웹사이트](https://elevenlabs.io/)에서 계정 생성/로그인
2. `Profile` → `API Key` 메뉴 클릭
3. API 키 복사하여 안전한 곳에 저장

#### 환경 변수 파일 생성:
```bash
# 1. backend 폴더로 이동
cd ../backend

# 2. .env 파일 생성
touch .env

# 3. .env 파일에 API 키 추가 (VS Code에서 편집)
```

**Backend `.env` 파일 내용:**
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
```

**Frontend 환경설정 (중요!):**
프로젝트 루트에 `frontend/.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 1. frontend 폴더로 이동
cd ../frontend

# 2. .env 파일 생성
touch .env

# 3. .env 파일에 Ngrok static domain 추가
```

**Frontend `.env` 파일 내용:**
```env
# Ngrok Static Domain 설정 (백엔드용)
# Ngrok 사이트(https://ngrok.com/)에서 확인한 static domain을 입력하세요
VITE_NGROK_STATIC_DOMAIN=your-static-domain.ngrok-free.app

# 백엔드 API URL (Ngrok static domain 사용)
VITE_BACKEND_API_URL=https://your-static-domain.ngrok-free.app

# 프론트엔드 URL (동적 URL 사용 - ngrok start 명령어로 생성됨)
# VITE_FRONTEND_URL은 설정하지 않음 (자동 생성)
```

**⚠️ 주의사항:**
- `your-static-domain.ngrok-free.app` 부분을 실제 Ngrok에서 생성한 static domain으로 교체하세요
- 예시: `my-voice-app.ngrok-free.app` → `VITE_NGROK_STATIC_DOMAIN=my-voice-app.ngrok-free.app`
- **백엔드만 static domain을 사용하고, 프론트엔드는 동적 URL을 사용합니다**

**🔧 하드코딩된 URL 교체 (중요!):**
프로젝트에 하드코딩된 Ngrok URL들을 환경변수로 교체해야 합니다:

1. **환경변수 파일 생성 후:**
   ```bash
   # frontend 폴더에 .env 파일 생성
   cd frontend
   touch .env
   ```

2. **환경변수 설정:**
   ```env
   VITE_NGROK_STATIC_DOMAIN=your-actual-domain.ngrok-free.app
   VITE_BACKEND_API_URL=https://your-actual-domain.ngrok-free.app
   ```

3. **코드 수정:**
   다음 파일들에서 `https://helpful-elf-carefully.ngrok-free.app`를 환경변수로 교체:
   - `frontend/src/pages/Chat.jsx`
   - `frontend/src/pages/Index.jsx`
   - `frontend/src/pages/Cheatsheet.jsx`
   - `frontend/src/pages/Feedback.jsx`
   - `frontend/src/pages/Retry.jsx`
   - `frontend/src/pages/CheatsheetHistory.jsx`

   **교체 방법:**
   ```javascript
   // 기존 (하드코딩)
   return 'https://helpful-elf-carefully.ngrok-free.app';
   
   // 변경 후 (환경변수 사용)
   return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
   ```

**📝 참고:** 백엔드만 static domain을 사용하고, 프론트엔드는 `ngrok start` 명령어로 생성되는 동적 URL을 사용합니다.

### 9단계: Ngrok 설정

#### Ngrok 계정 생성:
1. [Ngrok 웹사이트](https://ngrok.com/)에서 회원가입
2. 이메일 인증 완료
3. 로그인 후 `Your Authtoken` 메뉴 클릭

#### Ngrok Static Domain 설정 (중요!):
1. [Ngrok Dashboard](https://dashboard.ngrok.com/)에서 로그인
2. `Cloud Edge` → `Domains` 메뉴 클릭
3. `New Domain` 버튼 클릭하여 static domain 생성
4. 원하는 subdomain 입력 (예: `my-voice-app`)
5. 생성된 static domain 확인 (예: `my-voice-app.ngrok-free.app`)
6. **이 static domain을 아래 환경설정에 입력해야 합니다**

#### Ngrok 설치 및 인증:
```bash
# 1. Ngrok 다운로드 (macOS 기준)
curl -O https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip

# 2. 압축 해제
unzip ngrok-v3-stable-darwin-amd64.zip

# 3. 실행 파일을 시스템 경로로 이동
sudo mv ngrok /usr/local/bin

# 4. 인증 토큰 설정 (웹사이트에서 복사한 토큰 사용)
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE

# 5. 설치 확인
ngrok version
```

#### Windows 사용자:
1. [Ngrok 다운로드 페이지](https://ngrok.com/download)에서 Windows 버전 다운로드
2. 압축 해제 후 `ngrok.exe`를 원하는 폴더에 저장
3. 해당 폴더를 시스템 PATH에 추가하거나, 프로젝트 루트에 복사

### 10단계: Ngrok 설정 파일 생성

**Ngrok 설정 파일 생성:**
```bash
# 1. 프로젝트 루트로 이동
cd ..

# 2. ngrok 설정 파일 생성
mkdir -p ~/.ngrok2
touch ~/.ngrok2/ngrok.yml
```

**`~/.ngrok2/ngrok.yml` 파일 내용:**
```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE
tunnels:
  backend:
    addr: 8000
    proto: http
    hostname: your-static-domain.ngrok-free.app
  frontend:
    addr: 5173
    proto: http
    hostname: your-static-domain.ngrok-free.app
```

**⚠️ 설정 변경사항:**
- `YOUR_AUTHTOKEN_HERE`: Ngrok 웹사이트에서 복사한 인증 토큰으로 교체
- `your-static-domain.ngrok-free.app`: 실제 생성한 static domain으로 교체 (백엔드용)

**📝 참고:** 프론트엔드는 동적 URL을 사용하고, 백엔드만 static domain을 사용합니다.

### 11단계: 실행 권한 설정

```bash
# 1. 프로젝트 루트로 이동
cd ..

# 2. 실행 스크립트에 실행 권한 부여
chmod +x start-backend.sh
chmod +x start-frontend.sh
chmod +x start-ngrok.sh
```

## 🎯 실행 방법

모든 설정이 완료되었다면, **3개의 서로 다른 터미널**에서 다음 명령어를 순서대로 실행:

### 터미널 1: 백엔드 서버
```bash
./start-backend.sh
```
- 성공 시: `http://localhost:8000`에서 서버 실행
- API 문서: `http://localhost:8000/docs`

### 터미널 2: 프론트엔드 서버
```bash
./start-frontend.sh
```
- 성공 시: `http://localhost:5173`에서 앱 실행

### 터미널 3: Ngrok 터널
```bash
./start-ngrok.sh
```
- 성공 시: 외부 접속 가능한 URL 제공 (예: `https://abc123.ngrok-free.app`)

## 🔧 문제 해결

### Ngrok Static Domain 관련 문제:

1. **"ngrok: command not found"**
   - Ngrok 설치 확인: `ngrok version`
   - PATH 설정 확인 또는 재설치

2. **"Static domain not found"**
   - [Ngrok Dashboard](https://dashboard.ngrok.com/)에서 static domain이 생성되었는지 확인
   - `~/.ngrok2/ngrok.yml` 파일의 hostname이 올바른지 확인
   - `frontend/.env` 파일의 static domain이 올바른지 확인

3. **"Invalid hostname" 오류**
   - static domain 형식 확인: `your-app.ngrok-free.app`
   - Ngrok 계정이 유료 플랜인지 확인 (static domain은 유료 기능)

4. **환경변수 인식 안됨**
   - `frontend/.env` 파일이 올바른 위치에 있는지 확인
   - 프론트엔드 서버 재시작
   - 환경변수 이름이 `VITE_`로 시작하는지 확인

### 일반적인 오류들:

1. **"conda: command not found"**
   - Anaconda 재설치 또는 환경 변수 설정 확인
   - 터미널 재시작

2. **"pip: command not found"**
   - 가상환경이 활성화되었는지 확인: `conda activate nk_voice`
   - Python 설치 확인: `python --version`

3. **"pnpm: command not found"**
   - pnpm 재설치: `npm install -g pnpm`
   - 터미널 재시작

4. **포트 충돌 오류**
   - 백엔드: `backend/.env`에서 포트 변경
   - 프론트엔드: `vite.config.js`에서 포트 변경

5. **API 키 오류**
   - `.env` 파일이 올바른 위치에 있는지 확인
   - API 키가 정확히 복사되었는지 확인
   - API 키에 충분한 크레딧이 있는지 확인

### 도움이 필요한 경우:
- VS Code에서 `Ctrl + Shift + P` → "Python: Select Interpreter" → `nk_voice` 환경 선택
- 터미널에서 항상 `conda activate nk_voice` 실행 후 작업

## 📱 접속 방법

- **로컬 접속**: `http://localhost:5173`
- **외부 접속**: Ngrok static domain 사용 (예: `https://my-voice-app.ngrok-free.app`)
- **API 문서**: `http://localhost:8000/docs` (로컬) 또는 `https://my-voice-app.ngrok-free.app/docs` (외부)

**🔗 Ngrok Static Domain 확인 방법:**
1. [Ngrok Dashboard](https://dashboard.ngrok.com/) 로그인
2. `Cloud Edge` → `Domains` 메뉴에서 생성된 static domain 확인 (백엔드용)
3. 또는 터미널에서 `ngrok status` 명령어로 현재 터널 상태 확인

**📝 참고:** 백엔드만 static domain을 사용하고, 프론트엔드는 동적 URL을 사용합니다.

## 🎉 축하합니다!

모든 설정이 완료되었습니다! 이제 환자 진료 상황 음성 대화 연습 시스템을 사용할 수 있습니다.

## 📚 추가 정보

- **시스템 요구사항**: Python 3.11+, Node.js 16.0+, pnpm
- **지원 브라우저**: Chrome, Firefox, Safari, Edge (최신 버전)
- **마이크 권한**: 브라우저에서 마이크 접근 권한 허용 필요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.
