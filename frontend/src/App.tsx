import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JoinPage } from './pages/JoinPage';
import { SessionPage } from './pages/SessionPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/join/cafe-alpha" replace />} />
        <Route path="/join/:cafeId" element={<JoinPage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="*" element={<Navigate to="/join/cafe-alpha" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
