import React, { useState, useEffect } from "react";
import { supabase } from "../../../Services/supabase";
import {
  FaUsers, FaSpinner, FaUserCog, FaSearch,
  FaTimes, FaToggleOn, FaToggleOff, FaTable, FaCalendarAlt, FaCheck, FaFileExcel, FaTrashAlt,
  FaChartBar, FaHeartbeat
} from "react-icons/fa";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Utility to get current month in YYYY-MM format
const getCurrentMonthString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

// Utility to get total days in a specific YYYY-MM
const getDaysInMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

// Get number of weeks in a month (typically 4-5)
const getWeeksInMonth = (yearMonth) => {
  const days = getDaysInMonth(yearMonth);
  const weeks = [];
  for (let i = 1; i <= days; i += 7) {
    const end = Math.min(i + 6, days);
    weeks.push({ weekNumber: Math.ceil(i / 7), label: `W${Math.ceil(i / 7)}` });
  }
  return weeks;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ============================================================
// DYNAMIC CATEGORY CONFIG — edit this list to add/rename/reorder
// categories. Everything (pickers, summaries, dashboard, Excel
// export) renders from this single source of truth.
// `hex` is used for inline styles so colors ALWAYS render even
// if Tailwind purges dynamic class names.
// ============================================================
const LIFEGROUP_CATEGORIES = [
  { id: "one_on_one",         label: "One on One",         short: "1:1",    hex: "#3b82f6" },
  { id: "mac_group",          label: "MAC Group",          short: "MAC",    hex: "#6366f1" },
  { id: "mentoring",          label: "Mentoring",          short: "MNT",    hex: "#a855f7" },
  { id: "kids_community",     label: "Kids Community",     short: "KIDS",   hex: "#f59e0b" },
  { id: "teens_community",    label: "Teens Community",    short: "TEENS",  hex: "#ec4899" },
  { id: "family_macgroup",    label: "Family MACGroup",    short: "FAMILY", hex: "#10b981" },
  { id: "corporate_macgroup", label: "Corporate MACGroup", short: "CORP",   hex: "#0891b2" },
  { id: "campus_macgroup",    label: "Campus MACGroup",    short: "CAMPUS", hex: "#f43f5e" },
];

const CATEGORY_MAP = Object.fromEntries(LIFEGROUP_CATEGORIES.map(c => [c.id, c]));

// ============================================================
// LEADER HEALTH STATUS — based on weeks with >=1 lifegroup
// conducted in the selected month
//   0-1 weeks = Critical
//   2 weeks   = Under Monitoring
//   3 weeks   = Stable
//   4+ weeks  = Excellent
// ============================================================
const LEADER_STATUSES = {
  critical:   { key: "critical",   label: "Critical",         hex: "#f43f5e", badge: "bg-rose-100 text-rose-700 border-rose-200",    barHex: "#f43f5e" },
  monitoring: { key: "monitoring", label: "Under Monitoring", hex: "#f59e0b", badge: "bg-amber-100 text-amber-700 border-amber-200", barHex: "#f59e0b" },
  stable:     { key: "stable",     label: "Stable",           hex: "#3b82f6", badge: "bg-blue-100 text-blue-700 border-blue-200",    barHex: "#3b82f6" },
  excellent:  { key: "excellent",  label: "Excellent",        hex: "#10b981", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", barHex: "#10b981" },
};

const getLeaderStatus = (weeksConducted) => {
  if (weeksConducted <= 1) return LEADER_STATUSES.critical;
  if (weeksConducted === 2) return LEADER_STATUSES.monitoring;
  if (weeksConducted === 3) return LEADER_STATUSES.stable;
  return LEADER_STATUSES.excellent;
};

// Safely read the categories array from a checkin record.
// Backward compatible: legacy rows with is_checked=true but no
// categories array are treated as "one_on_one".
const getRecordCategories = (record) => {
  if (!record) return [];
  if (Array.isArray(record.categories) && record.categories.length > 0) return record.categories;
  if (record.is_checked) return ["one_on_one"];
  return [];
};

// Small colored dots showing which categories a record has (inline style = purge-proof)
function CategoryDots({ categories, className = "" }) {
  if (!categories.length) return null;
  return (
    <div className={`flex gap-0.5 flex-wrap ${className}`}>
      {categories.map(id => (
        <span
          key={id}
          title={CATEGORY_MAP[id]?.label || id}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: CATEGORY_MAP[id]?.hex || "#94a3b8" }}
        />
      ))}
    </div>
  );
}

