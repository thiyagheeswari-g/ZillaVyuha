import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { MultiAgentFlow } from './pages/MultiAgentFlow';
import { AgentDetail } from './pages/AgentDetail';
import { Alerts } from './pages/Alerts';
import { Recommendations } from './pages/Recommendations';
import { Facilities } from './pages/Facilities';
import { Resources } from './pages/Resources';
import { Forecasts } from './pages/Forecasts';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
import { Approvals } from './pages/Approvals';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="agent-flow" element={<MultiAgentFlow />} />
          <Route path="agent-flow/:flowId/step/:stepId" element={<AgentDetail />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="resources" element={<Resources />} />
          <Route path="forecasts" element={<Forecasts />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<div className="p-6 text-xl">Page not found or not in Tier 1 scope.</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
