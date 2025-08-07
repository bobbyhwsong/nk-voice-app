import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import './Cheatsheet.css';

const Cheatsheet = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [cheatsheetData, setCheatsheetData] = useState(null);
    const [voiceAnalysis, setVoiceAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const [showPsychologicalPopup, setShowPsychologicalPopup] = useState(true);
    const [canClosePopup, setCanClosePopup] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // useEffect에서 자동 치트시트 생성 제거 - 사용자가 직접 생성 버튼을 눌러야 함

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

    const initializeCheatsheet = async () => {
        try {
            setLoading(true);
            setError(null);
            setIsInitialized(true); // 초기화 시작 표시

            // 사용자 정보 가져오기
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const participantId = userData.participantId || localStorage.getItem('participantId');

            if (!participantId) {
                setError('사용자 정보를 찾을 수 없습니다.');
                setLoading(false);
                return;
            }

            // LLM API 호출 (음성분석은 백엔드에서 처리)
            const apiBaseUrl = getApiBaseUrl();
            
            const response = await fetch(`${apiBaseUrl}/api/generate-cheatsheet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_id: participantId
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                console.log('✅ 백엔드 응답 데이터:', data);
                console.log('📋 치트시트 데이터:', data.cheatsheet);
                console.log('📝 스크립트 배열:', data.cheatsheet?.script);
                console.log('👂 리스닝 배열:', data.cheatsheet?.listening);
                
                setCheatsheetData(data.cheatsheet);
                // 음성분석 결과가 있다면 설정
                if (data.voice_analysis) {
                    setVoiceAnalysis(data.voice_analysis);
                }
                // 치트시트가 준비되면 팝업 닫기 가능하도록 설정
                setCanClosePopup(true);
                
                // 치트시트를 로그에 저장
                await saveCheatsheetToLog(participantId, data.cheatsheet, data.voice_analysis);
            } else {
                console.error('치트시트 생성 오류:', data.error);
                setError('스크립트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                // 에러 시 기본 데이터는 설정하지 않음
            }

        } catch (error) {
            console.error('치트시트 생성 네트워크 오류:', error);
            setError('서버 연결에 실패했습니다. 네트워크 연결을 확인해주세요.');
            // 네트워크 오류 시에도 기본 데이터는 설정하지 않음
        } finally {
            setLoading(false);
        }
    };

    const saveCheatsheetToLog = async (participantId, cheatsheetData, voiceAnalysisData) => {
        try {
            const apiBaseUrl = getApiBaseUrl();

            const logData = {
                participant_id: participantId,
                timestamp: new Date().toISOString(),
                cheatsheet: cheatsheetData,
                voice_analysis: voiceAnalysisData,
                page_type: 'cheatsheet'
            };

            const response = await fetch(`${apiBaseUrl}/api/save-cheatsheet-log`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                body: JSON.stringify(logData)
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                console.log('치트시트 로그 저장 완료:', result.log_id);
            } else {
                console.error('치트시트 로그 저장 실패:', result.error);
            }
        } catch (error) {
            console.error('치트시트 로그 저장 중 오류:', error);
        }
    };

    // 음성분석은 백엔드에서 처리하므로 프론트엔드에서는 제거
    // const generateVoiceAnalysis = async (participantId) => {
    //     try {
    //         const apiBaseUrl = getApiBaseUrl();
    //         // 대화 로그 가져오기
    //         const logsResponse = await fetch(`${apiBaseUrl}/api/logs?participant_id=${participantId}&page_type=chat`);
    //         const logsData = await logsResponse.json();
    //         if (logsData.status === 'success' && logsData.logs.length > 0) {
    //             const userMessages = logsData.logs
    //                 .filter(log => log.user_message)
    //                 .map(log => log.user_message);
    //             const analysisResponse = await fetch(`${apiBaseUrl}/api/analyze-voice`, {
    //                 method: 'POST',
    //                 headers: { 'Content-Type': 'application/json' },
    //                 body: JSON.stringify({
    //                     messages: userMessages,
    //                     participant_id: participantId,
    //                     analysis_type: 'voice_analysis'
    //                 })
    //             });
    //             const analysisData = await analysisResponse.json();
    //             if (analysisData.status === 'success') {
    //                 setVoiceAnalysis(analysisData.analysis);
    //             }
    //         }
    //     } catch (error) {
    //         console.error('음성 분석 오류:', error);
    //     }
    // };

    const showDefaultCheatsheet = () => {
        setCheatsheetData({
            cheatsheet: {
                script: [
                    {
                        title: '증상 위치',
                        content: '어디가 아픈지 구체적으로 말씀드리겠습니다.'
                    },
                    {
                        title: '증상 시작 시기',
                        content: '언제부터 아픈지 정확히 말씀드리겠습니다.'
                    }
                ],
                listening: [
                    {
                        title: '진단명과 근거',
                        content: '진단명과 그 근거를 설명드리겠습니다.'
                    },
                    {
                        title: '처방약 정보',
                        content: '처방약의 이름과 복용 방법을 설명드리겠습니다.'
                    }
                ]
            }
        });
    };

    const copyCheatsheet = () => {
        const cheatsheetContainer = document.getElementById('cheatsheetContainer');
        const text = extractTextContent(cheatsheetContainer);

        navigator.clipboard.writeText(text).then(() => {
            showNotification('전체 내용이 클립보드에 복사되었습니다.', 'success');
        }).catch(() => {
            // 폴백 방법
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('전체 내용이 클립보드에 복사되었습니다.', 'success');
        });
    };

    const downloadAsImage = async () => {
        try {
            showNotification('이미지 생성 중입니다...', 'info');

            const cheatsheetContainer = document.getElementById('cheatsheetContainer');

            // 스크롤 위치 저장
            const originalScrollTop = window.scrollY;

            // 컨테이너를 화면 상단으로 스크롤
            cheatsheetContainer.scrollIntoView({ behavior: 'instant' });

            // 잠시 대기하여 스크롤 완료
            await new Promise(resolve => setTimeout(resolve, 500));

            // html2canvas 옵션 설정
            const options = {
                scale: 2, // 고해상도
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: cheatsheetContainer.offsetWidth,
                height: cheatsheetContainer.offsetHeight,
                scrollX: 0,
                scrollY: 0
            };

            // 이미지 생성
            const canvas = await html2canvas(cheatsheetContainer, options);

            // 이미지를 blob으로 변환
            canvas.toBlob((blob) => {
                // 다운로드 링크 생성
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                // 파일명 생성 (현재 날짜 포함)
                const now = new Date();
                const dateStr = now.getFullYear() +
                    String(now.getMonth() + 1).padStart(2, '0') +
                    String(now.getDate()).padStart(2, '0') + '_' +
                    String(now.getHours()).padStart(2, '0') +
                    String(now.getMinutes()).padStart(2, '0');

                link.download = `진료스크립트_${dateStr}.png`;

                // 다운로드 실행
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 메모리 정리
                URL.revokeObjectURL(url);

                // 원래 스크롤 위치로 복원
                window.scrollTo(0, originalScrollTop);

                showNotification('이미지가 성공적으로 다운로드되었습니다.', 'success');
            }, 'image/png');

        } catch (error) {
            console.error('이미지 다운로드 오류:', error);
            showNotification('이미지 다운로드 중 오류가 발생했습니다.', 'error');
        }
    };

    const downloadAsText = () => {
        try {
            const cheatsheetContainer = document.getElementById('cheatsheetContainer');

            // 구조화된 텍스트 생성
            let textContent = '📋 진료 스크립트\n';
            textContent += '='.repeat(50) + '\n\n';

            // 심리적 섹션
            const psychologicalSection = cheatsheetContainer.querySelector('.psychological-section');
            if (psychologicalSection) {
                textContent += '💙 마음의 준비\n';
                textContent += '-'.repeat(30) + '\n';

                const encouragementCard = psychologicalSection.querySelector('.encouragement-card');
                if (encouragementCard) {
                    const title = encouragementCard.querySelector('h4');
                    const content = encouragementCard.querySelector('p');
                    if (title) textContent += title.textContent + '\n';
                    if (content) textContent += content.textContent + '\n\n';
                }

                const researchInfo = psychologicalSection.querySelector('.research-info');
                if (researchInfo) {
                    const title = researchInfo.querySelector('h4');
                    const content = researchInfo.querySelector('p');
                    if (title) textContent += title.textContent + '\n';
                    if (content) textContent += content.textContent + '\n\n';
                }

                const voiceAnalysis = psychologicalSection.querySelector('.voice-analysis');
                if (voiceAnalysis) {
                    const analysisContent = voiceAnalysis.querySelector('.analysis-content');
                    if (analysisContent) {
                        textContent += '🎤 음성 분석 결과\n';
                        textContent += analysisContent.textContent + '\n\n';
                    }
                }
            }

            // 스크립트 섹션
            const scriptSection = cheatsheetContainer.querySelector('.script-section');
            if (scriptSection) {
                textContent += '💬 실제 말할 스크립트\n';
                textContent += '-'.repeat(30) + '\n';

                const scriptItems = scriptSection.querySelectorAll('.script-item');
                scriptItems.forEach((item, index) => {
                    const title = item.querySelector('h4');
                    const actualScript = item.querySelector('.actual-script');

                    if (title) textContent += `${index + 1}. ${title.textContent}\n`;
                    if (actualScript) textContent += `   ${actualScript.textContent}\n`;
                    textContent += '\n';
                });
            }

            // 들어야 하는 것 섹션
            const listeningSection = cheatsheetContainer.querySelectorAll('.script-section')[1];
            if (listeningSection) {
                textContent += '👂 무조건 들어야 하는 것\n';
                textContent += '-'.repeat(30) + '\n';

                const listeningItems = listeningSection.querySelectorAll('.listening-item');
                listeningItems.forEach((item, index) => {
                    const title = item.querySelector('h4');
                    const doctorScript = item.querySelector('.doctor-script');

                    if (title) textContent += `${index + 1}. ${title.textContent}\n`;
                    if (doctorScript) textContent += `   ${doctorScript.textContent}\n`;
                    textContent += '\n';
                });
            }

            // 파일명 생성
            const now = new Date();
            const dateStr = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0');

            // 다운로드 실행
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `진료스크립트_${dateStr}.txt`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 메모리 정리
            URL.revokeObjectURL(url);

            showNotification('텍스트 파일이 성공적으로 다운로드되었습니다.', 'success');

        } catch (error) {
            console.error('텍스트 다운로드 오류:', error);
            showNotification('텍스트 다운로드 중 오류가 발생했습니다.', 'error');
        }
    };

    const extractTextContent = (element) => {
        let text = '';

        function extract(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent.trim() + ' ';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'H3' || node.tagName === 'H4') {
                    text += '\n\n' + node.textContent.trim() + '\n';
                } else if (node.tagName === 'P') {
                    text += node.textContent.trim() + '\n';
                } else if (node.tagName === 'LI') {
                    text += '• ' + node.textContent.trim() + '\n';
                } else {
                    for (let child of node.childNodes) {
                        extract(child);
                    }
                }
            }
        }

        extract(element);
        return text.trim();
    };

    const showNotification = (message, type = 'info') => {
        // 기존 알림 제거
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 새 알림 생성
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2em;">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // 애니메이션 표시
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // 자동 제거
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    };

    const finishCheatsheet = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const participantId = userData.participantId || localStorage.getItem('participantId');

            if (!participantId || !cheatsheetData) {
                showNotification('저장할 데이터가 없습니다.', 'error');
                return;
            }

            const apiBaseUrl = getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/save-cheatsheet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_id: participantId,
                    cheatsheet_data: cheatsheetData,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                showNotification('치트시트가 성공적으로 저장되었습니다.', 'success');
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            } else {
                showNotification('치트시트 저장 중 오류가 발생했습니다.', 'error');
            }
        } catch (error) {
            console.error('치트시트 저장 오류:', error);
            showNotification('치트시트 저장 중 오류가 발생했습니다.', 'error');
        }
    };

    const goBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="cheatsheet-page">
                <header className="cheatsheet-header">
                    <div className="nav-buttons">
                        <button className="nav-btn home-btn" onClick={() => navigate('/')}>
                            🏠 홈으로
                        </button>
                        <button className="nav-btn back-btn" onClick={() => navigate(-1)}>
                            ← 이전으로
                        </button>
                    </div>
                    <h1>📋 진료 스크립트</h1>
                    <p>실제 진료 중 참고용 맞춤형 가이드</p>
                </header>

                <div className="content">
            <div className="cheatsheet-container">
                        {/* 로딩 상태 */}
                        <div className="script-section">
                            <h3>🤖 AI 스크립트 생성 중</h3>
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                                <h4>맞춤형 스크립트를 생성하고 있습니다...</h4>
                                <p>잠시만 기다려주세요. 당신만을 위한 진료 스크립트를 준비하고 있어요.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 로딩 중에도 마음의 준비 팝업 표시 */}
                {showPsychologicalPopup && (
                    <div className="popup-overlay" onClick={(e) => {
                        // 로딩 중에는 팝업을 닫을 수 없음
                        e.stopPropagation();
                    }}>
                        <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                            <div className="popup-header">
                                <h2>💙 마음의 준비</h2>
                                {/* 로딩 중에는 닫기 버튼 숨김 */}
                            </div>
                            <div className="popup-body">
                                <div className="encouragement-card">
                                    <div className="encouragement-icon">🌟</div>
                                    <h4>충분한 진료는 당신의 권리입니다</h4>
                                    <p>의료진료를 받는 것은 모든 사람의 기본적인 권리입니다. 북한이탈주민이라는 점에 대해 스스로 너무 걱정하지 마세요. 의사는 환자의 건강을 돕는 것이 목적입니다.</p>
                                </div>

                                <div className="research-info">
                                    <h4>📚 관련 연구 및 조사</h4>
                                    <p>사람들이 생각보다 북한이탈주민에 관심이 많지 않을 수 있습니다!</p>
                                    <ul>
                                        <li><a href="https://www.kihasa.re.kr/web/publication/research/view.do?key=169" target="_blank" rel="noopener noreferrer">한국보건사회연구원 - 북한이탈주민 사회통합 실태조사</a></li>
                                        <li><a href="https://www.unikorea.go.kr/unikorea/business/statistics/" target="_blank" rel="noopener noreferrer">통일부 - 북한이탈주민 정착 지원 현황</a></li>
                                        <li><a href="https://www.korea.kr/news/pressReleaseView.do?newsId=156456789" target="_blank" rel="noopener noreferrer">정부24 - 북한이탈주민 인식 개선 캠페인</a></li>
                                    </ul>
                                </div>

                                {voiceAnalysis && (
                                    <div className="voice-analysis">
                                        <h4>🎤 음성 분석 결과</h4>
                                        <div className="analysis-content">
                                            <div className="analysis-summary">
                                                <p><strong>{voiceAnalysis.summary}</strong></p>
                                            </div>
                                            <div className="analysis-details">
                                                <p>{voiceAnalysis.details}</p>
                                            </div>
                                            <div className="analysis-aspects">
                                                <h5>👍 긍정적인 면</h5>
                                                <ul>
                                                    {voiceAnalysis.positive_aspects.map((aspect, index) => (
                                                        <li key={index}>{aspect}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="analysis-suggestions">
                                                <h5>💡 제안사항</h5>
                                                <ul>
                                                    {voiceAnalysis.suggestions.map((suggestion, index) => (
                                                        <li key={index}>{suggestion}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 로딩 중 안내 메시지 */}
                                <div className="popup-info">
                                    <p>🤖 치트시트를 생성하는 동안 위 내용을 참고해주세요.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className="cheatsheet-page">
                <div className="content">
            <div className="cheatsheet-container">
                <div className="error-state">
                    <div className="error-icon">❌</div>
                    <h3>오류가 발생했습니다</h3>
                    <p>{error}</p>
                            <button onClick={() => {
                                setIsInitialized(false);
                                setCheatsheetData(null);
                                setVoiceAnalysis(null);
                                setError(null);
                                setShowPsychologicalPopup(true);
                                setCanClosePopup(false);
                                initializeCheatsheet();
                            }} className="retry-btn">
                                🔄 다시 시도
                    </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cheatsheet-page">
            <header className="cheatsheet-header">
                <div className="nav-buttons">
                    <button className="nav-btn home-btn" onClick={() => navigate('/')}>
                        🏠 홈으로
                    </button>
                    <button className="nav-btn back-btn" onClick={goBack}>
                        ← 이전으로
                    </button>
                </div>
                <h1>📋 진료 스크립트</h1>
                <p>실제 진료 중 참고용 맞춤형 가이드</p>
            </header>

            <div className="content">
                <div className="cheatsheet-container" id="cheatsheetContainer">
                    {/* 치트시트가 없을 때 보여줄 화면 */}
                    {!cheatsheetData && (
                        <div className="no-cheatsheet-state">
                            <div className="no-cheatsheet-icon">📋</div>
                            <h3>치트시트가 없습니다</h3>
                            <p>먼저 의료 대화를 진행하신 후 치트시트를 생성해주세요.</p>
                            <div className="no-cheatsheet-actions">
                                <button 
                                    className="generate-cheatsheet-btn"
                                    onClick={() => {
                                        setLoading(true);
                                        setError(null);
                                        setShowPsychologicalPopup(true);
                                        setCanClosePopup(false);
                                        initializeCheatsheet();
                                    }}
                                >
                                    🤖 치트시트 생성하기
                                </button>
                                <button 
                                    className="view-history-btn"
                                    onClick={() => navigate('/cheatsheet-history')}
                                >
                                    📝 과거 치트시트 보기
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* 치트시트가 준비되었을 때 마음의 준비 보기 버튼 */}
                    {cheatsheetData && !showPsychologicalPopup && (
                        <div className="psychological-toggle">
                            <button 
                                className="show-psychological-btn"
                                onClick={() => setShowPsychologicalPopup(true)}
                            >
                                💙 마음의 준비 보기
                            </button>
                        </div>
                    )}

                    {/* 치트시트 50:50 분할 레이아웃 */}
                    {cheatsheetData && (
                        <div className="parallel-sections">
                            {/* 왼쪽: 말해야 하는 것 */}
                            <div className="script-div left-section">
                                <h3>💬 무조건 말해야 하는 것</h3>
                                {cheatsheetData?.script && cheatsheetData.script.length > 0 ? (
                                    cheatsheetData.script.map((item, index) => (
                                        <div key={index} className="script-item">
                                            <h4>{item.title || `핵심 ${index + 1}`}</h4>
                                            <p>{item.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="script-item">
                                        <p>생성된 스크립트가 없습니다.</p>
                                    </div>
                                )}
                            </div>

                            {/* 오른쪽: 들어야 하는 것 */}
                            <div className="listening-div right-section">
                                <h3>👂 무조건 들어야 하는 것</h3>
                                {cheatsheetData?.listening && cheatsheetData.listening.length > 0 ? (
                                    cheatsheetData.listening.map((item, index) => (
                                        <div key={index} className="listening-item">
                                            <h4>{item.title || `핵심 ${index + 1}`}</h4>
                                            <p>{item.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="listening-item">
                                        <p>생성된 내용이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div>
            </div>

            {/* 액션 버튼들은 치트시트 컨테이너 밖에 별도로 배치 */}
            {cheatsheetData && (
                <div className="action-buttons">
                    <button className="action-btn copy-btn" onClick={copyCheatsheet}>
                        📋 전체 복사
                    </button>
                    <button className="action-btn download-img-btn" onClick={downloadAsImage}>
                        📸 이미지로 다운로드
                    </button>
                    <button className="action-btn finish-btn" onClick={finishCheatsheet}>
                        🎉 완료
                    </button>
                </div>
            )}

            {/* 마음의 준비 팝업 */}
            {showPsychologicalPopup && (
                <div className="popup-overlay" onClick={(e) => {
                    // 치트시트가 생성된 후에만 배경 클릭으로 닫기 가능
                    if (canClosePopup && e.target === e.currentTarget) {
                        setShowPsychologicalPopup(false);
                    }
                }}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                        <div className="popup-header">
                            <h2>💙 마음의 준비</h2>
                            {canClosePopup && (
                                <button 
                                    className="popup-close-btn" 
                                    onClick={() => setShowPsychologicalPopup(false)}
                                    title="팝업 닫기"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <div className="popup-body">
                            <div className="encouragement-card">
                                <div className="encouragement-icon">🌟</div>
                                <h4>충분한 진료는 당신의 권리입니다</h4>
                                <p>의료진료를 받는 것은 모든 사람의 기본적인 권리입니다. 북한이탈주민이라는 점에 대해 스스로 너무 걱정하지 마세요. 의사는 환자의 건강을 돕는 것이 목적입니다.</p>
                            </div>

                            <div className="research-info">
                                <h4>📚 관련 연구 및 조사</h4>
                                <p>사람들이 생각보다 북한이탈주민에 관심이 많지 않을 수 있습니다!</p>
                                <ul>
                                    <li><a href="https://www.kihasa.re.kr/web/publication/research/view.do?key=169" target="_blank" rel="noopener noreferrer">한국보건사회연구원 - 북한이탈주민 사회통합 실태조사</a></li>
                                    <li><a href="https://www.unikorea.go.kr/unikorea/business/statistics/" target="_blank" rel="noopener noreferrer">통일부 - 북한이탈주민 정착 지원 현황</a></li>
                                    <li><a href="https://www.korea.kr/news/pressReleaseView.do?newsId=156456789" target="_blank" rel="noopener noreferrer">정부24 - 북한이탈주민 인식 개선 캠페인</a></li>
                                </ul>
                            </div>

                            {voiceAnalysis && (
                                <div className="voice-analysis">
                                    <h4>🎤 음성 분석 결과</h4>
                                    <div className="analysis-content">
                                        <div className="analysis-summary">
                                            <p><strong>{voiceAnalysis.summary}</strong></p>
                                        </div>
                                        <div className="analysis-details">
                                            <p>{voiceAnalysis.details}</p>
                                        </div>
                                        <div className="analysis-aspects">
                                            <h5>👍 긍정적인 면</h5>
                                            <ul>
                                                {voiceAnalysis.positive_aspects.map((aspect, index) => (
                                                    <li key={index}>{aspect}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="analysis-suggestions">
                                            <h5>💡 제안사항</h5>
                                            <ul>
                                                {voiceAnalysis.suggestions.map((suggestion, index) => (
                                                    <li key={index}>{suggestion}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 치트시트 생성/보기 버튼 */}
                            <div className="popup-action">
                                {!cheatsheetData && !loading && (
                                    <button 
                                        className="popup-action-btn generate-btn"
                                        onClick={() => {
                                            setLoading(true);
                                            setError(null);
                                            initializeCheatsheet();
                                        }}
                                    >
                                        🤖 치트시트 만들기
                                    </button>
                                )}
                                
                                {loading && (
                                    <button className="popup-action-btn loading-btn" disabled>
                                        <div className="btn-loading-spinner"></div>
                                        치트시트 생성 중...
                                    </button>
                                )}
                                
                                {cheatsheetData && (
                                    <button 
                                        className="popup-action-btn view-btn"
                                        onClick={() => setShowPsychologicalPopup(false)}
                                    >
                                        📋 치트시트 보기
                                    </button>
                            )}
                        </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cheatsheet;
