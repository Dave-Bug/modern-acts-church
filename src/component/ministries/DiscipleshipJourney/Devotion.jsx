import React, { useState, useEffect } from "react";
import { supabase } from "../../../Services/supabase";
import { 
  FaBook, FaSpinner, FaUserCog, FaSearch, 
  FaTimes, FaToggleOn, FaToggleOff, FaTable, FaCalendarAlt, FaFileExcel
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Devotion() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [members, setMembers] = useState([]);
  const [scores, setScores] = useState([]); // Holds the whole year's scores
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  
  // Roster Modal States
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const daysInMonth = getDaysInMonth(selectedMonth);
  const currentYear = selectedMonth.split('-')[0];

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch all members
      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name, is_devotion_tracked")
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;

      // 2. Fetch scores for the entire selected year
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

  // Handle Score Input
  const handleScoreUpdate = async (memberId, newScoreStr) => {
    let newScore = parseInt(newScoreStr, 10);
    
    // Validation: prevent negative or numbers higher than days in month
    if (isNaN(newScore) || newScoreStr === "") newScore = 0;
    if (newScore < 0) newScore = 0;
    if (newScore > daysInMonth) newScore = daysInMonth;

    try {
      const existingRecord = scores.find(s => s.member_id === memberId && s.tracking_month === selectedMonth);
      
      if (existingRecord) {
        // Update existing record
        await supabase
          .from("dj_devotions")
          .update({ score: newScore })
          .eq("id", existingRecord.id);
      } else {
        // Insert new record
        await supabase
          .from("dj_devotions")
          .insert([{ 
            member_id: memberId, 
            tracking_month: selectedMonth, 
            score: newScore 
          }]);
      }
      
      // Silently update local state for fast UI
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

  // Toggle Tracking Status in Roster
  const handleToggleTracking = async (memberId, currentStatus) => {
    const updatedStatus = !currentStatus;
    try {
      await supabase
        .from("usher_members")
        .update({ is_devotion_tracked: updatedStatus })
        .eq("id", memberId);
      
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_devotion_tracked: updatedStatus } : m));
    } catch (err) {
      alert("Could not update roster status: " + err.message);
    }
  };

  // Beautiful Excel Export Generator
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Devotion Summary ${currentYear}`);

      // General worksheet view settings
      worksheet.views = [{ showGridLines: true }];

      // 1. Add Title Banner
      worksheet.mergeCells("A1:O1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `CHURCH DEVOTION TRACKER SUMMARY — YEAR ${currentYear}`;
      titleCell.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: "FFFFFF" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D97706" } // Premium Amber-600
      };
      worksheet.getRow(1).height = 40;

      // 2. Define Headers
      const headers = ["Member Name", ...MONTH_NAMES, "Annual Total", "Completion %"];
      worksheet.addRow([]); // Blank spacer
      const headerRow = worksheet.addRow(headers);
      worksheet.getRow(3).height = 25;

      // Style Headers
      headerRow.eachCell((cell, colNum) => {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "1E293B" } };
        cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F1F5F9" } // Slate 100 
        };
        cell.border = {
          bottom: { style: "medium", color: { argb: "CBD5E1" } },
          top: { style: "thin", color: { argb: "E2E8F0" } }
        };
      });

      // 3. Add Rows & Apply Conditional Formatting Profiles
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
        rowData.push(attendancePct); // Raw fractional decimal to format natively as percentage

        const insertedRow = worksheet.addRow(rowData);
        worksheet.getRow(insertedRow.number).height = 22;

        // Base cell font and border formatting
        insertedRow.eachCell((cell, colNum) => {
          cell.font = { name: "Segoe UI", size: 10, color: { argb: "334155" } };
          cell.border = { bottom: { style: "thin", color: { argb: "F1F5F9" } } };
          
          if (colNum === 1) {
            cell.alignment = { horizontal: "left", vertical: "middle" };
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "0F172A" } };
          } else if (colNum === 14) { // Annual Total
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "B45309" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
          } else if (colNum === 15) { // Percentage Column
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.numFmt = "0.0%";
            
            // Styled KPI indicators
            if (attendancePct >= 0.85) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D1FAE5" } }; // Green
              cell.font = { color: { argb: "065F46" }, bold: true };
            } else if (attendancePct >= 0.50) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDD5" } }; // Orange
              cell.font = { color: { argb: "9A3412" }, bold: true };
            } else if (attendancePct > 0) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } }; // Red
              cell.font = { color: { argb: "991B1B" }, bold: true };
            }
          } else {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      });

      // Explicit Column Sizing
      worksheet.columns.forEach((col, idx) => {
        if (idx === 0) col.width = 24; // Name column wide
        else if (idx === 13) col.width = 14; // Total column wide
        else if (idx === 14) col.width = 15; // Percent column wide
        else col.width = 7; // Month score column narrow
      });

      // Write and deliver file
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
  const filteredActiveMembers = activeMembers.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredRosterConfig = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(rosterSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header Panel */}
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <FaBook className="text-amber-500" /> Devotion Dashboard
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Track monthly and annual completion metrics.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider whitespace-nowrap">Target Month:</span>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer" 
            />
          </div>

          <button
            onClick={exportToExcel}
            disabled={exporting || filteredActiveMembers.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {exporting ? <FaSpinner className="animate-spin" /> :   <FaFileExcel className="text-sm sm:text-base text-emerald-600" />} 
            <span>Export</span>
          </button>

          <button 
            onClick={() => { setRosterSearchQuery(""); setShowRosterModal(true); }}
            className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 hover:text-amber-600 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <FaUserCog /> Manage Pipeline
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 px-4 md:px-6 pt-4 gap-1 sm:gap-2">
        <button onClick={() => setActiveTab("monthly")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "monthly" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <FaTable /> <span>Monthly Grid</span>
        </button>
        <button onClick={() => setActiveTab("annual")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "annual" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <FaCalendarAlt /> <span>Annual Roster</span>
        </button>
      </div>

      {/* Search Filter input */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 max-w-md">
          <FaSearch className="text-slate-400 text-xs ml-1" />
          <input 
            type="text" placeholder="Search actively tracked members..." 
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none" 
          />
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <FaSpinner className="animate-spin text-2xl mb-2 text-amber-500" />
            <span className="text-xs font-bold">Syncing Ledger...</span>
          </div>
        ) : filteredActiveMembers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FaBook className="text-4xl text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500 mb-1">No tracked entries match filter parameters.</p>
            <p className="text-xs text-slate-400">Modify search metrics or assign tracking streams inside pipeline modal.</p>
          </div>
        ) : activeTab === "monthly" ? (
          <>
            {/* Desktop Structured View (Hidden on Mobile viewports) */}
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
                          {currentScore === 0 ? (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-bold">Unassigned</span>
                          ) : percent === 100 ? (
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

            {/* Mobile Adaptive Card View (Visible only on Mobile viewports) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredActiveMembers.map((member) => {
                const record = scores.find(s => s.member_id === member.id && s.tracking_month === selectedMonth);
                const currentScore = record ? record.score : 0;
                const percent = (currentScore / daysInMonth) * 100;

                return (
                  <div key={member.id} className="p-4 bg-white flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800">{member.first_name} {member.last_name}</span>
                      <div>
                        {currentScore === 0 ? (
                          <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-bold">Unassigned</span>
                        ) : percent === 100 ? (
                          <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">Excellent</span>
                        ) : percent >= 75 ? (
                          <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">Stable</span>
                        ) : (
                          <span className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold">Attention</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Monthly Score:</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          min="0" max={daysInMonth}
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
          /* ANNUAL SUMMARY TAB */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px] lg:min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-3 px-6 whitespace-nowrap">Tracked Member Name</th>
                  {MONTH_NAMES.map(m => (
                    <th key={m} className="py-3 px-2 text-center">{m}</th>
                  ))}
                  <th className="py-3 px-4 text-center text-amber-700 bg-amber-50 font-black tracking-wide">YTD Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredActiveMembers.map((member) => {
                  let annualTotal = 0;

                  return (
                    <tr key={member.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-6 font-bold text-slate-800 whitespace-nowrap">
                        {member.first_name} {member.last_name}
                      </td>
                      {MONTH_NAMES.map((m, idx) => {
                        const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                        const record = scores.find(s => s.member_id === member.id && s.tracking_month === monthStr);
                        const monthScore = record ? record.score : 0;
                        annualTotal += monthScore;

                        return (
                          <td key={m} className={`py-3 px-2 text-center font-mono text-xs ${monthScore > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>
                            {monthScore > 0 ? monthScore : "-"}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center font-mono font-black text-amber-700 bg-amber-50/60">
                        {annualTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANAGE ROSTER PIPELINE MODAL */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-base">Devotion Operational Pipeline</h3>
                <p className="text-xs text-slate-500">Toggle inclusion streams across directory records.</p>
              </div>
              <button onClick={() => setShowRosterModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors">
                <FaTimes />
              </button>
            </div>
            
            <div className="p-3 border-b border-slate-100">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <FaSearch className="text-slate-400 text-xs ml-1" />
                <input 
                  type="text" placeholder="Filter church records directory..." 
                  value={rosterSearchQuery} onChange={(e) => setRosterSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none" 
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredRosterConfig.map((m) => (
                <div key={m.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-all">
                  <span className="font-bold text-sm text-slate-800">{m.first_name} {m.last_name}</span>
                  <button 
                    onClick={() => handleToggleTracking(m.id, m.is_devotion_tracked)} 
                    className="cursor-pointer border-none bg-transparent focus:outline-none"
                  >
                    {m.is_devotion_tracked ? (
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100 transition-all shadow-sm">
                        <FaToggleOn className="text-sm" /> Tracked
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs bg-slate-100 px-2.5 py-1.5 rounded-xl transition-all">
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

