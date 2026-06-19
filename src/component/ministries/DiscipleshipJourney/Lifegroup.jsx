import React, { useState, useEffect } from "react";
import { supabase } from "../../../Services/supabase";
import { 
  FaUsers, FaSpinner, FaUserCog, FaSearch, 
  FaTimes, FaToggleOn, FaToggleOff, FaTable, FaCalendarAlt, FaCheck, FaFileExcel
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

export default function LifeGroupChecking() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [members, setMembers] = useState([]);
  const [checkins, setCheckins] = useState([]); // Will hold the entire year's checkin records
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  
  // Roster Modal States
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const weeks = getWeeksInMonth(selectedMonth);
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

  // Toggle weekly checkin status
  const handleWeekToggle = async (memberId, weekNumber, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const existingRecord = checkins.find(
        c => c.member_id === memberId && c.tracking_month === selectedMonth && c.week_number === weekNumber
      );

      if (existingRecord) {
        const { error } = await supabase
          .from("lifegroup_checkins")
          .update({ is_checked: newStatus })
          .eq("id", existingRecord.id);
        if (error) throw error;
        
        setCheckins(prev =>
          prev.map(c => c.id === existingRecord.id ? { ...c, is_checked: newStatus } : c)
        );
      } else {
        const { data, error } = await supabase
          .from("lifegroup_checkins")
          .insert([{
            member_id: memberId,
            tracking_month: selectedMonth,
            week_number: weekNumber,
            is_checked: newStatus
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

  // Toggle Tracking Status in Roster
  const handleToggleTracking = async (memberId, currentStatus) => {
    const updatedStatus = !currentStatus;
    try {
      await supabase
        .from("usher_members")
        .update({ is_lifegroup_tracked: updatedStatus })
        .eq("id", memberId);

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_lifegroup_tracked: updatedStatus } : m));
    } catch (err) {
      alert("Could not update roster status: " + err.message);
    }
  };

  // Export to Excel function
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(
      activeTab === "monthly" ? `Weekly Detail ${selectedMonth}` : `Annual Summary ${currentYear}`
    );

    if (activeTab === "monthly") {
      const headerRow = ["Member Name", ...weeks.map(w => w.label), "Attended Summary"];
      sheet.addRow(headerRow);

      filteredActiveMembers.forEach((member) => {
        const rowData = [`${member.first_name} ${member.last_name}`];
        let attendedCount = 0;

        weeks.forEach((w) => {
          const record = checkins.find(
            c => c.member_id === member.id && c.tracking_month === selectedMonth && c.week_number === w.weekNumber
          );
          const isChecked = record ? record.is_checked : false;
          if (isChecked) attendedCount++;
          rowData.push(isChecked ? "Present" : "Absent");
        });

        rowData.push(`${attendedCount} / ${weeks.length}`);
        sheet.addRow(rowData);
      });
    } else {
      const headerRow = ["Member Name", ...MONTH_NAMES, "Annual Total"];
      sheet.addRow(headerRow);

      filteredActiveMembers.forEach((member) => {
        const rowData = [`${member.first_name} ${member.last_name}`];
        let annualTotal = 0;

        MONTH_NAMES.forEach((m, idx) => {
          const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
          const monthWeeks = getWeeksInMonth(monthStr);
          const monthAttendedWeeks = monthWeeks.filter(w => {
            const record = checkins.find(
              c => c.member_id === member.id && c.tracking_month === monthStr && c.week_number === w.weekNumber
            );
            return record && record.is_checked;
          }).length;

          annualTotal += monthAttendedWeeks;
          rowData.push(monthAttendedWeeks > 0 ? monthAttendedWeeks : 0);
        });

        rowData.push(annualTotal);
        sheet.addRow(rowData);
      });
    }

    // Auto-fit Columns
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value) maxLen = Math.max(maxLen, cell.value.toString().length + 3);
      });
      col.width = maxLen;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = activeTab === "monthly" 
      ? `LifeGroup_Weekly_${selectedMonth}.xlsx` 
      : `LifeGroup_Annual_Summary_${currentYear}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  const activeMembers = members.filter(m => m.is_lifegroup_tracked);
  const filteredActiveMembers = activeMembers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRosterConfig = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(rosterSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full w-full">
      {/* Header Panel */}
      <div className="p-3 md:p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 bg-slate-50">
        <div>
          <h2 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2">
            <FaUsers className="text-blue-500" /> Life Group Checking
          </h2>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">Track weekly attendance and summaries.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Target:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-600 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FaFileExcel /> Export Excel
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 px-3 md:px-4 pt-1 gap-1">
        <button onClick={() => setActiveTab("monthly")}
          className={`flex items-center gap-1.5 px-2 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === "monthly" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <FaTable /> <span>Weekly Detail</span>
        </button>
        <button onClick={() => setActiveTab("annual")}
          className={`flex items-center gap-1.5 px-2 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === "annual" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
          <FaCalendarAlt /> <span>Annual Summary</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2 w-full max-w-sm">
          <FaSearch className="text-slate-400 text-xs ml-1" />
          <input
            type="text" placeholder="Search tracked members..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Responsive Viewport Area */}
      <div className="flex-1 overflow-auto">
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
        ) : activeTab === "monthly" ? (
          <>
            {/* 📱 MOBILE VIEW: Cards */}
            <div className="block md:hidden p-3 space-y-3">
              {filteredActiveMembers.map((member) => {
                const attendedWeeks = weeks.filter(w => {
                  const record = checkins.find(
                    c => c.member_id === member.id && c.tracking_month === selectedMonth && c.week_number === w.weekNumber
                  );
                  return record && record.is_checked;
                }).length;

                return (
                  <div key={member.id} className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 shadow-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs text-slate-800">{member.first_name} {member.last_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${attendedWeeks === weeks.length ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {attendedWeeks}/{weeks.length} Attended
                      </span>
                    </div>
                    {/* Horizontal grid list of touchable checkboxes */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {weeks.map((w) => {
                        const record = checkins.find(
                          c => c.member_id === member.id && c.tracking_month === selectedMonth && c.week_number === w.weekNumber
                        );
                        const isChecked = record ? record.is_checked : false;

                        return (
                          <button
                            key={w.weekNumber}
                            onClick={() => handleWeekToggle(member.id, w.weekNumber, isChecked)}
                            type="button"
                            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg border transition-all ${
                              isChecked 
                                ? "bg-emerald-500 border-emerald-600 text-emerald-600 shadow-xs" 
                                : "bg-white border-slate-200 text-slate-400"
                            }`}
                          >
                            <span className={`text-[8px] uppercase font-bold mb-0.5 ${isChecked ? "text-emerald-100" : "text-slate-400"}`}>{w.label}</span>
                            <div className="text-[10px]">{isChecked ? <FaCheck /> : "○"}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP VIEW: Compact Data Table */}
            <table className="hidden md:table w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2 px-4">Member Name</th>
                  {weeks.map((w) => (
                    <th key={w.weekNumber} className="py-2 px-1 text-center">{w.label}</th>
                  ))}
                  <th className="py-2 px-4 text-center">Attended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActiveMembers.map((member) => {
                  const attendedWeeks = weeks.filter(w => {
                    const record = checkins.find(
                      c => c.member_id === member.id && c.tracking_month === selectedMonth && c.week_number === w.weekNumber
                    );
                    return record && record.is_checked;
                  }).length;

                  return (
                    <tr key={member.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-1.5 px-4 font-bold text-slate-800 text-xs">
                        {member.first_name} {member.last_name}
                      </td>
                      {weeks.map((w) => {
                        const record = checkins.find(
                          c => c.member_id === member.id && c.tracking_month === selectedMonth && c.week_number === w.weekNumber
                        );
                        const isChecked = record ? record.is_checked : false;

                        return (
                          <td key={w.weekNumber} className="py-1.5 px-1 text-center">
                            <button
                              onClick={() => handleWeekToggle(member.id, w.weekNumber, isChecked)}
                              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer font-bold text-xs mx-auto ${
                                isChecked
                                  ? "bg-emerald-500 text-emerald-600 border border-emerald-600 shadow-xs"
                                  : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                              }`}
                              type="button"
                            >
                              {isChecked ? <FaCheck /> : "○"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-4 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          attendedWeeks === weeks.length ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700"
                        }`}>
                          {attendedWeeks}/{weeks.length}
                        </span>
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
                let annualTotal = 0;
                return (
                  <div key={member.id} className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
                    <div className="font-bold text-xs text-slate-800 border-b border-slate-100 pb-1.5 mb-1.5 flex justify-between">
                      <span>{member.first_name} {member.last_name}</span>
                    </div>
                    
                    {/* Compact monthly summary grid */}
                    <div className="grid grid-cols-4 gap-1 text-center mb-1.5">
                      {MONTH_NAMES.map((m, idx) => {
                        const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                        const monthWeeks = getWeeksInMonth(monthStr);
                        const monthAttendedWeeks = monthWeeks.filter(w => {
                          const record = checkins.find(
                            c => c.member_id === member.id && c.tracking_month === monthStr && c.week_number === w.weekNumber
                          );
                          return record && record.is_checked;
                        }).length;

                        annualTotal += monthAttendedWeeks;

                        return (
                          <div key={m} className={`p-1 rounded-md text-[11px] ${monthAttendedWeeks > 0 ? 'bg-blue-50/40 border border-blue-100 font-bold text-slate-800' : 'bg-slate-50 text-slate-300'}`}>
                            <div className="text-[8px] uppercase text-slate-400 font-medium">{m}</div>
                            <div>{monthAttendedWeeks > 0 ? monthAttendedWeeks : "-"}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold text-center p-1.5 rounded-lg">
                      Annual Total: {annualTotal}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP VIEW: Annual Summary Wide Table */}
            <table className="hidden md:table w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-2 px-4">Member Name</th>
                  {MONTH_NAMES.map(m => (
                    <th key={m} className="py-2 px-1 text-center">{m}</th>
                  ))}
                  <th className="py-2 px-3 text-center text-blue-600 bg-blue-50/50">Annual Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredActiveMembers.map((member) => {
                  let annualTotal = 0;

                  return (
                    <tr key={member.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-1.5 px-4 font-bold text-slate-800">
                        {member.first_name} {member.last_name}
                      </td>
                      {MONTH_NAMES.map((m, idx) => {
                        const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
                        const monthWeeks = getWeeksInMonth(monthStr);
                        const monthAttendedWeeks = monthWeeks.filter(w => {
                          const record = checkins.find(
                            c => c.member_id === member.id && c.tracking_month === monthStr && c.week_number === w.weekNumber
                          );
                          return record && record.is_checked;
                        }).length;

                        annualTotal += monthAttendedWeeks;

                        return (
                          <td key={m} className={`py-1.5 px-1 text-center font-mono ${monthAttendedWeeks > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>
                            {monthAttendedWeeks > 0 ? monthAttendedWeeks : "-"}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-3 text-center font-mono font-black text-blue-600 bg-blue-50/50">
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

      {/* MANAGE ROSTER MODAL */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 max-w-md w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden pb-4 sm:pb-0 animate-in slide-in-from-bottom duration-200">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-sm">Manage Life Group Roster</h3>
                <p className="text-[11px] text-slate-500">Toggle tracking status for individuals.</p>
              </div>
              <button onClick={() => setShowRosterModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-200/50 sm:bg-transparent rounded-full cursor-pointer">
                <FaTimes />
              </button>
            </div>

            <div className="p-2.5 border-b border-slate-100">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <FaSearch className="text-slate-400 text-xs ml-1" />
                <input
                  type="text" placeholder="Search church directory..."
                  value={rosterSearchQuery} onChange={(e) => setRosterSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1.5">
              {filteredRosterConfig.map((m) => (
                <div key={m.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-all">
                  <span className="font-bold text-xs text-slate-800 pr-2">{m.first_name} {m.last_name}</span>
                  <button
                    onClick={() => handleToggleTracking(m.id, m.is_lifegroup_tracked)}
                    className="cursor-pointer border-none bg-transparent shrink-0"
                  >
                    {m.is_lifegroup_tracked ? (
                      <div className="flex items-center gap-1 text-blue-600 font-bold text-[11px] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                        <FaToggleOn className="text-sm" /> Tracked
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 font-medium text-[11px] bg-slate-100 px-2 py-1 rounded-lg">
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