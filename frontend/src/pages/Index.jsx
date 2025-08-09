import React, { useState, useEffect } from 'react';
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
  const [connectionStatus, setConnectionStatus] = useState('');

  // 연결 상태 확인 함수
  const checkConnection = async () => {
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

      // ngrok 요청을 위한 헤더 설정
      const getRequestHeaders = () => {
        const headers = {};
        
        // ngrok 환경에서 필요한 헤더 추가
        const apiBaseUrl = getApiBaseUrl();
        if (apiBaseUrl.includes('ngrok-free.app') || apiBaseUrl.includes('ngrok.io')) {
          headers['ngrok-skip-browser-warning'] = 'true';
        }
        
        return headers;
      };

      // timeout이 포함된 fetch 함수
      const fetchWithTimeout = async (url, options, timeout = 10000) => {
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
      setConnectionStatus('연결 확인 중...');
      
      const response = await fetchWithTimeout(`${apiBaseUrl}/health`, {
        method: 'GET',
        headers: getRequestHeaders()
      });
      
      if (response.ok) {
        setConnectionStatus('✅ 서버 연결 정상');
      } else {
        setConnectionStatus('⚠️ 서버 응답 오류');
      }
    } catch (error) {
      console.error('Connection check error:', error);
      if (error.message === 'timeout') {
        setConnectionStatus('❌ 연결 시간 초과');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setConnectionStatus('❌ 서버에 연결할 수 없음');
      } else {
        setConnectionStatus('❌ 연결 오류');
      }
    }
  };

  // 페이지 로드 시 연결 상태 확인
  useEffect(() => {
    checkConnection();
  }, []);

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

      // ngrok 요청을 위한 헤더 설정
      const getRequestHeaders = () => {
        const headers = {
          'Content-Type': 'application/json',
        };
        
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
      
      console.log('🔍 Index 페이지 API URL:', apiBaseUrl);
      console.log('🔍 현재 window.location:', window.location.href);
      console.log('🔍 전송할 데이터:', userData);
      
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/save-user-data`, {
        method: 'POST',
        headers: getRequestHeaders(),
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
      
      // 네트워크 오류 유형에 따른 상세한 에러 메시지
      let errorMessage = '서버 연결에 실패했습니다.';
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'ngrok 서버에 연결할 수 없습니다. URL을 확인하거나 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS 오류가 발생했습니다. 서버 설정을 확인해주세요.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage + ' 다시 시도해주세요.');
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

      const apiBaseUrl = getApiBaseUrl();
      
      // 과거 치트시트 존재 여부 확인
      const response = await fetchWithTimeout(`${apiBaseUrl}/api/get-cheatsheet-history/${encodeURIComponent(formData.participantId)}`, {
        method: 'GET',
        headers: getRequestHeaders()
      });
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
      
      // 네트워크 오류 유형에 따른 상세한 에러 메시지
      let errorMessage = '서버 연결에 실패했습니다.';
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'ngrok 서버에 연결할 수 없습니다. URL을 확인하거나 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS 오류가 발생했습니다. 서버 설정을 확인해주세요.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage + ' 다시 시도해주세요.');
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🏥 의료 진료 연습 시스템</h1>
        <p>AI 의사와의 진료 대화 연습</p>
        {connectionStatus && (
          <div style={{ 
            fontSize: '0.9em', 
            padding: '5px 10px', 
            borderRadius: '5px',
            backgroundColor: connectionStatus.includes('✅') ? '#d4edda' : 
                           connectionStatus.includes('⚠️') ? '#fff3cd' : '#f8d7da',
            border: `1px solid ${connectionStatus.includes('✅') ? '#c3e6cb' : 
                                connectionStatus.includes('⚠️') ? '#ffeaa7' : '#f5c6cb'}`,
            color: connectionStatus.includes('✅') ? '#155724' : 
                   connectionStatus.includes('⚠️') ? '#856404' : '#721c24'
          }}>
            {connectionStatus}
            {!connectionStatus.includes('✅') && (
              <button 
                onClick={checkConnection}
                style={{
                  marginLeft: '10px',
                  padding: '2px 8px',
                  fontSize: '0.8em',
                  backgroundColor: 'transparent',
                  border: '1px solid currentColor',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                🔄 재시도
              </button>
            )}
          </div>
        )}
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
