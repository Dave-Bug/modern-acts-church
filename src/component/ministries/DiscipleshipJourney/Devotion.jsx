import React, { useState, useEffect } from "react";
import { supabase } from "../../../Services/supabase";
import { 
  FaBook, FaSpinner, FaUserCog, FaSearch, 
  FaTimes, FaToggleOn, FaToggleOff, FaTable, FaCalendarAlt, FaFileExcel
} from "react-icons/fa";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const getCurrentMonthString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

const getDaysInMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

const getElapsedDaysUpTo = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  const endDay = isCurrentMonth ? today.getDate() : getDaysInMonth(yearMonth);
  
  let total = 0;
  for (let m = 1; m < month; m++) {
    total += new Date(year, m, 0).getDate();
  }
  total += endDay;
  return total;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Devotion() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [members, setMembers] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const daysInMonth = getDaysInMonth(selectedMonth);
  const currentYear = selectedMonth.split('-')[0];
  const elapsedDays = getElapsedDaysUpTo(selectedMonth);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name, is_devotion_tracked")
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;

      const { data: yearScores, error: scoreErr } = await supabase
        .from("dj_devotions")
        .select("*")
        .gte("tracking_month", `${currentYear}-01`)
        .lte("tracking_month", `${currentYear}-12`);
      if (scoreErr) throw scoreErr;

      setMembers(roster || []);
      setScores(yearScores || []);
    } catch (err) {
      console.error("Error fetching data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleScoreUpdate = async (memberId, newScoreStr) => {
    let newScore = parseInt(newScoreStr, 10);
    if (isNaN(newScore) || newScoreStr === "") newScore = 0;
    if (newScore < 0) newScore = 0;
    if (newScore > daysInMonth) newScore = daysInMonth;

    try {
      const existingRecord = scores.find(s => s.member_id === memberId && s.tracking_month === selectedMonth);
      if (existingRecord) {
        await supabase.from("dj_devotions").update({ score: newScore }).eq("id", existingRecord.id);
      } else {
        await supabase.from("dj_devotions").insert([{ member_id: memberId, tracking_month: selectedMonth, score: newScore }]);
      }
      setScores(prev => {
        if (existingRecord) {
          return prev.map(s => (s.member_id === memberId && s.tracking_month === selectedMonth) ? { ...s, score: newScore } : s);
        } else {
          return [...prev, { member_id: memberId, tracking_month: selectedMonth, score: newScore }];
        }
      });
    } catch (err) {
      alert("Error saving score: " + err.message);
    }
  };

  const handleToggleTracking = async (memberId, currentStatus) => {
    const updatedStatus = !currentStatus;
    try {
      await supabase.from("usher_members").update({ is_devotion_tracked: updatedStatus }).eq("id", memberId);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_devotion_tracked: updatedStatus } : m));
    } catch (err) {
      alert("Could not update roster status: " + err.message);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Devotion Summary ${currentYear}`);
      worksheet.views = [{ showGridLines: true }];

      worksheet.mergeCells("A1:O1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `CHURCH DEVOTION TRACKER SUMMARY — YEAR ${currentYear}`;
      titleCell.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: "FFFFFF" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D97706" } };
      worksheet.getRow(1).height = 40;

      const headers = ["Member Name", ...MONTH_NAMES, "Annual Total", "Completion %"];
      worksheet.addRow([]);
      const headerRow = worksheet.addRow(headers);
      worksheet.getRow(3).height = 25;

      headerRow.eachCell((cell, colNum) => {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "1E293B" } };
        cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };
        cell.border = { bottom: { style: "medium", color: { argb: "CBD5E1" } }, top: { style: "thin", color: { argb: "E2E8F0" } } };
      });

      const activeMembers = members.filter(m => m.is_devotion_tracked);
      const filteredActiveMembers = activeMembers.filter(m => 
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      );

      filteredActiveMembers.forEach((member) => {
        let annualTotal = 0;
        let totalPossibleDays = 0;
        const rowData = [ `${member.first_name} ${member.last_name}` ];

        MONTH_NAMES.forEach((_, idx) => {
          const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
          const record = scores.find(s => s.member_id === member.id && s.tracking_month === monthStr);
          const monthScore = record ? record.score : 0;
          annualTotal += monthScore;
          totalPossibleDays += getDaysInMonth(monthStr);
          rowData.push(monthScore > 0 ? monthScore : "-");
        });

        const attendancePct = totalPossibleDays > 0 ? (annualTotal / totalPossibleDays) : 0;
        rowData.push(annualTotal);
        rowData.push(attendancePct);

        const insertedRow = worksheet.addRow(rowData);
        worksheet.getRow(insertedRow.number).height = 22;

        insertedRow.eachCell((cell, colNum) => {
          cell.font = { name: "Segoe UI", size: 10, color: { argb: "334155" } };
          cell.border = { bottom: { style: "thin", color: { argb: "F1F5F9" } } };
          if (colNum === 1) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "0F172A" } };
          } else if (colNum === 14) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "B45309" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
          } else if (colNum === 15) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.numFmt = "0.0%";
            if (attendancePct >= 0.85) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D1FAE5" } };
              cell.font = { color: { argb: "065F46" }, bold: true };
            } else if (attendancePct >= 0.50) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDD5" } };
              cell.font = { color: { argb: "9A3412" }, bold: true };
            } else if (attendancePct > 0) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } };
              cell.font = { color: { argb: "991B1B" }, bold: true };
            }
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      });

      worksheet.columns.forEach((col, idx) => {
        if (idx === 0) col.width = 24;
        else if (idx === 13) col.width = 14;
        else if (idx === 14) col.width = 15;
        else col.width = 7;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Church_Devotion_Roster_${currentYear}.xlsx`);
    } catch (err) {
      alert("Excel processing failure: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const activeMembers = members.filter(m => m.is_devotion_tracked);

  const getMemberStatus = (member) => {
    const record = scores.find(s => s.member_id === member.id && s.tracking_month === selectedMonth);
    const currentScore = record ? record.score : 0;
    const percent = (currentScore / daysInMonth) * 100;
    
    if (percent === 100) return "Excellent";
    if (percent >= 75) return "Stable";
    return "Attention";
  };

  const getAnnualStatus = (member) => {
    const totalScore = scores
      .filter(s => s.member_id === member.id && s.tracking_month.startsWith(currentYear))
      .reduce((sum, s) => sum + s.score, 0);
    
    const percent = (totalScore / elapsedDays) * 100;
    
    if (percent === 100) return "Excellent";
    if (percent >= 75) return "Stable";
    return "Attention";
  };

  // FIX: status counts now switch based on active tab
  const currentStatusFn = activeTab === "monthly" ? getMemberStatus : getAnnualStatus;
  
  const statusCounts = {
    All: activeMembers.length,
    Excellent: activeMembers.filter(m => currentStatusFn(m) === "Excellent").length,
    Stable: activeMembers.filter(m => currentStatusFn(m) === "Stable").length,
    Attention: activeMembers.filter(m => currentStatusFn(m) === "Attention").length,
  };

  const filteredActiveMembers = activeMembers.filter(m => {
    const nameMatch = `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const status = activeTab === "monthly" ? getMemberStatus(m) : getAnnualStatus(m);
    const statusMatch = statusFilter === "All" || status === statusFilter;
    return nameMatch && statusMatch;
  });
  
  const filteredRosterConfig = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(rosterSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex-1 overflow-auto">

        {/* Header Panel */}
        <div className="p-3 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 md:gap-4 bg-slate-50">
          <div>
            <h2 className="text-sm md:text-lg font-black text-slate-800 flex items-center gap-2">
              <FaBook className="text-amber-500" /> Devotion Dashboard
            </h2>
            <p className="hidden md:block text-xs font-medium text-slate-500 mt-1">Track monthly and annual completion metrics.</p>
          </div>
          
          <div className="flex flex-row flex-wrap sm:flex-row items-stretch sm:items-center gap-1.5 md:gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 md:gap-2 bg-white border border-slate-200 rounded-xl px-2 md:px-3 py-1 md:py-1.5 shadow-sm">
              <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Month:</span>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-[11px] md:text-xs font-bold text-slate-700 focus:outline-none cursor-pointer" 
              />
            </div>

            <button
              onClick={exportToExcel}
              disabled={exporting || filteredActiveMembers.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl px-2.5 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 md:gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {exporting ? <FaSpinner className="animate-spin" /> : <FaFileExcel className="text-sm sm:text-base text-emerald-600" />} 
              <span>Export</span>
            </button>

            <button 
              onClick={() => { setRosterSearchQuery(""); setShowRosterModal(true); }}
              className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl px-2.5 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-bold text-slate-700 hover:text-amber-600 transition-all shadow-sm flex items-center justify-center gap-1.5 md:gap-2 cursor-pointer"
            >
              <FaUserCog /> <span className="hidden xs:inline">Manage Pipeline</span><span className="xs:hidden">Manage</span>
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 px-3 md:px-6 pt-2 md:pt-4 gap-1 sm:gap-2 bg-white">
          <button onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 md:px-4 py-1.5 md:py-2.5 text-[11px] md:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "monthly" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaTable /> <span>Monthly Grid</span>
          </button>
          <button onClick={() => setActiveTab("annual")}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 md:px-4 py-1.5 md:py-2.5 text-[11px] md:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "annual" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaCalendarAlt /> <span>Annual Roster</span>
          </button>
        </div>

        {/* Search + Status Filter — STICKY */}
        <div className="sticky top-0 z-20 p-2 md:p-4 border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 md:p-2.5 flex items-center gap-2">
            <FaSearch className="text-slate-400 text-xs ml-1 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none" 
            />
          </div>

          {/* STATUS FILTER PILLS — now dynamic per tab */}
          <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar">
            {[
              { key: "All", label: "All", count: statusCounts.All, color: "slate" },
              { key: "Excellent", label: "Excellent", count: statusCounts.Excellent, color: "emerald" },
              { key: "Stable", label: "Stable", count: statusCounts.Stable, color: "amber" },
              { key: "Attention", label: "Attention", count: statusCounts.Attention, color: "rose" },
            ].map((item) => {
              const isActive = statusFilter === item.key;
              const colorMap = {
                slate: { bg: "bg-slate-100", text: "text-slate-600", activeBg: "bg-slate-800", activeText: "text-blue-500", border: "border-slate-200" },
                emerald: { bg: "bg-emerald-50", text: "text-emerald-600", activeBg: "bg-emerald-600", activeText: "text-blue-500", border: "border-emerald-200" },
                amber: { bg: "bg-amber-50", text: "text-amber-600", activeBg: "bg-amber-500", activeText: "text-blue-500", border: "border-amber-200" },
                rose: { bg: "bg-rose-50", text: "text-rose-600", activeBg: "bg-rose-500", activeText: "text-blue-500", border: "border-rose-200" },
              };
              const theme = colorMap[item.color];

              return (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border ${
                    isActive 
                      ? `${theme.activeBg} ${theme.activeText} border-transparent shadow-sm` 
                      : `${theme.bg} ${theme.text} ${theme.border} hover:opacity-80`
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[9px] px-1 py-0 rounded ${isActive ? "bg-white/20" : "bg-white/60"}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main View Area */}
        <div className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <FaSpinner className="animate-spin text-2xl mb-2 text-amber-500" />
              <span className="text-xs font-bold">Syncing Ledger...</span>
            </div>
          ) : filteredActiveMembers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FaBook className="text-4xl text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500 mb-1">No tracked entries found.</p>
              <p className="text-xs text-slate-400">Try adjusting search or status filter.</p>
            </div>
          ) : activeTab === "monthly" ? (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                      <th className="py-3 px-6">Member Identity</th>
                      <th className="py-3 px-6 text-center">Current Score vs Target Month Days</th>
                      <th className="py-3 px-6 text-center">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActiveMembers.map((member) => {
                      const record = scores.find(s => s.member_id === member.id && s.tracking_month === selectedMonth);
                      const currentScore = record ? record.score : 0;
                      const percent = (currentScore / daysInMonth) * 100;

                      return (
                        <tr key={member.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-slate-800 text-sm">
                            {member.first_name} {member.last_name}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <input 
                                type="number" 
                                min="0" max={daysInMonth}
                                defaultValue={currentScore || ""}
                                placeholder="0"
                                onBlur={(e) => handleScoreUpdate(member.id, e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                                className="w-16 bg-white border border-slate-200 rounded-lg py-1 text-center font-mono font-bold text-slate-800 text-sm focus:outline-none focus:border-amber-500 shadow-sm" 
                              />
                              <span className="text-slate-400 font-bold text-xs">/ {daysInMonth} Days</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {percent === 100 ? (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">Excellent</span>
                            ) : percent >= 75 ? (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-bold">Stable</span>
                            ) : (
                              <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-bold">Attention Required</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredActiveMembers.map((member) => {
                  const record = scores.find(s => s.member_id === member.id && s.tracking_month === selectedMonth);
                  const currentScore = record ? record.score : 0;
                  const percent = (currentScore / daysInMonth) * 100;

                  return (
                    <div key={member.id} className="p-3 bg-white flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm text-slate-800">
                          {member.first_name} {member.last_name}
                        </h3>
                        <div>
                          {percent === 100 ? (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">Excellent</span>
                          ) : percent >= 75 ? (
                            <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">Stable</span>
                          ) : (
                            <span className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold">Attention</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Monthly Score:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            min="0" 
                            max={daysInMonth}
                            defaultValue={currentScore || ""}
                            placeholder="0"
                            onBlur={(e) => handleScoreUpdate(member.id, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                            className="w-14 bg-white border border-slate-200 rounded-md py-0.5 text-center font-mono font-bold text-slate-800 text-xs focus:outline-none focus:border-amber-500" 
                          />
                          <span className="text-slate-400 font-bold text-xs">/ {daysInMonth} Days</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* DESKTOP ANNUAL TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-20">
                      <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 z-30 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        Member
                      </th>
                      {MONTH_NAMES.map(m => (
                        <th key={m} className="py-2.5 px-1.5 text-center min-w-[32px]">{m}</th>
                      ))}
                      <th className="py-2.5 px-2 text-center text-amber-700 bg-amber-50 font-black sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        Total
                      </th>
                      <th className="py-2.5 px-2 text-center text-slate-600 bg-slate-50 font-black sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        %
                      </th>
                      <th className="py-2.5 px-2 text-center text-slate-500 bg-slate-50 font-bold sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredActiveMembers.map((member) => {
                      let annualTotal = 0;

                      return (
                        <tr key={member.id} className="hover:bg-amber-50/20 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            {member.first_name} {member.last_name}
                          </td>
                          {MONTH_NAMES.map((m, idx) => {
                            const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                            const record = scores.find(s => s.member_id === member.id && s.tracking_month === monthStr);
                            const monthScore = record ? record.score : 0;
                            annualTotal += monthScore;

                            return (
                              <td key={m} className={`py-2.5 px-1.5 text-center font-mono text-[10px] min-w-[32px] ${monthScore > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>
                                {monthScore > 0 ? monthScore : "-"}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-2 text-center font-mono font-black text-amber-700 bg-amber-50/60 sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            {annualTotal}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 sticky right-0 z-10 bg-white shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            {Math.round((annualTotal / elapsedDays) * 100)}%
                          </td>
                          <td className="py-2.5 px-2 text-center sticky right-0 z-10 bg-white shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            {(() => {
                              const pct = (annualTotal / elapsedDays) * 100;
                              if (pct === 100) return <span className="text-[8px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Excellent</span>;
                              if (pct >= 75) return <span className="text-[8px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">Stable</span>;
                              return <span className="text-[8px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">Attention</span>;
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE ANNUAL CARD VIEW */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredActiveMembers.map((member) => {
                  const annualTotal = scores
                    .filter(s => s.member_id === member.id && s.tracking_month.startsWith(currentYear))
                    .reduce((sum, s) => sum + s.score, 0);
                  const percent = Math.round((annualTotal / elapsedDays) * 100);

                  return (
                    <div key={member.id} className="p-3 bg-white flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm text-slate-800">
                          {member.first_name} {member.last_name}
                        </h3>
                        <div>
                          {percent === 100 ? (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">Excellent</span>
                          ) : percent >= 75 ? (
                            <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">Stable</span>
                          ) : (
                            <span className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold">Attention</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Annual Score:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-800">{annualTotal}</span>
                          <span className="text-slate-400 font-bold text-xs">/ {elapsedDays} Days</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Completion:</span>
                        <span className={`font-mono font-bold text-sm ${percent >= 75 ? 'text-emerald-600' : percent >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {percent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MANAGE ROSTER PIPELINE MODAL */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-sm">Devotion Pipeline</h3>
                <p className="text-[10px] text-slate-500">Toggle members to track.</p>
              </div>
              <button onClick={() => setShowRosterModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <FaTimes />
              </button>
            </div>
            
            <div className="p-3 border-b border-slate-100">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <FaSearch className="text-slate-400 text-xs ml-1" />
                <input 
                  type="text" 
                  placeholder="Filter church records..." 
                  value={rosterSearchQuery} 
                  onChange={(e) => setRosterSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none" 
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredRosterConfig.map((m) => (
                <div key={m.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl">
                  <span className="font-bold text-sm text-slate-800">{m.first_name} {m.last_name}</span>
                  <button 
                    onClick={() => handleToggleTracking(m.id, m.is_devotion_tracked)} 
                    className="border-none bg-transparent focus:outline-none"
                  >
                    {m.is_devotion_tracked ? (
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100 shadow-sm">
                        <FaToggleOn className="text-sm" /> Tracked
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] bg-slate-100 px-2.5 py-1.5 rounded-xl">
                        <FaToggleOff className="text-sm" /> Ignored
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}