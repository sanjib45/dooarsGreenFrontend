import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import { authAPI } from '../api/authApi';

export default function Layout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Pre-populate from cache so there's no "Loading..." flash
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; }
    catch { return null; }
  });

  useEffect(() => {
    const controller = new AbortController();
    authAPI.getProfile()
      .then(({ data }) => {
        if (data?.success) {
          setProfile(data.data);
          localStorage.setItem('user', JSON.stringify(data.data));
        }
      })
      .catch(() => { /* silent — cached value is still shown */ });
    return () => controller.abort();
  }, []);

  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-surface overflow-hidden font-sans relative">
      {/* Top Navbar */}
      <header className="h-16 shrink-0 border-b border-outline-variant/20 bg-surface-container-lowest flex items-center justify-between px-4 z-50">
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-surface-container transition-all text-on-surface-variant active:scale-90 flex items-center justify-center mr-4"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full overflow-hidden flex justify-center items-start shadow-sm bg-white border border-white shrink-0">
              <img src="/logo.png" alt="DOOARS GREEN Logo" className="h-[115%] max-w-none -mt-[10%]" />
            </div>
            <span className="font-headline font-bold text-primary text-xl tracking-tight">
              DOOARS GREEN
            </span>
          </a>
        </div>

        {/* Settings button in the top right corner */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 rounded-xl hover:bg-surface-container transition-all text-on-surface-variant active:scale-90 flex items-center justify-center"
            title="Settings"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Off-canvas on mobile, collapsable on desktop */}
      <div
        className={`print:hidden z-40 shadow-xl shadow-primary/5 flex-shrink-0 transition-all duration-300 ease-in-out absolute md:relative h-full ${
          isMobile
            ? `fixed inset-y-0 left-0 bg-white ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}`
            : sidebarOpen ? 'w-72 translate-x-0' : 'w-[72px] translate-x-0'
        }`}
      >
        <Sidebar 
          collapsed={!isMobile && !sidebarOpen} 
          onToggle={() => setSidebarOpen(o => !o)} 
          isMobile={isMobile}
          profile={profile}
        />
      </div>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth bg-surface relative z-10 print:overflow-visible print:h-auto print:p-0">
          <div className="max-w-[1600px] mx-auto w-full animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Background decorative leaf SVG */}
      <div className="fixed top-0 right-0 z-0 w-1/3 h-full opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full text-primary" viewBox="0 0 100 100">
          <path d="M10,90 Q30,10 50,50 T90,10" fill="none" stroke="currentColor" strokeWidth="0.2" />
          <path d="M5,85 Q25,5 45,45 T85,5" fill="none" stroke="currentColor" strokeWidth="0.1" />
        </svg>
      </div>

      <SettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
        onProfileUpdate={() => {
          authAPI.getProfile()
            .then(({ data }) => {
              if (data?.success) {
                setProfile(data.data);
                localStorage.setItem('user', JSON.stringify(data.data));
              }
            })
            .catch(() => {});
        }}
      />
    </div>
  );
}
