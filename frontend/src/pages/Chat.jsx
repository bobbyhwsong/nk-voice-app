import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Chat.css';

const Chat = () => {
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
  
  // 세션 ID 생성 (초기값은 빈 문자열로 설정)
  const [sessionId, setSessionId] = useState('');
  
  const chatMessagesRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const currentAudioRef = useRef(null);
  
  const navigate = useNavigate();

  // API 기본 URL 설정
  const getApiBaseUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const backendUrl = urlParams.get('backend');
    if (backendUrl) {
      return backendUrl;
    }
    
    // ngrok 환경인지 확인
    if (window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io')) {
      // ngrok 백엔드 URL 직접 사용
      return 'https://helpful-elf-carefully.ngrok-free.app';
    }
    
    return 'http://localhost:8000';
  };

  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    initializeSpeechRecognition();
    scrollToBottom();
    
    // 페이지 로드 시 새로운 세션 생성
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    console.log('🆔 페이지 로드 시 새 세션 생성:', newSessionId);
  }, []);

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

  const playElevenLabsAudio = (audioUrl) => {
    try {
      // 기존 오디오 중지
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // 새로운 오디오 생성
      const audio = new Audio(`${apiBaseUrl}${audioUrl}`);
      
      audio.onloadstart = () => {
        console.log('🎵 ElevenLabs 음성 로딩 시작');
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
      };
      
      audio.onerror = (error) => {
        console.error('❌ ElevenLabs 음성 재생 오류:', error);
        // 오류 시 기본 TTS로 폴백
        speakMessage('음성 재생에 실패했습니다.');
      };
      
      // 음성 재생 시작
      audio.play();
      
    } catch (error) {
      console.error('❌ ElevenLabs 음성 재생 초기화 오류:', error);
      // 오류 시 기본 TTS로 폴백
      speakMessage('음성 재생에 실패했습니다.');
    }
  };

  const stopCurrentAudio = () => {
    console.log('⏹️ 음성 중지 요청');
    
    if (currentAudioRef.current) {
      console.log('⏹️ ElevenLabs 음성 중지');
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
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
      // 세션 ID가 없으면 새로 생성
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(currentSessionId);
        console.log('🆔 메시지 전송 시 새 세션 생성:', currentSessionId);
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
      
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

    } catch (error) {
      console.error('메시지 전송 오류:', error);
      addMessage('죄송합니다. 오류가 발생했습니다.', 'bot');
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    if (window.confirm('대화 내용을 모두 지우시겠습니까?')) {
      // 새로운 세션 ID 생성
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
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
      
      console.log('🔄 새로운 세션 시작:', newSessionId);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const goToFeedback = () => {
    navigate('/feedback');
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="nav-buttons">
          <button className="nav-btn home-btn" onClick={() => navigate('/')}>
            🏠 홈
          </button>
          <button className="nav-btn back-btn" onClick={() => navigate(-1)}>
            ← 이전
          </button>
        </div>
        <h1>🏥 의료 진료 연습 시스템</h1>
        <p>음성으로 의사와 진료 대화를 연습하세요!</p>
      </header>
      
      <div className="chat-main">
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}-message`}>
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">{message.time}</div>
            </div>
          ))}
        </div>
        
        <div className="input-area">
          <div className="text-input-container">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="증상을 설명하거나 의사에게 질문하세요..."
              disabled={isLoading}
            />
            <button
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleVoiceRecording}
              disabled={isLoading}
            >
              <span className="mic-icon">🎤</span>
              <span className="mic-text">음성</span>
            </button>
            <button
              className="stop-voice-btn"
              onClick={stopCurrentAudio}
              disabled={isLoading}
              title="음성 멈춤"
            >
              <span className="stop-icon">⏹️</span>
            </button>
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!textInput.trim() || isLoading}
            >
              전송
            </button>
          </div>
          
          {voiceStatus && (
            <div className="voice-status">{voiceStatus}</div>
          )}
        </div>
      </div>
      
      <div className="settings">
        <div className="setting-group" style={{ display: 'none' }}>
          <label>음성: ElevenLabs 50대 남성 의사</label>
        </div>
        <div className="setting-group">
          <button className="clear-btn" onClick={clearConversation}>
            🔄
          </button>
          <button className="feedback-btn" onClick={goToFeedback}>
            피드백 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
