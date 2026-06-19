import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaHome, FaSearch, FaSpinner, FaFileExcel,
  FaCalendarAlt, FaTable, FaHandHoldingHeart,
  FaDonate, FaPrayingHands, FaChartLine,
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

const CATEGORIES = ["Tithes", "Basket", "Pledge"];

export default function FinanceTotalIncome() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [tithes, setTithes] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [pledges, setPledges] = useState([]);

  const [yearTithes, setYearTithes] = useState([]);
  const [yearOfferings, setYearOfferings] = useState([]);
  const [yearPledges, setYearPledges] = useState([]);

  const currentYear = selectedMonth.split('-')[0];
  const weeks = getWeeksInMonth(selectedMonth);

  useEffect(() => {
    fetchAllIncomeData();
  }, [selectedMonth]);

  async function fetchAllIncomeData() {
    try {
      setLoading(true);

      const lastDay = getDaysInMonth(selectedMonth);

      // Monthly data
      const { data: tData } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Tithes")
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${lastDay}`);

      const { data: oData } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Basket")
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${lastDay}`);

      const { data: pData } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Pledge")
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${lastDay}`);

      // Annual data
      const { data: ytData } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Tithes")
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);

      const { data: yoData } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Basket")
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);

      const { data: ypData } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Pledge")
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);

      setTithes(tData || []);
      setOfferings(oData || []);
      setPledges(pData || []);
      setYearTithes(ytData || []);
      setYearOfferings(yoData || []);
      setYearPledges(ypData || []);
    } catch (err) {
      console.error("Error fetching income data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  };

  // --- MONTHLY HELPERS ---
  const getWeeklyTotal = (records, week) => {
    return records
      .filter(r => {
        const day = parseInt(r.date.split('-')[2]);
        return day >= week.start && day <= week.end;
      })
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  };

  const getMonthlyTotal = (records) => {
    return records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  };

  // --- ANNUAL HELPERS ---
  const getMonthlySum = (records, monthIndex) => {
    const monthNum = String(monthIndex + 1).padStart(2, '0');
    return records
      .filter(r => r.date.startsWith(`${currentYear}-${monthNum}`))
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  };

  const getAnnualTotal = (records) => {
    return records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  };

  // --- BUILD MONTHLY ROWS ---
  const monthlyRows = [
    {
      category: "Tithes",
      icon: <FaPrayingHands className="text-blue-500" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      weeklyData: weeks.map(w => ({ ...w, amount: getWeeklyTotal(tithes, w) })),
      total: getMonthlyTotal(tithes)
    },
    {
      category: "Offering",
      icon: <FaDonate className="text-emerald-500" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      weeklyData: weeks.map(w => ({ ...w, amount: getWeeklyTotal(offerings, w) })),
      total: getMonthlyTotal(offerings)
    },
    {
      category: "Pledge",
      icon: <FaHandHoldingHeart className="text-violet-500" />,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-200",
      weeklyData: weeks.map(w => ({ ...w, amount: getWeeklyTotal(pledges, w) })),
      total: getMonthlyTotal(pledges)
    }
  ];

  const monthlyGrandTotal = monthlyRows.reduce((sum, r) => sum + r.total, 0);

  // --- BUILD ANNUAL ROWS ---
  const annualRows = [
    {
      category: "Tithes",
      icon: <FaPrayingHands className="text-blue-500" />,
      color: "text-blue-600",
      months: MONTH_NAMES.map((_, idx) => getMonthlySum(yearTithes, idx)),
      total: getAnnualTotal(yearTithes)
    },
    {
      category: "Offering",
      icon: <FaDonate className="text-emerald-500" />,
      color: "text-emerald-600",
      months: MONTH_NAMES.map((_, idx) => getMonthlySum(yearOfferings, idx)),
      total: getAnnualTotal(yearOfferings)
    },
    {
      category: "Pledge",
      icon: <FaHandHoldingHeart className="text-violet-500" />,
      color: "text-violet-600",
      months: MONTH_NAMES.map((_, idx) => getMonthlySum(yearPledges, idx)),
      total: getAnnualTotal(yearPledges)
    }
  ];

  const annualGrandTotal = annualRows.reduce((sum, r) => sum + r.total, 0);
  const monthlyColumnGrandTotals = MONTH_NAMES.map((_, idx) =>
    annualRows.reduce((sum, r) => sum + r.months[idx], 0)
  );

  // Filter rows by search
  const filteredMonthlyRows = monthlyRows.filter(r =>
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAnnualRows = annualRows.filter(r =>
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- EXCEL EXPORT ---
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    // Monthly Sheet
    const wsMonthly = workbook.addWorksheet("Monthly Income");
    wsMonthly.columns = [
      { key: "category", width: 18 },
      ...weeks.map((_, idx) => ({ key: `week_${idx}`, width: 13 })),
      { key: "total", width: 16 }
    ];

    wsMonthly.mergeCells("A1:E1");
    wsMonthly.mergeCells("A2:E2");
    wsMonthly.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsMonthly.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsMonthly.getCell("A2").value = `Income Report — Monthly (${selectedMonth})`;
    wsMonthly.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsMonthly.getRow(4).values = ["Category", ...weeks.map((_, idx) => `Week ${idx + 1}`), "Total"];
    wsMonthly.getRow(4).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    monthlyRows.forEach((row, rIdx) => {
      const newRow = wsMonthly.addRow([row.category, ...row.weeklyData.map(w => w.amount), row.total]);
      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (colIdx === 1) cell.alignment = { horizontal: "left" };
        else {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = "₱#,##0.00";
        }
      });
    });

    const totalRow = wsMonthly.addRow(["Grand Total", ...weeks.map(w => {
      return monthlyRows.reduce((sum, r) => sum + getWeeklyTotal(
        r.category === "Tithes" ? tithes : r.category === "Offering" ? offerings : pledges, w
      ), 0);
    }), monthlyGrandTotal]);
    totalRow.eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.alignment = { horizontal: colIdx => colIdx === 1 ? "left" : "right" };
    });

    // Annual Sheet
    const wsAnnual = workbook.addWorksheet("Annual Income");
    wsAnnual.columns = [
      { key: "category", width: 18 },
      ...MONTH_NAMES.map(m => ({ key: m.toLowerCase(), width: 12 })),
      { key: "total", width: 16 }
    ];

    wsAnnual.mergeCells("A1:O1");
    wsAnnual.mergeCells("A2:O2");
    wsAnnual.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsAnnual.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsAnnual.getCell("A2").value = `Income Report — Annual (${currentYear})`;
    wsAnnual.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsAnnual.getRow(4).values = ["Category", ...MONTH_NAMES, "Annual Total"];
    wsAnnual.getRow(4).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    annualRows.forEach((row, rIdx) => {
      const newRow = wsAnnual.addRow([row.category, ...row.months, row.total]);
      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (colIdx === 1) cell.alignment = { horizontal: "left" };
        else {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = "₱#,##0.00";
        }
      });
    });

    const annualTotalRow = wsAnnual.addRow(["Grand Total", ...monthlyColumnGrandTotals, annualGrandTotal]);
    annualTotalRow.eachCell((cell, colIdx) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      if (colIdx > 1) {
        cell.numFmt = "₱#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Total_Income_Report_${currentYear}.xlsx`);
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
              Total <span className="text-emerald-600">Income</span>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {[
            { label: "Tithes", value: formatCurrency(getMonthlyTotal(tithes)), color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Offering", value: formatCurrency(getMonthlyTotal(offerings)), color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
            { label: "Pledge", value: formatCurrency(getMonthlyTotal(pledges)), color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
            { label: "Grand Total", value: formatCurrency(monthlyGrandTotal), color: "text-slate-900", bg: "bg-slate-100", border: "border-slate-200" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-xl p-2.5 sm:px-4 sm:py-2.5 shadow-sm`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</div>
              <div className={`text-sm sm:text-base md:text-lg font-black truncate ${stat.color}`}>₱{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-sm flex items-center gap-2 flex-1">
            <FaSearch className="text-slate-400 text-xs sm:text-sm ml-1" />
            <input type="text" placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 focus:outline-none" />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
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
            filteredMonthlyRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No income records found.</div>
            ) : filteredMonthlyRows.map((row) => {
              return (
                <div key={row.category} className={`${row.bg} border ${row.border} rounded-xl shadow-sm overflow-hidden`}>
                  {/* Card Header */}
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {row.icon}
                        <span className="font-bold text-sm text-slate-900">{row.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-black ${row.color}`}>₱{formatCurrency(row.total)}</div>
                    </div>
                  </div>

                  {/* Week Grid */}
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {row.weeklyData.map((week, widx) => {
                        const hasValue = week.amount > 0;
                        return (
                          <div key={widx} className={`py-2 px-1 rounded-lg font-mono font-bold text-[10px] flex flex-col items-center justify-center min-h-[48px] ${
                            hasValue
                              ? "bg-white/70 text-slate-800 border border-white/50"
                              : "bg-white/40 text-slate-400 border border-white/30"
                          }`}>
                            <span className="text-[8px] font-bold text-slate-400 mb-0.5">W{widx + 1}</span>
                            <span>{hasValue ? formatCurrency(week.amount) : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Annual Mobile Cards
            filteredAnnualRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No records found.</div>
            ) : filteredAnnualRows.map((row) => (
              <div key={row.category} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {row.icon}
                      <span className="font-bold text-sm text-slate-900">{row.category}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-slate-900">₱{formatCurrency(row.total)}</div>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-6 gap-1">
                    {row.months.map((m, idx) => (
                      <div key={idx} className={`text-center py-1.5 px-0.5 rounded-md ${m > 0 ? row.bg + ' ' + row.color.replace('text-', 'bg-') : 'bg-slate-50 text-slate-300'}`}>
                        <div className="text-[8px] font-bold uppercase">{MONTH_NAMES[idx]}</div>
                        <div className="text-[10px] font-mono font-bold">{m > 0 ? formatCurrency(m) : "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ===== DESKTOP: Table Layout ===== */}
        <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
              <span className="text-xs sm:text-sm text-slate-400">Syncing income data...</span>
            </div>
          ) : activeTab === "monthly" ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 sm:px-4 min-w-[100px]">Category</th>
                    {weeks.map((week, idx) => (
                      <th key={idx} className="py-3 px-1 sm:px-2 text-center min-w-[65px] sm:min-w-[75px]">W{idx + 1}</th>
                    ))}
                    <th className="py-3 px-2 sm:px-3 text-right min-w-[100px]">Monthly Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredMonthlyRows.length === 0 ? (
                    <tr><td colSpan={weeks.length + 3} className="py-12 text-center text-slate-400 text-sm">No income records found for this period.</td></tr>
                  ) : filteredMonthlyRows.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center gap-2">
                          {row.icon}
                          <span className="font-bold text-slate-900">{row.category}</span>
                        </div>
                      </td>
                      {row.weeklyData.map((week, widx) => (
                        <td key={widx} className="py-3 px-1 sm:px-2 text-center">
                          <span className={`font-mono font-bold text-[10px] sm:text-xs ${week.amount > 0 ? row.color : 'text-slate-300'}`}>
                            {week.amount > 0 ? formatCurrency(week.amount) : "—"}
                          </span>
                        </td>
                      ))}
                      <td className="py-3 px-2 sm:px-3 text-right font-mono font-bold text-slate-900">₱{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/50 font-black border-t border-slate-200">
                    <td className="py-3 px-3 sm:px-4 text-slate-900 text-xs uppercase">Grand Total</td>
                    {weeks.map((week, idx) => (
                      <td key={idx} className="py-3 px-1 sm:px-2 text-center font-mono text-slate-900">
                        ₱{formatCurrency(monthlyRows.reduce((sum, r) => sum + r.weeklyData[idx].amount, 0))}
                      </td>
                    ))}
                    <td className="py-3 px-2 sm:px-3 text-right font-mono text-emerald-700">₱{formatCurrency(monthlyGrandTotal)}</td>
                  </tr>
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
                  {filteredAnnualRows.length === 0 ? (
                    <tr><td colSpan={14} className="py-12 text-center text-slate-400 text-sm">No income records found for this year.</td></tr>
                  ) : filteredAnnualRows.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {row.icon}
                          <span className="font-bold text-slate-900">{row.category}</span>
                        </div>
                      </td>
                      {row.months.map((m, idx) => (
                        <td key={idx} className={`py-3 px-1 text-right font-mono ${m > 0 ? row.color + ' font-bold' : 'text-slate-300'}`}>
                          {m > 0 ? formatCurrency(m) : "—"}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">₱{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/50 font-black border-t border-slate-200">
                    <td className="py-3 px-4 text-slate-900 text-xs uppercase">Grand Total</td>
                    {monthlyColumnGrandTotals.map((mTotal, idx) => (
                      <td key={idx} className="py-3 px-1 text-right font-mono text-slate-900">
                        {mTotal > 0 ? formatCurrency(mTotal) : "—"}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono text-emerald-700">₱{formatCurrency(annualGrandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}