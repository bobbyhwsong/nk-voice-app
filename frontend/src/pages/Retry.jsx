import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Retry.css';

const Retry = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        {
            content: '안녕하세요, 어떻게 오셨나요?',
            sender: 'bot',
            time: '지금'
        }
    ]);
    const [textInput, setTextInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [quests, setQuests] = useState([]);
    const [completedQuests, setCompletedQuests] = useState(new Set());
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logs, setLogs] = useState([]);
    const [showQuestToast, setShowQuestToast] = useState(false);
    const [questToastMessage, setQuestToastMessage] = useState('');
    const [lastUserMessage, setLastUserMessage] = useState('');
    const [lastBotResponse, setLastBotResponse] = useState('');
    const [isCheckingQuest, setIsCheckingQuest] = useState(false);
    
    // 세션 ID 생성 (초기값은 빈 문자열로 설정)
    const [sessionId, setSessionId] = useState('');
    
    const chatMessagesRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthesisRef = useRef(null);
    const currentAudioRef = useRef(null);

    const [questCheckTimeout, setQuestCheckTimeout] = useState(null);

    // 퀘스트 체크 함수 (즉시 실행)
    const immediateQuestCheck = (userMessage, botResponse) => {
        checkQuestCompletion(userMessage, botResponse);
    };

    // API 기본 URL 설정
    const getApiBaseUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const backendUrl = urlParams.get('backend');
        if (backendUrl) {
            return backendUrl;
        }
        
        // ngrok 환경인지 확인
        if (window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io')) {
            // ngrok static domain 사용
            return 'https://helpful-elf-carefully.ngrok-free.app';
        }
        
        return 'http://localhost:8000';
    };

    // ngrok 요청을 위한 헤더 설정
    const getRequestHeaders = (includeContentType = true) => {
        const headers = {};
        
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        
        // ngrok 환경에서 필요한 헤더 추가
        const apiBaseUrl = getApiBaseUrl();
        if (apiBaseUrl.includes('ngrok-free.app') || apiBaseUrl.includes('ngrok.io')) {
            headers['ngrok-skip-browser-warning'] = 'true';
            headers['User-Agent'] = 'Mozilla/5.0 (compatible; API-Client)';
        }
        
        return headers;
    };

    // timeout이 포함된 fetch 함수
    const fetchWithTimeout = async (url, options, timeout = 30000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('timeout');
            }
            throw error;
        }
    };

    const apiBaseUrl = getApiBaseUrl();

    useEffect(() => {
        // 사용자 데이터 확인
        const userData = localStorage.getItem('userData');
        if (!userData) {
            alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
            navigate('/');
            return;
        }

        initializeSpeechRecognition();
        scrollToBottom();
        
        // 페이지 로드 시 새로운 세션 생성
        const newSessionId = `retry_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        console.log('🆔 페이지 로드 시 새 세션 생성:', newSessionId);
        
        // 퀘스트 로드
        loadQuestsFromFeedback();
        
        // 컴포넌트 언마운트 시 정리
        return () => {
            // 컴포넌트가 언마운트될 때 모든 음성 중지
            stopCurrentAudio();
            
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [navigate]);

    // 세션별 퀘스트 진행 상황 저장
    useEffect(() => {
        if (sessionId && completedQuests.size > 0) {
            const sessionProgress = {
                sessionId: sessionId,
                completedQuests: Array.from(completedQuests),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(`quest_progress_${sessionId}`, JSON.stringify(sessionProgress));
            console.log('💾 퀘스트 진행 상황 저장:', sessionProgress);
        }
    }, [completedQuests, sessionId]);

    // 세션별 퀘스트 진행 상황 복원
    useEffect(() => {
        if (sessionId) {
            const savedProgress = localStorage.getItem(`quest_progress_${sessionId}`);
            if (savedProgress) {
                try {
                    const progress = JSON.parse(savedProgress);
                    setCompletedQuests(new Set(progress.completedQuests));
                    console.log('📂 퀘스트 진행 상황 복원:', progress);
                } catch (error) {
                    console.error('퀘스트 진행 상황 복원 오류:', error);
                }
            }
        }
    }, [sessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const initializeSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setVoiceStatus('이 브라우저는 음성 인식을 지원하지 않습니다.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'ko-KR';

        recognitionRef.current.onstart = () => {
            // 음성 인식 시작 시 현재 재생 중인 음성 중지
            stopCurrentAudio();
            setIsRecording(true);
            setVoiceStatus('음성 인식 중...');
        };

        recognitionRef.current.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                setTextInput(finalTranscript);
                setVoiceStatus('');
                stopRecording();
                // 음성 인식 완료 시 현재 재생 중인 음성 중지
                stopCurrentAudio();
            } else if (interimTranscript) {
                setVoiceStatus(`듣는 중: ${interimTranscript}`);
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            setVoiceStatus(`음성 인식 오류: ${event.error}`);
            setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
            setIsRecording(false);
            setVoiceStatus('');
        };
    };

    const scrollToBottom = () => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    };

    const getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const addMessage = (content, sender, speak = true) => {
        const newMessage = {
            content,
            sender,
            time: getCurrentTime()
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // ElevenLabs 음성은 generateBotResponse에서 처리하므로 여기서는 기본 TTS 사용하지 않음
        if (speak && sender === 'bot') {
            // 기본 TTS는 ElevenLabs 실패 시에만 사용
            // speakMessage(content);
        }
    };

    const speakMessage = (text) => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            synthesisRef.current = utterance;
            speechSynthesis.speak(utterance);
        }
    };

    const playElevenLabsAudio = (audioUrl, onComplete = null) => {
        try {
            // 기존 오디오 중지
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }

            // 오디오 URL 구성 및 ngrok 헤더 추가
            const fullAudioUrl = `${apiBaseUrl}${audioUrl}`;
            console.log('🔗 원본 오디오 URL:', audioUrl);
            console.log('🔗 완전한 오디오 URL:', fullAudioUrl);
            console.log('🔗 API Base URL:', apiBaseUrl);

            // ngrok 환경에서 직접 fetch로 먼저 테스트
            const testAudioAccess = async () => {
                try {
                    const headers = {};
                    
                    // ngrok 환경인지 확인하고 필요한 헤더 추가
                    if (window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io')) {
                        headers['ngrok-skip-browser-warning'] = 'true';
                        headers['User-Agent'] = 'Mozilla/5.0 (compatible; API-Client)';
                        console.log('🔧 ngrok 환경 감지 - 헤더 추가');
                    }
                    
                    console.log('🔍 오디오 파일 접근성 사전 테스트 시작...');
                    const response = await fetch(fullAudioUrl, { 
                        method: 'HEAD',  // HEAD 요청으로 헤더만 확인
                        headers: headers
                    });
                    
                    console.log('🔍 접근성 테스트 결과:');
                    console.log('  - 상태 코드:', response.status);
                    console.log('  - Content-Type:', response.headers.get('content-type'));
                    console.log('  - Content-Length:', response.headers.get('content-length'));
                    console.log('  - Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    return true;
                } catch (error) {
                    console.error('❌ 사전 접근성 테스트 실패:', error);
                    return false;
                }
            };

            // 사전 테스트 실행
            testAudioAccess().then(accessOk => {
                console.log('🔍 사전 테스트 완료, 결과:', accessOk);
                
                if (!accessOk) {
                    console.error('❌ 오디오 파일에 접근할 수 없습니다.');
                    speakMessage('음성 파일에 접근할 수 없습니다.');
                    if (onComplete) {
                        onComplete();
                    }
                    return;
                }

                console.log('✅ 사전 테스트 통과 - 오디오 재생 시작');
                
                // 접근 가능하면 오디오 재생 시도
                const audio = new Audio();
                
                // ngrok 환경에서는 특별한 설정 필요
                if (window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io')) {
                    console.log('🔧 ngrok 환경 - 특별 설정 적용');
                    // ngrok 환경에서는 preload를 none으로 설정
                    audio.preload = 'none';
                } else {
                    audio.crossOrigin = "anonymous";
                    audio.preload = 'auto';
                }
                
                // 브라우저 지원 형식 확인
                console.log('🔍 브라우저 오디오 지원 확인:');
                console.log('  - MP3 지원:', audio.canPlayType('audio/mpeg'));
                console.log('  - MP3 codecs 지원:', audio.canPlayType('audio/mpeg; codecs="mp3"'));
                console.log('  - Audio/mp3 지원:', audio.canPlayType('audio/mp3'));
                
                audio.onloadstart = () => {
                    console.log('🎵 ElevenLabs 음성 로딩 시작:', fullAudioUrl);
                };
                
                audio.oncanplay = () => {
                    console.log('🎵 ElevenLabs 음성 재생 준비 완료');
                };
                
                audio.onplay = () => {
                    console.log('🎵 ElevenLabs 음성 재생 시작');
                    currentAudioRef.current = audio;
                };
                
                audio.onended = () => {
                    console.log('🎵 ElevenLabs 음성 재생 완료');
                    currentAudioRef.current = null;
                    if (onComplete) {
                        onComplete();
                    }
                };
                
                audio.onerror = (error) => {
                    console.error('❌ ElevenLabs 음성 재생 오류:', error);
                    console.error('❌ 오디오 URL:', fullAudioUrl);
                    console.error('❌ 오디오 네트워크 상태:', audio.networkState);
                    console.error('❌ 오디오 준비 상태:', audio.readyState);
                    console.error('❌ 오디오 에러 코드:', audio.error?.code);
                    console.error('❌ 오디오 에러 메시지:', audio.error?.message);
                    
                    // 오류 시 기본 TTS로 폴백
                    speakMessage('음성 재생에 실패했습니다.');
                    
                    // 오류 시에도 콜백 실행
                    if (onComplete) {
                        onComplete();
                    }
                };
                
                // ngrok 환경에서는 fetch로 파일을 먼저 다운로드 후 Blob URL 사용
                if (window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io')) {
                    console.log('🔧 ngrok 환경 - Blob URL 방식 사용');
                    
                    fetch(fullAudioUrl, {
                        headers: {
                            'ngrok-skip-browser-warning': 'true',
                            'User-Agent': 'Mozilla/5.0 (compatible; API-Client)'
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        return response.blob();
                    })
                    .then(audioBlob => {
                        console.log('✅ 오디오 Blob 다운로드 완료:', audioBlob.size, 'bytes');
                        
                        const blobUrl = URL.createObjectURL(audioBlob);
                        console.log('🔗 Blob URL 생성:', blobUrl);
                        
                        audio.src = blobUrl;
                        audio.load();
                        
                        // Blob URL 정리를 위한 이벤트 리스너 (기존 onended 덮어쓰기)
                        audio.onended = () => {
                            console.log('🎵 ElevenLabs 음성 재생 완료');
                            currentAudioRef.current = null;
                            URL.revokeObjectURL(blobUrl); // 메모리 정리
                            if (onComplete) {
                                onComplete();
                            }
                        };
                        
                        return audio.play();
                    })
                    .then(() => {
                        console.log('✅ 오디오 재생 성공적으로 시작됨');
                    })
                    .catch(error => {
                        console.error('❌ Blob 방식 오디오 재생 오류:', error);
                        speakMessage('음성 재생에 실패했습니다.');
                        if (onComplete) {
                            onComplete();
                        }
                    });
                    
                } else {
                    // 일반 환경에서는 기존 방식 사용
                    console.log('🎵 오디오 소스 설정:', fullAudioUrl);
                    audio.src = fullAudioUrl;
                    
                    console.log('🎵 오디오 로드 시작');
                    audio.load(); // 명시적으로 로드
                    
                    // 음성 재생 시작
                    console.log('🎵 오디오 재생 요청');
                    audio.play()
                        .then(() => {
                            console.log('✅ 오디오 재생 성공적으로 시작됨');
                        })
                        .catch(playError => {
                            console.error('❌ 오디오 재생 시작 오류:', playError);
                            console.error('❌ 재생 오류 상세:', {
                                name: playError.name,
                                message: playError.message,
                                code: playError.code
                            });
                            speakMessage('음성 재생에 실패했습니다.');
                            if (onComplete) {
                                onComplete();
                            }
                        });
                }
            });
            
        } catch (error) {
            console.error('❌ ElevenLabs 음성 재생 초기화 오류:', error);
            // 오류 시 기본 TTS로 폴백
            speakMessage('음성 재생에 실패했습니다.');
            // 오류 시에도 콜백 실행
            if (onComplete) {
                onComplete();
            }
        }
    };

    const stopCurrentAudio = () => {
        console.log('⏹️ 음성 중지 요청');
        
        if (currentAudioRef.current) {
            console.log('⏹️ ElevenLabs 음성 중지');
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
            
            // 음성 중단 시 특별한 처리 없음
        }
        
        if (synthesisRef.current) {
            console.log('⏹️ 기본 TTS 중지');
            speechSynthesis.cancel();
            synthesisRef.current = null;
        }
        
        console.log('⏹️ 모든 음성 중지 완료');
    };

    const toggleVoiceRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        // 현재 재생 중인 음성 중지
        stopCurrentAudio();
        
        if (recognitionRef.current) {
            recognitionRef.current.start();
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const generateBotResponse = async (userMessage) => {
        try {
            // 기존 세션 ID 사용
            const currentSessionId = sessionId;
            if (!currentSessionId) {
                console.error('❌ 세션 ID가 없습니다.');
                throw new Error('세션 ID가 없습니다.');
            }
            
            // 대화 기록 구성 (최근 10개 메시지만 포함)
            const conversationHistory = messages
                .filter(msg => msg.sender === 'user' || msg.sender === 'bot')
                .slice(-10)
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }));
            
            console.log('🔗 API URL:', `${apiBaseUrl}/api/chat`);
            console.log('📤 전송 데이터:', {
                message: userMessage,
                participantId: localStorage.getItem('participantId') || 'unknown',
                sessionId: currentSessionId,
                conversationHistory: conversationHistory
            });
            console.log('🆔 현재 세션 ID:', currentSessionId);
            
            const response = await fetchWithTimeout(`${apiBaseUrl}/api/chat`, {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    message: userMessage,
                    participantId: localStorage.getItem('participantId') || 'unknown',
                    sessionId: currentSessionId,
                    conversationHistory: conversationHistory
                })
            });

            console.log('📥 응답 상태:', response.status);
            console.log('📥 응답 헤더:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP 오류:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ 응답 데이터:', data);
            
            // 마지막 메시지들 저장
            setLastUserMessage(userMessage);
            setLastBotResponse(data.response || '');
            
            // ElevenLabs 음성 재생
            if (data.audio_url) {
                playElevenLabsAudio(data.audio_url);
            }
            
            return data.response || '죄송합니다. 응답을 생성할 수 없습니다.';
        } catch (error) {
            console.error('채팅 API 오류:', error);
            return '죄송합니다. 서버와의 연결에 문제가 있습니다.';
        }
    };

    const sendMessage = async () => {
        if (!textInput.trim()) return;

        // 새로운 메시지 전송 시 현재 재생 중인 음성 중지
        stopCurrentAudio();

        const userMessage = textInput.trim();
        setTextInput('');
        setIsLoading(true);

        // 사용자 메시지 추가
        addMessage(userMessage, 'user', false);

        try {
            // 로딩 메시지 추가
            const loadingMessage = {
                content: '의사가 응답을 준비하고 있습니다...',
                sender: 'bot',
                time: getCurrentTime()
            };
            setMessages(prev => [...prev, loadingMessage]);

            // 봇 응답 생성
            const botResponse = await generateBotResponse(userMessage);

            // 로딩 메시지 제거하고 실제 응답 추가
            setMessages(prev => {
                const filtered = prev.filter(msg => msg.content !== '의사가 응답을 준비하고 있습니다...');
                return [...filtered, { content: botResponse, sender: 'bot', time: getCurrentTime() }];
            });

            // 퀘스트 완료 체크는 generateBotResponse 내부에서 처리됨
            
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            addMessage('죄송합니다. 오류가 발생했습니다.', 'bot');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearConversation = async () => {
        if (window.confirm('대화 내용을 모두 지우시겠습니까?')) {
            // 이전 세션의 진행 상황 정리
            if (sessionId) {
                localStorage.removeItem(`quest_progress_${sessionId}`);
                console.log('🗑️ 이전 세션 진행 상황 정리:', sessionId);
            }
            
            // 새로운 세션 ID 생성
            const newSessionId = `retry_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 세션 ID 상태 업데이트
            setSessionId(newSessionId);
            
            // 메시지 초기화
            setMessages([
                {
                    content: '안녕하세요, 어떻게 오셨나요?',
                    sender: 'bot',
                    time: getCurrentTime()
                }
            ]);
            
            // 오디오 중지
            stopCurrentAudio();
            
            // 음성 인식 중지
            if (isRecording) {
                stopRecording();
            }
            
            // 퀘스트 완료 상태 초기화
            setCompletedQuests(new Set());
            
            console.log('🔄 새로운 세션 시작:', newSessionId);
        }
    };

    const loadQuestsFromFeedback = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const participantId = userData.participantId || localStorage.getItem('participantId') || '';
            
            if (!participantId) {
                console.warn('참가자 ID가 없습니다. 기본 퀘스트를 로드합니다.');
                loadDefaultQuests();
                return;
            }
            
            const apiBaseUrl = getApiBaseUrl();
            console.log('🔍 Retry 페이지 API URL:', apiBaseUrl);
            
            // 새로운 API로 피드백 데이터 가져오기 시도
            try {
                const response = await fetchWithTimeout(`${apiBaseUrl}/api/get-feedback/${encodeURIComponent(participantId)}`, {
                    method: 'GET',
                    headers: getRequestHeaders(false)
                });
                
                console.log('🔍 새로운 피드백 API 응답 상태:', response.status);
                
                if (response.ok) {
                    const evaluationData = await response.json();
                    console.log('✅ 새로운 피드백 API 성공:', evaluationData);
                    if (evaluationData.status === 'success') {
                        createQuestsFromEvaluation(evaluationData.evaluation);
                        return;
                    }
                }
            } catch (error) {
                console.log('새로운 피드백 API 실패, 기존 방식 시도:', error);
            }
            
            // 기존 API로 시도
            try {
                const response = await fetchWithTimeout(`${apiBaseUrl}/get-feedback`, {
                    method: 'POST',
                    headers: getRequestHeaders(),
                    body: JSON.stringify({ userData })
                });

                if (response.ok) {
                    const feedbackData = await response.json();
                    createQuestsFromFeedback(feedbackData);
                } else {
                    // localStorage에서 평가 데이터 확인
                    const evaluationData = localStorage.getItem('evaluationData');
                    if (evaluationData) {
                        const evaluation = JSON.parse(evaluationData);
                        createQuestsFromEvaluation(evaluation);
                    } else {
                        loadDefaultQuests();
                    }
                }
            } catch (error) {
                console.error('기존 피드백 API 오류:', error);
                // localStorage에서 평가 데이터 확인
                const evaluationData = localStorage.getItem('evaluationData');
                if (evaluationData) {
                    const evaluation = JSON.parse(evaluationData);
                    createQuestsFromEvaluation(evaluation);
                } else {
                    loadDefaultQuests();
                }
            }
        } catch (error) {
            console.error('피드백 로드 오류:', error);
            // localStorage에서 평가 데이터 확인
            const evaluationData = localStorage.getItem('evaluationData');
            if (evaluationData) {
                const evaluation = JSON.parse(evaluationData);
                createQuestsFromEvaluation(evaluation);
            } else {
                loadDefaultQuests();
            }
        }
    };

    const createQuestsFromFeedback = (feedbackData) => {
        const newQuests = [];
        
        if (feedbackData.communication) {
            Object.entries(feedbackData.communication).forEach(([key, value]) => {
                if (value === '하' || value === '중') {
                    newQuests.push({
                        id: `comm_${key}`,
                        category: 'communication',
                        title: getCategoryTitle('communication', key),
                        description: getCategoryDescription('communication', key),
                        grade: value,
                        keywords: getCategoryKeywords('communication', key)
                    });
                }
            });
        }

        if (feedbackData.medical_knowledge) {
            Object.entries(feedbackData.medical_knowledge).forEach(([key, value]) => {
                if (value === '하' || value === '중') {
                    newQuests.push({
                        id: `med_${key}`,
                        category: 'medical_knowledge',
                        title: getCategoryTitle('medical_knowledge', key),
                        description: getCategoryDescription('medical_knowledge', key),
                        grade: value,
                        keywords: getCategoryKeywords('medical_knowledge', key)
                    });
                }
            });
        }

        setQuests(newQuests);
    };

    const createQuestsFromEvaluation = (evaluation) => {
        const newQuests = [];
        
        // Feedback 페이지의 체크리스트 구조에 맞게 퀘스트 생성
        if (evaluation.grades) {
            // 환자 입장 체크리스트
            const patientItems = [
                { key: 'symptom_location', label: '어디가 아픈지 구체적인 위치', category: 'patient' },
                { key: 'symptom_timing', label: '언제부터 아픈지 시작 시기', category: 'patient' },
                { key: 'symptom_severity', label: '증상이 얼마나 심한지 강도', category: 'patient' },
                { key: 'current_medication', label: '현재 복용 중인 약물', category: 'patient' },
                { key: 'allergy_info', label: '알레르기 여부', category: 'patient' }
            ];
            
            // 진료과정 체크리스트
            const doctorItems = [
                { key: 'diagnosis_info', label: '의사의 진단명과 진단 근거', category: 'doctor' },
                { key: 'prescription_info', label: '처방약의 이름과 복용 방법', category: 'doctor' },
                { key: 'side_effects', label: '약의 부작용과 주의사항', category: 'doctor' },
                { key: 'followup_plan', label: '다음 진료 계획과 재방문 시기', category: 'doctor' },
                { key: 'emergency_plan', label: '증상 악화 시 언제 다시 와야 하는지', category: 'doctor' }
            ];
            
            // 모든 체크리스트 항목을 확인
            [...patientItems, ...doctorItems].forEach(item => {
                const grade = evaluation.grades[item.key];
                if (grade === '하' || grade === '중') {
                    newQuests.push({
                        id: item.key, // 피드백 데이터의 키와 일치하도록 수정
                        category: item.category,
                        title: item.label,
                        description: getQuestDescription(item.key, grade),
                        grade: grade,
                        scoreReason: evaluation.score_reasons?.[item.key] || '평가 정보가 없습니다.'
                    });
                }
            });
        }
        
        setQuests(newQuests);
    };

    const getCategoryTitle = (category, key) => {
        const titles = {
            communication: {
                greeting: '인사 및 소개',
                symptom_inquiry: '증상 문진',
                explanation: '설명 및 안내',
                empathy: '공감 및 위로',
                closing: '마무리'
            },
            medical_knowledge: {
                diagnosis: '진단 능력',
                treatment: '치료 계획',
                medication: '약물 처방',
                follow_up: '추후 관리'
            }
        };
        return titles[category]?.[key] || key;
    };

    const getCategoryDescription = (category, key) => {
        const descriptions = {
            communication: {
                greeting: '환자와의 첫 인사를 친근하고 전문적으로 수행하세요.',
                symptom_inquiry: '체계적이고 상세한 증상 문진을 진행하세요.',
                explanation: '의학적 용어를 쉽게 설명하고 환자가 이해할 수 있도록 도와주세요.',
                empathy: '환자의 감정에 공감하고 적절한 위로를 제공하세요.',
                closing: '진료를 정리하고 다음 단계를 명확히 안내하세요.'
            },
            medical_knowledge: {
                diagnosis: '증상과 검사 결과를 종합하여 정확한 진단을 내리세요.',
                treatment: '환자의 상태에 맞는 적절한 치료 계획을 수립하세요.',
                medication: '약물의 효과와 부작용을 고려하여 처방하세요.',
                follow_up: '치료 후 추후 관리 방안을 제시하세요.'
            }
        };
        return descriptions[category]?.[key] || '개선이 필요한 항목입니다.';
    };

    const getCategoryKeywords = (category, key) => {
        const keywords = {
            communication: {
                greeting: ['안녕하세요', '어떻게 오셨나요', '소개', '친근함'],
                symptom_inquiry: ['증상', '언제부터', '어떤 통증', '상세히'],
                explanation: ['설명', '이해하기 쉽게', '의학 용어', '안내'],
                empathy: ['공감', '위로', '걱정', '이해'],
                closing: ['정리', '다음 단계', '약속', '마무리']
            },
            medical_knowledge: {
                diagnosis: ['진단', '증상 분석', '검사 결과', '판단'],
                treatment: ['치료 계획', '방법', '절차', '과정'],
                medication: ['약물', '처방', '복용법', '부작용'],
                follow_up: ['추후 관리', '재진', '관찰', '모니터링']
            }
        };
        return keywords[category]?.[key] || [];
    };

    const loadDefaultQuests = () => {
        const defaultQuests = [
            {
                id: 'default_1',
                category: 'communication',
                title: '친근한 인사',
                description: '환자와의 첫 인사를 친근하고 전문적으로 수행하세요.',
                grade: '중',
                keywords: ['안녕하세요', '어떻게 오셨나요', '소개']
            },
            {
                id: 'default_2',
                category: 'communication',
                title: '체계적 문진',
                description: '증상을 체계적이고 상세하게 문진하세요.',
                grade: '중',
                keywords: ['증상', '언제부터', '어떤 통증', '상세히']
            }
        ];
        setQuests(defaultQuests);
    };

    const checkQuestCompletion = async (userMessage, botResponse) => {
        if (quests.length === 0) return;
        
        // 미완료 퀘스트가 없으면 체크하지 않음
        const incompleteQuests = quests.filter(quest => !completedQuests.has(quest.id));
        if (incompleteQuests.length === 0) {
            console.log('✅ 모든 퀘스트가 완료되었습니다!');
            return;
        }
        
        // 퀘스트 체크 상태 설정
        setIsCheckingQuest(true);
        
        // 대화창에 퀘스트 체크 시작 메시지 추가
        const checkingMessage = {
            content: '🔍 퀘스트 체크 중입니다...',
            sender: 'system',
            time: getCurrentTime(),
            isTemp: true
        };
        setMessages(prev => [...prev, checkingMessage]);
        
        try {
            // 최신 메시지를 포함한 대화 내용 구성
            const conversationHistory = [
                ...messages.map(msg => ({
                    sender: msg.sender,
                    content: msg.content
                })),
                // 방금 추가된 사용자 메시지와 봇 응답 포함
                { sender: 'user', content: userMessage },
                { sender: 'bot', content: botResponse }
            ];
            
            // 미완료 퀘스트만 필터링하여 전송
            const questsForCheck = quests
                .filter(quest => !completedQuests.has(quest.id))
                .map(quest => ({
                    id: quest.id,
                    title: quest.title,
                    description: quest.description,
                    grade: quest.grade
                }));
            
                            console.log('🔍 퀘스트 체크 시작:', {
                    sessionId: sessionId,
                    participantId: localStorage.getItem('participantId') || 'unknown',
                    conversationLength: conversationHistory.length,
                    questsCount: questsForCheck.length
                });
                console.log('🆔 퀘스트 체크 세션 ID:', sessionId);
            
            // LLM 기반 퀘스트 체크 API 호출
            const response = await fetchWithTimeout(`${apiBaseUrl}/api/check-quests`, {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    conversation_history: conversationHistory,
                    quests: questsForCheck,
                    participant_id: localStorage.getItem('participantId') || 'unknown',
                    session_id: sessionId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const completedQuests = data.completed_quests || [];
                
                console.log('✅ 퀘스트 체크 결과:', completedQuests);
                // 달성된 퀘스트 처리
                completedQuests.forEach(questResult => {
                    if (questResult.status === '완전히 달성' || questResult.status === '달성') {
                        // 퀘스트 ID가 정확히 매칭되는지 확인
                        const questExists = quests.some(quest => quest.id === questResult.quest_id);
                        
                        if (questExists) {
                            setCompletedQuests(prev => new Set([...prev, questResult.quest_id]));
                            showQuestCompletion(questResult);
                            console.log('🎉 퀘스트 완료:', questResult.quest_id);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('퀘스트 체크 오류:', error);
        } finally {
            // 퀘스트 체크 상태 해제
            setIsCheckingQuest(false);
            
            // 임시 메시지 제거
            setMessages(prev => prev.filter(msg => !msg.isTemp));
        }
    };

    const showQuestCompletion = (questResult) => {
        // 해당 퀘스트의 제목 찾기
        const quest = quests.find(q => q.id === questResult.quest_id);
        const questTitle = quest ? quest.title : questResult.quest_id;
        
        // 퀘스트 완료 토스트 알림
        const toastMessage = `🎉 퀘스트 완료!\n${questTitle}`;
        setQuestToastMessage(toastMessage);
        setShowQuestToast(true);
        
        // 3초 후 토스트 숨기기
        setTimeout(() => {
            setShowQuestToast(false);
        }, 3000);
        
        console.log('🎉 퀘스트 완료:', questResult);
    };

    const toggleQuestCompletion = (questId) => {
        setCompletedQuests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questId)) {
                newSet.delete(questId);
            } else {
                newSet.add(questId);
            }
            return newSet;
        });
    };

    const viewLogs = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            const participantId = userData.participantId || localStorage.getItem('participantId');
            
            if (!participantId) {
                alert('참가자 정보를 찾을 수 없습니다.');
                return;
            }
            
            const response = await fetchWithTimeout(`${apiBaseUrl}/api/logs?participant_id=${encodeURIComponent(participantId)}`, {
                method: 'GET',
                headers: getRequestHeaders(false)
            });

            if (response.ok) {
                const logsData = await response.json();
                console.log('📋 Retry 로그 응답 데이터:', logsData);
                console.log('📋 로그 배열:', logsData.logs);
                
                if (logsData.logs && logsData.logs.length > 0) {
                    console.log('📋 첫 번째 로그 구조:', logsData.logs[0]);
                    
                    // 백엔드에서 받은 로그를 대화 세션별로 그룹화
                    const sessionGroups = {};
                    
                    logsData.logs.forEach(log => {
                        const sessionId = log.session_id || 'default';
                        if (!sessionGroups[sessionId]) {
                            sessionGroups[sessionId] = {
                                timestamp: log.timestamp || new Date().toISOString(),
                                messages: [],
                                session_id: sessionId
                            };
                        }
                        
                        // 사용자 메시지와 봇 응답을 순서대로 추가
                        if (log.user_message && log.user_message.trim()) {
                            sessionGroups[sessionId].messages.push({
                                sender: 'user',
                                content: log.user_message.trim()
                            });
                        }
                        
                        if (log.bot_response && log.bot_response.trim()) {
                            sessionGroups[sessionId].messages.push({
                                sender: 'bot',
                                content: log.bot_response.trim()
                            });
                        }
                    });
                    
                    // 그룹화된 세션들을 배열로 변환하고 시간순 정렬
                    const processedLogs = Object.values(sessionGroups)
                        .filter(session => session.messages.length > 0)
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    console.log('📋 처리된 로그 (세션별 그룹화):', processedLogs);
                    console.log('📋 총 세션 수:', processedLogs.length);
                    
                    if (processedLogs.length > 0) {
                        console.log('📋 첫 번째 세션 메시지 수:', processedLogs[0].messages.length);
                    }
                    
                    setLogs(processedLogs);
                } else {
                    console.log('📋 로그가 없습니다.');
                    setLogs([]);
                }
                
                setShowLogsModal(true);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('로그 로드 오류:', error);
            
            let errorMessage = '로그를 불러오는데 실패했습니다.';
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = 'ngrok 서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
            } else if (error.message.includes('timeout')) {
                errorMessage = '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            }
            
            alert(errorMessage);
        }
    };

    const getProgressPercentage = () => {
        if (quests.length === 0) return 0;
        return (completedQuests.size / quests.length) * 100;
    };

    const getCategoryIcon = (category) => {
        const icons = {
            patient: '👤',
            doctor: '👨‍⚕️',
            communication: '💬',
            medical_knowledge: '🏥'
        };
        return icons[category] || '📋';
    };

    const getGradeBadgeClass = (grade) => {
        return grade === '하' ? 'grade-badge 하' : 'grade-badge 중';
    };

    const saveQuestEvaluationLog = () => {
        // 현재 완료된 퀘스트와 미완료 퀘스트 분류
        const achievedQuests = [];
        const unachievedQuests = [];
        
        quests.forEach(quest => {
            if (completedQuests.has(quest.id)) {
                achievedQuests.push({
                    quest_id: quest.id,
                    title: quest.title,
                    status: '완료',
                    grade: quest.grade
                });
            } else {
                unachievedQuests.push({
                    quest_id: quest.id,
                    title: quest.title,
                    status: '미완료',
                    grade: quest.grade
                });
            }
        });
        
        // 퀘스트 평가 결과 로그 저장
        const questEvaluationLog = {
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            participant_id: localStorage.getItem('participantId') || 'unknown',
            achieved_quests: achievedQuests,
            unachieved_quests: unachievedQuests,
            total_quests: quests.length,
            completed_count: completedQuests.size,
            completion_rate: quests.length > 0 ? (completedQuests.size / quests.length) * 100 : 0
        };
        
        console.log('📊 퀘스트 평가 결과 저장:', questEvaluationLog);
        
        // 로그를 localStorage에 저장
        const existingLogs = JSON.parse(localStorage.getItem('quest_evaluation_logs') || '[]');
        existingLogs.push(questEvaluationLog);
        localStorage.setItem('quest_evaluation_logs', JSON.stringify(existingLogs));
        
        return questEvaluationLog;
    };

    const handleCheatsheetGeneration = () => {
        // 페이지 이동 전에 재생 중인 음성을 멈춤
        stopCurrentAudio();
        
        // 음성 인식도 중지
        if (isRecording) {
            stopRecording();
        }
        
        // 치트시트 페이지로 이동만 (생성하지 않음)
        navigate('/cheatsheet');
    };

    const goToHome = () => {
        // 페이지 이동 전에 재생 중인 음성을 멈춤
        stopCurrentAudio();
        
        // 음성 인식도 중지
        if (isRecording) {
            stopRecording();
        }
        
        navigate('/');
    };

    const goBack = () => {
        // 페이지 이동 전에 재생 중인 음성을 멈춤
        stopCurrentAudio();
        
        // 음성 인식도 중지
        if (isRecording) {
            stopRecording();
        }
        
        navigate(-1);
    };

    const getQuestDescription = (key, grade) => {
        const descriptions = {
            // 환자 입장 체크리스트
            symptom_location: '증상이 발생하는 구체적인 위치를 명확히 설명하세요.',
            symptom_timing: '증상이 언제부터 시작되었는지 구체적으로 말씀해주세요.',
            symptom_severity: '증상의 심각도를 구체적으로 설명하세요.',
            current_medication: '현재 복용 중인 약물이 있다면 알려주세요.',
            allergy_info: '알레르기가 있는 약물이나 음식이 있다면 알려주세요.',
            
            // 진료과정 체크리스트
            diagnosis_info: '의사가 진단명과 진단 근거를 명확히 설명해주세요.',
            prescription_info: '처방약의 이름과 복용 방법을 자세히 안내해주세요.',
            side_effects: '약물의 부작용과 주의사항을 설명해주세요.',
            followup_plan: '다음 진료 계획과 재방문 시기를 명확히 안내해주세요.',
            emergency_plan: '증상 악화 시 언제 다시 와야 하는지 안내해주세요.'
        };
        return descriptions[key] || '개선이 필요한 항목입니다.';
    };

    return (
        <div className="retry-container">
            <header className="retry-header">
                <div className="nav-buttons">
                    <button className="nav-btn home-btn" onClick={goToHome}>
                        🏠 홈
                    </button>
                    <button className="nav-btn back-btn" onClick={goBack}>
                        ← 이전
                    </button>
                </div>
                <h1>🔄 진료 연습 재도전</h1>
                <p>피드백을 바탕으로 개선된 진료 대화를 연습해보세요!</p>
            </header>

            <div className="main-content">
                <div className="chat-section">
                    <div className="chat-messages" ref={chatMessagesRef}>
                        {messages.map((message, index) => (
                            <div key={index} className={`message ${message.sender}-message ${message.isTemp ? 'temp-message' : ''}`}>
                                <div className="message-content">
                                    {message.content}
                                    {message.sender === 'system' && message.isTemp && (
                                        <span className="loading-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </span>
                                    )}
                                </div>
                                <div className="message-time">{message.time}</div>
                            </div>
                        ))}
                    </div>

                    <div className="input-section">
                        <div className="input-area">
                            <div className="text-input-container">
                                <input
                                    type="text"
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="증상을 설명하거나 의사에게 질문하세요..."
                                    disabled={isLoading || isCheckingQuest}
                                />
                                                            <button
                                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                                onClick={toggleVoiceRecording}
                                disabled={isLoading || isCheckingQuest}
                            >
                                <span className="mic-icon">🎤</span>
                                <span className="mic-text">음성</span>
                            </button>
                            <button
                                className="stop-voice-btn"
                                onClick={stopCurrentAudio}
                                disabled={isLoading || isCheckingQuest}
                                title="음성 멈춤"
                            >
                                <span className="stop-icon">⏹️</span>
                            </button>
                            <button
                                className="send-btn"
                                onClick={sendMessage}
                                disabled={!textInput.trim() || isLoading || isCheckingQuest}
                            >
                                전송
                            </button>
                            </div>
                            <div className="voice-status">
                                {voiceStatus}
                            </div>
                        </div>

                        <div className="button-area">
                            <button className="clear-btn" onClick={clearConversation} title="대화 초기화">
                                🔄
                            </button>
                            <button className="logs-btn" onClick={viewLogs}>
                                📋 이전 대화 보기
                            </button>
                            <button className="cheatsheet-btn" onClick={handleCheatsheetGeneration}>
                                📋 치트시트 생성하기
                            </button>

                        </div>
                    </div>
                </div>

                <div className="quest-section">
                    <div className="quest-header">
                        <h2>🎯 하나씩 개선해보세요</h2>
                        <button 
                            className="quest-check-btn"
                            onClick={() => {
                                if (lastUserMessage && lastBotResponse) {
                                    console.log('🔍 퀘스트 체크 버튼 클릭');
                                    immediateQuestCheck(lastUserMessage, lastBotResponse);
                                }
                            }}
                            disabled={!lastUserMessage || !lastBotResponse || isCheckingQuest}
                        >
                            {isCheckingQuest ? (
                                <>
                                    <span className="loading-spinner"></span>
                                    퀘스트 체크 중...
                                </>
                            ) : (
                                <>
                                    🔍 퀘스트 체크
                                </>
                            )}
                        </button>
                    </div>

                    <div className="quest-list">
                        {quests
                            .sort((a, b) => {
                                const aCompleted = completedQuests.has(a.id);
                                const bCompleted = completedQuests.has(b.id);
                                // 미완료 퀘스트가 위에, 완료된 퀘스트가 아래에 오도록 정렬
                                if (aCompleted && !bCompleted) return 1;
                                if (!aCompleted && bCompleted) return -1;
                                return 0;
                            })
                            .map((quest) => {
                                const isCompleted = completedQuests.has(quest.id);
                                return (
                                    <div
                                        key={quest.id}
                                        className={`quest-item ${isCompleted ? 'completed' : ''}`}
                                    >
                                <div className="quest-header">
                                    <div className="quest-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={completedQuests.has(quest.id)}
                                            onChange={() => toggleQuestCompletion(quest.id)}
                                        />
                                    </div>
                                    <div className="quest-content">
                                        <div className="quest-title">
                                            {getCategoryIcon(quest.category)} {quest.title}
                                        </div>
                                        <div className="quest-description">{quest.description}</div>
                                    </div>
                                    <div className={getGradeBadgeClass(quest.grade)}>
                                        {quest.grade}
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>

                    <div className="quest-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${getProgressPercentage()}%` }}
                            ></div>
                        </div>
                        <div className="progress-text">
                            <span>{completedQuests.size}</span> / <span>{quests.length}</span> 완료
                        </div>
                    </div>
                </div>
            </div>

            {/* 로그 모달 */}
            {showLogsModal && (
                <div className="logs-modal" onClick={() => setShowLogsModal(false)}>
                    <div className="logs-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="logs-modal-header">
                            <div className="header-content">
                                <h3>📋 이전 대화 기록</h3>
                                <div className="header-info">
                                    <div className="date-info">
                                        날짜: {new Date().toLocaleDateString('ko-KR')}
                                    </div>
                                    <div className="participant-info">
                                        참가자: {(() => {
                                            try {
                                                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                                                return userData.participantId || localStorage.getItem('participantId') || '알 수 없음';
                                            } catch (e) {
                                                return '알 수 없음';
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setShowLogsModal(false)}>
                                ✕
                            </button>
                        </div>
                        <div className="logs-modal-body">
                            {logs.length > 0 ? (
                                <div className="logs-container">
                                    {logs.map((log, index) => (
                                        <div key={index} className="log-entry">
                                            <div className="log-header">
                                                <span className="log-number">세션 #{index + 1}</span>
                                                <span className="log-timestamp">
                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString('ko-KR') : '시간 정보 없음'}
                                                </span>
                                                {log.session_id && (
                                                    <span className="session-id" title={log.session_id}>
                                                        ID: {log.session_id.substring(0, 8)}...
                                                    </span>
                                                )}
                                            </div>
                                            <div className="log-messages">
                                                {log.messages && log.messages.length > 0 ? (
                                                    log.messages.map((msg, msgIndex) => (
                                                        <div key={msgIndex} className={`log-${msg.sender}`}>
                                                            <div className="message-label">
                                                                {msg.sender === 'user' ? '👤 환자' : '👨‍⚕️ 의사'}
                                                            </div>
                                                            <div className="message-content">
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="no-messages">
                                                        메시지가 없습니다.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-logs">
                                    <div className="empty-icon">📭</div>
                                    <h4>기록이 없습니다</h4>
                                    <p>아직 저장된 대화 기록이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 퀘스트 완료 토스트 */}
            {showQuestToast && (
                <div className="quest-toast">
                    {questToastMessage}
                </div>
            )}
        </div>
    );
};

export default Retry;
