import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FaHome, FaSearch, FaSpinner, FaPlus, FaMinus, 
  FaUserCog, FaToggleOn, FaToggleOff, FaTimes,
  FaFileExcel, FaCalendarAlt, FaTable, FaEdit,
  FaChevronRight, FaChevronDown, FaEllipsisV
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

export default function FinanceTithes() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [tithes, setTithes] = useState([]);
  const [allYearTithes, setAllYearTithes] = useState([]); 
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [expandedMembers, setExpandedMembers] = useState({});

  const [showEditModal, setShowEditModal] = useState(false);
  const [showTitherRosterModal, setShowTitherRosterModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingTitheId, setEditingTitheId] = useState(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");

  const currentYear = selectedMonth.split('-')[0];

  useEffect(() => {
    fetchTithesData();
  }, [selectedMonth]);

  async function fetchTithesData() {
    try {
      setLoading(true);
      const { data: ledger, error: ledgerErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Tithes")
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${getDaysInMonth(selectedMonth)}`);
      if (ledgerErr) throw ledgerErr;

      const { data: yearLedger, error: yearLedgerErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Tithes")
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);
      if (yearLedgerErr) throw yearLedgerErr;

      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name, gross, is_tither, bindedto")
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;

      setMembers(roster || []);
      setTithes(ledger || []);
      setAllYearTithes(yearLedger || []);
    } catch (err) {
      console.error("Error fetching database records:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  };

  const getPartner = (member) => {
    if (!member || !member.bindedto) return null;
    return members.find(m => String(m.id) === String(member.bindedto)) || null;
  };

  const toggleExpand = (memberId) => {
    setExpandedMembers(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const handleToggleTitherStatus = async (memberId, currentStatus) => {
    const updatedStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from("usher_members")
        .update({ is_tither: updatedStatus })
        .eq("id", memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_tither: updatedStatus } : m));
    } catch (err) {
      console.error("Error changing status:", err.message);
      alert(`Could not save: ${err.message}`);
    }
  };

  const handleUpdateBinding = async (memberId, targetBindedId) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (member.bindedto) {
        await supabase.from("usher_members").update({ bindedto: null }).eq("id", member.bindedto);
      }
      await supabase.from("usher_members").update({ bindedto: targetBindedId || null }).eq("id", memberId);
      if (targetBindedId) {
        await supabase.from("usher_members").update({ bindedto: memberId }).eq("id", targetBindedId);
      }
      await fetchTithesData();
    } catch (err) {
      console.error("Error updating binding link:", err.message);
      alert(`Could not save connection: ${err.message}`);
    }
  };

  const findWeekTithe = (memberId, week) => {
    return tithes.find(t => {
      if (String(t.member_id) !== String(memberId)) return false;
      const day = parseInt(t.date.split('-')[2]);
      return day >= week.start && day <= week.end;
    });
  };

  const deleteWeekTithes = async (memberId, week) => {
    const startDate = `${selectedMonth}-${String(week.start).padStart(2, '0')}`;
    const endDate = `${selectedMonth}-${String(week.end).padStart(2, '0')}`;
    const { error } = await supabase
      .from("church_finance")
      .delete()
      .eq("category", "Tithes")
      .eq("member_id", memberId)
      .gte("date", startDate)
      .lte("date", endDate);
    if (error) { console.error("Error deleting week tithes:", error); throw error; }
  };

  const openWeekEditModal = (member, week) => {
    setSelectedMember(member);
    setSelectedWeek(week);
    const existing = findWeekTithe(member.id, week);
    if (existing) {
      setEditingTitheId(existing.id);
      setEditAmount(existing.amount);
      setEditDate(existing.date);
      setEditDescription(existing.description || "None");
    } else {
      setEditingTitheId(null);
      setEditAmount("");
      setEditDate(`${selectedMonth}-${String(week.start).padStart(2, '0')}`);
      setEditDescription("None");
    }
    setShowEditModal(true);
  };

  const handleGrossUpdate = async (memberId, newGrossValue) => {
    const numericGross = parseFloat(newGrossValue) || 0;
    try {
      const { error } = await supabase.from("usher_members").update({ gross: numericGross }).eq("id", memberId);
      if (error) throw error;
      await fetchTithesData();
    } catch (err) {
      alert(`Could not save goal: ${err.message}`);
    }
  };

  const handleSaveTithe = async (e) => {
    e.preventDefault();
    if (!editAmount || !editDate || !selectedMember || !selectedWeek) return;
    const amount = parseFloat(editAmount) || 0;
    const member = selectedMember;
    const partner = member.bindedto ? members.find(m => String(m.id) === String(member.bindedto)) : null;
    try {
      const payload = { date: editDate, transaction_type: "Income", category: "Tithes", amount, description: editDescription || "None" };
      await deleteWeekTithes(member.id, selectedWeek);
      await supabase.from("church_finance").insert([{ ...payload, member_id: member.id }]);
      if (partner) {
        await deleteWeekTithes(partner.id, selectedWeek);
        await supabase.from("church_finance").insert([{ ...payload, member_id: partner.id }]);
      }
      await fetchTithesData();
      setShowEditModal(false);
      setEditAmount(""); setEditDescription(""); setEditingTitheId(null); setSelectedMember(null); setSelectedWeek(null);
    } catch (err) {
      console.error("Error saving tithe:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const weeks = getWeeksInMonth(selectedMonth);

  const getAnnualRows = () => {
    let rows = [];
    const processedMemberIds = new Set();
    activeTitherMembers.forEach(m => {
      const mid = String(m.id);
      if (processedMemberIds.has(mid)) return;
      const partner = getPartner(m);
      const targetGross = parseFloat(m.gross || 0);
      if (partner) {
        processedMemberIds.add(mid);
        processedMemberIds.add(String(partner.id));
        const primary = parseInt(mid) < parseInt(partner.id) ? m : partner;
        const secondary = parseInt(mid) < parseInt(partner.id) ? partner : m;
        const primaryGross = parseFloat(primary.gross || 0);
        const primaryTithes = allYearTithes.filter(t => String(t.member_id) === String(primary.id));
        const secondaryTithes = allYearTithes.filter(t => String(t.member_id) === String(secondary.id));
        const dateAmountMap = new Map();
        [...primaryTithes, ...secondaryTithes].forEach(t => {
          const key = `${t.date}_${t.amount}`;
          if (!dateAmountMap.has(key)) dateAmountMap.set(key, { date: t.date, amount: parseFloat(t.amount || 0) });
        });
        let runningYearTotal = 0;
        let metMonthsCount = 0;
        const monthlyTotals = MONTH_NAMES.map((_, index) => {
          const monthNumString = String(index + 1).padStart(2, '0');
          const monthPrefix = `${currentYear}-${monthNumString}`;
          let monthlySum = 0;
          dateAmountMap.forEach((record) => { if (record.date.startsWith(monthPrefix)) monthlySum += record.amount; });
          runningYearTotal += monthlySum;
          const isMonthMet = primaryGross > 0 && monthlySum >= primaryGross;
          if (isMonthMet) metMonthsCount++;
          return { amount: monthlySum, isMet: primaryGross > 0 ? isMonthMet : true };
        });
        rows.push({
          memberId: primary.id, name: `${primary.first_name} ${primary.last_name}`, months: monthlyTotals,
          grandTotal: runningYearTotal, scoreText: primaryGross > 0 ? `${metMonthsCount}/12` : "0/12",
          scoreRaw: metMonthsCount, hasGoal: primaryGross > 0, targetGross: primaryGross,
          isVirtual: false, isBoundPair: true, partnerName: `${secondary.first_name} ${secondary.last_name}`
        });
      } else {
        processedMemberIds.add(mid);
        const memberYearTithes = allYearTithes.filter(t => String(t.member_id) === mid);
        let runningYearTotal = 0;
        let metMonthsCount = 0;
        const monthlyTotals = MONTH_NAMES.map((_, index) => {
          const monthNumString = String(index + 1).padStart(2, '0');
          const monthlySum = memberYearTithes.filter(t => t.date.startsWith(`${currentYear}-${monthNumString}`)).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
          runningYearTotal += monthlySum;
          const isMonthMet = targetGross > 0 && monthlySum >= targetGross;
          if (isMonthMet) metMonthsCount++;
          return { amount: monthlySum, isMet: targetGross > 0 ? isMonthMet : true };
        });
        rows.push({
          memberId: m.id, name: `${m.first_name} ${m.last_name}`, months: monthlyTotals,
          grandTotal: runningYearTotal, scoreText: targetGross > 0 ? `${metMonthsCount}/12` : "0/12",
          scoreRaw: metMonthsCount, hasGoal: targetGross > 0, targetGross, isVirtual: false, isBoundPair: false
        });
      }
    });
    const unassignedYearTithes = allYearTithes.filter(t => !t.member_id);
    if (unassignedYearTithes.length > 0) {
      let anonymousRunningTotal = 0;
      const anonymousMonthlyTotals = MONTH_NAMES.map((_, index) => {
        const monthNumString = String(index + 1).padStart(2, '0');
        const monthlySum = unassignedYearTithes.filter(t => t.date.startsWith(`${currentYear}-${monthNumString}`)).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        anonymousRunningTotal += monthlySum;
        return { amount: monthlySum, isMet: true };
      });
      rows.push({
        memberId: "anonymous", name: "Anonymous", months: anonymousMonthlyTotals,
        grandTotal: anonymousRunningTotal, scoreText: "N/A", scoreRaw: 0,
        hasGoal: false, targetGross: 0, isVirtual: true, isBoundPair: false
      });
    }
    return rows;
  };

  const getMonthlyRows = () => {
    let rows = [];
    const processedMemberIds = new Set();
    activeTitherMembers.forEach(m => {
      const mid = String(m.id);
      if (processedMemberIds.has(mid)) return;
      const partner = getPartner(m);
      const targetGross = parseFloat(m.gross || 0);
      if (partner) {
        processedMemberIds.add(mid);
        processedMemberIds.add(String(partner.id));
        const primary = parseInt(mid) < parseInt(partner.id) ? m : partner;
        const secondary = parseInt(mid) < parseInt(partner.id) ? partner : m;
        const primaryGross = parseFloat(primary.gross || 0);
        const primaryTithes = tithes.filter(t => String(t.member_id) === String(primary.id));
        const secondaryTithes = tithes.filter(t => String(t.member_id) === String(secondary.id));
        const dateAmountMap = new Map();
        [...primaryTithes, ...secondaryTithes].forEach(t => {
          const day = parseInt(t.date.split('-')[2]);
          const key = `${day}_${t.amount}`;
          if (!dateAmountMap.has(key)) dateAmountMap.set(key, { day, amount: parseFloat(t.amount || 0), record: t });
        });
        const weeklyData = weeks.map(week => {
          let weekAmount = 0;
          let weekRecord = null;
          dateAmountMap.forEach((record) => {
            if (record.day >= week.start && record.day <= week.end) {
              weekAmount += record.amount;
              if (!weekRecord) weekRecord = record.record;
            }
          });
          return { ...week, record: weekRecord, amount: weekAmount };
        });
        const totalTithesForMonth = weeklyData.reduce((sum, w) => sum + w.amount, 0);
        const isAchieved = primaryGross > 0 && totalTithesForMonth >= primaryGross;
        rows.push({
          memberId: primary.id, name: `${primary.first_name} ${primary.last_name}`,
          totalTithes: totalTithesForMonth, gross: primaryGross, isAchieved, weeklyData,
          isVirtual: false, isBoundPair: true, partnerName: `${secondary.first_name} ${secondary.last_name}`
        });
      } else {
        processedMemberIds.add(mid);
        const memberTithes = tithes.filter(t => String(t.member_id) === mid);
        const weeklyData = weeks.map(week => {
          const record = memberTithes.find(t => {
            const day = parseInt(t.date.split('-')[2]);
            return day >= week.start && day <= week.end;
          });
          return { ...week, record: record || null, amount: record ? parseFloat(record.amount || 0) : 0 };
        });
        const totalTithesForMonth = weeklyData.reduce((sum, w) => sum + w.amount, 0);
        const isAchieved = targetGross > 0 && totalTithesForMonth >= targetGross;
        rows.push({
          memberId: m.id, name: `${m.first_name} ${m.last_name}`,
          totalTithes: totalTithesForMonth, gross: targetGross, isAchieved, weeklyData,
          isVirtual: false, isBoundPair: false
        });
      }
    });
    const unassignedTithes = tithes.filter(t => !t.member_id);
    if (unassignedTithes.length > 0) {
      const totalUnassigned = unassignedTithes.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const unassignedWeeklyData = weeks.map(week => {
        const record = unassignedTithes.find(t => {
          const day = parseInt(t.date.split('-')[2]);
          return day >= week.start && day <= week.end;
        });
        return { ...week, record: record || null, amount: record ? parseFloat(record.amount || 0) : 0 };
      });
      rows.push({
        memberId: "anonymous", name: "Anonymous", totalTithes: totalUnassigned,
        gross: 0, isAchieved: false, weeklyData: unassignedWeeklyData, isVirtual: true, isBoundPair: false
      });
    }
    return rows;
  };

  const activeTitherMembers = members.filter(member => member.is_tither === true);
  const annualRows = getAnnualRows();
  const monthlyRows = getMonthlyRows();
  const filteredAnnualRows = annualRows.filter(row => row.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRows = monthlyRows.filter(row => row.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const annualGrandTotal = filteredAnnualRows.reduce((sum, r) => sum + r.grandTotal, 0);
  const monthlyColumnGrandTotals = MONTH_NAMES.map((_, idx) => filteredAnnualRows.reduce((sum, r) => sum + r.months[idx].amount, 0));
  const achievedCount = filteredRows.filter(r => r.isAchieved && !r.isVirtual).length;
  const notAchievedCount = filteredRows.filter(r => !r.isAchieved && r.gross > 0 && !r.isVirtual).length;
  const noBaselineCount = filteredRows.filter(r => r.gross === 0 && !r.isVirtual).length;
  const overallTotal = filteredRows.reduce((sum, r) => sum + r.totalTithes, 0);
  const filteredRosterConfig = members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(rosterSearchQuery.toLowerCase()));

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const wsMonthly = workbook.addWorksheet("Monthly Tracker View");
    const totalWeeks = weeks.length;
    wsMonthly.columns = [
      { key: "name", width: 26 },
      ...weeks.map((_, idx) => ({ key: `week_${idx}`, width: 13 })),
      { key: "totalTithes", width: 16 }, { key: "goal", width: 14 }, { key: "status", width: 13 }
    ];
    wsMonthly.mergeCells("A1:E1"); wsMonthly.mergeCells("A2:E2");
    const titleCell = wsMonthly.getCell("A1");
    titleCell.value = "Modern Acts Church - Olongapo";
    titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    const subtitleCell = wsMonthly.getCell("A2");
    subtitleCell.value = `Finance Report — Monthly Detail Window (${selectedMonth})`;
    subtitleCell.font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };
    wsMonthly.getRow(4).values = ["MET", "SHORT", "NO GOAL", "TOTAL"];
    wsMonthly.getRow(5).values = [achievedCount, notAchievedCount, noBaselineCount, overallTotal];
    const cardStyles = {
      A: { color: "FF059669", bg: "FFECFDF5", bold: true },
      B: { color: "FFE11D48", bg: "FFFCE8E6", bold: true },
      C: { color: "FF475569", bg: "FFF1F5F9", bold: false },
      D: { color: "FF2563EB", bg: "FFEBF5FF", bold: true, numFormat: "₱#,##0.00" }
    };
    ["A", "B", "C", "D"].forEach(col => {
      wsMonthly.getCell(`${col}4`).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF94A3B8" } };
      wsMonthly.getCell(`${col}4`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: cardStyles[col].bg } };
      wsMonthly.getCell(`${col}4`).alignment = { horizontal: "center" };
      const val = wsMonthly.getCell(`${col}5`);
      val.font = { name: "Segoe UI", size: 14, bold: cardStyles[col].bold, color: { argb: cardStyles[col].color } };
      val.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cardStyles[col].bg } };
      val.alignment = { horizontal: "center" };
      if (cardStyles[col].numFormat) val.numFmt = cardStyles[col].numFormat;
    });
    wsMonthly.getRow(7).values = ["Name", ...weeks.map((_, idx) => `Week ${idx + 1}`), "Total Tithes", "Goal", "Status"];
    wsMonthly.getRow(7).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    filteredRows.forEach((row, rIdx) => {
      const status = row.isVirtual ? "N/A" : row.gross === 0 ? "N/A" : row.isAchieved ? "Met" : "Short";
      const rowValues = [row.name, ...row.weeklyData.map(w => w.amount), row.totalTithes, row.gross, status];
      const newRow = wsMonthly.addRow(rowValues);
      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (colIdx === 1) cell.alignment = { horizontal: "left" };
        else if (colIdx > 1 && colIdx <= (totalWeeks + 3)) {
          cell.alignment = { horizontal: "right" }; cell.numFmt = "₱#,##0.00";
        } else {
          cell.alignment = { horizontal: "center" };
          if (cell.value === "Met") cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF047857" } };
          if (cell.value === "Short") cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFB91C1C" } };
        }
      });
    });
    const wsAnnual = workbook.addWorksheet("Annual 12-Month Matrix");
    wsAnnual.columns = [{ key: "name", width: 26 }, ...MONTH_NAMES.map(m => ({ key: m.toLowerCase(), width: 13 })), { key: "annualSum", width: 16 }, { key: "achievedScore", width: 14 }];
    wsAnnual.mergeCells("A1:O1"); wsAnnual.mergeCells("A2:O2");
    wsAnnual.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsAnnual.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsAnnual.getCell("A2").value = `Annual Ledger — 12-Month Tithes Summary Table (Calendar Year ${currentYear})`;
    wsAnnual.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };
    wsAnnual.getRow(4).values = ["ANNUAL CONSOLIDATED TOTAL"];
    wsAnnual.getCell("A4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF94A3B8" } };
    wsAnnual.getRow(5).values = [annualGrandTotal];
    wsAnnual.getCell("A5").font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF2563EB" } };
    wsAnnual.getCell("A5").numFmt = "₱#,##0.00";
    wsAnnual.getRow(7).values = ["Member Name", ...MONTH_NAMES, "Annual Total", "Achieved"];
    wsAnnual.getRow(7).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    filteredAnnualRows.forEach((row, rIdx) => {
      const rowValues = [row.name, ...row.months.map(m => m.amount), row.grandTotal, row.scoreText];
      const newRow = wsAnnual.addRow(rowValues);
      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (colIdx === 1) {
          cell.alignment = { horizontal: "left" };
          if (row.isVirtual) cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF2563EB" } };
        } else if (colIdx === 15) {
          cell.alignment = { horizontal: "center" };
          if (!row.isVirtual && row.hasGoal) cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: row.scoreRaw >= 6 ? "FF047857" : "FFB91C1C" } };
        } else {
          cell.alignment = { horizontal: "right" }; cell.numFmt = "₱#,##0.00";
          if (colIdx === 14) cell.font = { name: "Segoe UI", size: 10, bold: true };
        }
      });
    });
    const summaryRow = wsAnnual.addRow(["Total Cumulative", ...monthlyColumnGrandTotals, annualGrandTotal, ""]);
    summaryRow.eachCell((cell, colIdx) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      if (colIdx > 1 && colIdx < 15) { cell.numFmt = "₱#,##0.00"; cell.alignment = { horizontal: "right" }; }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Tithes_Master_Report_${currentYear}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased">
      <div className="fixed top-3 left-3 z-50 sm:top-4 sm:left-4">
        <Link to="/ministries/finance" className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm">
          <FaHome /><span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pt-14 sm:pt-20">
        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight">
              Tithe <span className="text-blue-600">Tracker</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase hidden sm:inline">Target Window:</span>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4 gap-1 sm:gap-2">
          <button onClick={() => setActiveTab("monthly")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "monthly" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaTable className="text-xs" /> <span>Monthly</span>
          </button>
          <button onClick={() => setActiveTab("annual")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "annual" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <FaCalendarAlt className="text-xs" /> <span>Annual</span>
          </button>
        </div>

        {/* Stats Cards */}
        {activeTab === "monthly" ? (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 mb-4">
            {[
              { label: "Met", value: achievedCount, color: "text-emerald-600" },
              { label: "Short", value: notAchievedCount, color: "text-rose-600" },
              { label: "No Goal", value: noBaselineCount, color: "text-slate-500" },
              { label: "Total", value: `₱${formatCurrency(overallTotal)}`, color: "text-blue-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-3 sm:px-4 sm:py-2.5 shadow-sm">
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</div>
                <div className={`text-base sm:text-lg md:text-xl font-black truncate ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-4">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-3 shadow-sm w-full sm:w-auto sm:min-w-[240px]">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Annual Cumulative Grand Total ({currentYear})</div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-blue-600">₱{formatCurrency(annualGrandTotal)}</div>
            </div>
          </div>
        )}

        {/* Search + Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-2.5 shadow-sm flex items-center gap-2 flex-1">
            <FaSearch className="text-slate-400 text-xs sm:text-sm ml-1 flex-shrink-0" />
            <input type="text" placeholder="Search members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-800 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportExcel}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 hover:border-emerald-300 rounded-xl px-3 py-2.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-600 transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer">
              <FaFileExcel className="text-sm sm:text-base text-emerald-600" /><span className="hidden sm:inline">Excel</span><span className="sm:hidden">Export</span>
            </button>
            <button onClick={() => { setRosterSearchQuery(""); setShowTitherRosterModal(true); }}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 hover:border-blue-300 rounded-xl px-3 py-2.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer">
              <FaUserCog className="text-sm sm:text-base" /><span className="hidden sm:inline">Manage Roster</span><span className="sm:hidden">Roster</span>
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
            filteredRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No recorded profiles matched.</div>
            ) : filteredRows.map((row) => {
              const isExpanded = !!expandedMembers[row.memberId];
              const currentMemberObj = row.isVirtual
                ? { id: "anonymous", first_name: "Anonymous", last_name: "" }
                : members.find(m => m.id === row.memberId);

              return (
                <div key={row.memberId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Card Header */}
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-sm ${row.isVirtual ? 'text-blue-600' : 'text-slate-900'}`}>{row.name}</span>
                        {row.isBoundPair && (
                          <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {row.partnerName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {row.isVirtual || row.gross === 0 ? (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">N/A</span>
                        ) : row.isAchieved ? (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Met</span>
                        ) : (
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Short</span>
                        )}
                        <span className="text-[10px] text-slate-400">Goal: ₱{formatCurrency(row.gross)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black text-slate-900">₱{formatCurrency(row.totalTithes)}</div>
                      <button onClick={() => toggleExpand(row.memberId)}
                        className="text-[10px] text-blue-600 font-bold mt-0.5 flex items-center gap-0.5 ml-auto">
                        {isExpanded ? <>Less <FaChevronDown className="text-[8px]" /></> : <>Details <FaChevronRight className="text-[8px]" /></>}
                      </button>
                    </div>
                  </div>

                  {/* Week Grid - Always visible on mobile */}
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {row.weeklyData.map((week, widx) => {
                        const hasValue = week.amount > 0;
                        return (
                          <button key={widx} onClick={() => openWeekEditModal(currentMemberObj, week)}
                            className={`py-2 px-1 rounded-lg font-mono font-bold text-[10px] transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[48px] ${
                              hasValue
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-500 border border-slate-100"
                            }`}>
                            <span className="text-[8px] font-bold text-slate-400 mb-0.5">W{widx + 1}</span>
                            <span>{hasValue ? formatCurrency(week.amount) : "—"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Goal Setting</span>
                        {row.isVirtual ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : (
                          <input type="number" step="0.01" min="0" defaultValue={row.gross || ""} placeholder="0"
                            onBlur={(e) => handleGrossUpdate(row.memberId, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                            className="w-20 bg-transparent text-right font-mono font-semibold text-slate-700 text-xs focus:outline-none border-b border-transparent focus:border-blue-400" />
                        )}
                      </div>
                      {row.isBoundPair && (
                        <div className="text-[10px] text-purple-600 font-bold bg-purple-50 border border-purple-200 rounded-lg p-2">
                          Bound with: {row.partnerName} — Both share the same tithe amount
                        </div>
                      )}
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
              <div key={row.memberId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{row.name}</span>
                      {row.isBoundPair && (
                        <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {row.partnerName}</span>
                      )}
                    </div>
                    <div className="mt-1">
                      {row.isVirtual ? (
                        <span className="text-slate-300 text-[10px]">—</span>
                      ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${row.scoreRaw >= 6 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {row.scoreText} months met
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-blue-600">₱{formatCurrency(row.grandTotal)}</div>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-6 gap-1">
                    {row.months.map((m, idx) => (
                      <div key={idx} className={`text-center py-1.5 px-0.5 rounded-md ${m.amount > 0 ? (m.isMet ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700') : 'bg-slate-50 text-slate-300'}`}>
                        <div className="text-[8px] font-bold uppercase">{MONTH_NAMES[idx]}</div>
                        <div className="text-[10px] font-mono font-bold">{m.amount > 0 ? formatCurrency(m.amount) : "—"}</div>
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
              <span className="text-xs sm:text-sm text-slate-400">Syncing database registry matrix...</span>
            </div>
          ) : activeTab === "monthly" ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[180px]">Name</th>
                    {weeks.map((week, idx) => (
                      <th key={idx} className="py-3 px-2 text-center min-w-[75px]">W{idx + 1}</th>
                    ))}
                    <th className="py-3 px-3 text-right min-w-[90px]">Total</th>
                    <th className="py-3 px-3 text-right min-w-[80px]">Goal</th>
                    <th className="py-3 px-3 text-center min-w-[70px]">Status</th>
                    <th className="py-3 px-3 text-center min-w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={weeks.length + 6} className="py-12 text-center text-slate-400 text-sm">No recorded profiles matched.</td></tr>
                  ) : filteredRows.map((row) => {
                    const isExpanded = !!expandedMembers[row.memberId];
                    const currentMemberObj = row.isVirtual
                      ? { id: "anonymous", first_name: "Anonymous", last_name: "" }
                      : members.find(m => m.id === row.memberId);

                    return (
                      <React.Fragment key={row.memberId}>
                        <tr className={`${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'} transition-colors`}>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold ${row.isVirtual ? 'text-blue-600' : 'text-slate-900'}`}>{row.name}</span>
                              {row.isBoundPair && (
                                <span className="text-[9px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {row.partnerName}</span>
                              )}
                              {!row.isBoundPair && currentMemberObj && currentMemberObj.bindedto && (
                                <span className="text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-bold">LINKED</span>
                              )}
                            </div>
                          </td>
                          {row.weeklyData.map((week, widx) => {
                            const hasValue = week.amount > 0;
                            return (
                              <td key={widx} className="py-2.5 px-2 text-center">
                                <button onClick={() => openWeekEditModal(currentMemberObj, week)}
                                  className={`w-full py-1 px-1 rounded font-mono font-bold text-xs transition-colors cursor-pointer ${
                                    hasValue 
                                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200" 
                                      : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"
                                  }`}
                                  title={hasValue ? `Click to edit ₱${formatCurrency(week.amount)}` : "Click to add amount"}>
                                  {hasValue ? formatCurrency(week.amount) : "—"}
                                </button>
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(row.totalTithes)}</td>
                          <td className="py-2.5 px-3 text-right">
                            {row.isVirtual ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <input type="number" step="0.01" min="0" defaultValue={row.gross || ""} placeholder="0"
                                onBlur={(e) => handleGrossUpdate(row.memberId, e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                                className="w-20 bg-transparent text-right font-mono font-semibold text-slate-700 text-sm focus:outline-none border-b border-transparent focus:border-blue-400" />
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {row.isVirtual || row.gross === 0 ? (
                              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">N/A</span>
                            ) : row.isAchieved ? (
                              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Met</span>
                            ) : (
                              <span className="text-xs text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Short</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button onClick={() => toggleExpand(row.memberId)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer active:scale-90 transition-colors ${isExpanded ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                              {isExpanded ? <FaMinus className="text-[10px]" /> : <FaEdit className="text-[10px]" />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={weeks.length + 6} className="py-3 px-6">
                              <div className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Week Breakdown</div>
                              <div className="grid grid-cols-5 gap-2">
                                {row.weeklyData.map((week, idx) => (
                                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Week {idx + 1} ({week.label})</div>
                                    <div className="text-sm font-mono font-bold text-slate-800">
                                      {week.amount > 0 ? `₱${formatCurrency(week.amount)}` : <span className="text-slate-300">—</span>}
                                    </div>
                                    {week.record && (
                                      <div className="text-[9px] text-slate-400 mt-0.5">{week.record.date}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {row.isBoundPair && (
                                <div className="mt-2 text-[10px] text-purple-600 font-bold bg-purple-50 border border-purple-200 rounded-lg p-2">
                                  Bound with: {row.partnerName} — Both share the same tithe amount
                                </div>
                              )}
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Member Name</th>
                    {MONTH_NAMES.map((m) => (
                      <th key={m} className="py-3 px-1 text-right">{m}</th>
                    ))}
                    <th className="py-3 px-3 text-right">Annual Total</th>
                    <th className="py-3 px-3 text-center">Achieved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                  {filteredAnnualRows.map((row) => (
                    <tr key={row.memberId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {row.name}
                        {row.isBoundPair && (
                          <span className="text-[9px] font-normal text-purple-500 ml-1">+ {row.partnerName}</span>
                        )}
                      </td>
                      {row.months.map((m, idx) => (
                        <td key={idx} className={`py-3 px-1 text-right font-mono ${
                          m.amount > 0 ? (m.isMet ? 'text-slate-800 font-bold' : 'text-rose-600 font-bold') : 'text-slate-300'
                        }`}>
                          {m.amount > 0 ? formatCurrency(m.amount) : "—"}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono font-black text-blue-600 bg-blue-50/20">{formatCurrency(row.grandTotal)}</td>
                      <td className="py-3 px-3 text-center">
                        {row.isVirtual ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${row.scoreRaw >= 6 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {row.scoreText}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100/50 font-black border-t border-slate-200">
                    <td className="py-3 px-4 text-slate-900 text-xs uppercase">Total Cumulative</td>
                    {monthlyColumnGrandTotals.map((mTotal, idx) => (
                      <td key={idx} className="py-3 px-1 text-right font-mono text-slate-900">
                        {mTotal > 0 ? formatCurrency(mTotal) : "—"}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-right font-mono text-blue-600 bg-blue-100/30">{formatCurrency(annualGrandTotal)}</td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ROSTER MODAL */}
      {showTitherRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-sm sm:text-lg">Manage Tither Roster</h3>
                <p className="text-[10px] sm:text-xs text-slate-400">Toggle tracking status and setup bound relationship pipelines.</p>
              </div>
              <button onClick={() => setShowTitherRosterModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg">
                <FaTimes className="text-sm" />
              </button>
            </div>
            <div className="p-2 sm:p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <FaSearch className="text-slate-400 text-xs ml-1" />
              <input type="text" placeholder="Filter configuration list..." value={rosterSearchQuery} onChange={(e) => setRosterSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-700 focus:outline-none" />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredRosterConfig.map((m) => (
                <div key={m.id} className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 rounded-xl transition-all">
                  <div className="min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-slate-800">{m.first_name} {m.last_name}</span>
                    <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
                      <span>Binded To:</span>
                      <select value={m.bindedto || ""} onChange={(e) => handleUpdateBinding(m.id, e.target.value)}
                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-600 focus:outline-none text-[10px] sm:text-xs">
                        <option value="">None</option>
                        {members.filter(opt => opt.id !== m.id).map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.first_name} {opt.last_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => handleToggleTitherStatus(m.id, m.is_tither)} className="self-start sm:self-auto cursor-pointer border-none bg-transparent">
                    {m.is_tither ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] sm:text-xs bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                        <FaToggleOn className="text-sm" /> Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] sm:text-xs bg-slate-100 px-2 py-1.5 rounded-lg">
                        <FaToggleOff className="text-sm" /> Disabled
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WEEK CELL EDIT MODAL */}
      {showEditModal && selectedMember && selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSaveTithe} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider">
                  {editingTitheId ? "Update" : "Set"} Week {weeks.indexOf(selectedWeek) + 1} Tithe
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedMember.first_name} {selectedMember.last_name}</p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-1"><FaTimes /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              {selectedMember.bindedto && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Linked Partner</div>
                  {(() => {
                    const partner = members.find(m => String(m.id) === String(selectedMember.bindedto));
                    return partner ? (
                      <div className="text-xs sm:text-sm font-bold text-slate-800">
                        {partner.first_name} {partner.last_name} 
                        <span className="text-xs font-normal text-slate-500 ml-1">will also receive ₱{editAmount || "0.00"}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (PHP)</label>
                  <input type="number" step="0.01" min="0" required value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input type="date" required value={editDate} onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Note</label>
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional memo..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {editingTitheId && (
                <button type="button" onClick={async () => {
                  try {
                    await supabase.from("church_finance").delete().eq("id", editingTitheId);
                    const partner = selectedMember.bindedto ? members.find(m => String(m.id) === String(selectedMember.bindedto)) : null;
                    if (partner) {
                      const partnerRecord = findWeekTithe(partner.id, selectedWeek);
                      if (partnerRecord) await supabase.from("church_finance").delete().eq("id", partnerRecord.id);
                    }
                    setShowEditModal(false);
                    await fetchTithesData();
                  } catch (err) { alert(`Error deleting: ${err.message}`); }
                }} className="px-3 sm:px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Delete</button>
              )}
              <button type="button" onClick={() => setShowEditModal(false)} className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer">
                {editingTitheId ? "Update" : "Set"} Amount
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}