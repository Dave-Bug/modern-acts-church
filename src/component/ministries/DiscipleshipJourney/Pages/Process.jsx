// Pages/Process.jsx
import React, { useState, useEffect } from "react";
import Consolidation from "./Consolidation";
import SoulWinning from "./SoulWinning";
import Soaking from "./Soaking";
import Schooling from "./Schooling";
import { supabase } from "../../../../Services/supabase";

export default function Process() {
  const [activeTab, setActiveTab] = useState("Consolidation");
  const [loadingStats, setLoadingStats] = useState(true);
  
  const tabs = ["Consolidation", "Soul Winning", "Soaking", "Schooling"];

  // State to hold the calculations for the pipeline overview
  const [stats, setStats] = useState({
    "Consolidation": { total: 0, ready: 0, women: 0, men: 0 },
    "Soul Winning": { total: 0, ready: 0, women: 0, men: 0 },
    "Soaking": { total: 0, ready: 0, women: 0, men: 0 },
    "Schooling": { total: 0, ready: 0, women: 0, men: 0 },
  });

  // Re-fetch stats whenever the tab changes to keep numbers fresh
  useEffect(() => {
    fetchPipelineStats();
  }, [activeTab]);

  const parseBool = (val) => {
    if (val === true || val === 1) return true;
    if (!val) return false;
    const str = String(val).trim().toUpperCase();
    return str === "TRUE" || str === "COMPLETED";
  };

  async function fetchPipelineStats() {
    try {
      setLoadingStats(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("*");

      if (error) throw error;

      // Initialize fresh counters
      let newStats = {
        "Consolidation": { total: 0, ready: 0, women: 0, men: 0 },
        "Soul Winning": { total: 0, ready: 0, women: 0, men: 0 },
        "Soaking": { total: 0, ready: 0, women: 0, men: 0 },
        "Schooling": { total: 0, ready: 0, women: 0, men: 0 },
      };

      if (data) {
        data.forEach((r) => {
          const stage = r.current_stage;
          if (!newStats[stage]) return; // Skip if they are "Graduated" or not in these 4 tabs

          // Increment totals and gender demographics
          newStats[stage].total += 1;
          if (r.gender_category === "Women") newStats[stage].women += 1;
          if (r.gender_category === "Men") newStats[stage].men += 1;

          // Determine "Ready" status based on specific module rules
          let isReady = false;
          
          if (stage === "Consolidation") {
            isReady = r.conso_1_done && r.conso_2_done;
          } 
          else if (stage === "Soul Winning") {
            isReady = r.soul_winning_status === "Active";
          } 
          else if (stage === "Soaking") {
            isReady = 
              parseBool(r.lr_pre_retreat) && 
              parseBool(r.lr_life_retreat) && 
              r.soaking_status?.toUpperCase() === "ACTIVE" && 
              r.remarks_for_lr?.toUpperCase() === "READY";
          } 
          else if (stage === "Schooling") {
            isReady = 
              parseBool(r.vlc) && 
              parseBool(r.sod_1) && 
              parseBool(r.sod_2) && 
              parseBool(r.sod_3) && 
              parseBool(r.preaching_test) && 
              r.schooling_status?.toUpperCase() === "ACTIVE";
          }

          if (isReady) newStats[stage].ready += 1;
        });
      }

      setStats(newStats);
    } catch (err) {
      console.error("Failed to load pipeline statistics:", err.message);
    } finally {
      setLoadingStats(false);
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {loadingStats && (
        <div className="text-xs text-slate-500 font-bold animate-pulse mb-[-1rem]">
          Synchronizing pipeline data...
        </div>
      )}

      {/* Interactive Stat Cards as Tabs */}
      {/* Changed gap-3 to gap-2 to bring cards closer together */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const s = stats[tab];
          const ratio = s.total > 0 ? (s.ready / s.total) * 100 : 0;
          const isActive = activeTab === tab;
          
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              // Changed padding from p-3 to p-2 and gap from gap-1.5 to gap-1 to make the card more compact
              className={`text-left flex flex-col gap-1 p-2 rounded-lg shadow-sm transition-all duration-200 outline-none ${
                isActive 
                  ? "bg-white border-2 border-blue-500 ring-0" 
                  : "bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white hover:shadow-md"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                {/* Enlarged text from text-xs to text-sm */}
                <span className={`font-bold text-sm ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                  {tab}
                </span>
                {/* Enlarged text slightly from text-[10px] to text-[11px] */}
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                  s.ready === s.total && s.total > 0 ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"
                }`}>
                  Ready: {s.ready}/{s.total}
                </span>
              </div>
              
              {/* Enlarged text from text-[10px] to text-xs */}
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Total Population: <span className="text-slate-700 font-bold">{s.total}</span> <br/>
                <span className="text-slate-400 font-medium">({s.women} Women, {s.men} Men)</span>
              </p>
              
              {/* Readiness Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                <div 
                  className={`h-1 rounded-full transition-all duration-500 ${
                    s.ready === s.total && s.total > 0 ? "bg-emerald-500" : "bg-blue-500"
                  }`} 
                  style={{ width: `${ratio}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Area */}
      <div className="mt-4 border-t border-slate-200 pt-6">
        {activeTab === "Consolidation" && <Consolidation />}
        {activeTab === "Soul Winning" && <SoulWinning />}
        {activeTab === "Soaking" && <Soaking />}
        {activeTab === "Schooling" && <Schooling />}
      </div>
    </div>
  );
}