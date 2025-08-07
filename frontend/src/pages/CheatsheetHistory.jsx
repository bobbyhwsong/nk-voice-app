import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CheatsheetHistory.css';

const CheatsheetHistory = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cheatsheets, setCheatsheets] = useState([]);
    const [error, setError] = useState(null);
    const [selectedCheatsheet, setSelectedCheatsheet] = useState(null);

    useEffect(() => {
        loadCheatsheetHistory();
    }, []);

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
            const response = await fetch(`${apiBaseUrl}/api/get-cheatsheet-history/${participantId}`);
            const data = await response.json();

            if (data.status === 'success') {
                setCheatsheets(data.cheatsheets || []);
            } else {
                setError('치트시트 히스토리를 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('치트시트 히스토리 로드 오류:', error);
            setError('서버 연결에 실패했습니다.');
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
                        <p>{error}</p>
                        <button onClick={loadCheatsheetHistory} className="retry-btn">
                            🔄 다시 시도
                        </button>
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
                        🏠 홈으로
                    </button>
                    <button className="nav-btn back-btn" onClick={goBack}>
                        ← 이전으로
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
                                        <span className="script-count">
                                            💬 스크립트 {cheatsheet.cheatsheet?.script?.length || 0}개
                                        </span>
                                        <span className="listening-count">
                                            👂 청취 항목 {cheatsheet.cheatsheet?.listening?.length || 0}개
                                        </span>
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
                        <div className="modal-body">
                            <div className="cheatsheet-date">
                                📅 생성일: {formatDate(selectedCheatsheet.timestamp)}
                            </div>

                            {/* 음성분석 결과 */}
                            {selectedCheatsheet.voice_analysis && (
                                <div className="voice-analysis-section">
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
                                <div className="script-section">
                                    <h3>💬 실제 말할 스크립트</h3>
                                    {selectedCheatsheet.cheatsheet.script.map((item, index) => (
                                        <div key={index} className="script-item">
                                            <h4>{item.title || `스크립트 ${index + 1}`}</h4>
                                            <p className="script-content">{item.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 청취 섹션 */}
                            {selectedCheatsheet.cheatsheet?.listening && (
                                <div className="listening-section">
                                    <h3>👂 무조건 들어야 하는 것</h3>
                                    {selectedCheatsheet.cheatsheet.listening.map((item, index) => (
                                        <div key={index} className="listening-item">
                                            <h4>{item.title || `청취 항목 ${index + 1}`}</h4>
                                            <p className="listening-content">{item.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheatsheetHistory;
