import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Feedback.css';

const Feedback = () => {
  const navigate = useNavigate();
  const [conversationLogs, setConversationLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [showLogsPopup, setShowLogsPopup] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: 대화 로그, 2: 체크리스트, 3: 종합 평가

  useEffect(() => {
    // 페이지 로드 시 스크롤을 맨 위로 이동
    const contentElement = document.querySelector('.content');
    if (contentElement) {
      contentElement.scrollTop = 0;
    }
  }, []);

  const loadConversationData = async () => {
    setIsLoadingLogs(true);
    try {
      // API 기본 URL 동적 설정
      const getApiBaseUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const backendUrl = urlParams.get('backend');
        if (backendUrl) {
          return backendUrl;
        }
        
        // ngrok 환경인지 확인 - 현재 frontend URL을 기반으로 backend URL 추정
        if (window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io')) {
          // ngrok static domain 사용 - 실제 backend domain으로 교체 필요
          return 'https://helpful-elf-carefully.ngrok-free.app';
        }
        
        return 'http://localhost:8000';
      };
      
      const apiBaseUrl = getApiBaseUrl();
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      let participantId = userData.participantId || localStorage.getItem('participantId') || '';
      
      console.log('🔍 참가자 ID:', participantId);
      console.log('📋 사용자 데이터:', userData);
      console.log('🌐 API Base URL:', apiBaseUrl);
      
      // localStorage의 모든 키 확인
      console.log('📦 localStorage 모든 키:', Object.keys(localStorage));
      console.log('📦 localStorage 내용:', {
        userData: localStorage.getItem('userData'),
        participantId: localStorage.getItem('participantId'),
        chatSessionId: localStorage.getItem('chatSessionId')
      });
      
      // 참가자 ID가 없으면 테스트용 ID 사용
      if (!participantId) {
        console.warn('⚠️ 참가자 ID가 없습니다. 테스트용 ID를 사용합니다.');
        participantId = '연습'; // 테스트용 참가자 ID
      }
      
      const logsUrl = `${apiBaseUrl}/api/logs?participant_id=${participantId}`;
      
      console.log('🌐 API 요청 URL:', logsUrl);
      
      // ngrok 특수 헤더 추가
      const requestHeaders = {
        'Content-Type': 'application/json'
      };
      
      // ngrok 환경에서 브라우저 경고 스킵
      if (apiBaseUrl.includes('ngrok')) {
        requestHeaders['ngrok-skip-browser-warning'] = 'true';
      }
      
      const response = await fetch(logsUrl, {
        method: 'GET',
        headers: requestHeaders
      });
      console.log('📡 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP 오류:', response.status, errorText);
        console.error('❌ 요청 URL:', logsUrl);
        console.error('❌ 요청 헤더:', requestHeaders);
        
        // 상세한 오류 메시지 제공
        let errorMessage = `서버 오류 (${response.status})`;
        if (response.status === 404) {
          errorMessage = '대화 로그를 찾을 수 없습니다.';
        } else if (response.status === 500) {
          errorMessage = '서버 내부 오류가 발생했습니다.';
        } else if (response.status === 0 || !navigator.onLine) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('📊 응답 데이터:', data);
      
      if (data.status === 'success' && data.logs.length > 0) {
        console.log(`✅ ${data.logs.length}개의 대화 로그를 로드했습니다.`);
        console.log('📝 로그 내용:', data.logs);
        setConversationLogs(data.logs);
        setLogsLoaded(true);
        setShowLogsPopup(true); // 로그 로드 후 팝업 표시
      } else {
        console.log('⚠️ 대화 로그가 없습니다.');
        console.log('📊 응답 상태:', data.status);
        console.log('📊 로그 개수:', data.logs?.length || 0);
        setLogsLoaded(false);
        setConversationLogs([]);
        alert('대화 로그가 없습니다.');
      }
    } catch (error) {
      console.error('❌ 대화 로그 로드 오류:', error);
      setLogsLoaded(false);
      setConversationLogs([]);
      
      // 사용자 친화적인 오류 메시지
      let userMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        userMessage = 'Backend 서버에 연결할 수 없습니다. ngrok이 실행 중인지 확인해주세요.';
      }
      
      alert(`대화 로그 로드 중 오류가 발생했습니다: ${userMessage}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const generateFeedback = async () => {
    if (conversationLogs.length === 0) {
      alert('대화 로그가 없습니다. 먼저 대화 로그를 불러와주세요.');
      return;
    }

    setIsGeneratingFeedback(true);
    setShowPopup(true);

    try {
      // API 기본 URL 동적 설정
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
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const participantId = userData.participantId || localStorage.getItem('participantId') || '';

      // ngrok 특수 헤더 준비
      const fetchHeaders = {
        'Content-Type': 'application/json'
      };
      
      // ngrok 환경에서 브라우저 경고 스킵
      if (apiBaseUrl.includes('ngrok')) {
        fetchHeaders['ngrok-skip-browser-warning'] = 'true';
      }

      // 음성 분석과 평가를 동시에 실행
      const [voiceResponse, evaluationResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/analyze-voice`, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify({
            messages: conversationLogs.map(log => log.user_message),
            participant_id: participantId,
            analysis_type: 'voice_analysis'
          })
        }),
        fetch(`${apiBaseUrl}/api/evaluate`, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify({
            logs: conversationLogs,
            participant_id: participantId,
            evaluation_type: 'conversation_based'
          })
        })
      ]);

      const voiceData = await voiceResponse.json();
      const evaluationData = await evaluationResponse.json();

      if (voiceData.status === 'success') {
        setVoiceAnalysis(voiceData.analysis);
      }

      if (evaluationData.status === 'success') {
        setEvaluation(evaluationData.evaluation);
        // 평가 데이터를 localStorage에도 저장 (기존 호환성 유지)
        localStorage.setItem('evaluationData', JSON.stringify(evaluationData.evaluation));
        setShowEvaluation(true);
        setCurrentStep(2); // 체크리스트 단계로 이동
        // 스크롤을 맨 위로 이동
        setTimeout(() => {
          const contentElement = document.querySelector('.content');
          if (contentElement) {
            contentElement.scrollTop = 0;
          }
        }, 100);
      }
    } catch (error) {
      console.error('피드백 생성 오류:', error);
      alert('피드백 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const getGradeClass = (grade) => {
    if (grade === '상') return 'excellent';
    if (grade === '중') return 'good';
    return 'poor';
  };

  const getGradeScore = (grade) => {
    if (grade === '상') return 100;
    if (grade === '중') return 60;
    return 30;
  };

  const calculateOverallScore = () => {
    if (!evaluation || !evaluation.grades) return 0;
    
    const grades = Object.values(evaluation.grades);
    const totalScore = grades.reduce((sum, grade) => sum + getGradeScore(grade), 0);
    return Math.round(totalScore / grades.length);
  };

  const getOverallGrade = (score) => {
    if (score >= 90) return '우수';
    if (score >= 70) return '양호';
    if (score >= 50) return '보통';
    return '개선 필요';
  };

  const getOverallDescription = (score) => {
    if (score >= 90) return '핵심 체크리스트를 매우 잘 준수했습니다.';
    if (score >= 70) return '대부분의 핵심 체크리스트를 잘 준수했습니다.';
    if (score >= 50) return '일부 핵심 체크리스트를 준수했습니다.';
    return '핵심 체크리스트 준수도가 낮습니다. 개선이 필요합니다.';
  };

  const toggleScoreReason = (itemKey) => {
    const reasonElement = document.getElementById(`${itemKey}Reason`);
    if (reasonElement) {
      reasonElement.style.display = reasonElement.style.display === 'none' ? 'block' : 'none';
    }
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  const closeLogsPopup = () => {
    setShowLogsPopup(false);
  };

  const showOverallEvaluation = () => {
    setCurrentStep(3);
    // 스크롤을 맨 위로 이동
    setTimeout(() => {
      const contentElement = document.querySelector('.content');
      if (contentElement) {
        contentElement.scrollTop = 0;
      }
    }, 100);
  };

  const goToRetry = () => {
    navigate('/retry');
  };

  if (isLoading) {
    return (
      <div className="feedback-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="feedback-container">
      <header className="feedback-header">
        <div className="header-content">
          <h1>📊 피드백</h1>
          <div className="header-subtitle">
            <p>대화 분석 및 가이드라인 준수도 평가</p>
          </div>
        </div>
        <div className="nav-buttons">
          <button className="nav-btn home-btn" onClick={() => navigate('/')}>
            🏠 홈
          </button>
          <button className="nav-btn back-btn" onClick={() => navigate(-1)}>
            ← 이전
          </button>
        </div>
      </header>

      <div className="content">
        {/* 통합된 피드백 컨테이너 */}
        <div className="feedback-section">
          {/* 단계 1: 대화 로그 불러오기 */}
          {currentStep === 1 && (
            <div className="step-container">
              <h2>📋 대화 로그 불러오기</h2>
              <p>진료 연습에서 나눈 대화를 불러와서 분석해보세요.</p>
              <div className="feedback-actions">
                <button
                  className="load-logs-btn"
                  onClick={loadConversationData}
                  disabled={isLoadingLogs}
                >
                  {isLoadingLogs ? '🔄 대화 로그 불러오는 중...' : '📋 대화 로그 불러오기'}
                </button>
              </div>
            </div>
          )}

          {/* 단계 2: 체크리스트 평가 */}
          {currentStep === 2 && showEvaluation && evaluation && (
            <div className="step-container">
              
              <div className="evaluation-layout">
                {/* 왼쪽: 환자 입장 체크리스트 */}
                <div className="evaluation-left">
                  <h3>🗣️ 환자 입장에서 꼭 말해야 하는 것</h3>
                  <div className="evaluation-items">
                    {[
                      { key: 'symptom_location', label: '어디가 아픈지 구체적인 위치' },
                      { key: 'symptom_timing', label: '언제부터 아픈지 시작 시기' },
                      { key: 'symptom_severity', label: '증상이 얼마나 심한지 강도' },
                      { key: 'current_medication', label: '현재 복용 중인 약물' },
                      { key: 'allergy_info', label: '알레르기 여부' }
                    ].map(item => (
                      <div key={item.key} className="evaluation-item" onClick={() => toggleScoreReason(item.key)}>
                        <span className="item-label">{item.label}</span>
                        <div className="score-display">
                          <span className={`grade-badge ${getGradeClass(evaluation.grades[item.key])}`}>
                            {evaluation.grades[item.key] || '-'}
                          </span>
                          <div className="score-bar">
                            <div 
                              className="score-fill" 
                              style={{ width: `${getGradeScore(evaluation.grades[item.key])}%` }}
                            ></div>
                          </div>
                          <span className="score-text">{getGradeScore(evaluation.grades[item.key])}%</span>
                        </div>
                        <div className="reason-toggle" id={`${item.key}Reason`} style={{ display: 'none' }}>
                          <div className="reason-content">
                            {evaluation.score_reasons?.[item.key] || '평가 정보가 없습니다.'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 오른쪽: 진료과정 체크리스트 */}
                <div className="evaluation-right">
                  <h3>👂 진료과정 중에 꼭 들어야 하는 것</h3>
                  <div className="evaluation-items">
                    {[
                      { key: 'diagnosis_info', label: '의사의 진단명과 진단 근거' },
                      { key: 'prescription_info', label: '처방약의 이름과 복용 방법' },
                      { key: 'side_effects', label: '약의 부작용과 주의사항' },
                      { key: 'followup_plan', label: '다음 진료 계획과 재방문 시기' },
                      { key: 'emergency_plan', label: '증상 악화 시 언제 다시 와야 하는지' }
                    ].map(item => (
                      <div key={item.key} className="evaluation-item" onClick={() => toggleScoreReason(item.key)}>
                        <span className="item-label">{item.label}</span>
                        <div className="score-display">
                          <span className={`grade-badge ${getGradeClass(evaluation.grades[item.key])}`}>
                            {evaluation.grades[item.key] || '-'}
                          </span>
                          <div className="score-bar">
                            <div 
                              className="score-fill" 
                              style={{ width: `${getGradeScore(evaluation.grades[item.key])}%` }}
                            ></div>
                          </div>
                          <span className="score-text">{getGradeScore(evaluation.grades[item.key])}%</span>
                        </div>
                        <div className="reason-toggle" id={`${item.key}Reason`} style={{ display: 'none' }}>
                          <div className="reason-content">
                            {evaluation.score_reasons?.[item.key] || '평가 정보가 없습니다.'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* 단계 3: 종합 평가 */}
          {currentStep === 3 && showEvaluation && evaluation && (
            <div className="step-container">
              
              <div className="overall-score-section">
                <div className="overall-evaluation">
                  <div className="overall-score">
                    <div className="score-circle">
                      <div className="score-number">{calculateOverallScore()}</div>
                      <div className="score-label">점</div>
                    </div>
                  </div>
                  <div className="score-description">
                    <h4>{getOverallGrade(calculateOverallScore())}</h4>
                    <p>{getOverallDescription(calculateOverallScore())}</p>
                  </div>
                </div>
              </div>

              <div className="improvement-section">
                <h3>💡 개선 제안</h3>
                <div className="tips-text">
                  {evaluation.improvement_tips && evaluation.improvement_tips.length > 0 ? (
                    evaluation.improvement_tips.map((tip, index) => (
                      <p key={index} className="tip-text">
                        {index + 1}. {tip}
                      </p>
                    ))
                  ) : (
                    <p className="tip-text">
                      1. 훌륭합니다! 핵심 체크리스트를 잘 준수했습니다.
                    </p>
                  )}
                </div>
              </div>


            </div>
          )}

          {/* 피드백 생성 버튼 (단계 1에서만 표시) */}
          {currentStep === 1 && conversationLogs.length > 0 && (
            <div className="feedback-actions">
              <button
                className="generate-feedback-btn"
                onClick={generateFeedback}
                disabled={isGeneratingFeedback}
              >
                {isGeneratingFeedback ? '🔄 피드백 생성 중...' : '📊 피드백 생성하기'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="navigation">
        {showEvaluation && evaluation && currentStep === 2 && (
          <button className="nav-btn" onClick={showOverallEvaluation}>
            📊 종합 평가 보기
          </button>
        )}
        {showEvaluation && evaluation && currentStep === 3 && (
          <button className="nav-btn" onClick={() => {
            setCurrentStep(2);
            // 스크롤을 맨 위로 이동
            setTimeout(() => {
              const contentElement = document.querySelector('.content');
              if (contentElement) {
                contentElement.scrollTop = 0;
              }
            }, 100);
          }}>
            ← 체크리스트 돌아가기
          </button>
        )}
        {showEvaluation && evaluation && currentStep === 3 && (
          <button className="nav-btn restart-btn" onClick={goToRetry}>
            피드백 반영해서 연습 진행하기
          </button>
        )}
      </div>

      {/* 대화 로그 팝업 */}
      {showLogsPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h3>💬 대화 로그</h3>
              <button className="popup-close" onClick={closeLogsPopup}>&times;</button>
            </div>
            <div className="popup-body">
              <div className="conversation-log">
                {conversationLogs.length > 0 ? (
                  conversationLogs.map((log, index) => (
                    <React.Fragment key={index}>
                      <div className="conversation-entry user">
                        <div className="speaker">환자</div>
                        <div className="message">{log.user_message}</div>
                        <div className="timestamp">
                          {new Date(log.timestamp).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div className="conversation-entry doctor">
                        <div className="speaker">의사</div>
                        <div className="message">{log.bot_response}</div>
                        <div className="timestamp">
                          {new Date(log.timestamp).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </React.Fragment>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                    대화 로그가 없습니다.
                  </p>
                )}
              </div>
            </div>
            <div className="popup-footer">
              <button className="popup-btn" onClick={closeLogsPopup}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 음성 분석 팝업 */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h3>🎉 음성 분석 완료!</h3>
              <button className="popup-close" onClick={closePopup} disabled={isGeneratingFeedback}>&times;</button>
            </div>
            <div className="popup-body">
              <div className="voice-analysis">
                <h4>🎤 음성 분석 결과</h4>
                {voiceAnalysis ? (
                  <p>
                    <strong>분석 결과:</strong> {voiceAnalysis.summary}<br /><br />
                    <strong>상세 분석:</strong> {voiceAnalysis.details}<br /><br />
                    <em>💡 걱정하지 마세요! 자연스러운 대화를 잘 이어가고 계십니다.</em>
                  </p>
                ) : (
                  <p>분석 중입니다...</p>
                )}
              </div>

              <div className="research-links">
                <h4>📚 관련 연구 및 조사</h4>
                <p>사람들이 생각보다 북한이탈주민에 관심이 많지 않을 수 있습니다!</p>
                <ul>
                  <li>
                    <a href="https://www.kihasa.re.kr/web/publication/research/view.do?key=169" target="_blank" rel="noopener noreferrer">
                      한국보건사회연구원 - 북한이탈주민 사회통합 실태조사
                    </a>
                  </li>
                  <li>
                    <a href="https://www.unikorea.go.kr/unikorea/business/statistics/" target="_blank" rel="noopener noreferrer">
                      통일부 - 북한이탈주민 정착 지원 현황
                    </a>
                  </li>
                  <li>
                    <a href="https://www.korea.kr/news/pressReleaseView.do?newsId=156456789" target="_blank" rel="noopener noreferrer">
                      정부24 - 북한이탈주민 인식 개선 캠페인
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="popup-footer">
              <button 
                className="popup-btn" 
                onClick={closePopup}
                disabled={isGeneratingFeedback}
              >
                {isGeneratingFeedback ? '추가 피드백 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback;
