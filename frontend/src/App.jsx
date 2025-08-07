import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Index from './pages/Index'
import Guideline from './pages/Guideline'
import Chat from './pages/Chat'
import Feedback from './pages/Feedback'
import Retry from './pages/Retry'
import Cheatsheet from './pages/Cheatsheet'
import CheatsheetHistory from './pages/CheatsheetHistory'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/guideline" element={<Guideline />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/retry" element={<Retry />} />
          <Route path="/cheatsheet" element={<Cheatsheet />} />
          <Route path="/cheatsheet-history" element={<CheatsheetHistory />} />
          {/* 추후 다른 페이지들 추가 예정 */}
        </Routes>
      </div>
    </Router>
  )
}

export default App
