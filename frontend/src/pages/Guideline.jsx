import React, { useState, useEffect } from 'react';
import './Guideline.css';

const Guideline = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [patientCheckboxes, setPatientCheckboxes] = useState({
        core1: false, core2: false, core3: false, core4: false, core5: false
    });
    const [listenCheckboxes, setListenCheckboxes] = useState({
        listen1: false, listen2: false, listen3: false, listen4: false, listen5: false
    });
    const [tipCheckboxes, setTipCheckboxes] = useState({
        tip1: false, tip2: false, tip3: false
    });
    const [startBtnDisabled, setStartBtnDisabled] = useState(true);
    const [isPracticeMode, setIsPracticeMode] = useState(false);

    useEffect(() => {
        // 사용자 데이터 확인
        const userData = localStorage.getItem('userData');
        if (!userData) {
            window.location.href = '/';
            return;
        }

        try {
            const user = JSON.parse(userData);
            console.log('사용자 정보:', user);
            
            // 연습 모드인지 확인 (참가자ID가 '연습'이거나 '테스트'인 경우)
            const participantId = user.participantId || '';
            if (participantId === '연습' || participantId === '테스트' || participantId.toLowerCase().includes('practice')) {
                setIsPracticeMode(true);
                console.log('🎯 연습 모드로 설정됨');
            }
        } catch (error) {
            console.error('사용자 데이터 파싱 오류:', error);
            window.location.href = '/';
        }
    }, []);

    useEffect(() => {
        // 현재 단계에 따라 버튼 활성화 상태 결정
        if (currentStep === 1) {
            const allPatientChecked = Object.values(patientCheckboxes).every(checked => checked);
            const allListenChecked = Object.values(listenCheckboxes).every(checked => checked);
            setStartBtnDisabled(!allPatientChecked || !allListenChecked);
        } else if (currentStep === 2) {
            // 연습 모드가 아닌 경우 모든 팁을 읽어야 함
            if (!isPracticeMode) {
                const allTipsChecked = Object.values(tipCheckboxes).every(checked => checked);
                setStartBtnDisabled(!allTipsChecked);
            } else {
                // 연습 모드에서는 항상 버튼 활성화
                setStartBtnDisabled(false);
            }
        }
    }, [currentStep, patientCheckboxes, listenCheckboxes, tipCheckboxes, isPracticeMode]);

    const handlePatientCheckboxChange = (id) => {
        setPatientCheckboxes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
        
        // 모든 체크리스트 완료 확인
        const updatedCheckboxes = {
            ...patientCheckboxes,
            [id]: !patientCheckboxes[id]
        };
        
        const allPatientChecked = Object.values(updatedCheckboxes).every(checked => checked);
        const allListenChecked = Object.values(listenCheckboxes).every(checked => checked);
        if (allPatientChecked && allListenChecked) {
            setTimeout(() => {
                alert('✅ 모든 체크리스트 완료!\n\n이제 위의 숫자 "2"를 클릭해서 2단계로 이동해주세요.');
            }, 100);
        }
    };

    const handleListenCheckboxChange = (id) => {
        setListenCheckboxes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
        
        // 모든 체크리스트 완료 확인
        const updatedCheckboxes = {
            ...listenCheckboxes,
            [id]: !listenCheckboxes[id]
        };
        
        const allPatientChecked = Object.values(patientCheckboxes).every(checked => checked);
        const allListenChecked = Object.values(updatedCheckboxes).every(checked => checked);
        if (allPatientChecked && allListenChecked) {
            setTimeout(() => {
                alert('✅ 모든 체크리스트 완료!\n\n이제 위의 숫자 "2"를 클릭해서 2단계로 이동해주세요.');
            }, 100);
        }
    };

    const handleTipCheckboxChange = (id) => {
        setTipCheckboxes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
        
        // 모든 팁 체크리스트 완료 확인
        const updatedCheckboxes = {
            ...tipCheckboxes,
            [id]: !tipCheckboxes[id]
        };
        
        const allTipsChecked = Object.values(updatedCheckboxes).every(checked => checked);
        if (allTipsChecked && !isPracticeMode) {
            setTimeout(() => {
                alert('✅ 모든 팁을 확인했습니다!\n\n이제 진료 연습을 시작할 수 있습니다.');
            }, 100);
        }
    };

    const handleStepClick = (step) => {
        setCurrentStep(step);
    };

    const handleStartPractice = () => {
        // 연습 모드가 아닌 경우 모든 체크리스트 완료 확인
        if (!isPracticeMode) {
            const allPatientChecked = Object.values(patientCheckboxes).every(checked => checked);
            const allListenChecked = Object.values(listenCheckboxes).every(checked => checked);
            const allTipsChecked = Object.values(tipCheckboxes).every(checked => checked);
            
            if (!allPatientChecked || !allListenChecked) {
                alert('모든 체크리스트를 완료해주세요!\n\n1단계: 환자 입장에서 꼭 말해야 하는 것과 진료과정 중에 꼭 들어야 하는 것\n\n모든 항목에 체크한 후 2단계로 이동해주세요.');
                return;
            }
            
            if (!allTipsChecked) {
                alert('모든 팁을 확인해주세요!\n\n2단계: 효과적인 진료를 위한 팁\n\n모든 팁을 읽고 체크한 후 시작 버튼을 눌러주세요.');
                return;
            }
        }
        
        // 사용자 데이터에 가이드라인 완료 시간 추가
        const userData = JSON.parse(localStorage.getItem('userData'));
        userData.guidelineCompleted = new Date().toISOString();
        userData.practiceMode = isPracticeMode; // 연습 모드 여부 저장
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // 진료 연습 페이지로 이동
        window.location.href = '/chat';
    };

    const handleSkipToChat = () => {
        // 연습 모드에서 바로 채팅으로 이동
        const userData = JSON.parse(localStorage.getItem('userData'));
        userData.guidelineSkipped = new Date().toISOString();
        userData.practiceMode = true;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        window.location.href = '/chat';
    };

    const renderStep1 = () => (
        <div className="guideline-section">
            <h2>🗣️ 환자 입장에서 꼭 말해야 하는 것</h2>
            {isPracticeMode && (
                <div className="practice-hint">
                    💡 연습 모드: 체크하지 않아도 2단계에서 바로 시작할 수 있어요!
                </div>
            )}
            <div className="checklist">
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="core1" 
                        className="check-input"
                        checked={patientCheckboxes.core1}
                        onChange={() => handlePatientCheckboxChange('core1')}
                    />
                    <label htmlFor="core1">어디가 아픈지 구체적인 위치</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="core2" 
                        className="check-input"
                        checked={patientCheckboxes.core2}
                        onChange={() => handlePatientCheckboxChange('core2')}
                    />
                    <label htmlFor="core2">언제부터 아픈지 시작 시기</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="core3" 
                        className="check-input"
                        checked={patientCheckboxes.core3}
                        onChange={() => handlePatientCheckboxChange('core3')}
                    />
                    <label htmlFor="core3">증상이 얼마나 심한지 강도</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="core4" 
                        className="check-input"
                        checked={patientCheckboxes.core4}
                        onChange={() => handlePatientCheckboxChange('core4')}
                    />
                    <label htmlFor="core4">현재 복용 중인 약물</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="core5" 
                        className="check-input"
                        checked={patientCheckboxes.core5}
                        onChange={() => handlePatientCheckboxChange('core5')}
                    />
                    <label htmlFor="core5">알레르기 여부</label>
                </div>
            </div>

            <h2>👂 진료과정 중에 꼭 들어야 하는 것</h2>
            <div className="checklist">
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="listen1" 
                        className="check-input"
                        checked={listenCheckboxes.listen1}
                        onChange={() => handleListenCheckboxChange('listen1')}
                    />
                    <label htmlFor="listen1">의사의 진단명과 진단 근거</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="listen2" 
                        className="check-input"
                        checked={listenCheckboxes.listen2}
                        onChange={() => handleListenCheckboxChange('listen2')}
                    />
                    <label htmlFor="listen2">처방약의 이름과 복용 방법</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="listen3" 
                        className="check-input"
                        checked={listenCheckboxes.listen3}
                        onChange={() => handleListenCheckboxChange('listen3')}
                    />
                    <label htmlFor="listen3">약의 부작용과 주의사항</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="listen4" 
                        className="check-input"
                        checked={listenCheckboxes.listen4}
                        onChange={() => handleListenCheckboxChange('listen4')}
                    />
                    <label htmlFor="listen4">다음 진료 계획과 재방문 시기</label>
                </div>
                <div className="checklist-item">
                    <input 
                        type="checkbox" 
                        id="listen5" 
                        className="check-input"
                        checked={listenCheckboxes.listen5}
                        onChange={() => handleListenCheckboxChange('listen5')}
                    />
                    <label htmlFor="listen5">증상 악화 시 언제 다시 와야 하는지</label>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="guideline-section">
            <h2>💡 효과적인 진료를 위한 팁</h2>
            {isPracticeMode && (
                <div className="practice-hint">
                    💡 연습 모드: 팁을 체크하지 않아도 바로 시작할 수 있어요!
                </div>
            )}
            <div className="tips">
                <div className="tip-item">
                    <div className="tip-header">
                        <div className="tip-checkbox-container">
                            <input 
                                type="checkbox" 
                                id="tip1" 
                                className="check-input"
                                checked={tipCheckboxes.tip1}
                                onChange={() => handleTipCheckboxChange('tip1')}
                            />
                            <label htmlFor="tip1" className="tip-checkbox-label">읽었음</label>
                        </div>
                        <div className="tip-icon">⏰</div>
                    </div>
                    <h3>충분한 시간 할애는 당신의 권리입니다</h3>
                    <ul>
                        <li>의사가 서두르더라도 증상을 충분히 설명하세요</li>
                        <li>궁금한 점이 있으면 끝까지 물어보세요</li>
                        <li>진료 시간이 부족하면 다음 진료를 예약하세요</li>
                    </ul>
                </div>
                
                <div className="tip-item">
                    <div className="tip-header">
                        <div className="tip-checkbox-container">
                            <input 
                                type="checkbox" 
                                id="tip2" 
                                className="check-input"
                                checked={tipCheckboxes.tip2}
                                onChange={() => handleTipCheckboxChange('tip2')}
                            />
                            <label htmlFor="tip2" className="tip-checkbox-label">읽었음</label>
                        </div>
                        <div className="tip-icon">👤</div>
                    </div>
                    <h3>사람들은 생각보다 당신의 배경에 관심이 없습니다</h3>
                    <ul>
                        <li>부끄러워하지 말고 솔직하게 증상을 설명하세요</li>
                        <li>의사는 당신을 판단하지 않고 도움을 주려고 해요</li>
                        <li>건강과 관련된 정보는 모두 공유하세요</li>
                    </ul>
                </div>
                
                <div className="tip-item">
                    <div className="tip-header">
                        <div className="tip-checkbox-container">
                            <input 
                                type="checkbox" 
                                id="tip3" 
                                className="check-input"
                                checked={tipCheckboxes.tip3}
                                onChange={() => handleTipCheckboxChange('tip3')}
                            />
                            <label htmlFor="tip3" className="tip-checkbox-label">읽었음</label>
                        </div>
                        <div className="tip-icon">📝</div>
                    </div>
                    <h3>구체적이고, 적극적으로 이야기하세요</h3>
                    <ul>
                        <li>증상을 구체적으로 설명하세요</li>
                        <li>의사의 질문에 적극적으로 답변하고 질문하세요</li>
                        <li>진료 중에 메모를 하는 것은 완전히 괜찮아요</li>
                    </ul>
                </div>
            </div>
            <div className="step-navigation">
                {isPracticeMode && (
                    <button 
                        className="nav-btn skip-btn"
                        onClick={handleSkipToChat}
                    >
                        🏃‍♂️ 가이드라인 스킵하고 바로 연습하기
                    </button>
                )}
                <button 
                    className={`nav-btn start-btn ${startBtnDisabled ? 'disabled' : ''}`}
                    disabled={startBtnDisabled && !isPracticeMode}
                    onClick={handleStartPractice}
                >
                    {isPracticeMode ? '📖 가이드라인 읽고 시작하기' : '진료 연습 시작 →'}
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        switch (currentStep) {
            case 1:
                return renderStep1();
            case 2:
                return renderStep2();
            default:
                return renderStep1();
        }
    };



    return (
        <div className="guideline-container">
            <header className="guideline-header">
                <div className="nav-buttons">
                    <button className="nav-btn home-btn" onClick={() => window.location.href = '/'}>
                        🏠 홈
                    </button>
                    <button className="nav-btn back-btn" onClick={() => window.history.back()}>
                        ← 이전
                    </button>
                </div>
                <h1>진료 전 확인사항</h1>
                {isPracticeMode && (
                    <div className="practice-mode-notice">
                        🎯 연습 모드: 체크리스트를 완료하지 않아도 바로 시작할 수 있습니다
                    </div>
                )}
                <div className="step-indicator">
                    <span 
                        className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep === 1 ? 'current' : ''}`}
                        onClick={() => handleStepClick(1)}
                    >
                        1
                    </span>
                    <span 
                        className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep === 2 ? 'current' : ''}`}
                        onClick={() => handleStepClick(2)}
                    >
                        2
                    </span>
                </div>
            </header>
            
            <div className="content">
                {renderContent()}
            </div>
        </div>
    );
};

export default Guideline;
