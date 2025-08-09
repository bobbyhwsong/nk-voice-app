import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import './CheatsheetHistory.css';

// 영어 제목을 한글로 변환하는 함수
const translateTitle = (englishTitle) => {
    const titleMap = {
        'symptom_location': '증상 위치',
        'symptom_timing': '증상 발생 시기',
        'symptom_severity': '증상 심각도',
        'current_medication': '현재 복용 중인 약물',
        'allergy_info': '알레르기 정보',
        'diagnosis_info': '진단 정보',
        'prescription_info': '처방 정보',
        'side_effects': '부작용',
        'followup_plan': '추후 계획',
        'emergency_plan': '응급 계획'
    };
    
    return titleMap[englishTitle] || englishTitle;
};

const CheatsheetHistory = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cheatsheets, setCheatsheets] = useState([]);
    const [error, setError] = useState(null);
    const [selectedCheatsheet, setSelectedCheatsheet] = useState(null);
    const [completedItems, setCompletedItems] = useState(new Set()); // 완료된 아이템들 추적
    const modalContentRef = useRef();
    const scriptSectionRef = useRef();
    const listeningSectionRef = useRef();
    const voiceAnalysisRef = useRef();

    useEffect(() => {
        loadCheatsheetHistory();
    }, []);

    // 아이템 완료 상태 토글 함수
    const toggleItemCompletion = (itemType, index) => {
        const itemKey = `${itemType}-${index}`;
        const newCompletedItems = new Set(completedItems);
        
        if (newCompletedItems.has(itemKey)) {
            newCompletedItems.delete(itemKey);
        } else {
            newCompletedItems.add(itemKey);
        }
        
        setCompletedItems(newCompletedItems);
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
            return 'https://helpful-elf-carefully.ngrok-free.app';
        }
        
        return 'http://localhost:8000';
    };

    // ngrok 요청을 위한 헤더 설정
    const getRequestHeaders = () => {
        const headers = {};
        
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

    const loadCheatsheetHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            const participantId = localStorage.getItem('participantId');
            if (!participantId) {
                setError('참여자 정보를 찾을 수 없습니다.');
                setLoading(false);
                return;
            }

            const apiBaseUrl = getApiBaseUrl();
            console.log('🔍 CheatsheetHistory API URL:', apiBaseUrl);
            console.log('🔍 ParticipantId:', participantId);
            
            const response = await fetchWithTimeout(`${apiBaseUrl}/api/get-cheatsheet-history/${encodeURIComponent(participantId)}`, {
                method: 'GET',
                headers: getRequestHeaders()
            });

            console.log('🔍 Response status:', response.status);
            console.log('🔍 Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('🔍 Response error text:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // 응답이 HTML인지 확인 (ngrok 브라우저 경고 페이지)
            const contentType = response.headers.get('content-type');
            console.log('🔍 Content-Type:', contentType);
            
            if (contentType && contentType.includes('text/html')) {
                const htmlText = await response.text();
                console.error('🔍 HTML Response detected:', htmlText.substring(0, 200));
                throw new Error('ngrok_html_warning');
            }

            const data = await response.json();
            console.log('🔍 Response data:', data);

            if (data.status === 'success') {
                setCheatsheets(data.cheatsheets || []);
            } else {
                setError(`치트시트 히스토리를 불러올 수 없습니다: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('치트시트 히스토리 로드 오류:', error);
            
            // 네트워크 오류 유형에 따른 상세한 에러 메시지
            let errorMessage = '서버 연결에 실패했습니다.';
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = 'ngrok 서버에 연결할 수 없습니다. URL을 확인하거나 잠시 후 다시 시도해주세요.';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'CORS 오류가 발생했습니다. 서버 설정을 확인해주세요.';
            } else if (error.message.includes('timeout')) {
                errorMessage = '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            } else if (error.message.includes('SyntaxError') || error.message === 'ngrok_html_warning') {
                errorMessage = 'ngrok 브라우저 경고 페이지가 표시되었습니다. 다음을 시도해보세요:\n1. ngrok 터널이 제대로 실행 중인지 확인\n2. 브라우저에서 직접 ngrok URL을 방문하여 경고를 승인\n3. 잠시 후 다시 시도';
            } else if (error.message.includes('HTTP')) {
                errorMessage = `서버 오류: ${error.message}`;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleViewCheatsheet = (cheatsheet) => {
        setSelectedCheatsheet(cheatsheet);
    };

    const handleCloseModal = () => {
        setSelectedCheatsheet(null);
    };

    const goBack = () => {
        navigate(-1);
    };

    // 전체 치트시트 텍스트 복사 함수
    const copyCheatsheetText = () => {
        if (!selectedCheatsheet) return;

        let copyText = `📋 치트시트 - ${formatDate(selectedCheatsheet.timestamp)}\n\n`;
        
        // 스크립트 섹션
        if (selectedCheatsheet.cheatsheet?.script) {
            copyText += `💬 무조건 말해야 하는 것:\n\n`;
            selectedCheatsheet.cheatsheet.script.forEach((item, index) => {
                copyText += `${index + 1}. ${translateTitle(item.title)}\n`;
                copyText += `${item.content}\n\n`;
            });
        }

        // 청취 섹션
        if (selectedCheatsheet.cheatsheet?.listening) {
            copyText += `👂 무조건 들어야 하는 것:\n\n`;
            selectedCheatsheet.cheatsheet.listening.forEach((item, index) => {
                copyText += `${index + 1}. ${translateTitle(item.title)}\n`;
                copyText += `${item.content}\n\n`;
            });
        }

        // 음성 분석 섹션
        if (selectedCheatsheet.voice_analysis) {
            copyText += `🎤 음성 분석:\n\n`;
            copyText += `${selectedCheatsheet.voice_analysis}\n\n`;
        }

        navigator.clipboard.writeText(copyText).then(() => {
            alert('치트시트가 클립보드에 복사되었습니다!');
        }).catch(err => {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다.');
        });
    };

    // 스크립트만 복사하는 함수
    const copyScriptOnly = () => {
        if (!selectedCheatsheet?.cheatsheet?.script) return;

        let copyText = `💬 무조건 말해야 하는 것:\n\n`;
        selectedCheatsheet.cheatsheet.script.forEach((item, index) => {
            copyText += `${index + 1}. ${translateTitle(item.title)}\n`;
            copyText += `${item.content}\n\n`;
        });

        navigator.clipboard.writeText(copyText).then(() => {
            alert('스크립트가 클립보드에 복사되었습니다!');
        }).catch(err => {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다.');
        });
    };

    // 청취 항목만 복사하는 함수
    const copyListeningOnly = () => {
        if (!selectedCheatsheet?.cheatsheet?.listening) return;

        let copyText = `👂 무조건 들어야 하는 것:\n\n`;
        selectedCheatsheet.cheatsheet.listening.forEach((item, index) => {
            copyText += `${index + 1}. ${translateTitle(item.title)}\n`;
            copyText += `${item.content}\n\n`;
        });

        navigator.clipboard.writeText(copyText).then(() => {
            alert('청취 항목이 클립보드에 복사되었습니다!');
        }).catch(err => {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다.');
        });
    };

    // 전체 이미지로 다운로드 함수
    const downloadAsImage = async () => {
        if (!modalContentRef.current) return;

        try {
            const canvas = await html2canvas(modalContentRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true
            });

            const link = document.createElement('a');
            link.download = `치트시트_전체_${formatDate(selectedCheatsheet.timestamp).replace(/[:/\s]/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            console.error('이미지 다운로드 실패:', error);
            alert('이미지 다운로드에 실패했습니다.');
        }
    };

    // 스크립트 섹션만 이미지로 다운로드
    const downloadScriptAsImage = async () => {
        if (!scriptSectionRef.current) return;

        try {
            const canvas = await html2canvas(scriptSectionRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true
            });

            const link = document.createElement('a');
            link.download = `스크립트_${formatDate(selectedCheatsheet.timestamp).replace(/[:/\s]/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            console.error('스크립트 이미지 다운로드 실패:', error);
            alert('스크립트 이미지 다운로드에 실패했습니다.');
        }
    };

    // 청취 항목 섹션만 이미지로 다운로드
    const downloadListeningAsImage = async () => {
        if (!listeningSectionRef.current) return;

        try {
            const canvas = await html2canvas(listeningSectionRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true
            });

            const link = document.createElement('a');
            link.download = `청취항목_${formatDate(selectedCheatsheet.timestamp).replace(/[:/\s]/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            console.error('청취 항목 이미지 다운로드 실패:', error);
            alert('청취 항목 이미지 다운로드에 실패했습니다.');
        }
    };

    // 음성 분석 섹션만 이미지로 다운로드
    const downloadVoiceAnalysisAsImage = async () => {
        if (!voiceAnalysisRef.current) return;

        try {
            const canvas = await html2canvas(voiceAnalysisRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true
            });

            const link = document.createElement('a');
            link.download = `음성분석_${formatDate(selectedCheatsheet.timestamp).replace(/[:/\s]/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            console.error('음성 분석 이미지 다운로드 실패:', error);
            alert('음성 분석 이미지 다운로드에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="cheatsheet-history-page">
                <div className="content">
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <h3>치트시트 히스토리를 불러오는 중...</h3>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="cheatsheet-history-page">
                <div className="content">
                    <div className="error-state">
                        <div className="error-icon">❌</div>
                        <h3>오류가 발생했습니다</h3>
                        <div className="error-message" style={{ whiteSpace: 'pre-line', marginBottom: '20px' }}>
                            {error}
                        </div>
                        <div className="error-actions">
                            <button onClick={loadCheatsheetHistory} className="retry-btn">
                                🔄 다시 시도
                            </button>
                            <button 
                                onClick={() => window.open(getApiBaseUrl(), '_blank')} 
                                className="test-connection-btn"
                                style={{ marginLeft: '10px' }}
                            >
                                🌐 서버 연결 테스트
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cheatsheet-history-page">
            <header className="history-header">
                <div className="nav-buttons">
                    <button className="nav-btn home-btn" onClick={() => navigate('/')}>
                        🏠 홈
                    </button>
                </div>
                <h1>📋 치트시트 히스토리</h1>
                <p>과거에 생성된 치트시트 목록</p>
            </header>

            <div className="content">
                {cheatsheets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>저장된 치트시트가 없습니다</h3>
                        <p>먼저 의료 대화를 진행하고 치트시트를 생성해보세요.</p>
                        <button className="create-btn" onClick={() => navigate('/')}>
                            새 치트시트 생성하러 가기
                        </button>
                    </div>
                ) : (
                    <div className="history-list">
                        <h3>총 {cheatsheets.length}개의 치트시트</h3>
                        {cheatsheets.map((cheatsheet, index) => (
                            <div key={index} className="history-item">
                                <div className="history-info">
                                    <div className="history-date">
                                        📅 {formatDate(cheatsheet.timestamp)}
                                    </div>
                                    <div className="history-summary">
                                        {cheatsheet.voice_analysis && (
                                            <span className="voice-analysis-badge">
                                                🎤 음성분석 포함
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    className="view-btn"
                                    onClick={() => handleViewCheatsheet(cheatsheet)}
                                >
                                    📖 보기
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 치트시트 상세 보기 모달 */}
            {selectedCheatsheet && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📋 치트시트 상세보기</h2>
                            <button className="close-btn" onClick={handleCloseModal}>✕</button>
                        </div>
                        <div className="modal-body" ref={modalContentRef}>
                            <div className="cheatsheet-date">
                                📅 생성일: {formatDate(selectedCheatsheet.timestamp)}
                            </div>

                            {/* 음성분석 결과 */}
                            {selectedCheatsheet.voice_analysis && (
                                <div className="voice-analysis-section" ref={voiceAnalysisRef}>
                                    <h3>🎤 음성 분석 결과</h3>
                                    <div className="analysis-summary">
                                        <p><strong>{selectedCheatsheet.voice_analysis.summary}</strong></p>
                                    </div>
                                    <div className="analysis-details">
                                        <p>{selectedCheatsheet.voice_analysis.details}</p>
                                    </div>
                                    {selectedCheatsheet.voice_analysis.positive_aspects && (
                                        <div className="analysis-aspects">
                                            <h5>👍 긍정적인 면</h5>
                                            <ul>
                                                {selectedCheatsheet.voice_analysis.positive_aspects.map((aspect, index) => (
                                                    <li key={index}>{aspect}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {selectedCheatsheet.voice_analysis.suggestions && (
                                        <div className="analysis-suggestions">
                                            <h5>💡 제안사항</h5>
                                            <ul>
                                                {selectedCheatsheet.voice_analysis.suggestions.map((suggestion, index) => (
                                                    <li key={index}>{suggestion}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 스크립트 섹션 */}
                            {selectedCheatsheet.cheatsheet?.script && (
                                <div className="script-section" ref={scriptSectionRef}>
                                    <h3>💬 실제 말할 스크립트</h3>
                                    {selectedCheatsheet.cheatsheet.script.map((item, index) => {
                                        const itemKey = `script-${index}`;
                                        const isCompleted = completedItems.has(itemKey);
                                        return (
                                            <div 
                                                key={index} 
                                                className={`script-item ${isCompleted ? 'completed' : ''}`}
                                                onClick={() => toggleItemCompletion('script', index)}
                                            >
                                                <h4>{translateTitle(item.title) || `스크립트 ${index + 1}`}</h4>
                                                <p className="script-content">{item.content}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 청취 섹션 */}
                            {selectedCheatsheet.cheatsheet?.listening && (
                                <div className="listening-section" ref={listeningSectionRef}>
                                    <h3>👂 무조건 들어야 하는 것</h3>
                                    {selectedCheatsheet.cheatsheet.listening.map((item, index) => {
                                        const itemKey = `listening-${index}`;
                                        const isCompleted = completedItems.has(itemKey);
                                        return (
                                            <div 
                                                key={index} 
                                                className={`listening-item ${isCompleted ? 'completed' : ''}`}
                                                onClick={() => toggleItemCompletion('listening', index)}
                                            >
                                                <h4>{translateTitle(item.title) || `청취 항목 ${index + 1}`}</h4>
                                                <p className="listening-content">{item.content}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        
                        {/* 액션 버튼들 */}
                        <div className="modal-actions">
                            <div className="action-row">
                                <button className="modal-action-btn copy-btn" onClick={copyCheatsheetText}>
                                    📋 전체 복사
                                </button>
                                <button className="modal-action-btn download-btn" onClick={downloadAsImage}>
                                    📸 전체 이미지 다운로드
                                </button>
                            </div>
                            <div className="action-row section-actions">
                                <h4 className="section-title">📄 텍스트 복사</h4>
                                <div className="button-group">
                                    {selectedCheatsheet.cheatsheet?.script && (
                                        <button className="modal-action-btn script-copy-btn" onClick={copyScriptOnly}>
                                            💬 스크립트만 복사
                                        </button>
                                    )}
                                    {selectedCheatsheet.cheatsheet?.listening && (
                                        <button className="modal-action-btn listening-copy-btn" onClick={copyListeningOnly}>
                                            👂 청취 항목만 복사
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="action-row section-actions">
                                <h4 className="section-title">📸 개별 이미지 다운로드</h4>
                                <div className="button-group">
                                    {selectedCheatsheet.voice_analysis && (
                                        <button className="modal-action-btn voice-download-btn" onClick={downloadVoiceAnalysisAsImage}>
                                            🎤 음성분석 이미지
                                        </button>
                                    )}
                                    {selectedCheatsheet.cheatsheet?.script && (
                                        <button className="modal-action-btn script-download-btn" onClick={downloadScriptAsImage}>
                                            💬 스크립트 이미지
                                        </button>
                                    )}
                                    {selectedCheatsheet.cheatsheet?.listening && (
                                        <button className="modal-action-btn listening-download-btn" onClick={downloadListeningAsImage}>
                                            👂 청취항목 이미지
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheatsheetHistory;