// Per-category count chips used in the Annual summary
function CategoryBreakdown({ countMap }) {
  const entries = LIFEGROUP_CATEGORIES.filter(c => (countMap[c.id] || 0) > 0);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(c => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-white border-slate-200 text-slate-600"
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.hex }} />
          {c.short} ×{countMap[c.id]}
        </span>
      ))}
    </div>
  );
}

export default function LifeGroupChecking() {
  const [activeTab, setActiveTab] = useState("monthly"); // "monthly" | "annual" | "dashboard"
  const [members, setMembers] = useState([]);
  const [checkins, setCheckins] = useState([]); // Entire year's checkin records
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());

  // Roster Modal States
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Category picker sheet: which member/week cell is being edited
  const [selectedCell, setSelectedCell] = useState(null); // { memberId, weekNumber }

  // Dashboard leader-status filter
  const [statusFilter, setStatusFilter] = useState("all");

  // ============================================================
  // ✅ DERIVED VALUES — declared FIRST, before anything that
  // uses them. (This ordering was the blank-screen bug.)
  // ============================================================
  const weeks = getWeeksInMonth(selectedMonth);
  const currentYear = selectedMonth.split('-')[0];

  const activeMembers = members.filter(m => m.is_lifegroup_tracked);
  const filteredActiveMembers = activeMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredRosterConfig = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(rosterSearchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // Close the category sheet when switching months
  useEffect(() => {
    setSelectedCell(null);
  }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch all members
      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name, is_lifegroup_tracked")
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;

      // 2. Fetch checkins for the entire selected year
      const { data: yearCheckins, error: checkinErr } = await supabase
        .from("lifegroup_checkins")
        .select("*")
        .gte("tracking_month", `${currentYear}-01`)
        .lte("tracking_month", `${currentYear}-12`);
      if (checkinErr) throw checkinErr;

      setMembers(roster || []);
      setCheckins(yearCheckins || []);
    } catch (err) {
      console.error("Error fetching data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const findRecord = (memberId, month, weekNumber) =>
    checkins.find(c => c.member_id === memberId && c.tracking_month === month && c.week_number === weekNumber);

  // Toggle one category inside the selected cell (member + week)
  const handleCategoryToggle = async (categoryId) => {
    if (!selectedCell) return;
    const { memberId, weekNumber } = selectedCell;

    try {
      const existingRecord = findRecord(memberId, selectedMonth, weekNumber);

      if (existingRecord) {
        const currentCats = getRecordCategories(existingRecord);
        const newCats = currentCats.includes(categoryId)
          ? currentCats.filter(c => c !== categoryId)
          : [...currentCats, categoryId];

        if (newCats.length === 0) {
          // No categories left — remove the row entirely
          const { error } = await supabase
            .from("lifegroup_checkins")
            .delete()
            .eq("id", existingRecord.id);
          if (error) throw error;
          setCheckins(prev => prev.filter(c => c.id !== existingRecord.id));
        } else {
          const { error } = await supabase
            .from("lifegroup_checkins")
            .update({ categories: newCats, is_checked: true })
            .eq("id", existingRecord.id);
          if (error) throw error;
          setCheckins(prev =>
            prev.map(c => c.id === existingRecord.id ? { ...c, categories: newCats, is_checked: true } : c)
          );
        }
      } else {
        // First category for this cell — insert a new row
        const { data, error } = await supabase
          .from("lifegroup_checkins")
          .insert([{
            member_id: memberId,
            tracking_month: selectedMonth,
            week_number: weekNumber,
            is_checked: true,
            categories: [categoryId],
          }])
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          setCheckins(prev => [...prev, data[0]]);
        }
      }
    } catch (err) {
      console.error("Error saving checkin:", err);
      alert("Error saving checkin: " + err.message);
    }
  };

  // Clear every category in the selected cell
  const handleClearCell = async () => {
    if (!selectedCell) return;
    const { memberId, weekNumber } = selectedCell;
    const existingRecord = findRecord(memberId, selectedMonth, weekNumber);
    if (!existingRecord) return;

    try {
      const { error } = await supabase
        .from("lifegroup_checkins")
        .delete()
        .eq("id", existingRecord.id);
      if (error) throw error;
      setCheckins(prev => prev.filter(c => c.id !== existingRecord.id));
    } catch (err) {
      alert("Error clearing checkin: " + err.message);
    }
  };

  // Toggle Tracking Status in Roster
  const handleToggleTracking = async (memberId, currentStatus) => {
    const updatedStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from("usher_members")
        .update({ is_lifegroup_tracked: updatedStatus })
        .eq("id", memberId);
      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_lifegroup_tracked: updatedStatus } : m));
    } catch (err) {
      alert("Could not update roster status: " + err.message);
    }
  };

  // Per-member stats for the selected month
  const getMonthStats = (memberId) => {
    let weeksAttended = 0;
    let frequency = 0;
    const categoryCounts = {};
    weeks.forEach(w => {
      const cats = getRecordCategories(findRecord(memberId, selectedMonth, w.weekNumber));
      if (cats.length > 0) weeksAttended++;
      frequency += cats.length;
      cats.forEach(id => { categoryCounts[id] = (categoryCounts[id] || 0) + 1; });
    });
    return { weeksAttended, frequency, categoryCounts };
  };

  // Per-member stats for a specific month string (used by annual view + export)
  const getStatsForMonth = (memberId, monthStr) => {
    const monthWeeks = getWeeksInMonth(monthStr);
    let frequency = 0;
    monthWeeks.forEach(w => {
      frequency += getRecordCategories(findRecord(memberId, monthStr, w.weekNumber)).length;
    });
    return frequency;
  };

  // Per-member per-category counts for the whole selected year
  const getYearCategoryCounts = (memberId) => {
    const counts = {};
    for (let idx = 0; idx < 12; idx++) {
      const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
      getWeeksInMonth(monthStr).forEach(w => {
        getRecordCategories(findRecord(memberId, monthStr, w.weekNumber)).forEach(id => {
          counts[id] = (counts[id] || 0) + 1;
        });
      });
    }
    return counts;
  };

  // ============================================================
  // DASHBOARD COMPUTATIONS
  // (safe now — activeMembers is declared above)
  // ============================================================

  // 1) Per-month, per-category conducted counts for the whole year
  //    (one "conducted" = one category checked for any member, any week)
  const monthCategoryMatrix = MONTH_NAMES.map((m, idx) => {
    const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
    const catCounts = {};
    let total = 0;
    activeMembers.forEach(member => {
      getWeeksInMonth(monthStr).forEach(w => {
        getRecordCategories(findRecord(member.id, monthStr, w.weekNumber)).forEach(id => {
          catCounts[id] = (catCounts[id] || 0) + 1;
          total++;
        });
      });
    });
    return { monthStr, label: m, catCounts, total };
  });

  // 2) Leader health for the selected month (critical first)
  const leaderRows = activeMembers.map(member => {
    const stats = getMonthStats(member.id);
    return { member, ...stats, status: getLeaderStatus(stats.weeksAttended) };
  }).sort((a, b) => a.weeksAttended - b.weeksAttended || a.frequency - b.frequency);

  const statusCounts = {
    critical: leaderRows.filter(r => r.status.key === "critical").length,
    monitoring: leaderRows.filter(r => r.status.key === "monitoring").length,
    stable: leaderRows.filter(r => r.status.key === "stable").length,
    excellent: leaderRows.filter(r => r.status.key === "excellent").length,
  };

  const filteredLeaderRows = statusFilter === "all"
    ? leaderRows
    : leaderRows.filter(r => r.status.key === statusFilter);

  const selectedMonthStats = monthCategoryMatrix.find(r => r.monthStr === selectedMonth);
  const selectedMonthFreq = selectedMonthStats ? selectedMonthStats.total : 0;

  // Export to Excel function
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(
      activeTab === "monthly" ? `Weekly Detail ${selectedMonth}` : `Annual Summary ${currentYear}`
    );

    const styleHeader = (row, freqColIndex) => {
      row.font = { bold: true, color: { argb: "FF1E293B" } };
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }; // light blue
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      if (freqColIndex) {
        row.getCell(freqColIndex).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } }; // yellow FREQUENCY
      }
    };

    if (activeTab === "monthly") {
      // Format mirrors the printed LifeGroup sheet:
      // NAME | W1..W5 | Weeks Attended | <one column per category> | FREQUENCY
      const headerRow = [
        "Member Name",
        ...weeks.map(w => w.label),
        "Weeks Attended",
        ...LIFEGROUP_CATEGORIES.map(c => c.label),
        "FREQUENCY",
      ];
      styleHeader(sheet.addRow(headerRow), headerRow.length);

      filteredActiveMembers.forEach((member) => {
        const stats = getMonthStats(member.id);
        const rowData = [`${member.first_name} ${member.last_name}`];

        weeks.forEach((w) => {
          const cats = getRecordCategories(findRecord(member.id, selectedMonth, w.weekNumber));
          rowData.push(cats.length > 0 ? cats.length : "");
        });

        rowData.push(`${stats.weeksAttended} / ${weeks.length}`);
        LIFEGROUP_CATEGORIES.forEach(c => rowData.push(stats.categoryCounts[c.id] || 0));
        rowData.push(stats.frequency);
        sheet.addRow(rowData);
      });
    } else {
      // Annual: months + per-category yearly totals + FREQUENCY
      const headerRow = [
        "Member Name",
        ...MONTH_NAMES,
        ...LIFEGROUP_CATEGORIES.map(c => c.label),
        "FREQUENCY",
      ];
      styleHeader(sheet.addRow(headerRow), headerRow.length);

      filteredActiveMembers.forEach((member) => {
        const rowData = [`${member.first_name} ${member.last_name}`];
        let annualTotal = 0;

        MONTH_NAMES.forEach((m, idx) => {
          const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
          const freq = getStatsForMonth(member.id, monthStr);
          annualTotal += freq;
          rowData.push(freq > 0 ? freq : 0);
        });

        const yearCats = getYearCategoryCounts(member.id);
        LIFEGROUP_CATEGORIES.forEach(c => rowData.push(yearCats[c.id] || 0));
        rowData.push(annualTotal);
        sheet.addRow(rowData);
      });
    }

    // Auto-fit Columns
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value !== null && cell.value !== undefined) {
          maxLen = Math.max(maxLen, cell.value.toString().length + 3);
        }
      });
      col.width = maxLen;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = activeTab === "monthly"
      ? `LifeGroup_Weekly_${selectedMonth}.xlsx`
      : `LifeGroup_Annual_Summary_${currentYear}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  // Data for the open category sheet
  const sheetMember = selectedCell ? members.find(m => m.id === selectedCell.memberId) : null;
  const sheetRecord = selectedCell ? findRecord(selectedCell.memberId, selectedMonth, selectedCell.weekNumber) : null;
  const sheetCategories = getRecordCategories(sheetRecord);

  const isDashboard = activeTab === "dashboard";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full w-full">
      <div className="flex-1 overflow-auto">

        {/* Header Panel */}
        <div className="p-3 md:p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 bg-slate-50">
          <div>
            <h2 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2">
              <FaUsers className="text-blue-500" /> Life Group Checking
            </h2>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              {isDashboard
                ? "Monitor conducted lifegroups per category and leader health."
                : "Tap a week cell to set categories attended. "}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Target:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => { if (e.target.value) setSelectedMonth(e.target.value); }}
                className="w-full bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => { setRosterSearchQuery(""); setShowRosterModal(true); }}
              className="w-full bg-white border border-slate-200 hover:border-blue-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FaUserCog /> Manage Roster
            </button>
            <button
              onClick={exportToExcel}
              disabled={isDashboard}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl px-2.5 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 md:gap-2 cursor-pointer disabled:cursor-not-allowed"
                          >
                            
              <FaFileExcel className="text-sm sm:text-base text-emerald-600" /> Export Excel
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 px-3 md:px-4 pt-1 gap-1 bg-white">
          <button onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-1.5 px-2 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === "monthly" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaTable /> <span>Weekly Detail</span>
          </button>
          <button onClick={() => setActiveTab("annual")}
            className={`flex items-center gap-1.5 px-2 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === "annual" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaCalendarAlt /> <span>Annual Summary</span>
          </button>
          <button onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-2 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === "dashboard" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaChartBar /> <span>Dashboard</span>
          </button>
        </div>

        {/* Search Bar — hidden on dashboard (it has its own filters) */}
        {!isDashboard && (
          <div className="p-3 border-b border-slate-100 bg-white sticky top-0 z-20 md:static md:z-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2 w-full max-w-sm">
              <FaSearch className="text-slate-400 text-xs ml-1" />
              <input
                type="text" placeholder="Search tracked members..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <FaSpinner className="animate-spin text-xl mb-2" />
            <span className="text-xs font-bold">Syncing attendance...</span>
          </div>
        ) : activeMembers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FaUsers className="text-3xl text-slate-200 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500 mb-0.5">No members are currently being tracked.</p>
            <p className="text-[11px] text-slate-400">Click "Manage Roster" to start adding people to the Life Group.</p>
          </div>
        ) : isDashboard ? (
          <>
            {/* ============================================================
                📊 DASHBOARD
                ============================================================ */}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3 md:p-4 border-b border-slate-100">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Conducted · {MONTH_NAMES[Number(selectedMonth.split('-')[1]) - 1]} {currentYear}</div>
                <div className="text-xl font-black text-slate-800 mt-0.5">{selectedMonthFreq}</div>
                <div className="text-[10px] font-medium text-slate-400">total lifegroup sessions</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-xs">
                <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wide">Critical Leaders</div>
                <div className="text-xl font-black text-rose-600 mt-0.5">{statusCounts.critical}</div>
                <div className="text-[10px] font-medium text-rose-400">0–1 weeks conducted</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-xs">
                <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">Under Monitoring</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">{statusCounts.monitoring}</div>
                <div className="text-[10px] font-medium text-amber-400">2 weeks conducted</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-xs">
                <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide">Stable + Excellent</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">{statusCounts.stable + statusCounts.excellent}</div>
                <div className="text-[10px] font-medium text-emerald-400">3+ weeks conducted</div>
              </div>
            </div>

            {/* Monthly per-category matrix */}
            <div className="p-3 md:p-4 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <FaChartBar className="text-blue-500" /> Conducted per Month per Category — {currentYear}
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl mt-2">
                <table className="w-full text-[11px] border-collapse min-w-[680px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2 px-3 text-left sticky left-0 bg-slate-50">Month</th>
                      {LIFEGROUP_CATEGORIES.map(c => (
                        <th key={c.id} className="py-2 px-2 text-center">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.hex }} />
                            {c.short}
                          </span>
                        </th>
                      ))}
                      <th className="py-2 px-3 text-center text-amber-600 bg-amber-50/40">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthCategoryMatrix.map((row) => (
                      <tr key={row.monthStr}
                        className={`transition-colors ${row.monthStr === selectedMonth ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                        <td className="py-1.5 px-3 font-bold text-slate-700 sticky left-0 bg-white">
                          {row.label}
                          {row.monthStr === selectedMonth && <span className="ml-1 text-[8px] font-black text-blue-500 uppercase">◀ target</span>}
                        </td>
                        {LIFEGROUP_CATEGORIES.map(c => (
                          <td key={c.id} className={`py-1.5 px-2 text-center font-mono ${(row.catCounts[c.id] || 0) > 0 ? "font-bold text-slate-800" : "text-slate-300"}`}>
                            {(row.catCounts[c.id] || 0) > 0 ? row.catCounts[c.id] : "-"}
                          </td>
                        ))}
                        <td className="py-1.5 px-3 text-center font-mono font-black text-amber-600 bg-amber-50/40">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leader health monitor */}
            <div className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <FaHeartbeat className="text-rose-500" /> Leader Health — {MONTH_NAMES[Number(selectedMonth.split('-')[1]) - 1]} {currentYear}
                </h3>

                {/* Status filter chips */}
                <div className="flex flex-wrap gap-1">
                  {[{ key: "all", label: `All (${leaderRows.length})`, hex: "#64748b" },
                    { key: "critical", label: `Critical (${statusCounts.critical})`, hex: LEADER_STATUSES.critical.hex },
                    { key: "monitoring", label: `Monitoring (${statusCounts.monitoring})`, hex: LEADER_STATUSES.monitoring.hex },
                    { key: "stable", label: `Stable (${statusCounts.stable})`, hex: LEADER_STATUSES.stable.hex },
                    { key: "excellent", label: `Excellent (${statusCounts.excellent})`, hex: LEADER_STATUSES.excellent.hex },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setStatusFilter(f.key)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all cursor-pointer ${
                        statusFilter === f.key ? "text-white" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      }`}
                      style={statusFilter === f.key ? { backgroundColor: f.hex, borderColor: f.hex } : undefined}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 📱 MOBILE: leader cards */}
              <div className="block md:hidden space-y-2">
                {filteredLeaderRows.map(({ member, weeksAttended, frequency, categoryCounts, status }) => (
                  <div key={member.id} className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-xs text-slate-800 truncate">{member.first_name} {member.last_name}</span>
                      <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full border ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Weeks progress bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                        <span>Weeks conducted</span>
                        <span>{weeksAttended}/{weeks.length}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, (weeksAttended / weeks.length) * 100)}%`, backgroundColor: status.barHex }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <CategoryDots categories={Object.keys(categoryCounts)} />
                      <span className="text-[10px] font-black text-amber-600">{frequency} freq</span>
                    </div>
                  </div>
                ))}
                {filteredLeaderRows.length === 0 && (
                  <p className="text-center text-[11px] text-slate-400 py-6">No leaders in this status category.</p>
                )}
              </div>

              {/* 💻 DESKTOP: leader table */}
              <table className="hidden md:table w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-3">Leader</th>
                    <th className="py-2 px-3 text-center">Weeks Conducted</th>
                    <th className="py-2 px-3 text-center">Categories</th>
                    <th className="py-2 px-3 text-center">Frequency</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaderRows.map(({ member, weeksAttended, frequency, categoryCounts, status }) => (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-800 text-xs">
                        {member.first_name} {member.last_name}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, (weeksAttended / weeks.length) * 100)}%`, backgroundColor: status.barHex }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-600">{weeksAttended}/{weeks.length}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <CategoryDots categories={Object.keys(categoryCounts)} className="justify-center" />
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-amber-600">{frequency}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${status.badge}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeaderRows.length === 0 && (
                <p className="hidden md:block text-center text-[11px] text-slate-400 py-6">No leaders in this status category.</p>
              )}
            </div>
          </>
        ) : activeTab === "monthly" ? (
          <>
            {/* 📱 MOBILE VIEW: Cards */}
            <div className="block md:hidden p-3 space-y-3">
              {filteredActiveMembers.map((member) => {
                const stats = getMonthStats(member.id);

                return (
                  <div key={member.id} className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 shadow-xs">
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <span className="font-bold text-xs text-slate-800 truncate">{member.first_name} {member.last_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stats.weeksAttended === weeks.length ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                          {stats.weeksAttended}/{weeks.length} wk
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {stats.frequency} freq
                        </span>
                      </div>
                    </div>

                    {/* Horizontal grid list of touchable week cells */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {weeks.map((w) => {
                        const cats = getRecordCategories(findRecord(member.id, selectedMonth, w.weekNumber));
                        const isSelected = selectedCell?.memberId === member.id && selectedCell?.weekNumber === w.weekNumber;

                        return (
                          <button
  key={w.weekNumber}
  onClick={() => setSelectedCell({ memberId: member.id, weekNumber: w.weekNumber })}
  type="button"
  style={cats.length > 0 ? { backgroundColor: "#10b981", borderColor: "#059669" } : undefined}
  className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg border transition-all ${
    cats.length > 0
      ? ""
      : "bg-white border-slate-200 text-slate-400"
  } ${isSelected ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
>
  <span
    className="text-[8px] uppercase font-bold mb-0.5"
    style={{ color: cats.length > 0 ? "#d1fae5" : "#94a3b8" }}
  >
    {w.label}
  </span>
  <div
    className="text-[10px] font-bold flex items-center gap-0.5"
    style={{ color: cats.length > 0 ? "#ffffff" : undefined }}
  >
    {cats.length > 0 ? cats.length : "○"}
  </div>
  <CategoryDots categories={cats} className="mt-0.5 justify-center" />
</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP VIEW: Compact Data Table */}
            <table className="hidden md:table w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2 px-4">Member Name</th>
                  {weeks.map((w) => (
                    <th key={w.weekNumber} className="py-2 px-1 text-center">{w.label}</th>
                  ))}
                  <th className="py-2 px-2 text-center">Attended</th>
                  <th className="py-2 px-3 text-center text-amber-600 bg-amber-50/40">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActiveMembers.map((member) => {
                  const stats = getMonthStats(member.id);

                  return (
                    <tr key={member.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-1.5 px-4">
                        <div className="font-bold text-slate-800 text-xs">
                          {member.first_name} {member.last_name}
                        </div>
                        <CategoryDots categories={Object.keys(stats.categoryCounts)} className="mt-0.5" />
                      </td>
                      {weeks.map((w) => {
                        const cats = getRecordCategories(findRecord(member.id, selectedMonth, w.weekNumber));
                        const isSelected = selectedCell?.memberId === member.id && selectedCell?.weekNumber === w.weekNumber;

                        return (
                          <td key={w.weekNumber} className="py-1.5 px-1 text-center">
  <button
    onClick={() => setSelectedCell({ memberId: member.id, weekNumber: w.weekNumber })}
    type="button"
    style={cats.length > 0
      ? { backgroundColor: "#10b981", color: "#ffffff", borderColor: "#059669" }
      : undefined
    }
    className={`w-8 h-8 rounded-md flex items-center justify-center transition-all cursor-pointer font-bold text-xs mx-auto border ${
      cats.length > 0
        ? ""  // colors come from inline style — always renders
        : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
    } ${isSelected ? "ring-2 ring-blue-400" : ""}`}
  >
    {cats.length > 0 ? cats.length : "○"}
  </button>
</td>
                        );
                      })}
                      <td className="py-1.5 px-2 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          stats.weeksAttended === weeks.length ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700"
                        }`}>
                          {stats.weeksAttended}/{weeks.length}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono font-black text-amber-600 bg-amber-50/40">
                        {stats.frequency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <>
            {/* 📱 MOBILE VIEW: Annual List */}
            <div className="block md:hidden p-3 space-y-2.5">
              {filteredActiveMembers.map((member) => {
                const yearCats = getYearCategoryCounts(member.id);
                let annualTotal = 0;

                return (
                  <div key={member.id} className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
                    <div className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-1.5 mb-1.5 flex justify-between items-center">
                      <span>{member.first_name} {member.last_name}</span>
                      <span className="text-amber-600 font-black">{Object.values(yearCats).reduce((a,b)=>a+b,0)} freq</span>
                    </div>

                    {/* Compact monthly summary grid */}
                    <div className="grid grid-cols-4 gap-1 text-center mb-1.5">
                      {MONTH_NAMES.map((m, idx) => {
                        const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                        const freq = getStatsForMonth(member.id, monthStr);
                        annualTotal += freq;

                        return (
                          <div key={m} className={`p-1 rounded-md text-[11px] ${freq > 0 ? 'bg-blue-50/40 border border-blue-100 font-bold text-slate-800' : 'bg-slate-50 text-slate-300'}`}>
                            <div className="text-[8px] uppercase text-slate-400 font-medium">{m}</div>
                            <div>{freq > 0 ? freq : "-"}</div>
                          </div>
                        );
                      })}
                    </div>

                    <CategoryBreakdown countMap={yearCats} />

                    <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold text-center p-1.5 rounded-lg mt-1.5">
                      Annual Total: {annualTotal}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP VIEW: Annual Summary Wide Table */}
            <table className="hidden md:table w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2 px-4">Member Name</th>
                  {MONTH_NAMES.map(m => (
                    <th key={m} className="py-2 px-1 text-center">{m}</th>
                  ))}
                  <th className="py-2 px-3 text-center text-amber-600 bg-amber-50/40">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredActiveMembers.map((member) => {
                  const yearCats = getYearCategoryCounts(member.id);
                  let annualTotal = 0;

                  return (
                    <tr key={member.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-1.5 px-4">
                        <div className="font-bold text-slate-800">{member.first_name} {member.last_name}</div>
                        <CategoryBreakdown countMap={yearCats} />
                      </td>
                      {MONTH_NAMES.map((m, idx) => {
                        const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                        const freq = getStatsForMonth(member.id, monthStr);
                        annualTotal += freq;

                        return (
                          <td key={m} className={`py-1.5 px-1 text-center font-mono ${freq > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>
                            {freq > 0 ? freq : "-"}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-3 text-center font-mono font-black text-amber-600 bg-amber-50/40">
                        {annualTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ============================================================
          CATEGORY PICKER SHEET (bottom sheet on mobile, modal on desktop)
          Active colors use INLINE STYLES so they never get purged by
          Tailwind (dynamic class names from JS objects can be purged).
          ============================================================ */}
      {selectedCell && sheetMember && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 w-full sm:max-w-md overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-sm">
                  {sheetMember.first_name} {sheetMember.last_name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Week {selectedCell.weekNumber} · {selectedMonth}
                  {sheetCategories.length > 0 && (
                    <span className="ml-1 font-bold text-emerald-600">({sheetCategories.length} selected)</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-200/50 sm:bg-transparent rounded-full cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Category chips — grid adapts to any number of categories */}
            <div className="p-3 grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {LIFEGROUP_CATEGORIES.map((cat) => {
                const isActive = sheetCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryToggle(cat.id)}
                    type="button"
                    style={isActive ? { backgroundColor: cat.hex, borderColor: cat.hex } : undefined}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive ? "text-white shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isActive ? "rgba(255,255,255,0.85)" : cat.hex }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold leading-tight truncate">{cat.label}</span>
                      {isActive && <span className="block text-[8px] opacity-80 font-medium">Selected — tap to remove</span>}
                    </span>
                    {isActive && <FaCheck className="ml-auto text-[10px] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Sheet footer */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-400 font-medium">Select all categories attended this week.</p>
              <button
                onClick={handleClearCell}
                disabled={sheetCategories.length === 0}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 border border-rose-200 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                <FaTrashAlt /> Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ROSTER MODAL — manage which members are tracked
          ============================================================ */}
      {showRosterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowRosterModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                  <FaUserCog className="text-blue-500" /> Manage Roster
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose which members are tracked for Life Groups.
                </p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-200/50 sm:bg-transparent rounded-full cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Roster search */}
            <div className="p-3 border-b border-slate-100">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <FaSearch className="text-slate-400 text-xs ml-1" />
                <input
                  type="text"
                  placeholder="Search all members..."
                  value={rosterSearchQuery}
                  onChange={(e) => setRosterSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
                />
                {rosterSearchQuery && (
                  <button
                    onClick={() => setRosterSearchQuery("")}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>
            </div>

            {/* Member list */}
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
              {filteredRosterConfig.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className={`text-[10px] font-medium ${member.is_lifegroup_tracked ? "text-emerald-600" : "text-slate-400"}`}>
                      {member.is_lifegroup_tracked ? "Being tracked" : "Not tracked"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleTracking(member.id, member.is_lifegroup_tracked)}
                    className={`shrink-0 p-1 rounded-lg transition-all cursor-pointer ${
                      member.is_lifegroup_tracked ? "hover:bg-emerald-50" : "hover:bg-slate-100"
                    }`}
                    title={member.is_lifegroup_tracked ? "Remove from tracking" : "Add to tracking"}
                  >
                    {member.is_lifegroup_tracked
                      ? <FaToggleOn className="text-2xl text-emerald-500" />
                      : <FaToggleOff className="text-2xl text-slate-300" />}
                  </button>
                </div>
              ))}
              {filteredRosterConfig.length === 0 && (
                <p className="text-center text-[11px] text-slate-400 py-8">
                  No members match your search.
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500">
                {activeMembers.length} of {members.length} tracked
              </span>
              <button
                onClick={() => setShowRosterModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}