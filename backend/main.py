from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
import requests
import json
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
import openai

# .env 파일 로드
load_dotenv()

app = FastAPI(title="NK Voice Backend", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ngrok 환경에서도 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  # ngrok-skip-browser-warning 헤더 포함
)

# Pydantic 모델
class NumberRequest(BaseModel):
    number: float

class SquareResponse(BaseModel):
    original: float
    squared: float
    message: str

class HealthResponse(BaseModel):
    status: str
    message: str

class UserData(BaseModel):
    participantId: str
    symptoms: str
    consent: bool
    loginTime: str

class UserDataResponse(BaseModel):
    success: bool
    message: str
    participantId: str

class ChatRequest(BaseModel):
    message: str
    participantId: str
    sessionId: str
    conversationHistory: Optional[list] = []

class ChatResponse(BaseModel):
    response: str
    success: bool
    audio_url: Optional[str] = None

class LogsResponse(BaseModel):
    status: str
    logs: list
    message: str

class VoiceAnalysisRequest(BaseModel):
    messages: list
    participant_id: str
    analysis_type: str

class VoiceAnalysisResponse(BaseModel):
    status: str
    analysis: dict
    message: str

class EvaluationRequest(BaseModel):
    logs: list
    participant_id: str
    evaluation_type: str

class EvaluationResponse(BaseModel):
    status: str
    evaluation: dict
    message: str

class RetryChatRequest(BaseModel):
    message: str
    userData: dict
    sessionType: str = "retry"

class RetryChatResponse(BaseModel):
    response: str
    success: bool

class FeedbackRequest(BaseModel):
    userData: dict

class FeedbackResponse(BaseModel):
    status: str
    feedback: dict
    message: str

class LogsRequest(BaseModel):
    userData: dict

class QuestCheckRequest(BaseModel):
    conversation_history: list
    quests: list
    participant_id: str
    session_id: str

class QuestCheckResponse(BaseModel):
    status: str
    completed_quests: list
    message: str

class CheatsheetRequest(BaseModel):
    participant_id: str

class CheatsheetResponse(BaseModel):
    status: str
    cheatsheet: dict
    message: str

class SaveCheatsheetRequest(BaseModel):
    participant_id: str
    cheatsheet_data: dict
    timestamp: str

class SaveCheatsheetResponse(BaseModel):
    status: str
    message: str

class GetCheatsheetHistoryRequest(BaseModel):
    participant_id: str

class GetCheatsheetHistoryResponse(BaseModel):
    status: str
    cheatsheets: list
    message: str

# 로그 디렉토리 생성 (절대 경로 사용)
LOG_DIR = os.path.abspath("logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR, exist_ok=True)
    print(f"📁 로그 디렉토리 생성: {LOG_DIR}")

# 데이터 디렉토리 생성 (절대 경로 사용)
DATA_DIR = os.path.abspath("data")
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"📁 데이터 디렉토리 생성: {DATA_DIR}")

# 정적 파일 서빙 설정 (logs 폴더를 /static으로 마운트)
# 디렉토리가 생성된 후에 마운트
app.mount("/static", StaticFiles(directory="logs"), name="static")
print(f"📁 정적 파일 서빙 설정: logs -> /static")

def ensure_directory_exists(directory_path):
    """디렉토리가 존재하지 않으면 생성하는 안전한 함수"""
    try:
        if not os.path.exists(directory_path):
            os.makedirs(directory_path, exist_ok=True)
            print(f"📁 디렉토리 생성: {directory_path}")
        return True
    except Exception as e:
        print(f"❌ 디렉토리 생성 실패: {directory_path} - {str(e)}")
        return False

