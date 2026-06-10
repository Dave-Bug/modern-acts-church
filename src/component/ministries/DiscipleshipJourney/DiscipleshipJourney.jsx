import { useState } from "react";
import { Link } from "react-router-dom"; 
import { 
  FaUsers, FaCross, FaWater, FaGraduationCap, 
  FaChevronLeft, FaChevronRight, FaBars, FaTimes,
  FaHome 
} from "react-icons/fa";
import Consolidation from "./Pages/Consolidation"; 
import SoulWinning from "./Pages/SoulWinning"; 
import Soaking from "./Pages/Soaking";
import Schooling from "./Pages/Schooling";

export default function DiscipleshipJourney() {
  // Navigation & UI States
  const [currentMenu, setCurrentMenu] = useState("Consolidation"); 
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigationItems = [
    { name: "Consolidation", icon: FaUsers, color: "text-blue-600" },
    { name: "Soul Winning", icon: FaCross, color: "text-red-500" },
    { name: "Soaking", icon: FaWater, color: "text-cyan-500" },
    { name: "Schooling", icon: FaGraduationCap, color: "text-indigo-500" },
  ];

  return (
    <div className="h-[100dvh] w-screen bg-[#f8fafc] text-slate-800 flex overflow-hidden antialiased font-sans relative">

      {/* ================= SIDEBAR MENU (DESKTOP) ================= */}
      <aside 
        className={`hidden md:flex flex-col bg-slate-900 text-slate-200 h-full border-r border-slate-800 transition-all duration-300 z-30 shrink-0 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand App Header block */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          {!sidebarCollapsed ? (
            <span className="text-sm font-black uppercase tracking-wider bg-linear-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              DJ Monitoring
            </span>
          ) : (
            <span className="text-[10px] mx-auto font-black text-slate-500">DJ</span>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white mx-auto md:mx-0 cursor-pointer transition-colors"
          >
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        {/* Desktop Sidebar Integrated Utility Context Actions Layer */}
        <div className="p-3 border-b border-slate-800/60">
          <Link
            to="/ministries"
            className={`flex items-center rounded-xl py-2.5 bg-slate-800/40 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white border border-slate-800 transition-all ${
              sidebarCollapsed ? "justify-center px-0" : "px-3.5 gap-3"
            }`}
          >
            <FaHome className="text-sm text-slate-400 shrink-0" />
            {!sidebarCollapsed && <span>Back to Hub</span>}
          </Link>
        </div>

        {/* Dynamic Navigation Map Link Stack */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentMenu === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setCurrentMenu(item.name)}
                className={`w-full flex items-center rounded-xl py-3 px-3.5 transition-all text-xs font-bold cursor-pointer group ${
                  isSelected 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <Icon className={`text-base shrink-0 ${isSelected ? "text-white" : item.color} ${sidebarCollapsed ? "mx-auto" : "mr-3"}`} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ================= MOBILE NAVIGATION DRAWER ================= */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-50 md:hidden backdrop-blur-xs transition-opacity" 
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div 
            className="w-64 bg-slate-900 h-full p-4 flex flex-col space-y-4 animate-in slide-in-from-left duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Navigation Pipeline</span>
              <button 
                onClick={() => setMobileSidebarOpen(false)} 
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isSelected = currentMenu === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => { setCurrentMenu(item.name); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center rounded-xl py-3 px-3.5 text-xs font-bold cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`text-base mr-3 shrink-0 ${isSelected ? "text-white" : item.color}`} />
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= WORKSPACE PANEL FRAMING ================= */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Header Panel View */}
        <header className="h-16 bg-white border-b border-slate-200 shrink-0 px-4 flex items-center justify-between gap-4 sticky top-0 z-20">
          
          {/* Mobile Back Button & Toggle controls grouped cleanly on left side */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/ministries"
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 active:bg-slate-100 transition-colors"
            >
              <FaHome className="text-slate-500" />
              Back
            </Link>
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer active:scale-95 transition-transform"
            >
              <FaBars />
            </button>
          </div>
          
          {/* Mobile Display Route Breadcrumbs Header */}
          <div className="text-right ml-auto md:block">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">Active Track</span>
            <span className="text-xs font-black text-slate-800">{currentMenu}</span>
          </div>
        </header>

        {/* Dynamic Inner Container Content Loader */}
        <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto flex-1 overflow-y-auto min-h-0">
          {currentMenu === "Consolidation" ? (
              <Consolidation />
          ) : currentMenu === "Soul Winning" ? (
              <SoulWinning />
          ) : currentMenu === "Soaking" ? (
              <Soaking />
          ) : currentMenu === "Schooling" ? (
              <Schooling />
          ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto mt-6 sm:mt-12 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg mx-auto mb-4 font-black">⚙️</div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 mb-1">{currentMenu} Submodule Pipeline</h2>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    This tracking layout is reserved. Complete your foundational entries inside Soaking to prepare profiles for this milestone stage.
                </p>
              </div>
          )}
        </div>
      </main>

    </div>
  );
}

