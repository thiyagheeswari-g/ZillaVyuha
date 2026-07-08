import React from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FloatingAssistant } from '../chat/FloatingAssistant';

export const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-app)] text-[var(--color-text-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <Outlet />
        </main>
        <FloatingAssistant />
      </div>
    </div>
  );
};
