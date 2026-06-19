import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaHome, FaSearch, FaSpinner, FaFileExcel,
  FaCalendarAlt, FaTable, FaArrowDown, FaEdit,
  FaPlus, FaMinus, FaTimes,
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

export default function FinanceExpenses() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [expenses, setExpenses] = useState([]);
  const [allYearExpenses, setAllYearExpenses] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const currentYear = selectedMonth.split('-')[0];
  const weeks = getWeeksInMonth(selectedMonth);

  useEffect(() => {
    fetchExpenseData();
  }, [selectedMonth]);

  async function fetchExpenseData() {
    try {
      setLoading(true);
      const lastDay = getDaysInMonth(selectedMonth);

      const { data: monthlyData, error: monthlyErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("transaction_type", "Expense")
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${lastDay}`);
      if (monthlyErr) throw monthlyErr;

      const { data: yearData, error: yearErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("transaction_type", "Expense")
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);
      if (yearErr) throw yearErr;

      setExpenses(monthlyData || []);
      setAllYearExpenses(yearData || []);
    } catch (err) {
      console.error("Error fetching expense data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  };

  const toggleExpand = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const getCategories = (records) => {
    const cats = [...new Set(records.map(r => r.category || "Uncategorized"))];
    return cats.sort();
  };

  /** Get ALL expenses for a category in a specific week */
  const getWeekExpenses = (category, week, records) => {
    return records.filter(r => {
      if ((r.category || "Uncategorized") !== category) return false;
      const day = parseInt(r.date.split('-')[2]);
      return day >= week.start && day <= week.end;
    });
  };

  // ========== MODAL OPENERS ==========

  const openEditModal = (record, week) => {
    setSelectedWeek(week);
    setEditingExpenseId(record.id);
    setEditAmount(String(record.amount));
    setEditDate(record.date);
    setEditDescription(record.description || "");
    setShowEditModal(true);
  };

  const openAddModal = (week) => {
    setSelectedWeek(week);
    setEditingExpenseId(null);
    setEditAmount("");
    setEditDate(`${selectedMonth}-${String(week.start).padStart(2, '0')}`);
    setEditDescription("");
    setShowEditModal(true);
  };

  // ========== SAVE HANDLER ==========

  const handleSaveExpense = async (e) => {
    e.preventDefault();

    if (!editAmount || parseFloat(editAmount) <= 0) {
      alert("Please specify a valid amount.");
      return;
    }
    if (!editDate) return;

    try {
      const payload = {
        date: editDate,
        transaction_type: "Expense",
        category: "Expenses",
        amount: parseFloat(editAmount),
        description: editDescription || null,
        member_id: null
      };

      if (editingExpenseId) {
        const { error } = await supabase
          .from("church_finance")
          .update(payload)
          .eq("id", editingExpenseId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("church_finance")
          .insert([payload]);
        if (error) throw error;
      }

      await fetchExpenseData();
      setShowEditModal(false);
      setEditAmount("");
      setEditDescription("");
      setEditingExpenseId(null);
      setSelectedWeek(null);
    } catch (err) {
      console.error("Error saving expense:", err);
      alert(`Error saving expense: ${err.message}`);
    }
  };

  // --- MONTHLY DATA — SHOW ALL RECORDS ---
  const monthlyCategories = getCategories(expenses);
  const monthlyRows = monthlyCategories.map(cat => {
    const weeklyData = weeks.map(week => {
      const records = getWeekExpenses(cat, week, expenses);
      const total = records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      return {
        ...week,
        records: records || [],
        total
      };
    });
    const total = weeklyData.reduce((sum, w) => sum + w.total, 0);
    return { category: cat, weeklyData, total };
  });

  monthlyRows.push({
    category: "Add New...",
    weeklyData: weeks.map(w => ({ ...w, records: [], total: 0 })),
    total: 0,
    isAddNew: true
  });

  const monthlyGrandTotal = monthlyRows.filter(r => !r.isAddNew).reduce((sum, r) => sum + r.total, 0);

  // --- ANNUAL DATA ---
  const annualCategories = getCategories(allYearExpenses);
  const annualRows = annualCategories.map(cat => {
    const catRecords = allYearExpenses.filter(r => (r.category || "Uncategorized") === cat);
    const months = MONTH_NAMES.map((_, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      return catRecords
        .filter(r => r.date.startsWith(`${currentYear}-${monthNum}`))
        .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    });
    const total = months.reduce((sum, m) => sum + m, 0);
    return { category: cat, months, total };
  });

  const annualGrandTotal = annualRows.reduce((sum, r) => sum + r.total, 0);
  const monthlyColumnGrandTotals = MONTH_NAMES.map((_, idx) =>
    annualRows.reduce((sum, r) => sum + r.months[idx], 0)
  );

  const filteredMonthlyRows = monthlyRows.filter(r =>
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredAnnualRows = annualRows.filter(r =>
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- EXCEL EXPORT ---
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    // ===== MONTHLY SHEET: Description | Week 1 | Week 2 | ... | Total =====
    const wsMonthly = workbook.addWorksheet("Monthly Expenses");

    const totalCols = 2 + weeks.length; // Description + weeks + Total

    // Title row
    wsMonthly.mergeCells(1, 1, 1, totalCols);
    wsMonthly.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsMonthly.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsMonthly.getCell("A1").alignment = { horizontal: "center" };

    // Subtitle row
    wsMonthly.mergeCells(2, 1, 2, totalCols);
    wsMonthly.getCell("A2").value = `Expense Report — Monthly (${selectedMonth})`;
    wsMonthly.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };
    wsMonthly.getCell("A2").alignment = { horizontal: "center" };

    // Column widths: Description + each week + Total
    wsMonthly.getColumn(1).width = 28;
    weeks.forEach((_, idx) => {
      wsMonthly.getColumn(idx + 2).width = 13;
    });
    wsMonthly.getColumn(totalCols).width = 14;

    // Header row (row 4)
    const headerValues = ["Description", ...weeks.map((_, idx) => `Week ${idx + 1}`), "Total"];
    const headerRow = wsMonthly.getRow(4);
    headerValues.forEach((val, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = val;
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Build rows: one per unique description, with amounts per week
    const allDescriptions = [...new Set(
      expenses
        .filter(e => e.description)
        .map(e => e.description.trim())
    )].sort();

    allDescriptions.forEach((desc, rIdx) => {
      const weekAmounts = weeks.map(week => {
        const matching = expenses.filter(e => {
          if (!e.description || e.description.trim() !== desc) return false;
          const expenseDay = parseInt(e.date.split('-')[2]);
          return expenseDay >= week.start && expenseDay <= week.end;
        });
        return matching.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      });
      const rowTotal = weekAmounts.reduce((sum, a) => sum + a, 0);

      const newRow = wsMonthly.addRow([desc, ...weekAmounts, rowTotal]);
      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8E0" } } };
        if (colIdx === 1) {
          cell.alignment = { horizontal: "left" };
        } else {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = "₱#,##0.00";
        }
      });
    });

    // Grand Total row
    const grandWeekTotals = weeks.map((_, wIdx) =>
      allDescriptions.reduce((sum, desc) => {
        const weekAmounts = weeks.map(week => {
          const matching = expenses.filter(e => {
            if (!e.description || e.description.trim() !== desc) return false;
            const expenseDay = parseInt(e.date.split('-')[2]);
            return expenseDay >= week.start && expenseDay <= week.end;
          });
          return matching.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
        });
        return sum + weekAmounts[wIdx];
      }, 0)
    );
    const grandTotal = grandWeekTotals.reduce((sum, a) => sum + a, 0);

    const totalRow = wsMonthly.addRow(["Grand Total", ...grandWeekTotals, grandTotal]);
    totalRow.eachCell((cell, colIdx) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8E0" } };
      if (colIdx > 1) {
        cell.numFmt = "₱#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
    });

    // ===== ANNUAL SHEET =====
    const wsAnnual = workbook.addWorksheet("Annual Expenses");
    wsAnnual.columns = [
      { key: "category", width: 22 },
      ...MONTH_NAMES.map(m => ({ key: m.toLowerCase(), width: 11 })),
      { key: "total", width: 14 }
    ];

    wsAnnual.mergeCells("A1:O1");
    wsAnnual.mergeCells("A2:O2");
    wsAnnual.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsAnnual.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsAnnual.getCell("A2").value = `Expense Report — Annual (${currentYear})`;
    wsAnnual.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsAnnual.getRow(4).values = ["Category", ...MONTH_NAMES, "Annual Total"];
    wsAnnual.getRow(4).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    annualRows.forEach((row, rIdx) => {
      const newRow = wsAnnual.addRow([row.category, ...row.months, row.total]);
      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8E0" } } };
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
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8E0" } };
      if (colIdx > 1) {
        cell.numFmt = "₱#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Expenses_Report_${currentYear}.xlsx`);
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
              Church <span className="text-rose-700">Expenses</span>
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
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mb-4">
          {[
            { label: "Total Records", value: expenses.length, color: "text-slate-700", icon: <FaTable className="text-slate-400" /> },
            { label: "Monthly Outlay", value: `₱${formatCurrency(monthlyGrandTotal)}`, color: "text-slate-800", icon: <FaArrowDown className="text-slate-400" /> },
            { label: "Categories", value: monthlyCategories.length, color: "text-blue-600", icon: <FaCalendarAlt className="text-blue-400" /> },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm min-w-[100px]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">{stat.icon}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className={`text-base sm:text-lg font-black truncate ${stat.color}`}>{stat.value}</div>
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
              <FaSpinner className="animate-spin text-slate-500 text-xl mr-2" />
              <span className="text-sm text-slate-400">Loading...</span>
            </div>
          ) : activeTab === "monthly" ? (
            filteredMonthlyRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No expense records found.</div>
            ) : filteredMonthlyRows.map((row) => {
              const isExpanded = !!expandedCategories[row.category];
              const isAddNew = row.isAddNew;

              return (
                <div key={row.category} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Card Header */}
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isAddNew ? (
                          <FaPlus className="text-slate-300 text-xs" />
                        ) : (
                          <FaArrowDown className="text-slate-500 text-xs" />
                        )}
                        <span className={`font-bold text-sm ${isAddNew ? 'text-slate-400' : 'text-slate-900'}`}>{row.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-black text-slate-900">
                        {isAddNew ? <span className="text-slate-300">—</span> : `₱${formatCurrency(row.total)}`}
                      </div>
                      {!isAddNew && (
                        <button onClick={() => toggleExpand(row.category)}
                          className="text-sm text-slate-500 font-bold mt-1 flex items-center gap-0.5 ml-auto">
                          {isExpanded ? <>Less <FaChevronDown className="text-[8px]" /></> : <>Details <FaChevronRight className="text-[8px]" /></>}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Week Grid */}
                  {!isAddNew && (
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-5 gap-1.5">
                        {row.weeklyData.map((week, widx) => {
                          const hasRecords = week.records.length > 0;
                          return (
                            <div key={widx} className="flex flex-col gap-1">
                              {week.records.map((record) => (
                                <button
                                  key={record.id}
                                  onClick={() => openEditModal(record, week)}
                                  className="py-1.5 px-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer text-left"
                                >
                                  <div className="font-bold text-xs text-slate-700 truncate">{record.description || 'Expense'}</div>
                                  <div className="font-mono font-bold text-sm text-slate-700">₱{formatCurrency(record.amount)}</div>
                                </button>
                              ))}
                              <button
                                onClick={() => openAddModal(week)}
                                className="py-2 px-1 rounded font-mono font-bold text-xs text-slate-300 hover:text-slate-500 hover:bg-slate-50 border border-dashed border-slate-200 transition-colors cursor-pointer flex items-center justify-center min-h-[32px]"
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && !isAddNew && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Week Breakdown</div>
                      <div className="grid grid-cols-2 gap-2">
                        {row.weeklyData.map((week, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                            <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Week {idx + 1} ({week.label})</div>
                            <div className="flex flex-col gap-1">
                              {week.records.length > 0 ? week.records.map(record => (
                                <button
                                  key={record.id}
                                  onClick={() => openEditModal(record, week)}
                                  className="text-left text-xs font-bold text-slate-700 hover:text-rose-900 cursor-pointer leading-tight"
                                >
                                  <div className="truncate">{record.description || 'Expense'}</div>
                                  <div className="font-mono text-slate-600">₱{formatCurrency(record.amount)}</div>
                                </button>
                              )) : (
                                <span className="text-sm text-slate-300">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Annual Mobile Cards
            filteredAnnualRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No records found.</div>
            ) : filteredAnnualRows.map((row) => (
              <div key={row.category} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3 bg-slate-50 border-b border-slate-200">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FaArrowDown className="text-slate-500 text-sm" />
                      </div>
                      <span className="font-bold text-sm text-slate-900">{row.category}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-black text-slate-700">₱{formatCurrency(row.total)}</div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-6 gap-1.5">
                    {row.months.map((m, idx) => (
                      <div key={idx} className={`text-center py-2 px-0.5 rounded-lg ${m > 0 ? 'bg-slate-50 border border-slate-200 text-slate-700' : 'bg-white border border-slate-100 text-slate-300'}`}>
                        <div className="text-[11px] font-bold text-slate-400 uppercase mb-0.5">{MONTH_NAMES[idx]}</div>
                        <div className="text-xs font-mono font-bold">{m > 0 ? formatCurrency(m) : "—"}</div>
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
              <FaSpinner className="animate-spin text-slate-500 text-xl mr-2" />
              <span className="text-xs sm:text-sm text-slate-400">Syncing expense data...</span>
            </div>
          ) : activeTab === "monthly" ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3 sm:px-4 min-w-[120px] sm:min-w-[150px]">Category</th>
                    {weeks.map((week, idx) => (
                      <th key={idx} className="py-3 px-1 sm:px-2 text-center min-w-[80px] sm:min-w-[100px]">W{idx + 1}</th>
                    ))}
                    <th className="py-3 px-2 sm:px-3 text-right min-w-[80px] sm:min-w-[90px]">Total</th>
                    <th className="py-3 px-2 sm:px-3 text-center min-w-[50px] sm:min-w-[60px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredMonthlyRows.length === 0 ? (
                    <tr><td colSpan={weeks.length + 4} className="py-12 text-center text-slate-400 text-base">No expense records found for this period.</td></tr>
                  ) : filteredMonthlyRows.map((row) => {
                    const isExpanded = !!expandedCategories[row.category];
                    const isAddNew = row.isAddNew;

                    return (
                      <React.Fragment key={row.category}>
                        <tr className={`${isExpanded ? 'bg-slate-50/30' : 'hover:bg-slate-50/60'} transition-colors ${isAddNew ? 'bg-slate-50/30' : ''}`}>
                          <td className="py-2.5 px-3 sm:px-4">
                            <div className="flex items-center gap-2">
                              {isAddNew ? (
                                <FaPlus className="text-slate-300 text-xs" />
                              ) : (
                                <FaArrowDown className="text-slate-500 text-xs" />
                              )}
                              <span className={`font-bold ${isAddNew ? 'text-slate-400' : 'text-slate-900'}`}>{row.category}</span>
                            </div>
                          </td>

                          {row.weeklyData.map((week, widx) => {
                            return (
                              <td key={widx} className="py-2.5 px-1 sm:px-2 text-center align-top">
                                <div className="flex flex-col gap-1 min-w-[60px]">
                                  {/* Show each expense record with description */}
                                  {week.records.map((record) => (
                                    <button
                                      key={record.id}
                                      onClick={() => openEditModal(record, week)}
                                      className="block w-full py-1.5 px-1 rounded bg-slate-50 hover:bg-slate-100 text-red-500 border border-slate-200 transition-colors cursor-pointer text-left leading-tight"
                                      title={`${record.description || 'Expense'} — ₱${formatCurrency(record.amount)} on ${record.date}`}
                                    >
                                      <div className="font-bold text-xs sm:text-sm text-slate-700 truncate">{record.description || 'Expense'}</div>
                                      <div className="font-mono font-bold text-xs sm:text-sm text-slate-700">₱{formatCurrency(record.amount)}</div>
                                    </button>
                                  ))}
                                  {/* Add button */}
                                  <button
                                    onClick={() => openAddModal(week)}
                                    className="w-full py-1 px-1 rounded font-mono font-bold text-xs sm:text-sm text-slate-300 hover:text-slate-500 hover:bg-slate-50 border border-dashed border-slate-200 transition-colors cursor-pointer"
                                    title={isAddNew ? "Click to add new expense" : "Click to add amount"}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-2 sm:px-3 text-right font-mono font-bold text-slate-900">
                            {isAddNew ? <span className="text-slate-300">—</span> : `₱${formatCurrency(row.total)}`}
                          </td>

                          <td className="py-2.5 px-2 sm:px-3 text-center">
                            {!isAddNew && (
                              <button onClick={() => toggleExpand(row.category)}
                                className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded cursor-pointer active:scale-90 transition-colors ${isExpanded ? "bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                {isExpanded ? <FaMinus className="text-[10px]" /> : <FaEdit className="text-[10px]" />}
                              </button>
                            )}
                          </td>
                        </tr>

                        {isExpanded && !isAddNew && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={weeks.length + 4} className="py-3 px-4 sm:px-6">
                              <div className="text-xs sm:text-sm font-bold text-slate-400 uppercase mb-2 tracking-wider">Week Breakdown</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {row.weeklyData.map((week, idx) => (
                                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Week {idx + 1} ({week.label})</div>
                                    <div className="flex flex-col gap-1">
                                      {week.records.length > 0 ? week.records.map(record => (
                                        <button
                                          key={record.id}
                                          onClick={() => openEditModal(record, week)}
                                          className="text-left text-sm sm:text-base font-bold text-slate-700 hover:text-slate-900 cursor-pointer leading-tight"
                                        >
                                          <div className="truncate">{record.description || 'Expense'}</div>
                                          <div className="font-mono text-slate-600">₱{formatCurrency(record.amount)}</div>
                                        </button>
                                      )) : (
                                        <span className="text-sm text-slate-300">—</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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
                    <tr><td colSpan={14} className="py-12 text-center text-slate-400 text-base">No expense records found for this year.</td></tr>
                  ) : filteredAnnualRows.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FaArrowDown className="text-slate-500 text-xs" />
                          <span className="font-bold text-slate-900">{row.category}</span>
                        </div>
                      </td>
                      {row.months.map((m, idx) => (
                        <td key={idx} className={`py-3 px-1 text-right font-mono ${m > 0 ? 'text-slate-600 font-bold' : 'text-slate-300'}`}>
                          {m > 0 ? formatCurrency(m) : "—"}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-700 bg-slate-50/20">₱{formatCurrency(row.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/50 font-black border-t border-slate-200">
                    <td className="py-3 px-4 text-slate-900 text-xs uppercase">Grand Total</td>
                    {monthlyColumnGrandTotals.map((mTotal, idx) => (
                      <td key={idx} className="py-3 px-1 text-right font-mono text-slate-900">
                        {mTotal > 0 ? formatCurrency(mTotal) : "—"}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 bg-slate-100/30">₱{formatCurrency(annualGrandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EDIT/ADD MODAL */}
      {showEditModal && selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSaveExpense} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {editingExpenseId ? "Update" : "Add New"} Expense
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Week {weeks.findIndex(w => w.start === selectedWeek.start && w.end === selectedWeek.end) + 1} ({selectedWeek.label})
                  {!editingExpenseId && <span className="ml-1 text-slate-400">— New Entry</span>}
                </p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><FaTimes /></button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (PHP)</label>
                  <input type="number" step="0.01" min="0" required value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-500 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input type="date" required value={editDate} onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Specific Expense <span className="text-slate-500">*</span>
                </label>
                <input type="text" required value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="e.g. Car repair, Gas, Rent, Supplies..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-slate-500" />
                <p className="text-[9px] text-slate-400 mt-1">Type the specific expense here (car, gas, food, rent, etc.)</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {editingExpenseId && (
                <button type="button" onClick={async () => {
                  try {
                    const { error } = await supabase.from("church_finance").delete().eq("id", editingExpenseId);
                    if (error) throw error;
                    setShowEditModal(false);
                    await fetchExpenseData();
                  } catch (err) {
                    alert(`Error deleting: ${err.message}`);
                  }
                }} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Delete</button>
              )}
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
              <button type="submit" className="bg-slate-700 hover:bg-slate-800 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
                {editingExpenseId ? "Update" : "Create"} Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}