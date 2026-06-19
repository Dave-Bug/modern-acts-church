import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FaHome, FaSpinner, FaEdit, FaTimes, FaTable, 
  FaCalendarAlt, FaFileExcel, FaPlus, FaMinus,
  FaChevronRight, FaChevronDown
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";
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

const getWeeksInMonth = (yearMonth) => {
  const days = getDaysInMonth(yearMonth);
  const weeks = [];
  for (let i = 1; i <= days; i += 7) {
    const end = Math.min(i + 6, days);
    weeks.push({ start: i, end: end, label: `${i}-${end}` });
  }
  return weeks;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function Offering() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [records, setRecords] = useState([]);
  const [allYearRecords, setAllYearRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [expanded, setExpanded] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingRecordId, setEditingRecordId] = useState(null);
  
  const [saveMode, setSaveMode] = useState("overwrite");

  const currentYear = selectedMonth.split('-')[0];
  const weeks = getWeeksInMonth(selectedMonth);

  useEffect(() => {
    fetchOffering();
  }, [selectedMonth]);

  async function fetchOffering() {
    try {
      setLoading(true);
      const { data: monthlyData, error: monthlyErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Basket")
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${getDaysInMonth(selectedMonth)}`);
      if (monthlyErr) throw monthlyErr;

      const { data: annualData, error: annualErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Basket")
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);
      if (annualErr) throw annualErr;

      setRecords(monthlyData || []);
      setAllYearRecords(annualData || []);
    } catch (err) {
      console.error("Error fetching offering records:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  };

  const findWeekRecords = (week) => {
    return records.filter(r => {
      const day = parseInt(r.date.split('-')[2]);
      return day >= week.start && day <= week.end;
    });
  };

  const findRecordByDate = (date) => {
    return records.find(r => r.date === date) || null;
  };

  const openWeekEditModal = (week) => {
    setSelectedWeek(week);
    setSaveMode("overwrite");
    
    const existingRecords = findWeekRecords(week);
    const firstRecord = existingRecords[0];

    if (firstRecord) {
      setEditingRecordId(firstRecord.id);
      setEditAmount(firstRecord.amount);
      setEditDate(firstRecord.date);
      setEditDescription(firstRecord.description || "");
    } else {
      setEditingRecordId(null);
      setEditAmount("");
      setEditDate(`${selectedMonth}-${String(week.start).padStart(2, '0')}`);
      setEditDescription("");
    }

    setShowEditModal(true);
  };

  const handleSaveOffering = async (e) => {
    e.preventDefault();
    if (!editAmount || !editDate || !selectedWeek) return;

    const amount = parseFloat(editAmount) || 0;

    try {
      if (saveMode === "add") {
        const payload = {
          date: editDate,
          transaction_type: "Income",
          category: "Basket",
          amount: amount,
          description: editDescription || "",
        };
        await supabase.from("church_finance").insert([payload]);
      } else {
        const existingOnSameDate = findRecordByDate(editDate);
        
        if (existingOnSameDate) {
          const payload = {
            date: editDate,
            transaction_type: "Income",
            category: "Basket",
            amount: amount,
            description: editDescription || "",
          };
          await supabase.from("church_finance").update(payload).eq("id", existingOnSameDate.id);
        } else if (editingRecordId) {
          const payload = {
            date: editDate,
            transaction_type: "Income",
            category: "Basket",
            amount: amount,
            description: editDescription || "",
          };
          await supabase.from("church_finance").update(payload).eq("id", editingRecordId);
        } else {
          const payload = {
            date: editDate,
            transaction_type: "Income",
            category: "Basket",
            amount: amount,
            description: editDescription || "",
          };
          await supabase.from("church_finance").insert([payload]);
        }
      }

      await fetchOffering();
      setShowEditModal(false);
      setEditAmount("");
      setEditDescription("");
      setEditingRecordId(null);
      setSelectedWeek(null);
      setSaveMode("overwrite");
    } catch (err) {
      console.error("Error saving offering:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const weeklyData = weeks.map(week => {
    const weekRecords = findWeekRecords(week);
    const totalAmount = weekRecords.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    return {
      ...week,
      records: weekRecords,
      record: weekRecords[0] || null,
      amount: totalAmount
    };
  });

  const monthlyTotal = weeklyData.reduce((sum, w) => sum + w.amount, 0);

  const monthlyTotals = MONTH_NAMES.map((_, index) => {
    const monthNumString = String(index + 1).padStart(2, '0');
    return allYearRecords
      .filter(r => r.date.startsWith(`${currentYear}-${monthNumString}`))
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  });

  const annualGrandTotal = monthlyTotals.reduce((sum, m) => sum + m, 0);

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const wsMonthly = workbook.addWorksheet("Monthly Offering");
    const totalWeeks = weeks.length;

    wsMonthly.columns = [
      { key: "category", width: 26 },
      ...weeks.map((_, idx) => ({ key: `week_${idx}`, width: 13 })),
      { key: "total", width: 16 }
    ];

    wsMonthly.mergeCells("A1:E1");
    wsMonthly.mergeCells("A2:E2");

    const titleCell = wsMonthly.getCell("A1");
    titleCell.value = "Modern Acts Church - Olongapo";
    titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };

    const subtitleCell = wsMonthly.getCell("A2");
    subtitleCell.value = `Offering Report — Monthly Detail Window (${selectedMonth})`;
    subtitleCell.font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsMonthly.getRow(4).values = ["Category", ...weeks.map((_, idx) => `Week ${idx + 1}`), "Total"];
    wsMonthly.getRow(4).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    const rowValues = ["Basket Offering", ...weeklyData.map(w => w.amount), monthlyTotal];
    const newRow = wsMonthly.addRow(rowValues);

    newRow.eachCell((cell, colIdx) => {
      cell.font = { name: "Segoe UI", size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      if (colIdx === 1) {
        cell.alignment = { horizontal: "left" };
        cell.font = { name: "Segoe UI", size: 10, bold: true };
      } else {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "₱#,##0.00";
      }
    });

    const wsAnnual = workbook.addWorksheet("Annual Offering");
    wsAnnual.columns = [
      { key: "category", width: 26 },
      ...MONTH_NAMES.map(m => ({ key: m.toLowerCase(), width: 13 })),
      { key: "annualSum", width: 16 }
    ];

    wsAnnual.mergeCells("A1:O1");
    wsAnnual.mergeCells("A2:O2");
    wsAnnual.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsAnnual.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsAnnual.getCell("A2").value = `Annual Offering — 12-Month Summary Table (Calendar Year ${currentYear})`;
    wsAnnual.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsAnnual.getRow(4).values = ["Category", ...MONTH_NAMES, "Annual Total"];
    wsAnnual.getRow(4).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    const annualRowValues = ["Basket Offering", ...monthlyTotals, annualGrandTotal];
    const annualRow = wsAnnual.addRow(annualRowValues);

    annualRow.eachCell((cell, colIdx) => {
      cell.font = { name: "Segoe UI", size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      if (colIdx === 1) {
        cell.alignment = { horizontal: "left" };
        cell.font = { name: "Segoe UI", size: 10, bold: true };
      } else {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "₱#,##0.00";
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Offering_Report_${currentYear}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased">
      <div className="fixed top-3 left-3 z-50 sm:top-4 sm:left-4">
        <Link to="/ministries/finance" className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm">
          <FaHome /><span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pt-16 sm:pt-20">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight">
              Offering <span className="text-blue-600">Tracker</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Target Window:</span>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm" />
          </div>
        </div>

        <div className="flex border-b border-slate-200 mb-5 gap-1 sm:gap-2">
          <button onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "monthly" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaTable /> <span className="hidden xs:inline">Monthly Detail</span><span className="xs:hidden">Monthly</span>
          </button>
          <button onClick={() => setActiveTab("annual")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "annual" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaCalendarAlt /> <span className="hidden xs:inline">Annual Summary</span><span className="xs:hidden">Annual</span>
          </button>
        </div>

        {activeTab === "monthly" ? (
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4">
            {[
              { label: "Total", value: `₱${formatCurrency(monthlyTotal)}`, color: "text-blue-600" },
              { label: "Weeks Recorded", value: `${weeklyData.filter(w => w.amount > 0).length}/${weeks.length}`, color: "text-slate-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-2.5 sm:px-4 sm:py-2.5 shadow-sm min-w-[80px] sm:min-w-[90px]">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</div>
                <div className={`text-sm sm:text-base md:text-lg font-black truncate ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 mb-4">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm w-full sm:w-auto sm:min-w-[240px]">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Annual Cumulative Grand Total ({currentYear})</div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-blue-600">₱{formatCurrency(annualGrandTotal)}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-4">
          <div className="flex gap-2 w-full md:w-auto md:ml-auto">
            <button onClick={handleExportExcel}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 hover:border-emerald-300 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-600 transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer">
              <FaFileExcel className="text-sm sm:text-base text-emerald-600" /><span>Excel</span>
            </button>
          </div>
        </div>

        {/* ===== MOBILE: Card Layout ===== */}
        <div className="lg:hidden space-y-3 mb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
              <span className="text-sm text-slate-400">Loading...</span>
            </div>
          ) : activeTab === "monthly" ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* Card Header */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-sm text-slate-900">Basket Offering</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black text-blue-600">₱{formatCurrency(monthlyTotal)}</div>
                  <button onClick={() => setExpanded(!expanded)}
                    className="text-xs text-blue-600 font-bold mt-0.5 flex items-center gap-0.5 ml-auto">
                    {expanded ? <>Less <FaChevronDown className="text-xs" /></> : <>Details <FaChevronRight className="text-xs" /></>}
                  </button>
                </div>
              </div>

              {/* Week Grid */}
              <div className="px-3 pb-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {weeklyData.map((week, widx) => {
                    const hasValue = week.amount > 0;
                    const recordCount = week.records.length;
                    return (
                      <button key={widx} onClick={() => openWeekEditModal(week)}
                        className={`py-2 px-1 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[52px] ${
                          hasValue
                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-500 border border-slate-100"
                        }`}>
                        <span className="text-[10px] font-bold text-slate-400 mb-0.5">W{widx + 1}</span>
                        <span>{hasValue ? formatCurrency(week.amount) : "—"}</span>
                        {recordCount > 1 && (
                          <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded-full mt-0.5">{recordCount}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expanded Details */}
              {expanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Week Breakdown</div>
                  <div className="grid grid-cols-2 gap-2">
                    {weeklyData.map((week, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Week {idx + 1} ({week.label})</div>
                        <div className="text-base font-mono font-bold text-slate-800">
                          {week.amount > 0 ? `₱${formatCurrency(week.amount)}` : <span className="text-slate-300">—</span>}
                        </div>
                        {week.records.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {week.records.map((rec, ridx) => (
                              <div key={ridx} className="text-xs text-slate-500 flex justify-between">
                                <span>{rec.date}</span>
                                <span className="font-mono">₱{formatCurrency(rec.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Annual Mobile Card */
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-sm text-slate-900">Basket Offering</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black text-blue-600">₱{formatCurrency(annualGrandTotal)}</div>
                </div>
              </div>
              <div className="px-3 pb-3">
                <div className="grid grid-cols-6 gap-1">
                  {monthlyTotals.map((m, idx) => (
                    <div key={idx} className={`text-center py-2 px-0.5 rounded-md ${m > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-300'}`}>
                      <div className="text-[10px] font-bold uppercase">{MONTH_NAMES[idx]}</div>
                      <div className="text-xs font-mono font-bold">{m > 0 ? formatCurrency(m) : "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== DESKTOP: Table Layout ===== */}
        <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
              <span className="text-xs sm:text-sm text-slate-400">Syncing database registry...</span>
            </div>
          ) : activeTab === "monthly" ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 sm:px-4 min-w-[120px] sm:min-w-[150px]">Category</th>
                    {weeks.map((week, idx) => (
                      <th key={idx} className="py-3 px-1 sm:px-2 text-center min-w-[65px] sm:min-w-[75px]">W{idx + 1}</th>
                    ))}
                    <th className="py-3 px-2 sm:px-3 text-right min-w-[80px] sm:min-w-[90px]">Total</th>
                    <th className="py-3 px-2 sm:px-3 text-center min-w-[50px] sm:min-w-[60px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  <tr className={`${expanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'} transition-colors`}>
                    <td className="py-2.5 px-3 sm:px-4">
                      <span className="font-bold text-slate-900">Basket Offering</span>
                    </td>

                    {weeklyData.map((week, widx) => {
                      const hasValue = week.amount > 0;
                      const recordCount = week.records.length;
                      return (
                        <td key={widx} className="py-2.5 px-1 sm:px-2 text-center">
                          <button 
                            onClick={() => openWeekEditModal(week)}
                            className={`w-full py-1 px-1 rounded font-mono font-bold text-[10px] sm:text-xs transition-colors cursor-pointer ${
                              hasValue 
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"
                            }`}
                            title={hasValue ? `Click to edit ₱${formatCurrency(week.amount)}` : "Click to add amount"}
                          >
                            {hasValue ? formatCurrency(week.amount) : "—"}
                            {recordCount > 1 && (
                              <span className="ml-1 text-[8px] bg-emerald-200 text-emerald-800 px-1 rounded-full">{recordCount}</span>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-2 sm:px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(monthlyTotal)}</td>

                    <td className="py-2.5 px-2 sm:px-3 text-center">
                      <button onClick={() => setExpanded(!expanded)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded cursor-pointer active:scale-90 transition-colors ${expanded ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                        {expanded ? <FaMinus className="text-[10px]" /> : <FaEdit className="text-[10px]" />}
                      </button>
                    </td>
                  </tr>

                  {expanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={weeks.length + 3} className="py-3 px-4 sm:px-6">
                        <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Week Breakdown</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                          {weeklyData.map((week, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Week {idx + 1} ({week.label})</div>
                              <div className="text-sm font-mono font-bold text-slate-800">
                                {week.amount > 0 ? `₱${formatCurrency(week.amount)}` : <span className="text-slate-300">—</span>}
                              </div>
                              {week.records.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {week.records.map((rec, ridx) => (
                                    <div key={ridx} className="text-[9px] text-slate-500 flex justify-between">
                                      <span>{rec.date}</span>
                                      <span className="font-mono">₱{formatCurrency(rec.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Category</th>
                    {MONTH_NAMES.map((m) => (
                      <th key={m} className="py-3 px-1 text-right">{m}</th>
                    ))}
                    <th className="py-3 px-3 text-right">Annual Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold">
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">Basket Offering</td>
                    {monthlyTotals.map((m, idx) => (
                      <td key={idx} className={`py-3 px-1 text-right font-mono ${m > 0 ? 'text-slate-800 font-bold' : 'text-slate-300'}`}>
                        {m > 0 ? formatCurrency(m) : "—"}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono font-black text-blue-600 bg-blue-50/20">{formatCurrency(annualGrandTotal)}</td>
                  </tr>
                  <tr className="bg-slate-100/50 font-black border-t border-slate-200">
                    <td className="py-3 px-4 text-slate-900 text-xs uppercase">Total Cumulative</td>
                    {monthlyTotals.map((mTotal, idx) => (
                      <td key={idx} className="py-3 px-1 text-right font-mono text-slate-900">
                        {mTotal > 0 ? formatCurrency(mTotal) : "—"}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono text-blue-600 bg-blue-100/30">{formatCurrency(annualGrandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* WEEK CELL EDIT MODAL */}
      {showEditModal && selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSaveOffering} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {editingRecordId ? "Update" : "Set"} Week Offering
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Offering Basket</p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><FaTimes /></button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              {editingRecordId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Save Mode</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSaveMode("overwrite")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        saveMode === "overwrite"
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Overwrite
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveMode("add")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        saveMode === "add"
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Add New
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {saveMode === "overwrite" 
                      ? "Replaces the existing amount for this date." 
                      : "Creates a new record. Total will be summed."}
                  </p>
                </div>
              )}

              {findWeekRecords(selectedWeek).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Existing Records This Week</div>
                  <div className="space-y-1">
                    {findWeekRecords(selectedWeek).map((rec, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-600">{rec.date}</span>
                        <span className="font-mono font-bold text-slate-800">₱{formatCurrency(rec.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-amber-200 pt-1 mt-1 flex justify-between text-xs font-bold">
                      <span className="text-amber-700">Current Total</span>
                      <span className="font-mono text-amber-700">
                        ₱{formatCurrency(findWeekRecords(selectedWeek).reduce((s, r) => s + parseFloat(r.amount || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (PHP)</label>
                  <input type="number" step="0.01" min="0" required value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input type="date" required value={editDate} onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Note</label>
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {editingRecordId && saveMode === "overwrite" && (
                <button type="button" onClick={async () => {
                  try {
                    const weekRecords = findWeekRecords(selectedWeek);
                    for (const rec of weekRecords) {
                      await supabase.from("church_finance").delete().eq("id", rec.id);
                    }
                    setShowEditModal(false);
                    await fetchOffering();
                  } catch (err) {
                    alert(`Error deleting: ${err.message}`);
                  }
                }} className="px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Delete All</button>
              )}
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                {saveMode === "add" ? "Add" : (editingRecordId ? "Update" : "Set")} Amount
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}