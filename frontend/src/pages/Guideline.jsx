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
    const [startBtnDisabled, setStartBtnDisabled] = useState(true);

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
        } catch (error) {
            console.error('사용자 데이터 파싱 오류:', error);
            window.location.href = '/';
        }
    }, []);

    useEffect(() => {
        // 현재 단계에 따라 버튼 활성화 상태 결정
        if (currentStep === 1) {
            const allPatientChecked = Object.values(patientCheckboxes).every(checked => checked);
            setStartBtnDisabled(!allPatientChecked);
        } else if (currentStep === 2) {
            const allListenChecked = Object.values(listenCheckboxes).every(checked => checked);
            setStartBtnDisabled(!allListenChecked);
        } else if (currentStep === 3) {
            setStartBtnDisabled(false);
        }
    }, [currentStep, patientCheckboxes, listenCheckboxes]);

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
        
        const allChecked = Object.values(updatedCheckboxes).every(checked => checked);
        if (allChecked) {
            setTimeout(() => {
                alert('✅ 1단계 체크리스트 완료!\n\n이제 위의 숫자 "2"를 클릭해서 2단계로 이동해주세요.');
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
        
        const allChecked = Object.values(updatedCheckboxes).every(checked => checked);
        if (allChecked) {
            setTimeout(() => {
                alert('✅ 2단계 체크리스트 완료!\n\n이제 위의 숫자 "3"을 클릭해서 3단계로 이동해주세요.');
            }, 100);
        }
    };

    const handleStepClick = (step) => {
        setCurrentStep(step);
    };

    const handleStartPractice = () => {
        // 모든 체크리스트 완료 확인
        const allPatientChecked = Object.values(patientCheckboxes).every(checked => checked);
        const allListenChecked = Object.values(listenCheckboxes).every(checked => checked);
        
        if (!allPatientChecked || !allListenChecked) {
            alert('모든 체크리스트를 완료해주세요!\n\n1단계: 환자 입장에서 꼭 말해야 하는 것\n2단계: 진료과정 중에 꼭 들어야 하는 것\n\n모든 항목에 체크한 후 시작 버튼을 눌러주세요.');
            return;
        }
        
        // 사용자 데이터에 가이드라인 완료 시간 추가
        const userData = JSON.parse(localStorage.getItem('userData'));
        userData.guidelineCompleted = new Date().toISOString();
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // 진료 연습 페이지로 이동
        window.location.href = '/chat';
    };

    const renderStep1 = () => (
        <div className="guideline-section">
            <h2>🗣️ 환자 입장에서 꼭 말해야 하는 것</h2>
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
        </div>
    );

    const renderStep2 = () => (
        <div className="guideline-section">
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

    const renderStep3 = () => (
        <div className="guideline-section">
            <h2>💡 효과적인 진료를 위한 팁</h2>
            <div className="tips">
                <div className="tip-item">
                    <div className="tip-icon">⏰</div>
                    <h3>충분한 시간 할애는 당신의 권리입니다</h3>
                    <ul>
                        <li>의사가 서두르더라도 증상을 충분히 설명하세요</li>
                        <li>궁금한 점이 있으면 끝까지 물어보세요</li>
                        <li>진료 시간이 부족하면 다음 진료를 예약하세요</li>
                    </ul>
                </div>
                
                <div className="tip-item">
                    <div className="tip-icon">👤</div>
                    <h3>사람들은 생각보다 당신의 배경에 관심이 없습니다</h3>
                    <ul>
                        <li>부끄러워하지 말고 솔직하게 증상을 설명하세요</li>
                        <li>의사는 당신을 판단하지 않고 도움을 주려고 해요</li>
                        <li>건강과 관련된 정보는 모두 공유하세요</li>
                    </ul>
                </div>
                
                <div className="tip-item">
                    <div className="tip-icon">📝</div>
                    <h3>구체적이고, 적극적으로 이야기하세요</h3>
                    <ul>
                        <li>증상을 구체적으로 설명하세요</li>
                        <li>의사의 질문에 적극적으로 답변하고 질문하세요</li>
                        <li>진료 중에 메모를 하는 것은 완전히 괜찮아요</li>
                    </ul>
                </div>
            </div>
            <div className="step-navigation">
                <button 
                    className={`nav-btn start-btn ${startBtnDisabled ? 'disabled' : ''}`}
                    disabled={startBtnDisabled}
                    onClick={handleStartPractice}
                >
                    진료 연습 시작 →
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
            case 3:
                return renderStep3();
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
                    <span 
                        className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep === 3 ? 'current' : ''}`}
                        onClick={() => handleStepClick(3)}
                    >
                        3
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