def save_user_log(user_data: UserData):
    """참가자 ID별로 로그를 저장하는 함수"""
    try:
        # 참가자 ID로 폴더 생성
        participant_dir = os.path.join(LOG_DIR, user_data.participantId)
        if not ensure_directory_exists(participant_dir):
            return False
        
        # 로그 파일명 생성 (날짜_시간.json)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_filename = f"user_info_{timestamp}.json"
        log_filepath = os.path.join(participant_dir, log_filename)
        
        # 로그 데이터 구성
        log_data = {
            "participantId": user_data.participantId,
            "symptoms": user_data.symptoms,
            "consent": user_data.consent,
            "loginTime": user_data.loginTime,
            "logCreatedAt": datetime.now().isoformat()
        }
        
        # JSON 파일로 저장
        with open(log_filepath, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 로그 저장 완료: {log_filepath}")
        return True
        
    except Exception as e:
        print(f"❌ 로그 저장 실패: {str(e)}")
        return False

@app.post("/api/save-user-data", response_model=UserDataResponse)
async def save_user_data(user_data: UserData):
    """사용자 데이터를 저장하는 API"""
    try:
        # 참가자 ID로 파일명 생성
        filename = f"data/user_data_{user_data.participantId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # 데이터를 JSON 파일로 저장
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(user_data.dict(), f, ensure_ascii=False, indent=2)
        
        # 로그 저장
        log_saved = save_user_log(user_data)
        
        return UserDataResponse(
            success=True,
            message="사용자 데이터가 성공적으로 저장되었습니다." + (" 로그도 저장되었습니다." if log_saved else " 로그 저장에 실패했습니다."),
            participantId=user_data.participantId
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 저장 중 오류가 발생했습니다: {str(e)}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """헬스체크 API"""
    # 로그 디렉토리 상태 확인
    log_status = "OK" if os.path.exists(LOG_DIR) else "ERROR"
    data_status = "OK" if os.path.exists(DATA_DIR) else "ERROR"
    
    return HealthResponse(
        status="OK",
        message=f"Backend 서버가 정상적으로 작동중입니다. 로그 디렉토리: {log_status}, 데이터 디렉토리: {data_status}"
    )

@app.get("/env-info")
async def env_info():
    """환경변수 정보 확인 API"""
    return {
        "openai_api_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "elevenlabs_api_key_set": bool(os.getenv("ELEVENLABS_API_KEY")),
        "elevenlabs_voice_id": os.getenv("ELEVENLABS_VOICE_ID", "BNr4zvrC1bGIdIstzjFQ"),
        "openai_api_key_length": len(os.getenv("OPENAI_API_KEY", "")),
        "elevenlabs_api_key_length": len(os.getenv("ELEVENLABS_API_KEY", "")),
        "log_directory": LOG_DIR,
        "log_directory_exists": os.path.exists(LOG_DIR),
        "data_directory": DATA_DIR,
        "data_directory_exists": os.path.exists(DATA_DIR),
        "current_working_directory": os.getcwd()
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_doctor(request: ChatRequest):
    """의사와의 채팅 API"""
    try:
        # OpenAI API 키 확인
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
        
        # OpenAI 클라이언트 설정
        openai.api_key = openai_api_key
        
        # 의사 역할 프롬프트
        system_prompt = """당신은 50대 남성의 경험 많은 내과 의사입니다. 환자와의 대화에서 다음 사항을 지켜주세요:

1. 무심한 듯한 말투로 대화하세요.
2. 환자의 증상을 파악하기 위한 질문을 하세요.
3. 환자에게 향후 조치에 대해 간단하게만 알려주세요.
4. 의학용어는 쉽게 설명하되, 간결하게 하세요.
5. 길게 말하지 말고, 존대말로 하세요.

환자의 메시지에 대해 의사로서 적절한 응답을 해주세요."""

        # 대화 기록 구성
        messages_for_api = [
            {"role": "system", "content": system_prompt}
        ]
        
        # 이전 대화 기록 추가
        if request.conversationHistory:
            messages_for_api.extend(request.conversationHistory)
        
        # 현재 사용자 메시지 추가
        messages_for_api.append({"role": "user", "content": request.message})
        
        print(f"📝 대화 기록 길이: {len(messages_for_api)}")
        print(f"📝 최근 대화: {request.conversationHistory[-3:] if request.conversationHistory else '없음'}")
        
        # ChatGPT API 호출
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=messages_for_api,
            max_tokens=500,
            temperature=0.7
        )
        
        # 응답 추출
        doctor_response = response.choices[0].message.content.strip()
        
        # 참가자별 디렉토리 생성 (먼저 생성)
        participant_dir = os.path.join(LOG_DIR, request.participantId)
        ensure_directory_exists(participant_dir)
        
        # 세션별 디렉토리 생성
        session_dir = os.path.join(participant_dir, request.sessionId)
        ensure_directory_exists(session_dir)
        
        # 세션 파일명 생성 (세션ID.json)
        session_filename = f"chat_session.json"
        session_filepath = os.path.join(session_dir, session_filename)
        
        # 기존 세션 파일이 있는지 확인
        existing_session = session_filepath if os.path.exists(session_filepath) else None
        
        # ElevenLabs 음성 생성
        elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
        audio_url = None
        
        if elevenlabs_api_key:
            try:
                # ElevenLabs Voice ID 환경변수에서 가져오기
                voice_id = os.getenv("ELEVENLABS_VOICE_ID", "BNr4zvrC1bGIdIstzjFQ")
                elevenlabs_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                
                headers = {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": elevenlabs_api_key
                }
                
                data = {
                    "text": doctor_response,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.5
                    }
                }
                
                audio_response = requests.post(elevenlabs_url, json=data, headers=headers)
                
                if audio_response.status_code == 200:
                    # 오디오 파일 저장 (세션별 디렉토리에)
                    audio_filename = f"audio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
                    audio_filepath = os.path.join(session_dir, audio_filename)
                    
                    with open(audio_filepath, 'wb') as f:
                        f.write(audio_response.content)
                    
                    # 오디오 URL 생성 (전용 API 엔드포인트 사용)
                    audio_url = f"/api/audio/{request.participantId}/{request.sessionId}/{audio_filename}"
                    
                    print(f"✅ ElevenLabs 음성 생성 완료: {audio_filepath}")
                else:
                    print(f"⚠️ ElevenLabs API 오류: {audio_response.status_code}")
                    
            except Exception as e:
                print(f"⚠️ ElevenLabs 음성 생성 실패: {str(e)}")
        
        # 대화 세션 로그 구성
        current_message = {
            "timestamp": datetime.now().isoformat(),
            "user_message": request.message,
            "doctor_response": doctor_response,
            "audio_url": audio_url,
            "conversation_history_length": len(request.conversationHistory) if request.conversationHistory else 0
        }
        
        # 기존 세션이 있으면 로드하고 새 메시지 추가
        if existing_session:
            try:
                with open(existing_session, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                session_data["messages"].append(current_message)
                session_data["last_updated"] = datetime.now().isoformat()
                session_data["total_messages"] = len(session_data["messages"])
                
                print(f"📝 기존 세션에 메시지 추가: {existing_session}")
            except Exception as e:
                print(f"⚠️ 기존 세션 로드 실패: {str(e)}")
                session_data = {
                    "participantId": request.participantId,
                    "sessionId": request.sessionId,
                    "session_start": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat(),
                    "messages": [current_message],
                    "total_messages": 1
                }
        else:
            # 새 세션 생성
            session_data = {
                "participantId": request.participantId,
                "sessionId": request.sessionId,
                "session_start": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat(),
                "messages": [current_message],
                "total_messages": 1
            }
            print(f"📝 새 세션 생성: {session_filename}")
        
        # 세션 파일 저장
        target_filepath = existing_session if existing_session else session_filepath
        with open(target_filepath, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 대화 세션 저장 완료: {target_filepath} (총 {session_data['total_messages']}개 메시지)")
        
        return ChatResponse(
            response=doctor_response,
            success=True,
            audio_url=audio_url
        )
        
    except Exception as e:
        print(f"❌ 채팅 API 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"채팅 처리 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/logs", response_model=LogsResponse)
async def get_conversation_logs(participant_id: str):
    """참가자 ID별 대화 로그를 조회하는 엔드포인트"""
    try:
        logs = []
        
        print(f"🔍 참가자 ID로 로그 조회: {participant_id}")
        print(f"📁 로그 디렉토리 경로: {LOG_DIR}")
        print(f"📁 로그 디렉토리 존재 여부: {os.path.exists(LOG_DIR)}")
        
        if participant_id:
            # 참가자별 세션 폴더 확인
            participant_dir = os.path.join(LOG_DIR, participant_id)
            print(f"📁 참가자 디렉토리: {participant_dir}")
            
            if os.path.exists(participant_dir):
                print(f"✅ 참가자 디렉토리 존재: {participant_dir}")
                
                # 디렉토리 내용 전체 확인
                try:
                    all_items = os.listdir(participant_dir)
                    print(f"📂 참가자 디렉토리 내용: {all_items}")
                except Exception as e:
                    print(f"❌ 디렉토리 읽기 오류: {e}")
                    
                # 세션 폴더들을 찾아서 가장 최근 세션 선택
                session_folders = []
                for item in os.listdir(participant_dir):
                    item_path = os.path.join(participant_dir, item)
                    if os.path.isdir(item_path) and item.startswith('session_'):
                        session_folders.append(item)
                
                print(f"📂 발견된 세션 폴더들: {session_folders}")
                
                if session_folders:
                    # 가장 최근 세션 선택 (폴더명 기준으로 정렬)
                    latest_session = sorted(session_folders, reverse=True)[0]
                    session_path = os.path.join(participant_dir, latest_session)
                    
                    print(f"📁 최근 세션 폴더: {latest_session}")
                    
                    # chat_session.json 파일 확인
                    chat_file = os.path.join(session_path, "chat_session.json")
                    if os.path.exists(chat_file):
                        try:
                            with open(chat_file, 'r', encoding='utf-8') as f:
                                session_data = json.load(f)
                                print(f"📄 세션 데이터 로드: {len(session_data.get('messages', []))}개 메시지")
                                print(f"📄 세션 데이터 키들: {list(session_data.keys())}")
                                
                                if 'messages' in session_data:
                                    for msg in session_data['messages']:
                                        log_entry = {
                                            'user_message': msg.get('user_message', ''),
                                            'bot_response': msg.get('doctor_response', ''),
                                            'timestamp': msg.get('timestamp', ''),
                                            'session_id': session_data.get('sessionId', '')
                                        }
                                        logs.append(log_entry)
                                        print(f"📝 메시지 로드: {log_entry['user_message'][:20]}...")
                                    print(f"📝 세션에서 {len(session_data['messages'])}개 메시지 로드")
                                else:
                                    print(f"⚠️ 세션에 messages 필드가 없습니다: {session_data.keys()}")
                        except Exception as e:
                            print(f"세션 파일 읽기 오류: {e}")
                    else:
                        print(f"⚠️ chat_session.json 파일이 없습니다: {chat_file}")
                else:
                    print(f"⚠️ 세션 폴더를 찾을 수 없습니다: {participant_dir}")
            else:
                print(f"⚠️ 참가자 디렉토리가 존재하지 않습니다: {participant_dir}")
        else:
            print("⚠️ 참가자 ID가 제공되지 않았습니다.")
        
        print(f"📊 최종 로드된 로그 개수: {len(logs)}")
        return LogsResponse(
            status="success",
            logs=logs,
            message=f"Found {len(logs)} conversation logs from latest session"
        )
        
    except Exception as e:
        print(f"❌ 로그 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/analyze-voice", response_model=VoiceAnalysisResponse)
async def analyze_voice(request: VoiceAnalysisRequest):
    """사용자 음성/대화 스타일을 분석하는 엔드포인트"""
    try:
        # OpenAI API 키 확인
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
        
        # 사용자 메시지들을 하나의 텍스트로 결합
        combined_messages = " ".join(request.messages)
        
        # LLM을 사용한 음성 분석 프롬프트
        analysis_prompt = f"""
다음은 의료 진료 연습 중 환자와의 대화입니다. 말투와 단어 선택을 중심으로 분석해주세요.
환자가 북한이탈주민이라서 걱정이 많습니다.
특히 긍정적인 측면에 초점을 맞춰주세요.

환자의 대화:
{combined_messages}

다음 관점에서 분석하고 긍정적으로 평가해주세요:
1. 말투의 특징 (예: 정중함, 친근함, 명확성 등)
2. 단어 선택의 적절성 (의료 용어 사용, 구체적인 표현 등)
3. 대화의 자연스러움 (문장의 흐름, 표현의 자연스러움)
4. 환자의 걱정을 줄이는 방법도 이야기해주세요.

긍정적인 관점에서 JSON 형식으로 응답해주세요:
{{
    "summary": "전반적인 대화 스타일 요약",
    "details": "상세한 분석 내용",
    "communication_style": "의사소통 스타일",
    "strengths": ["강점1", "강점2"],
    "areas_for_improvement": ["개선점1", "개선점2"]
}}
"""
        
        # OpenAI API 호출 (버전 호환성을 위한 처리)
        try:
            # 최신 버전 (v1.0+)
            client = openai.OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "당신은 대화 분석 전문가입니다. 환자의 대화 스타일을 분석하고, 긍정적인 면을 구체적으로 칭찬해주세요."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
        except AttributeError:
            # 구버전 (v0.x)
            openai.api_key = openai_api_key
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "당신은 의료 진료 연습을 위한 대화 분석 전문가입니다. 환자의 대화 스타일을 객관적이고 건설적으로 분석해주세요."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
        
        # 응답 파싱 (버전 호환성)
        try:
            # 최신 버전 (v1.0+)
            analysis_text = response.choices[0].message.content
        except AttributeError:
            # 구버전 (v0.x)
            analysis_text = response.choices[0].message.content
        
        try:
            # JSON 파싱 시도
            import re
            json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
            if json_match:
                analysis_data = json.loads(json_match.group())
            else:
                # JSON 파싱 실패 시 기본 형식 사용
                analysis_data = {
                    "summary": "자연스럽고 편안한 대화를 이어가셨습니다.",
                    "details": analysis_text,
                    "communication_style": "자연스러운 대화",
                    "strengths": ["자연스러운 대화"],
                    "areas_for_improvement": []
                }
        except json.JSONDecodeError:
            # JSON 파싱 오류 시 기본 형식 사용
            analysis_data = {
                "summary": "자연스럽고 편안한 대화를 이어가셨습니다.",
                "details": analysis_text,
                "communication_style": "자연스러운 대화",
                "strengths": ["자연스러운 대화"],
                "areas_for_improvement": []
            }
        
        # 음성 분석 데이터를 세션 폴더에 저장
        try:
            # 참가자별 디렉토리 확인
            participant_dir = os.path.join(LOG_DIR, request.participant_id)
            if not os.path.exists(participant_dir):
                os.makedirs(participant_dir)
            
            # 가장 최근 세션 폴더 찾기
            session_folders = []
            if os.path.exists(participant_dir):
                for item in os.listdir(participant_dir):
                    item_path = os.path.join(participant_dir, item)
                    if os.path.isdir(item_path) and item.startswith('session_'):
                        session_folders.append(item)
            
            if session_folders:
                # 가장 최근 세션 선택
                latest_session = sorted(session_folders, reverse=True)[0]
                session_dir = os.path.join(participant_dir, latest_session)
                
                # 음성 분석 파일명 생성
                voice_analysis_filename = f"voice_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                voice_analysis_filepath = os.path.join(session_dir, voice_analysis_filename)
                
                voice_analysis_data = {
                    "participant_id": request.participant_id,
                    "session_id": latest_session,
                    "analysis_type": request.analysis_type,
                    "timestamp": datetime.now().isoformat(),
                    "analysis": analysis_data,
                    "messages": request.messages  # 분석된 메시지들도 함께 저장
                }
                
                with open(voice_analysis_filepath, 'w', encoding='utf-8') as f:
                    json.dump(voice_analysis_data, f, ensure_ascii=False, indent=2)
                    
                print(f"✅ 음성 분석 데이터 저장: {voice_analysis_filepath}")
            else:
                print(f"⚠️ 세션 폴더를 찾을 수 없습니다: {participant_dir}")
                
        except Exception as e:
            print(f"⚠️ 음성 분석 저장 실패: {e}")
        
        return VoiceAnalysisResponse(
            status="success",
            analysis=analysis_data,
            message="음성 분석이 완료되었습니다."
        )
        
    except Exception as e:
        print(f"❌ 음성 분석 오류: {e}")
        raise HTTPException(status_code=500, detail=f"음성 분석 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/evaluate", response_model=EvaluationResponse)
async def evaluate_conversation(request: EvaluationRequest):
    """대화 내용을 기반으로 가이드라인 준수도를 평가하는 엔드포인트"""
    try:
        # OpenAI API 키 확인
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
        
        # 대화 로그를 텍스트로 변환
        conversation_text = ""
        for log in request.logs:
            conversation_text += f"환자: {log.get('user_message', '')}\n"
            conversation_text += f"의사: {log.get('bot_response', '')}\n\n"
        
        # 평가 기준 정의
        evaluation_criteria = """
환자가 의료 진료 연습에서 꼭 알아야하는 10가지:

환자 입장에서 꼭 말해야 하는 것:
1. symptom_location: 어디가 아픈지 구체적인 위치
2. symptom_timing: 언제부터 아픈지 시작 시기  
3. symptom_severity: 증상이 얼마나 심한지 강도
4. current_medication: 현재 복용 중인 약물
5. allergy_info: 알레르기 여부

진료과정 중에 의사한테 꼭 들어야 하는 것:
6. diagnosis_info: 의사의 진단명과 진단 근거
7. prescription_info: 처방약의 이름과 복용 방법
8. side_effects: 약의 부작용과 주의사항
9. followup_plan: 다음 진료 계획과 재방문 시기
10. emergency_plan: 증상 악화 시 언제 다시 와야 하는지
"""
        
        # LLM을 사용한 평가 프롬프트
        evaluation_prompt = f"""
다음은 환자용 의료 진료 연습의 대화 내용입니다.
평가 기준에 따라 환자가 얼마나 잘 말하고, 잘 들었는지 각 항목을 평가해주세요.

각 항목에 대해 상, 중, 하 등급을 매기고, 구체적인 이유를 설명해주세요.
환자 입장에서 꼭 말해야할 것을 말했는지, 의사한테 꼭 들어야할 것을 들었는지를 평가해주세요.

개선 팁은 환자 입장에서 적어주세요

대화 내용:
{conversation_text}

평가 기준:
{evaluation_criteria}

항목 평가가 중,하인 경우에만 개선 제안을 제공해주세요.
다음 JSON 형식으로 응답해주세요:
{{
    "grades": {{
        "symptom_location": "상/중/하",
        "symptom_timing": "상/중/하", 
        "symptom_severity": "상/중/하",
        "current_medication": "상/중/하",
        "allergy_info": "상/중/하",
        "diagnosis_info": "상/중/하",
        "prescription_info": "상/중/하", 
        "side_effects": "상/중/하",
        "followup_plan": "상/중/하",
        "emergency_plan": "상/중/하"
    }},
    "score_reasons": {{
        "symptom_location": "평가 이유",
        "symptom_timing": "평가 이유",
        "symptom_severity": "평가 이유", 
        "current_medication": "평가 이유",
        "allergy_info": "평가 이유",
        "diagnosis_info": "평가 이유",
        "prescription_info": "평가 이유",
        "side_effects": "평가 이유", 
        "followup_plan": "평가 이유",
        "emergency_plan": "평가 이유"
    }},
    "improvement_tips": [
        "개선 제안 1",
        "개선 제안 2",
        "개선 제안 3",
        "개선 제안 4",
        "개선 제안 5",
        "개선 제안 6",
        "개선 제안 7",
        "개선 제안 8",
        "개선 제안 9",
        "개선 제안 10"
    ]
}}
"""
        
        # OpenAI API 호출 (버전 호환성을 위한 처리)
        try:
            # 최신 버전 (v1.0+)
            client = openai.OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "당신은 환자용 의료 진료 연습을 위한 평가 전문가입니다. 객관적이고 건설적인 평가를 제공해주세요."},
                    {"role": "user", "content": evaluation_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
        except AttributeError:
            # 구버전 (v0.x)
            openai.api_key = openai_api_key
            response = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "당신은 환자용 의료 진료 연습을 위한 평가 전문가입니다. 객관적이고 건설적인 평가를 제공해주세요."},
                    {"role": "user", "content": evaluation_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
        
        # 응답 파싱 (버전 호환성)
        try:
            # 최신 버전 (v1.0+)
            evaluation_text = response.choices[0].message.content
        except AttributeError:
            # 구버전 (v0.x)
            evaluation_text = response.choices[0].message.content
        
        try:
            # JSON 파싱 시도
            import re
            json_match = re.search(r'\{.*\}', evaluation_text, re.DOTALL)
            if json_match:
                evaluation_data = json.loads(json_match.group())
            else:
                # JSON 파싱 실패 시 기본 형식 사용
                evaluation_data = {
                    "grades": {
                        "symptom_location": "중",
                        "symptom_timing": "중",
                        "symptom_severity": "중",
                        "current_medication": "중",
                        "allergy_info": "중",
                        "diagnosis_info": "중",
                        "prescription_info": "중",
                        "side_effects": "중",
                        "followup_plan": "중",
                        "emergency_plan": "중"
                    },
                    "score_reasons": {
                        "symptom_location": "평가 정보가 없습니다.",
                        "symptom_timing": "평가 정보가 없습니다.",
                        "symptom_severity": "평가 정보가 없습니다.",
                        "current_medication": "평가 정보가 없습니다.",
                        "allergy_info": "평가 정보가 없습니다.",
                        "diagnosis_info": "평가 정보가 없습니다.",
                        "prescription_info": "평가 정보가 없습니다.",
                        "side_effects": "평가 정보가 없습니다.",
                        "followup_plan": "평가 정보가 없습니다.",
                        "emergency_plan": "평가 정보가 없습니다."
                    },
                    "improvement_tips": ["더 많은 정보를 제공해주세요."]
                }
        except json.JSONDecodeError:
            # JSON 파싱 오류 시 기본 형식 사용
            evaluation_data = {
                "grades": {
                    "symptom_location": "중",
                    "symptom_timing": "중",
                    "symptom_severity": "중",
                    "current_medication": "중",
                    "allergy_info": "중",
                    "diagnosis_info": "중",
                    "prescription_info": "중",
                    "side_effects": "중",
                    "followup_plan": "중",
                    "emergency_plan": "중"
                },
                "score_reasons": {
                    "symptom_location": "평가 정보가 없습니다.",
                    "symptom_timing": "평가 정보가 없습니다.",
                    "symptom_severity": "평가 정보가 없습니다.",
                    "current_medication": "평가 정보가 없습니다.",
                    "allergy_info": "평가 정보가 없습니다.",
                    "diagnosis_info": "평가 정보가 없습니다.",
                    "prescription_info": "평가 정보가 없습니다.",
                    "side_effects": "평가 정보가 없습니다.",
                    "followup_plan": "평가 정보가 없습니다.",
                    "emergency_plan": "평가 정보가 없습니다."
                },
                "improvement_tips": ["더 많은 정보를 제공해주세요."]
            }
        
        # 피드백 데이터를 세션 폴더에 저장
        try:
            # 참가자별 디렉토리 확인
            participant_dir = os.path.join(LOG_DIR, request.participant_id)
            if not os.path.exists(participant_dir):
                os.makedirs(participant_dir)
            
            # 가장 최근 세션 폴더 찾기
            session_folders = []
            if os.path.exists(participant_dir):
                for item in os.listdir(participant_dir):
                    item_path = os.path.join(participant_dir, item)
                    if os.path.isdir(item_path) and item.startswith('session_'):
                        session_folders.append(item)
            
            if session_folders:
                # 가장 최근 세션 선택
                latest_session = sorted(session_folders, reverse=True)[0]
                session_dir = os.path.join(participant_dir, latest_session)
                
                # 피드백 파일명 생성
                feedback_filename = f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                feedback_filepath = os.path.join(session_dir, feedback_filename)
                
                feedback_data = {
                    "participant_id": request.participant_id,
                    "session_id": latest_session,
                    "evaluation_type": request.evaluation_type,
                    "timestamp": datetime.now().isoformat(),
                    "evaluation": evaluation_data,
                    "conversation_logs": request.logs  # 대화 로그도 함께 저장
                }
                
                with open(feedback_filepath, 'w', encoding='utf-8') as f:
                    json.dump(feedback_data, f, ensure_ascii=False, indent=2)
                    
                print(f"✅ 피드백 데이터 저장: {feedback_filepath}")
            else:
                print(f"⚠️ 세션 폴더를 찾을 수 없습니다: {participant_dir}")
                
        except Exception as e:
            print(f"⚠️ 피드백 저장 실패: {e}")
        
        return EvaluationResponse(
            status="success",
            evaluation=evaluation_data,
            message="평가가 완료되었습니다."
        )
        
    except Exception as e:
        print(f"❌ 평가 오류: {e}")
        raise HTTPException(status_code=500, detail=f"평가 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/audio/{participant_id}/{session_id}/{filename}")
async def get_audio_file(participant_id: str, session_id: str, filename: str):
    """오디오 파일을 제공하는 API"""
    try:
        audio_filepath = os.path.join(LOG_DIR, participant_id, session_id, filename)
        
        print(f"🔍 오디오 파일 요청: {audio_filepath}")
        print(f"🔍 참가자 ID: {participant_id}")
        print(f"🔍 세션 ID: {session_id}")
        print(f"🔍 파일명: {filename}")
        
        if not os.path.exists(audio_filepath):
            print(f"❌ 오디오 파일 없음: {audio_filepath}")
            # 디렉토리 구조 확인
            session_dir = os.path.join(LOG_DIR, participant_id, session_id)
            if os.path.exists(session_dir):
                files_in_dir = os.listdir(session_dir)
                print(f"📁 세션 디렉토리 내 파일들: {files_in_dir}")
            else:
                print(f"📁 세션 디렉토리 없음: {session_dir}")
                participant_dir = os.path.join(LOG_DIR, participant_id)
                if os.path.exists(participant_dir):
                    sessions_in_dir = os.listdir(participant_dir)
                    print(f"📁 참가자 디렉토리 내 세션들: {sessions_in_dir}")
            
            raise HTTPException(status_code=404, detail="오디오 파일을 찾을 수 없습니다.")
        
        # 파일 크기 확인
        file_size = os.path.getsize(audio_filepath)
        print(f"✅ 오디오 파일 찾음: {audio_filepath} (크기: {file_size} bytes)")
        
        # ngrok 환경에 최적화된 헤더
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Expose-Headers": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Content-Disposition": f"inline; filename={filename}",
            "Accept-Ranges": "bytes"  # 부분 요청 지원
        }
        
        # ngrok 환경에서는 추가 헤더
        if filename.endswith('.mp3'):
            headers["Content-Type"] = "audio/mpeg"
        
        print(f"🎵 오디오 파일 전송 시작: {filename}")
        
        response = FileResponse(
            path=audio_filepath,
            media_type="audio/mpeg",
            filename=filename,
            headers=headers
        )
        
        print(f"✅ 오디오 파일 응답 생성 완료: {filename}")
        return response
        
    except HTTPException:
        # HTTPException은 그대로 전달
        raise
    except Exception as e:
        print(f"❌ 오디오 파일 제공 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"오디오 파일 제공 중 오류가 발생했습니다: {str(e)}")

# HEAD 요청 처리를 위한 별도 엔드포인트 추가
@app.head("/api/audio/{participant_id}/{session_id}/{filename}")
async def head_audio_file(participant_id: str, session_id: str, filename: str):
    """오디오 파일 헤더 정보만 제공하는 API (HEAD 요청용)"""
    try:
        audio_filepath = os.path.join(LOG_DIR, participant_id, session_id, filename)
        
        print(f"🔍 오디오 파일 HEAD 요청: {audio_filepath}")
        
        if not os.path.exists(audio_filepath):
            print(f"❌ 오디오 파일 없음: {audio_filepath}")
            raise HTTPException(status_code=404, detail="오디오 파일을 찾을 수 없습니다.")
        
        file_size = os.path.getsize(audio_filepath)
        print(f"✅ 오디오 파일 HEAD 응답: {audio_filepath} (크기: {file_size} bytes)")
        
        from fastapi import Response
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "audio/mpeg",
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 오디오 파일 HEAD 요청 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"오디오 파일 헤더 요청 중 오류가 발생했습니다: {str(e)}")

# OPTIONS 요청 처리를 위한 별도 엔드포인트 추가
@app.options("/api/audio/{participant_id}/{session_id}/{filename}")
async def options_audio_file(participant_id: str, session_id: str, filename: str):
    """오디오 파일 OPTIONS 요청 처리 (CORS preflight)"""
    from fastapi import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400"
        }
    )

@app.post("/chat", response_model=RetryChatResponse)
async def retry_chat(request: RetryChatRequest):
    """Retry 페이지용 채팅 API"""
    try:
        print(f"🔄 Retry 채팅 요청: {request.userData.get('name', 'Unknown')}")
        
        # OpenAI API 키 확인
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
        
        # 시스템 프롬프트 설정 (재연습용)
        system_prompt = """당신은 50대 남성의 경험 많은 내과 의사입니다. 환자와의 대화에서 다음 사항을 지켜주세요:

1. 무심한 말투로 대화하세요.
2. 의학용어는 쉽게 설명하되, 간결하게 하세요.
3. 환자의 메시지에 대해 간결하게, 적절한 응답을 해주세요.
4. 길게 말하지 말고, 존대말로 하세요.

환자는 다음의 사항 중에 하나 또는 여러 개를 물어볼거야.
환자의 메시지에 따라 적절한 응답을 해주세요.

환자 입장에서 꼭 말해야 하는 것:
1. symptom_location: 어디가 아픈지 구체적인 위치
2. symptom_timing: 언제부터 아픈지 시작 시기  
3. symptom_severity: 증상이 얼마나 심한지 강도
4. current_medication: 현재 복용 중인 약물
5. allergy_info: 알레르기 여부

진료과정 중에 의사한테 꼭 들어야 하는 것:
6. diagnosis_info: 의사의 진단명과 진단 근거
7. prescription_info: 처방약의 이름과 복용 방법
8. side_effects: 약의 부작용과 주의사항
9. followup_plan: 다음 진료 계획과 재방문 시기
10. emergency_plan: 증상 악화 시 언제 다시 와야 하는지
"""
        
        # 사용자 메시지에 컨텍스트 추가
        user_message = f"환자: {request.message}"
        
        # OpenAI API 호출
        client = openai.OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        bot_response = response.choices[0].message.content.strip()
        
        # 대화 로그 저장
        try:
            # participant_id 우선, 없으면 name 사용
            user_identifier = request.userData.get('participantId', request.userData.get('name', 'Unknown'))
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_filename = f"user_data_{user_identifier}_{timestamp}.json"
            log_filepath = os.path.join(DATA_DIR, log_filename)
            
            log_data = {
                "userData": request.userData,
                "participant_id": user_identifier,  # 명시적으로 participant_id 저장
                "sessionType": request.sessionType,
                "timestamp": datetime.now().isoformat(),
                "conversation": [
                    {"role": "user", "content": request.message},
                    {"role": "assistant", "content": bot_response}
                ]
            }
            
            with open(log_filepath, 'w', encoding='utf-8') as f:
                json.dump(log_data, f, ensure_ascii=False, indent=2)
                
            print(f"✅ Retry 대화 로그 저장: {log_filename}")
            
        except Exception as e:
            print(f"⚠️ 로그 저장 실패: {e}")
        
        return RetryChatResponse(
            response=bot_response,
            success=True
        )
        
    except Exception as e:
        print(f"❌ Retry 채팅 오류: {e}")
        raise HTTPException(status_code=500, detail=f"채팅 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/get-feedback/{participant_id}", response_model=EvaluationResponse)
async def get_feedback_by_participant(participant_id: str):
    """참가자 ID로 피드백 데이터를 가져오는 API"""
    try:
        print(f"📋 피드백 요청: {participant_id}")
        
        # 참가자별 디렉토리 확인
        participant_dir = os.path.join(LOG_DIR, participant_id)
        if not os.path.exists(participant_dir):
            print(f"⚠️ 참가자 디렉토리가 없습니다: {participant_dir}")
            return EvaluationResponse(
                status="success",
                evaluation={
                    "grades": {
                        "symptom_location": "중",
                        "symptom_timing": "중",
                        "symptom_severity": "중",
                        "current_medication": "중",
                        "allergy_info": "중",
                        "diagnosis_info": "중",
                        "prescription_info": "중",
                        "side_effects": "중",
                        "followup_plan": "중",
                        "emergency_plan": "중"
                    },
                    "score_reasons": {
                        "symptom_location": "평가 정보가 없습니다.",
                        "symptom_timing": "평가 정보가 없습니다.",
                        "symptom_severity": "평가 정보가 없습니다.",
                        "current_medication": "평가 정보가 없습니다.",
                        "allergy_info": "평가 정보가 없습니다.",
                        "diagnosis_info": "평가 정보가 없습니다.",
                        "prescription_info": "평가 정보가 없습니다.",
                        "side_effects": "평가 정보가 없습니다.",
                        "followup_plan": "평가 정보가 없습니다.",
                        "emergency_plan": "평가 정보가 없습니다."
                    },
                    "improvement_tips": ["더 많은 정보를 제공해주세요."]
                },
                message="기본 평가 데이터를 반환합니다."
            )
        
        # 세션 폴더들 찾기
        session_folders = []
        for item in os.listdir(participant_dir):
            item_path = os.path.join(participant_dir, item)
            if os.path.isdir(item_path) and item.startswith('session_'):
                session_folders.append(item)
        
        if not session_folders:
            print(f"⚠️ 세션 폴더가 없습니다: {participant_dir}")
            return EvaluationResponse(
                status="success",
                evaluation={
                    "grades": {
                        "symptom_location": "중",
                        "symptom_timing": "중",
                        "symptom_severity": "중",
                        "current_medication": "중",
                        "allergy_info": "중",
                        "diagnosis_info": "중",
                        "prescription_info": "중",
                        "side_effects": "중",
                        "followup_plan": "중",
                        "emergency_plan": "중"
                    },
                    "score_reasons": {
                        "symptom_location": "평가 정보가 없습니다.",
                        "symptom_timing": "평가 정보가 없습니다.",
                        "symptom_severity": "평가 정보가 없습니다.",
                        "current_medication": "평가 정보가 없습니다.",
                        "allergy_info": "평가 정보가 없습니다.",
                        "diagnosis_info": "평가 정보가 없습니다.",
                        "prescription_info": "평가 정보가 없습니다.",
                        "side_effects": "평가 정보가 없습니다.",
                        "followup_plan": "평가 정보가 없습니다.",
                        "emergency_plan": "평가 정보가 없습니다."
                    },
                    "improvement_tips": ["더 많은 정보를 제공해주세요."]
                },
                message="기본 평가 데이터를 반환합니다."
            )
        
        # 가장 최근 세션에서 피드백 파일 찾기
        latest_session = sorted(session_folders, reverse=True)[0]
        session_dir = os.path.join(participant_dir, latest_session)
        
        feedback_files = []
        for filename in os.listdir(session_dir):
            if filename.startswith('feedback_') and filename.endswith('.json'):
                feedback_files.append(filename)
        
        if not feedback_files:
            print(f"⚠️ 피드백 파일이 없습니다: {session_dir}")
            return EvaluationResponse(
                status="success",
                evaluation={
                    "grades": {
                        "symptom_location": "중",
                        "symptom_timing": "중",
                        "symptom_severity": "중",
                        "current_medication": "중",
                        "allergy_info": "중",
                        "diagnosis_info": "중",
                        "prescription_info": "중",
                        "side_effects": "중",
                        "followup_plan": "중",
                        "emergency_plan": "중"
                    },
                    "score_reasons": {
                        "symptom_location": "평가 정보가 없습니다.",
                        "symptom_timing": "평가 정보가 없습니다.",
                        "symptom_severity": "평가 정보가 없습니다.",
                        "current_medication": "평가 정보가 없습니다.",
                        "allergy_info": "평가 정보가 없습니다.",
                        "diagnosis_info": "평가 정보가 없습니다.",
                        "prescription_info": "평가 정보가 없습니다.",
                        "side_effects": "평가 정보가 없습니다.",
                        "followup_plan": "평가 정보가 없습니다.",
                        "emergency_plan": "평가 정보가 없습니다."
                    },
                    "improvement_tips": ["더 많은 정보를 제공해주세요."]
                },
                message="기본 평가 데이터를 반환합니다."
            )
        
        # 가장 최근 피드백 파일 읽기
        latest_feedback = sorted(feedback_files, reverse=True)[0]
        feedback_filepath = os.path.join(session_dir, latest_feedback)
        
        with open(feedback_filepath, 'r', encoding='utf-8') as f:
            feedback_data = json.load(f)
        
        return EvaluationResponse(
            status="success",
            evaluation=feedback_data.get('evaluation', {}),
            message="피드백 데이터를 성공적으로 가져왔습니다."
        )
        
    except Exception as e:
        print(f"❌ 피드백 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=f"피드백 가져오기 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/get-voice-analysis/{participant_id}", response_model=VoiceAnalysisResponse)
async def get_voice_analysis_by_participant(participant_id: str):
    """참가자 ID로 음성 분석 데이터를 가져오는 API"""
    try:
        print(f"📋 음성 분석 요청: {participant_id}")
        
        # 참가자별 디렉토리 확인
        participant_dir = os.path.join(LOG_DIR, participant_id)
        if not os.path.exists(participant_dir):
            print(f"⚠️ 참가자 디렉토리가 없습니다: {participant_dir}")
            return VoiceAnalysisResponse(
                status="success",
                analysis={
                    "summary": "자연스럽고 편안한 대화를 이어가셨습니다.",
                    "details": "음성 분석 데이터가 없습니다.",
                    "communication_style": "자연스러운 대화",
                    "strengths": ["자연스러운 대화"],
                    "areas_for_improvement": []
                },
                message="기본 음성 분석 데이터를 반환합니다."
            )
        
        # 세션 폴더들 찾기
        session_folders = []
        for item in os.listdir(participant_dir):
            item_path = os.path.join(participant_dir, item)
            if os.path.isdir(item_path) and item.startswith('session_'):
                session_folders.append(item)
        
        if not session_folders:
            print(f"⚠️ 세션 폴더가 없습니다: {participant_dir}")
            return VoiceAnalysisResponse(
                status="success",
                analysis={
                    "summary": "자연스럽고 편안한 대화를 이어가셨습니다.",
                    "details": "음성 분석 데이터가 없습니다.",
                    "communication_style": "자연스러운 대화",
                    "strengths": ["자연스러운 대화"],
                    "areas_for_improvement": []
                },
                message="기본 음성 분석 데이터를 반환합니다."
            )
        
        # 가장 최근 세션에서 음성 분석 파일 찾기
        latest_session = sorted(session_folders, reverse=True)[0]
        session_dir = os.path.join(participant_dir, latest_session)
        
        voice_analysis_files = []
        for filename in os.listdir(session_dir):
            if filename.startswith('voice_analysis_') and filename.endswith('.json'):
                voice_analysis_files.append(filename)
        
        if not voice_analysis_files:
            print(f"⚠️ 음성 분석 파일이 없습니다: {session_dir}")
            return VoiceAnalysisResponse(
                status="success",
                analysis={
                    "summary": "자연스럽고 편안한 대화를 이어가셨습니다.",
                    "details": "음성 분석 데이터가 없습니다.",
                    "communication_style": "자연스러운 대화",
                    "strengths": ["자연스러운 대화"],
                    "areas_for_improvement": []
                },
                message="기본 음성 분석 데이터를 반환합니다."
            )
        
        # 가장 최근 음성 분석 파일 읽기
        latest_analysis = sorted(voice_analysis_files, reverse=True)[0]
        analysis_filepath = os.path.join(session_dir, latest_analysis)
        
        with open(analysis_filepath, 'r', encoding='utf-8') as f:
            analysis_data = json.load(f)
        
        return VoiceAnalysisResponse(
            status="success",
            analysis=analysis_data.get('analysis', {}),
            message="음성 분석 데이터를 성공적으로 가져왔습니다."
        )
        
    except Exception as e:
        print(f"❌ 음성 분석 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=f"음성 분석 가져오기 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/get-feedback/{participant_id}/{session_id}", response_model=EvaluationResponse)
async def get_feedback_by_session(participant_id: str, session_id: str):
    """특정 세션의 피드백 데이터를 가져오는 API"""
    try:
        print(f"📋 세션별 피드백 요청: {participant_id}/{session_id}")
        
        # 세션 디렉토리 확인
        session_dir = os.path.join(LOG_DIR, participant_id, session_id)
        if not os.path.exists(session_dir):
            print(f"⚠️ 세션 디렉토리가 없습니다: {session_dir}")
            return EvaluationResponse(
                status="success",
                evaluation={
                    "grades": {
                        "symptom_location": "중",
                        "symptom_timing": "중",
                        "symptom_severity": "중",
                        "current_medication": "중",
                        "allergy_info": "중",
                        "diagnosis_info": "중",
                        "prescription_info": "중",
                        "side_effects": "중",
                        "followup_plan": "중",
                        "emergency_plan": "중"
                    },
                    "score_reasons": {
                        "symptom_location": "평가 정보가 없습니다.",
                        "symptom_timing": "평가 정보가 없습니다.",
                        "symptom_severity": "평가 정보가 없습니다.",
                        "current_medication": "평가 정보가 없습니다.",
                        "allergy_info": "평가 정보가 없습니다.",
                        "diagnosis_info": "평가 정보가 없습니다.",
                        "prescription_info": "평가 정보가 없습니다.",
                        "side_effects": "평가 정보가 없습니다.",
                        "followup_plan": "평가 정보가 없습니다.",
                        "emergency_plan": "평가 정보가 없습니다."
                    },
                    "improvement_tips": ["더 많은 정보를 제공해주세요."]
                },
                message="기본 평가 데이터를 반환합니다."
            )
        
        # 세션 폴더에서 피드백 파일 찾기
        feedback_files = []
        for filename in os.listdir(session_dir):
            if filename.startswith('feedback_') and filename.endswith('.json'):
                feedback_files.append(filename)
        
        if not feedback_files:
            print(f"⚠️ 피드백 파일이 없습니다: {session_dir}")
            return EvaluationResponse(
                status="success",
                evaluation={
                    "grades": {
                        "symptom_location": "중",
                        "symptom_timing": "중",
                        "symptom_severity": "중",
                        "current_medication": "중",
                        "allergy_info": "중",
                        "diagnosis_info": "중",
                        "prescription_info": "중",
                        "side_effects": "중",
                        "followup_plan": "중",
                        "emergency_plan": "중"
                    },
                    "score_reasons": {
                        "symptom_location": "평가 정보가 없습니다.",
                        "symptom_timing": "평가 정보가 없습니다.",
                        "symptom_severity": "평가 정보가 없습니다.",
                        "current_medication": "평가 정보가 없습니다.",
                        "allergy_info": "평가 정보가 없습니다.",
                        "diagnosis_info": "평가 정보가 없습니다.",
                        "prescription_info": "평가 정보가 없습니다.",
                        "side_effects": "평가 정보가 없습니다.",
                        "followup_plan": "평가 정보가 없습니다.",
                        "emergency_plan": "평가 정보가 없습니다."
                    },
                    "improvement_tips": ["더 많은 정보를 제공해주세요."]
                },
                message="기본 평가 데이터를 반환합니다."
            )
        
        # 가장 최근 피드백 파일 읽기
        latest_feedback = sorted(feedback_files, reverse=True)[0]
        feedback_filepath = os.path.join(session_dir, latest_feedback)
        
        with open(feedback_filepath, 'r', encoding='utf-8') as f:
            feedback_data = json.load(f)
        
        return EvaluationResponse(
            status="success",
            evaluation=feedback_data.get('evaluation', {}),
            message="피드백 데이터를 성공적으로 가져왔습니다."
        )
        
    except Exception as e:
        print(f"❌ 세션별 피드백 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=f"세션별 피드백 가져오기 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/get-voice-analysis/{participant_id}/{session_id}", response_model=VoiceAnalysisResponse)
async def get_voice_analysis_by_session(participant_id: str, session_id: str):
    """특정 세션의 음성 분석 데이터를 가져오는 API"""
    try:
        print(f"📋 세션별 음성 분석 요청: {participant_id}/{session_id}")
        
        # 세션 디렉토리 확인
        session_dir = os.path.join(LOG_DIR, participant_id, session_id)
        if not os.path.exists(session_dir):
            print(f"⚠️ 세션 디렉토리가 없습니다: {session_dir}")
            return VoiceAnalysisResponse(
                status="success",
                analysis={
                    "summary": "자연스럽고 편안한 대화를 이어가셨습니다.",
                    "details": "음성 분석 데이터가 없습니다.",
                    "communication_style": "자연스러운 대화",
                    "strengths": ["자연스러운 대화"],
                    "areas_for_improvement": []
                },
                message="기본 음성 분석 데이터를 반환합니다."
            )
        
        # 세션 폴더에서 음성 분석 파일 찾기
        voice_analysis_files = []
        for filename in os.listdir(session_dir):
            if filename.startswith('voice_analysis_') and filename.endswith('.json'):
                voice_analysis_files.append(filename)
        
        if not voice_analysis_files:
            print(f"⚠️ 음성 분석 파일이 없습니다: {session_dir}")
            return VoiceAnalysisResponse(
                status="success",
                analysis={
                    "summary": "자연스럽고 편안한 대화를 이어가셨습니다.",
                    "details": "음성 분석 데이터가 없습니다.",
                    "communication_style": "자연스러운 대화",
                    "strengths": ["자연스러운 대화"],
                    "areas_for_improvement": []
                },
                message="기본 음성 분석 데이터를 반환합니다."
            )
        
        # 가장 최근 음성 분석 파일 읽기
        latest_analysis = sorted(voice_analysis_files, reverse=True)[0]
        analysis_filepath = os.path.join(session_dir, latest_analysis)
        
        with open(analysis_filepath, 'r', encoding='utf-8') as f:
            analysis_data = json.load(f)
        
        return VoiceAnalysisResponse(
            status="success",
            analysis=analysis_data.get('analysis', {}),
            message="음성 분석 데이터를 성공적으로 가져왔습니다."
        )
        
    except Exception as e:
        print(f"❌ 세션별 음성 분석 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=f"세션별 음성 분석 가져오기 중 오류가 발생했습니다: {str(e)}")

@app.post("/get-feedback", response_model=FeedbackResponse)
async def get_feedback(request: FeedbackRequest):
    """사용자의 피드백 데이터를 가져오는 API (기존 호환성 유지)"""
    try:
        print(f"📋 피드백 요청: {request.userData.get('name', 'Unknown')}")
        
        user_name = request.userData.get('name', 'Unknown')
        
        # 최근 피드백 파일 찾기
        feedback_files = []
        for filename in os.listdir(DATA_DIR):
            if filename.startswith(f"user_data_{user_name}_") and "feedback" in filename:
                feedback_files.append(filename)
        
        if not feedback_files:
            # 기본 피드백 데이터 반환
            default_feedback = {
                "communication": {
                    "greeting": "중",
                    "symptom_inquiry": "중",
                    "explanation": "중",
                    "empathy": "중",
                    "closing": "중"
                },
                "medical_knowledge": {
                    "diagnosis": "중",
                    "treatment": "중",
                    "medication": "중",
                    "follow_up": "중"
                }
            }
            
            return FeedbackResponse(
                status="success",
                feedback=default_feedback,
                message="기본 피드백 데이터를 반환합니다."
            )
        
        # 가장 최근 피드백 파일 읽기
        latest_feedback = sorted(feedback_files)[-1]
        feedback_filepath = os.path.join(DATA_DIR, latest_feedback)
        
        with open(feedback_filepath, 'r', encoding='utf-8') as f:
            feedback_data = json.load(f)
        
        return FeedbackResponse(
            status="success",
            feedback=feedback_data.get('feedback', {}),
            message="피드백 데이터를 성공적으로 가져왔습니다."
        )
        
    except Exception as e:
        print(f"❌ 피드백 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=f"피드백 가져오기 중 오류가 발생했습니다: {str(e)}")

@app.post("/get-logs", response_model=LogsResponse)
async def get_logs(request: LogsRequest):
    """사용자의 대화 로그를 가져오는 API"""
    try:
        print(f"📋 로그 요청: {request.userData.get('name', 'Unknown')}")
        
        user_name = request.userData.get('name', 'Unknown')
        
        # 사용자 관련 로그 파일들 찾기
        log_files = []
        for filename in os.listdir(DATA_DIR):
            if filename.startswith(f"user_data_{user_name}_") and filename.endswith('.json'):
                log_files.append(filename)
        
        logs = []
        for filename in sorted(log_files, reverse=True)[:10]:  # 최근 10개만
            try:
                log_filepath = os.path.join(DATA_DIR, filename)
                with open(log_filepath, 'r', encoding='utf-8') as f:
                    log_data = json.load(f)
                
                # 대화 메시지 추출
                messages = []
                if 'conversation' in log_data:
                    for msg in log_data['conversation']:
                        messages.append({
                            'sender': 'user' if msg['role'] == 'user' else 'bot',
                            'content': msg['content']
                        })
                
                logs.append({
                    'timestamp': log_data.get('timestamp', ''),
                    'messages': messages,
                    'sessionType': log_data.get('sessionType', 'unknown')
                })
                
            except Exception as e:
                print(f"⚠️ 로그 파일 읽기 실패 {filename}: {e}")
                continue
        
        return LogsResponse(
            status="success",
            logs=logs,
            message=f"총 {len(logs)}개의 로그를 가져왔습니다."
        )
        
    except Exception as e:
        print(f"❌ 로그 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=f"로그 가져오기 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/check-quests", response_model=QuestCheckResponse)
async def check_quests(request: QuestCheckRequest):
    """LLM을 사용하여 퀘스트 달성 여부를 체크하는 API"""
    try:
        print(f"🔍 퀘스트 체크 요청: 세션 {request.session_id}, 참가자 {request.participant_id}")
        print(f"📝 대화 길이: {len(request.conversation_history)}개 메시지")
        print(f"🎯 체크할 퀘스트: {len(request.quests)}개")
        
        # OpenAI API 키 확인
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
        
        # 대화 내용을 텍스트로 변환
        conversation_text = ""
        for msg in request.conversation_history:
            role = "환자" if msg.get('sender') == 'user' else "의사"
            content = msg.get('content', '')
            conversation_text += f"{role}: {content}\n"
        
        # 퀘스트 정보 구성 (ID를 명확하게 포함)
        quests_info = ""
        for quest in request.quests:
            quests_info += f"- ID: {quest['id']}, 제목: {quest['title']}, 설명: {quest['description']} (등급: {quest['grade']})\n"
        
        # LLM 프롬프트 구성
        prompt = f"""
다음은 의료 진료 연습 대화입니다. 환자의 입장에서, 각 퀘스트 항목이 달성되었는지 판단해주세요.

세션 정보: {request.session_id}
참가자: {request.participant_id}

대화 내용:
{conversation_text}

체크해야 할 퀘스트 항목들:
{quests_info}

각 퀘스트 항목에 대해 다음 기준으로 판단해주세요:
1. "달성": 대화에서 해당 항목이 다뤄짐
2. "미달성": 해당 항목이 전혀 다뤄지지 않음

다음 JSON 형식으로 응답해주세요. quest_id는 정확히 제공된 ID를 사용하세요:
{{
    "completed_quests": [
        {{
            "quest_id": "정확한_퀘스트_ID",
            "status": "달성 / 미달성",
            "reason": "판단 이유",
            "suggestion": "개선 제안 (부분 달성이나 미달성인 경우)"
        }}
    ]
}}
"""
        
        # OpenAI API 호출
        openai.api_key = openai_api_key
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "당신은 환자의 의료 진료 상황 연습을 위한 퀘스트 평가 전문가입니다. 객관적이고 정확한 평가를 제공해주세요. 퀘스트 ID는 정확히 제공된 ID를 사용해야 합니다. 이것은 환자 입장에서 수행하는 것입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        # 응답 파싱
        try:
            result_text = response.choices[0].message.content
            print(f"🤖 LLM 응답: {result_text}")
            
            import re
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_data = json.loads(json_match.group())
                completed_quests = result_data.get('completed_quests', [])
                print(f"✅ 파싱된 퀘스트 결과: {len(completed_quests)}개")
            else:
                completed_quests = []
                print("⚠️ JSON 파싱 실패")
        except json.JSONDecodeError as e:
            completed_quests = []
            print(f"❌ JSON 파싱 오류: {e}")
        
        return QuestCheckResponse(
            status="success",
            completed_quests=completed_quests,
            message="퀘스트 체크가 완료되었습니다."
        )
        
    except Exception as e:
        print(f"❌ 퀘스트 체크 오류: {e}")
        raise HTTPException(status_code=500, detail=f"퀘스트 체크 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/save-cheatsheet", response_model=SaveCheatsheetResponse)
async def save_cheatsheet(request: SaveCheatsheetRequest):
    """치트시트를 저장하는 API"""
    try:
        participant_id = request.participant_id
        print(f"💾 치트시트 저장 시작: {participant_id}")
        
        # 참가자별 디렉토리 확인
        participant_dir = os.path.join(LOG_DIR, participant_id)
        if not os.path.exists(participant_dir):
            os.makedirs(participant_dir)
        
        # 치트시트 파일명 생성
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        cheatsheet_filename = f"cheatsheet_{timestamp}.json"
        cheatsheet_filepath = os.path.join(participant_dir, cheatsheet_filename)
        
        # 치트시트 데이터 저장
        cheatsheet_data = {
            "participant_id": participant_id,
            "timestamp": request.timestamp,
            "cheatsheet": request.cheatsheet_data
        }
        
        with open(cheatsheet_filepath, 'w', encoding='utf-8') as f:
            json.dump(cheatsheet_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 치트시트 저장 완료: {cheatsheet_filepath}")
        
        return SaveCheatsheetResponse(
            status="success",
            message="치트시트가 성공적으로 저장되었습니다."
        )
        
    except Exception as e:
        print(f"❌ 치트시트 저장 오류: {e}")
        raise HTTPException(status_code=500, detail=f"치트시트 저장 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/get-cheatsheet-history/{participant_id}", response_model=GetCheatsheetHistoryResponse)
async def get_cheatsheet_history(participant_id: str):
    """참가자의 치트시트 히스토리를 가져오는 API"""
    try:
        print(f"📋 치트시트 히스토리 요청: {participant_id}")
        
        # 참가자별 디렉토리 확인
        participant_dir = os.path.join(LOG_DIR, participant_id)
        if not os.path.exists(participant_dir):
            return GetCheatsheetHistoryResponse(
                status="success",
                cheatsheets=[],
                message="치트시트 히스토리가 없습니다."
            )
        
        # 치트시트 파일들 찾기
        cheatsheet_files = []
        for filename in os.listdir(participant_dir):
            if filename.startswith('cheatsheet_') and filename.endswith('.json'):
                cheatsheet_files.append(filename)
        
        if not cheatsheet_files:
            return GetCheatsheetHistoryResponse(
                status="success",
                cheatsheets=[],
                message="치트시트 히스토리가 없습니다."
            )
        
        # 치트시트 데이터 로드
        cheatsheets = []
        for filename in sorted(cheatsheet_files, reverse=True):
            filepath = os.path.join(participant_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    cheatsheet_data = json.load(f)
                    cheatsheets.append(cheatsheet_data)
            except Exception as e:
                print(f"⚠️ 치트시트 파일 읽기 실패 {filename}: {e}")
                continue
        
        return GetCheatsheetHistoryResponse(
            status="success",
            cheatsheets=cheatsheets,
            message=f"총 {len(cheatsheets)}개의 치트시트를 가져왔습니다."
        )
        
    except Exception as e:
        print(f"❌ 치트시트 히스토리 가져오기 오류: {e}")
        raise HTTPException(status_code=500, detail=f"치트시트 히스토리 가져오기 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/generate-cheatsheet", response_model=CheatsheetResponse)
async def generate_cheatsheet(request: CheatsheetRequest):
    """참가자의 대화 기록을 바탕으로 맞춤형 진료 스크립트를 생성하는 API"""
    try:
        participant_id = request.participant_id
        print(f"📋 치트시트 생성 시작: {participant_id}")
        
        # OpenAI API 키 확인
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API 키가 설정되지 않았습니다.")
        
        conversation_text = ""
        
        # 1. 정규 채팅 세션 데이터 수집 (logs 디렉토리)
        participant_dir = os.path.join(LOG_DIR, participant_id)
        if os.path.exists(participant_dir):
            # 세션 디렉토리 찾기
            session_dirs = [d for d in os.listdir(participant_dir) if d.startswith('session_')]
            if session_dirs:
                # 최신 세션 선택
                latest_session = max(session_dirs, key=lambda x: os.path.getctime(os.path.join(participant_dir, x)))
                logs_filepath = os.path.join(participant_dir, latest_session, "chat_session.json")
                
                if os.path.exists(logs_filepath):
                    # 로그 파일 읽기
                    with open(logs_filepath, 'r', encoding='utf-8') as f:
                        logs_data = json.load(f)
                    
                    # 정규 세션 대화 내용 추출
                    for message in logs_data.get('messages', []):
                        if message.get('user_message'):
                            conversation_text += f"환자: {message['user_message']}\n"
                        if message.get('doctor_response'):
                            conversation_text += f"의사: {message['doctor_response']}\n"
                    
                    print(f"✅ 정규 세션 대화 데이터 로드: {len(logs_data.get('messages', []))}개 메시지")
        
        # 2. Retry 채팅 데이터 수집 (data 디렉토리)
        retry_conversation_text = ""
        retry_files = []
        
        # participant_id와 매칭되는 retry 파일들 찾기
        if os.path.exists(DATA_DIR):
            for filename in os.listdir(DATA_DIR):
                # participant_id로 시작하거나 파일 내용에서 participant_id가 매칭되는 파일 찾기
                if filename.startswith(f"user_data_{participant_id}_") and filename.endswith('.json'):
                    retry_files.append(filename)
                elif filename.startswith("user_data_") and filename.endswith('.json'):
                    # 파일 내용을 확인하여 participant_id 매칭
                    try:
                        temp_filepath = os.path.join(DATA_DIR, filename)
                        with open(temp_filepath, 'r', encoding='utf-8') as f:
                            temp_data = json.load(f)
                        if temp_data.get('participant_id') == participant_id:
                            retry_files.append(filename)
                    except:
                        continue
        
        # 최신 retry 파일들 처리 (최근 5개)
        retry_files.sort(reverse=True)
        for filename in retry_files[:5]:
            try:
                retry_filepath = os.path.join(DATA_DIR, filename)
                with open(retry_filepath, 'r', encoding='utf-8') as f:
                    retry_data = json.load(f)
                
                # retry 대화 내용 추출
                if 'conversation' in retry_data:
                    for msg in retry_data['conversation']:
                        if msg['role'] == 'user':
                            retry_conversation_text += f"환자: {msg['content']}\n"
                        elif msg['role'] == 'assistant':
                            retry_conversation_text += f"의사: {msg['content']}\n"
            except Exception as e:
                print(f"⚠️ Retry 파일 읽기 실패 {filename}: {e}")
                continue
        
        if retry_conversation_text:
            conversation_text += "\n--- Retry 연습 대화 ---\n" + retry_conversation_text
            print(f"✅ Retry 대화 데이터 로드: {len(retry_files[:5])}개 파일")
        
        # 최종 대화 데이터 상태 로깅
        total_chars = len(conversation_text)
        print(f"📊 총 대화 데이터 크기: {total_chars}자")
        
        # 대화 데이터가 없는 경우
        if not conversation_text.strip():
            print(f"⚠️ 대화 데이터 없음 - participant_id: {participant_id}")
            print(f"⚠️ LOG_DIR 상태: {os.path.exists(LOG_DIR)}")
            print(f"⚠️ DATA_DIR 상태: {os.path.exists(DATA_DIR)}")
            if os.path.exists(DATA_DIR):
                data_files = [f for f in os.listdir(DATA_DIR) if f.startswith(f"user_data_{participant_id}_")]
                print(f"⚠️ 참가자 관련 데이터 파일: {data_files}")
            raise HTTPException(status_code=404, detail="대화 로그를 찾을 수 없습니다.")
        
        # LLM 프롬프트 구성
        prompt = f"""
다음은 의료 진료 연습 대화입니다. 이 대화는 정규 진료 연습과 Retry 연습 대화를 모두 포함합니다. 
이 모든 대화를 종합적으로 분석하여 환자가 실제 진료에서 사용할 수 있는 맞춤형 스크립트를 생성해주세요.

참가자 ID: {participant_id}

대화 내용:
{conversation_text}

대화 내용을 기반으로 환자의 실제 정보와 연습 경험을 반영하여, 다음 두 가지 섹션으로 구성된 진료 스크립트를 생성해주세요:

(1) 환자 입장에서 꼭 말해야 하는 것:
1. symptom_location: 어디가 아픈지 구체적인 위치
2. symptom_timing: 언제부터 아픈지 시작 시기  
3. symptom_severity: 증상이 얼마나 심한지 강도
4. current_medication: 현재 복용 중인 약물
5. allergy_info: 알레르기 여부

(2) 진료과정 중에 환자가 꼭 들어야 하는 것:
6. diagnosis_info: 의사의 진단명과 진단 근거
7. prescription_info: 처방약의 이름과 복용 방법
8. side_effects: 약의 부작용과 주의사항
9. followup_plan: 다음 진료 계획과 재방문 시기
10. emergency_plan: 증상 악화 시 언제 다시 와야 하는지

각 항목은 구체적이고 실용적이어야 해요.
만약, 대화 내용에서 확인이 안 되는 내용의 경우에는, 말해야하는 형식을 만들어.
그리고, 빈칸을 비워두고 환자가 빈칸을 채워서 말할 수 있게 해주세요.

다음 JSON 형식으로 응답해주세요:
{{
    "cheatsheet": {{
        "script": [
            {{
                "title": "symptom_location",
                "content": "구체적인 스크립트 내용"
            }}
        ],
        "listening": [
            {{
                "title": "diagnosis_info",
                "content": "의사에게 물어보거나 들을 수 있는 내용"
            }}
        ]
    }}
}}
"""
        
        # OpenAI API 호출
        openai.api_key = openai_api_key
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "당신은 환자를 위한 진료 시에 사용할 스크립트 생성 전문가입니다. 북한이탈주민의 특성을 고려하여 실용적이고 구체적인 스크립트를 제공해주세요."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        # 응답 파싱
        try:
            result_text = response.choices[0].message.content
            print(f"🤖 LLM 응답: {result_text}")
            
            import re
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_data = json.loads(json_match.group())
                cheatsheet_data = result_data.get('cheatsheet', {})
                print(f"✅ 파싱된 치트시트: {len(cheatsheet_data.get('script', []))}개 스크립트")
            else:
                # 기본 치트시트 생성
                cheatsheet_data = {
                    "script": [
                        {"title": "증상 위치", "content": "어디가 아픈지 구체적으로 말씀드리겠습니다."},
                        {"title": "증상 시작 시기", "content": "언제부터 아픈지 정확히 말씀드리겠습니다."}
                    ],
                    "listening": [
                        {"title": "진단명과 근거", "content": "진단명과 그 근거를 설명드리겠습니다."},
                        {"title": "처방약 정보", "content": "처방약의 이름과 복용 방법을 설명드리겠습니다."}
                    ]
                }
                print("⚠️ JSON 파싱 실패, 기본 치트시트 사용")
        except json.JSONDecodeError as e:
            # 기본 치트시트 생성
            cheatsheet_data = {
                "script": [
                    {"title": "증상 위치", "content": "어디가 아픈지 구체적으로 말씀드리겠습니다."},
                    {"title": "증상 시작 시기", "content": "언제부터 아픈지 정확히 말씀드리겠습니다."}
                ],
                "listening": [
                    {"title": "진단명과 근거", "content": "진단명과 그 근거를 설명드리겠습니다."},
                    {"title": "처방약 정보", "content": "처방약의 이름과 복용 방법을 설명드리겠습니다."}
                ]
            }
            print(f"❌ JSON 파싱 오류: {e}, 기본 치트시트 사용")
        
        return CheatsheetResponse(
            status="success",
            cheatsheet=cheatsheet_data,
            message="진료 스크립트가 성공적으로 생성되었습니다."
        )
        
    except Exception as e:
        print(f"❌ 치트시트 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=f"치트시트 생성 중 오류가 발생했습니다: {str(e)}")

if __name__ == "__main__":
    # 환경변수 확인
    print("🔑 환경변수 상태:")
    print(f"   OpenAI API Key: {'✅ 설정됨' if os.getenv('OPENAI_API_KEY') else '❌ 설정되지 않음'}")
    print(f"   ElevenLabs API Key: {'✅ 설정됨' if os.getenv('ELEVENLABS_API_KEY') else '❌ 설정되지 않음'}")
    print(f"   ElevenLabs Voice ID: {os.getenv('ELEVENLABS_VOICE_ID', 'BNr4zvrC1bGIdIstzjFQ')}")
    print()
    
    print("📁 로그 디렉토리:")
    print(f"   로그 폴더: {os.path.abspath(LOG_DIR)}")
    print(f"   데이터 폴더: {os.path.abspath(DATA_DIR)}")
    print()
    
    print("🚀 FastAPI 서버가 포트 8000에서 실행중입니다.")
    print("📖 API 문서: http://localhost:8000/docs")
    print("🔍 환경변수 확인: http://localhost:8000/env-info")
    print("💡 ngrok은 별도 터미널에서 'ngrok start'로 실행하세요")
    
    # uvicorn으로 서버 시작
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
