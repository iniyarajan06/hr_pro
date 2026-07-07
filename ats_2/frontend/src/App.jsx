import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import ResumeScreening from './pages/ResumeScreening';
import CandidateRanking from './pages/CandidateRanking';
import CandidateDetail from './pages/CandidateDetail';
import Reports from './pages/Reports';
import Exports from './pages/Exports';
import Settings from './pages/Settings';

function WithLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<WithLayout><Dashboard /></WithLayout>} />
      <Route path="/jobs" element={<WithLayout><Jobs /></WithLayout>} />
      <Route path="/jobs/:id" element={<WithLayout><JobDetail /></WithLayout>} />
      <Route path="/jobs/:id/screening" element={<WithLayout><ResumeScreening /></WithLayout>} />
      <Route path="/jobs/:id/ranking" element={<WithLayout><CandidateRanking /></WithLayout>} />
      <Route path="/candidates/:id" element={<WithLayout><CandidateDetail /></WithLayout>} />
      <Route path="/reports" element={<WithLayout><Reports /></WithLayout>} />
      <Route path="/exports" element={<WithLayout><Exports /></WithLayout>} />
      <Route path="/settings" element={<WithLayout><Settings /></WithLayout>} />
    </Routes>
  );
}
