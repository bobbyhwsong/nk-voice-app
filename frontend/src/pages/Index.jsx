import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Index.css';

const Index = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    participantId: '',
    symptoms: '',
    consent: false
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 필수 필드 검증
    if (!formData.participantId || !formData.symptoms || !formData.consent) {
      setError('참여자 ID, 증상 설명, 연구 참여 동의를 모두 입력해주세요.');
      return;
    }

    const userData = {
      ...formData,
      loginTime: new Date().toISOString()
    };

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
      
      console.log('🔍 Index 페이지 API URL:', apiBaseUrl);
      console.log('🔍 현재 window.location:', window.location.href);
      console.log('🔍 전송할 데이터:', userData);
      
      const response = await fetch(`${apiBaseUrl}/api/save-user-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        // 로컬 스토리지에 저장
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('participantId', userData.participantId);
        
        // 가이드라인 페이지로 이동
        navigate('/guideline');
      } else {
        setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Error saving user data:', error);
      setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
    }
  };


  const handleViewCheatsheet = async () => {
    // 참여자 ID 입력 확인
    if (!formData.participantId) {
      setError('참여자 ID를 먼저 입력해주세요.');
      return;
    }

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
          return 'https://helpful-elf-carefully.ngrok-free.app';
        }
        
        return 'http://localhost:8000';
      };

      const apiBaseUrl = getApiBaseUrl();
      
      // 과거 치트시트 존재 여부 확인
      const response = await fetch(`${apiBaseUrl}/api/get-cheatsheet-history/${encodeURIComponent(formData.participantId)}`);
      const data = await response.json();

      if (data.status === 'success' && data.cheatsheets && data.cheatsheets.length > 0) {
        // 참여자 ID를 localStorage에 저장
        localStorage.setItem('participantId', formData.participantId);
        // 과거 치트시트 목록 페이지로 이동
        navigate('/cheatsheet-history');
      } else {
        setError('저장된 치트시트가 없습니다. 먼저 의료 대화를 진행해주세요.');
      }
    } catch (error) {
      console.error('Error checking cheatsheet history:', error);
      setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🏥 의료 진료 연습 시스템</h1>
        <p>AI 의사와의 진료 대화 연습</p>
      </header>
      
      <div className="content">
        <div className="login-form">
          <h3>참여자 정보 입력</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="participantId">참여자 ID *</label>
              <input
                type="text"
                id="participantId"
                name="participantId"
                value={formData.participantId}
                onChange={handleInputChange}
                required
                placeholder="예: P001"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="symptoms">현재 아픈 증상 설명 *</label>
              <textarea
                id="symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={handleInputChange}
                required
                placeholder="예: 머리가 아파요, 어제부터 머리 뒤쪽이 지속적으로 아파요"
              />
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  id="consent"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleInputChange}
                  required
                />
                연구 참여에 동의합니다 *
              </label>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" className="submit-btn">
              시스템 사용 시작하기
            </button>
          </form>
        </div>
      </div>

      <div className="bottom-buttons">
        <button className="cheatsheet-btn" onClick={handleViewCheatsheet}>
          📝 과거 치트시트 보기
        </button>
      </div>
    </div>
  );
};

export default Index;
