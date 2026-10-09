import React, { useState, useEffect } from "react";
import Consolidation from "./Consolidation";
import SoulWinning from "./SoulWinning";
import Soaking from "./Soaking";
import Schooling from "./Schooling";
import Graduates from "./Graduates"; // NEW IMPORT
import { supabase } from "../../../../Services/supabase";
import {
  FaUsers,
  FaCheckCircle,
  FaSpinner,
  FaChevronRight,
  FaLayerGroup,
  FaHeart,
  FaWater,
  FaGraduationCap,
  FaFemale,
  FaMale,
  FaAward, // NEW ICON for Graduates
} from "react-icons/fa";

export default function Process() {
  const [activeTab, setActiveTab] = useState("Consolidation");
  const [loadingStats, setLoadingStats] = useState(true);

  // ADDED "Graduates" to tabs
  const tabs = ["Consolidation", "Soul Winning", "Soaking", "Schooling", "Graduates"];

  const tabIcons = {
    Consolidation: FaLayerGroup,
    "Soul Winning": FaHeart,
    Soaking: FaWater,
    Schooling: FaGraduationCap,
    Graduates: FaAward, // NEW
  };

  const tabColors = {
    Consolidation: { active: "bg-blue-500", light: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", ring: "ring-blue-500", bg: "bg-blue-500/10" },
    "Soul Winning": { active: "bg-rose-500", light: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", ring: "ring-rose-500", bg: "bg-rose-500/10" },
    Soaking: { active: "bg-cyan-500", light: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-200", ring: "ring-cyan-500", bg: "bg-cyan-500/10" },
    Schooling: { active: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", ring: "ring-emerald-500", bg: "bg-emerald-500/10" },
    Graduates: { active: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", ring: "ring-amber-500", bg: "bg-amber-500/10" }, // NEW
  };

  // ADDED graduates count
  const [stats, setStats] = useState({
    Consolidation: { total: 0, ready: 0, women: 0, men: 0 },
    "Soul Winning": { total: 0, ready: 0, women: 0, men: 0 },
    Soaking: { total: 0, ready: 0, women: 0, men: 0 },
    Schooling: { total: 0, ready: 0, women: 0, men: 0 },
       Graduates: { total: 0, ready: 0, women: 0, men: 0 }, // ← ADDED ready: 0
  });

  const [graduatesCount, setGraduatesCount] = useState(0); // NEW

  useEffect(() => {
    fetchPipelineStats();
    fetchGraduatesCount(); // NEW
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

      let newStats = {
        Consolidation: { total: 0, ready: 0, women: 0, men: 0 },
        "Soul Winning": { total: 0, ready: 0, women: 0, men: 0 },
        Soaking: { total: 0, ready: 0, women: 0, men: 0 },
        Schooling: { total: 0, ready: 0, women: 0, men: 0 },
         Graduates: { total: 0, ready: 0, women: 0, men: 0 }, // ← ADDED ready: 0
      };

      if (data) {
        data.forEach((r) => {
          // NEW: Count graduates separately
          if (r.current_stage === "Graduated") {
            newStats.Graduates.total += 1;
            if (r.gender_category === "Women") newStats.Graduates.women += 1;
            if (r.gender_category === "Men") newStats.Graduates.men += 1;
            return; // Skip pipeline logic for graduates
          }

          const stage = r.current_stage;
          if (!newStats[stage]) return;

          newStats[stage].total += 1;
          if (r.gender_category === "Women") newStats[stage].women += 1;
          if (r.gender_category === "Men") newStats[stage].men += 1;

          let isReady = false;

          if (stage === "Consolidation") {
            isReady = r.conso_1_done && r.conso_2_done;
          } else if (stage === "Soul Winning") {
            isReady = r.soul_winning_status === "Active";
          } else if (stage === "Soaking") {
            isReady =
              parseBool(r.lr_pre_retreat) &&
              parseBool(r.lr_life_retreat) &&
              r.soaking_status?.toUpperCase() === "ACTIVE" &&
              r.remarks_for_lr?.toUpperCase() === "READY";
          } else if (stage === "Schooling") {
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

  // NEW: Separate fetch for graduates badge count
  async function fetchGraduatesCount() {
    try {
      const { count, error } = await supabase
        .from("consolidation_pipeline")
        .select("*", { count: "exact", head: true })
        .eq("current_stage", "Graduated");

      if (error) throw error;
      setGraduatesCount(count || 0);
    } catch (err) {
      console.error("Failed to load graduates count:", err.message);
    }
  }

  const totalAcrossAll = Object.values(stats).reduce((sum, s) => sum + s.total, 0);
  const readyAcrossAll = Object.values(stats).reduce((sum, s) => sum + s.ready, 0);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Discipleship <span className="text-blue-600">Pipeline</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Track member progression through consolidation stages
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <FaUsers className="text-slate-400 text-xs sm:text-sm" />
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pipeline
            </span>
          </div>
          <div className="h-3 sm:h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <div className="text-base sm:text-lg font-black text-slate-800 leading-none">
                {totalAcrossAll}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">
                Total
              </div>
            </div>
            <div className="text-right">
              <div className="text-base sm:text-lg font-black text-emerald-600 leading-none">
                {readyAcrossAll}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-emerald-500 uppercase">
                Ready
              </div>
            </div>
            {/* NEW: Graduates badge in header */}
            <div className="h-3 sm:h-4 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-base sm:text-lg font-black text-amber-600 leading-none">
                {graduatesCount}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase">
                Graduated
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loadingStats && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 shadow-sm">
          <FaSpinner className="animate-spin text-blue-500" />
          Synchronizing pipeline data...
        </div>
      )}

      {/* MOBILE: Horizontal scrollable tabs */}
      <div className="sm:hidden -mx-3 px-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => {
            const s = stats[tab];
            const isActive = activeTab === tab;
            const colors = tabColors[tab];
            const Icon = tabIcons[tab];

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? `bg-white ${colors.border} shadow-md`
                    : "bg-white border-slate-200"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? colors.light : "bg-slate-100"}`}>
                  <Icon className={`text-xs ${isActive ? colors.text : "text-slate-400"}`} />
                </div>
                <div className="text-left">
                  <div className={`text-xs font-bold ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                    {tab}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">
                      {s.total}
                    </span>
                    {/* Only show "ready" badge for non-Graduate tabs */}
                    {tab !== "Graduates" && s.ready > 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${colors.light} ${colors.text}`}>
                        {s.ready} ready
                      </span>
                    )}
                    {/* Show "completed" badge for Graduates */}
                    {tab === "Graduates" && s.total > 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${colors.light} ${colors.text}`}>
                        Done
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP: Grid cards — CHANGED to 5 columns on xl screens */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tabs.map((tab) => {
          const s = stats[tab];
          const ratio = s.total > 0 && tab !== "Graduates" ? (s.ready / s.total) * 100 : 0;
          const isActive = activeTab === tab;
          const colors = tabColors[tab];
          const Icon = tabIcons[tab];

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`group relative text-left rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                isActive
                  ? `bg-white ${colors.border} shadow-lg`
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
              }`}
            >
              <div
                className={`h-1 w-full transition-all duration-300 ${
                  isActive ? colors.active : "bg-slate-200"
                }`}
              />

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? colors.light : "bg-slate-100"
                    }`}
                  >
                    <Icon
                      className={`text-lg ${
                        isActive ? colors.text : "text-slate-400"
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tab === "Graduates" ? (
                      // Graduates badge
                      s.total > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                          <FaCheckCircle size={10} />
                          {s.total} Done
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          None
                        </span>
                      )
                    ) : s.ready === s.total && s.total > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <FaCheckCircle size={10} />
                        Complete
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          isActive
                            ? `${colors.light} ${colors.text} ${colors.border}`
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        Ready {s.ready}/{s.total}
                      </span>
                    )}
                  </div>
                </div>

                <h3
                  className={`font-bold text-base mb-1 transition-colors ${
                    isActive ? "text-slate-900" : "text-slate-700"
                  }`}
                >
                  {tab}
                </h3>

                <p className="text-xs text-slate-500 font-medium mb-4">
                  {tab === "Consolidation" && "Foundation & relationship building"}
                  {tab === "Soul Winning" && "Evangelism & outreach training"}
                  {tab === "Soaking" && "Retreat & spiritual deepening"}
                  {tab === "Schooling" && "Leadership & ministry school"}
                  {tab === "Graduates" && "Completed discipleship journey"} {/* NEW */}
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-black text-slate-800">
                      {s.total}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Members
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex gap-3">
                    <div className="text-center">
                      <div className="text-sm font-black text-pink-500">
                        {s.women}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        Women
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black text-blue-500">
                        {s.men}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        Men
                      </div>
                    </div>
                  </div>
                </div>

                {/* Only show progress bar for non-Graduate tabs */}
                {tab !== "Graduates" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">
                        Readiness
                      </span>
                      <span
                        className={`font-bold ${
                          ratio === 100 && s.total > 0
                            ? "text-emerald-600"
                            : "text-slate-700"
                        }`}
                      >
                        {Math.round(ratio)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          ratio === 100 && s.total > 0
                            ? "bg-emerald-500"
                            : colors.active
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                )}

                {isActive && (
                  <div className="absolute bottom-4 right-4">
                    <FaChevronRight
                      className={`text-sm ${colors.text} animate-pulse`}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* MOBILE: Active tab detail card */}
      <div className="sm:hidden">
        {tabs.map((tab) => {
          if (tab !== activeTab) return null;
          const s = stats[tab];
          const ratio = s.total > 0 && tab !== "Graduates" ? (s.ready / s.total) * 100 : 0;
          const colors = tabColors[tab];
          const Icon = tabIcons[tab];

          return (
            <div
              key={tab}
              className={`bg-white rounded-2xl border-2 ${colors.border} shadow-lg overflow-hidden`}
            >
              <div className={`h-1.5 w-full ${colors.active}`} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.light}`}>
                      <Icon className={`text-sm ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        {tab}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {tab === "Consolidation" && "Foundation & relationship building"}
                        {tab === "Soul Winning" && "Evangelism & outreach training"}
                        {tab === "Soaking" && "Retreat & spiritual deepening"}
                        {tab === "Schooling" && "Leadership & ministry school"}
                        {tab === "Graduates" && "Completed discipleship journey"} {/* NEW */}
                      </p>
                    </div>
                  </div>
                  {tab === "Graduates" ? (
                    s.total > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                        <FaCheckCircle size={10} />
                        {s.total} Done
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                        None
                      </span>
                    )
                  ) : s.ready === s.total && s.total > 0 ? (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                      <FaCheckCircle size={10} />
                      Complete
                    </span>
                  ) : (
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${colors.light} ${colors.text} ${colors.border}`}>
                      Ready {s.ready}/{s.total}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 py-3 border-y border-slate-100">
                  <div className="flex-1 text-center">
                    <div className="text-xl font-black text-slate-800">{s.total}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Members</div>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex-1">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm font-black text-pink-500">
                          <FaFemale className="text-xs" />
                          {s.women}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400">Women</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm font-black text-blue-500">
                          <FaMale className="text-xs" />
                          {s.men}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400">Men</div>
                      </div>
                    </div>
                  </div>
                </div>

                {tab !== "Graduates" && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500">Readiness</span>
                      <span className={`font-bold ${ratio === 100 && s.total > 0 ? "text-emerald-600" : "text-slate-700"}`}>
                        {Math.round(ratio)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${ratio === 100 && s.total > 0 ? "bg-emerald-500" : colors.active}`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center gap-3">
          <div className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg flex items-center justify-center ${tabColors[activeTab].light}`}>
            {React.createElement(tabIcons[activeTab], {
              className: `text-xs sm:text-sm ${tabColors[activeTab].text}`,
            })}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              {activeTab === "Graduates" ? "Graduates Registry" : `${activeTab} Module`} {/* NEW */}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
              {activeTab === "Graduates" 
                ? "Members who have completed the full discipleship journey" 
                : "Manage and track member progress"} {/* NEW */}
            </p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {activeTab === "Consolidation" && <Consolidation />}
          {activeTab === "Soul Winning" && <SoulWinning />}
          {activeTab === "Soaking" && <Soaking />}
          {activeTab === "Schooling" && <Schooling />}
          {activeTab === "Graduates" && <Graduates />} {/* NEW */}
        </div>
      </div>
    </div>
  );
}