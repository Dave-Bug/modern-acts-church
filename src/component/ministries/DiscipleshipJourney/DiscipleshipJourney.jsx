import { useState } from "react";
import { 
  FaUsers, FaCross, FaWater, FaGraduationCap, 
  FaChevronLeft, FaChevronRight, FaBars, FaTimes 
} from "react-icons/fa";
import Consolidation from "./Pages/Consolidation"; 
import SoulWinning from "./Pages/SoulWinning"; // Imported correctly up here!
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex antialiased font-sans">
      
      {/* ================= SIDEBAR MENU (DESKTOP) ================= */}
      <aside 
        className={`hidden md:flex flex-col bg-slate-900 text-slate-200 h-screen sticky top-0 border-r border-slate-800 transition-all duration-300 z-30 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand App Header block */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!sidebarCollapsed && (
            <span className="text-sm font-black uppercase tracking-wider bg-linear-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Discipleship CRM
            </span>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white mx-auto md:mx-0 cursor-pointer"
          >
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        {/* Dynamic Navigation Map Link Stack */}
        <nav className="flex-1 p-3 space-y-1.5">
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
        <div className="fixed inset-0 bg-slate-900/60 z-50 md:hidden backdrop-blur-xs" onClick={() => setMobileSidebarOpen(false)}>
          <div className="w-64 bg-slate-900 h-full p-4 flex flex-col space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Navigation Pipeline</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="text-slate-400 p-1 text-sm"><FaTimes /></button>
            </div>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isSelected = currentMenu === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => { setCurrentMenu(item.name); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center rounded-xl py-3 px-3.5 text-xs font-bold cursor-pointer ${
                      isSelected ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Icon className={`text-base mr-3 ${isSelected ? "text-white" : item.color}`} />
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= WORKSPACE PANEL FRAMING ================= */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        
        {/* Top Floating App Bar Mobile Header view */}
        <header className="h-16 bg-white border-b border-slate-200 shrink-0 px-4 flex items-center justify-between md:justify-end gap-4 sticky top-0 z-20">
          <button 
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <FaBars />
          </button>
        </header>

        {/* Dynamic Inner Container Content Loader */}

        <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto flex-1">
        {currentMenu === "Consolidation" ? (
            <Consolidation />
        ) : currentMenu === "Soul Winning" ? (
            <SoulWinning />
        ) : currentMenu === "Soaking" ? (
            <Soaking /> /* Mounts your newly integrated grid matrix dashboard view! */
        ) : 
        currentMenu === "Schooling" ? (
            <Schooling />
        ) : (
            /* Fallback Content Block for remaining Schooling tracker module */
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12 shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg mx-auto mb-4 font-black">⚙️</div>
            <h2 className="text-base font-black text-slate-900 mb-1">{currentMenu} Submodule Pipeline</h2>
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

