import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaHome, FaSearch, FaSpinner, FaPlus, FaMinus,
  FaUserCog, FaToggleOn, FaToggleOff, FaTimes,
  FaFileExcel, FaCalendarAlt, FaTable, FaEdit,
  FaChevronRight, FaChevronDown, FaCalendarDay
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

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

export default function FinancePledge() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [pledges, setPledges] = useState([]);
  const [allYearPledges, setAllYearPledges] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [expandedMembers, setExpandedMembers] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastEditDate, setLastEditDate] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPledgerRosterModal, setShowPledgerRosterModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingPledgeId, setEditingPledgeId] = useState(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");

  // Week modal: overwrite vs add-new
  const [saveMode, setSaveMode] = useState("overwrite");
  const [originalEditDate, setOriginalEditDate] = useState(null);

  // Today tab: inline editing states
  const [todayAmounts, setTodayAmounts] = useState({});
  const [todaySavingId, setTodaySavingId] = useState(null);

  const todayStr = getTodayString();
  const currentYear = selectedMonth.split('-')[0];

  useEffect(() => {
    fetchPledgeData();
  }, [selectedMonth]);

  async function fetchPledgeData(silent = false) {
    try {
      if (!silent) setLoading(true);

      const { data: ledger, error: ledgerErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Pledge")
        .gte("date", `${selectedMonth}-01`)
        .lte("date", `${selectedMonth}-${getDaysInMonth(selectedMonth)}`);
      if (ledgerErr) throw ledgerErr;

      const { data: yearLedger, error: yearLedgerErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Pledge")
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);
      if (yearLedgerErr) throw yearLedgerErr;

      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name, is_pledger, bindedto")
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;

      setMembers(roster || []);
      setPledges(ledger || []);
      setAllYearPledges(yearLedger || []);
    } catch (err) {
      console.error("Error fetching database records:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  };

  const getMemberName = (id) => {
    if (!id) return "Anonymous";
    const match = members.find((m) => String(m.id) === String(id));
    return match ? `${match.first_name} ${match.last_name}` : `Member #${id}`;
  };

  const getMemberById = (id) => {
    if (!id) return null;
    return members.find((m) => String(m.id) === String(id)) || null;
  };

  const isPrimaryMember = (member) => {
    if (!member || !member.bindedto) return true;
    return parseInt(member.id) < parseInt(member.bindedto);
  };

  const getPartner = (member) => {
    if (!member || !member.bindedto) return null;
    return members.find(m => String(m.id) === String(member.bindedto)) || null;
  };

  const toggleExpand = (memberId) => {
    setExpandedMembers(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const handleTogglePledgerStatus = async (memberId, currentStatus) => {
    const updatedStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from("usher_members")
        .update({ is_pledger: updatedStatus })
        .eq("id", memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_pledger: updatedStatus } : m));
    } catch (err) {
      console.error("Error changing status:", err.message);
      alert(`Could not save: ${err.message}`);
    }
  };

  const handleUpdateBinding = async (memberId, targetBindedId) => {
    try {
      const member = members.find(m => m.id === memberId);

      if (member.bindedto) {
        await supabase
          .from("usher_members")
          .update({ bindedto: null })
          .eq("id", member.bindedto);
      }

      await supabase
        .from("usher_members")
        .update({ bindedto: targetBindedId || null })
        .eq("id", memberId);

      if (targetBindedId) {
        await supabase
          .from("usher_members")
          .update({ bindedto: memberId })
          .eq("id", targetBindedId);
      }

      await fetchPledgeData(true);
    } catch (err) {
      console.error("Error updating binding link:", err.message);
      alert(`Could not save connection: ${err.message}`);
    }
  };

  const findWeekPledges = (memberId, week) => {
    return pledges.filter(p => {
      if (memberId === null || memberId === undefined || memberId === "anonymous") {
        return !p.member_id && parseInt(p.date.split('-')[2]) >= week.start && parseInt(p.date.split('-')[2]) <= week.end;
      }
      if (String(p.member_id) !== String(memberId)) return false;
      const day = parseInt(p.date.split('-')[2]);
      return day >= week.start && day <= week.end;
    });
  };

  const findWeekPledgeFromDB = async (memberId, week) => {
    const startDate = `${selectedMonth}-${String(week.start).padStart(2, '0')}`;
    const endDate = `${selectedMonth}-${String(week.end).padStart(2, '0')}`;

    let query = supabase
      .from("church_finance")
      .select("*")
      .eq("category", "Pledge")
      .gte("date", startDate)
      .lte("date", endDate);

    if (memberId === null || memberId === undefined || memberId === "anonymous") {
      query = query.is("member_id", null);
    } else {
      query = query.eq("member_id", memberId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Error finding week pledge:", error);
      return null;
    }
    return data;
  };

  const deleteWeekPledges = async (memberId, week) => {
    const startDate = `${selectedMonth}-${String(week.start).padStart(2, '0')}`;
    const endDate = `${selectedMonth}-${String(week.end).padStart(2, '0')}`;
    let query = supabase.from("church_finance").delete()
      .eq("category", "Pledge")
      .gte("date", startDate).lte("date", endDate);
    if (memberId === null || memberId === undefined || memberId === "anonymous") {
      query = query.is("member_id", null);
    } else {
      query = query.eq("member_id", memberId);
    }
    const { error } = await query;
    if (error) throw error;
  };

  const openWeekEditModal = (member, week) => {
    setSelectedMember(member);
    setSelectedWeek(week);
    setSaveMode("overwrite");

    const existing = findWeekPledges(member.id, week);
    const firstRecord = existing[0];

    if (firstRecord) {
      setEditingPledgeId(firstRecord.id);
      setEditAmount(firstRecord.amount);
      setEditDate(firstRecord.date);
      setOriginalEditDate(firstRecord.date);
      setEditDescription(firstRecord.description || "");
    } else {
      setEditingPledgeId(null);
      setEditAmount("");
      const weekStart = `${selectedMonth}-${String(week.start).padStart(2, '0')}`;
      const weekEnd = `${selectedMonth}-${String(week.end).padStart(2, '0')}`;
      let defaultDate = weekStart;
      if (lastEditDate && lastEditDate >= weekStart && lastEditDate <= weekEnd) {
        defaultDate = lastEditDate;
      }
      setEditDate(defaultDate);
      setOriginalEditDate(null);
      setEditDescription("");
    }
    setShowEditModal(true);
  };

  /* ─── Today Tab: Inline Save ─── */
  const getTodayPledge = (memberId) => {
    const matches = pledges.filter(t => String(t.member_id) === String(memberId) && t.date === todayStr);
    return matches.sort((a, b) => b.id - a.id)[0] || null;
  };

  const handleTodayAmountChange = (memberId, value) => {
    setTodayAmounts(prev => ({ ...prev, [memberId]: value }));
  };

  const handleTodaySave = async (member) => {
    const amount = parseFloat(todayAmounts[member.id]) || 0;
    if (amount <= 0) return;

    setTodaySavingId(member.id);
    try {
      const partner = getPartner(member);
      const payload = {
        date: todayStr,
        transaction_type: "Income",
        category: "Pledge",
        amount,
        description: "None"
      };

      const existingPrimary = getTodayPledge(member.id);
      const existingPartner = partner ? getTodayPledge(partner.id) : null;

      if (existingPrimary) {
        await supabase.from("church_finance").update(payload).eq("id", existingPrimary.id);
        await supabase.from("church_finance").delete()
          .eq("category", "Pledge")
          .eq("member_id", member.id)
          .eq("date", todayStr)
          .neq("id", existingPrimary.id);
      } else {
        await supabase.from("church_finance").insert([{ ...payload, member_id: member.id }]);
      }

      if (partner) {
        if (existingPartner) {
          await supabase.from("church_finance").update(payload).eq("id", existingPartner.id);
          await supabase.from("church_finance").delete()
            .eq("category", "Pledge")
            .eq("member_id", partner.id)
            .eq("date", todayStr)
            .neq("id", existingPartner.id);
        } else {
          await supabase.from("church_finance").insert([{ ...payload, member_id: partner.id }]);
        }
      }

      await fetchPledgeData(true);
      setTodayAmounts(prev => {
        const next = { ...prev };
        delete next[member.id];
        return next;
      });
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setTodaySavingId(null);
    }
  };

  const handleTodayKeyDown = (e, member) => {
    if (e.key === "Enter") handleTodaySave(member);
  };

  const handleSavePledge = async (e) => {
    e.preventDefault();
    if (isSaving || !editAmount || !editDate || !selectedMember || !selectedWeek) return;

    setIsSaving(true);
    const amount = parseFloat(editAmount) || 0;
    const member = selectedMember;
    const partner = member.bindedto ? members.find(m => String(m.id) === String(member.bindedto)) : null;

    try {
      const payload = {
        date: editDate,
        transaction_type: "Income",
        category: "Pledge",
        amount: amount,
        description: editDescription || "",
      };

      if (saveMode === "add") {
        const insertPayload = member.id === "anonymous" || member.id === null || member.id === undefined
          ? payload
          : { ...payload, member_id: member.id };
        await supabase.from("church_finance").insert([insertPayload]);
        if (partner) {
          await supabase.from("church_finance").insert([{ ...payload, member_id: partner.id }]);
        }
      } else {
        if (editingPledgeId) {
          await supabase.from("church_finance").update(payload).eq("id", editingPledgeId);
          if (partner) {
            const partnerRecords = findWeekPledges(partner.id, selectedWeek)
              .filter(t => t.date === originalEditDate);
            for (const rec of partnerRecords) {
              await supabase.from("church_finance").update(payload).eq("id", rec.id);
            }
          }
        } else {
          const insertPayload = member.id === "anonymous" || member.id === null || member.id === undefined
            ? payload
            : { ...payload, member_id: member.id };
          await supabase.from("church_finance").insert([insertPayload]);
          if (partner) {
            await supabase.from("church_finance").insert([{ ...payload, member_id: partner.id }]);
          }
        }
      }

      await fetchPledgeData(true);
      setLastEditDate(editDate);
      setShowEditModal(false);
      setEditAmount("");
      setEditDescription("");
      setEditingPledgeId(null);
      setSelectedMember(null);
      setSelectedWeek(null);
      setSaveMode("overwrite");
      setOriginalEditDate(null);
    } catch (err) {
      console.error("Error saving pledge:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const weeks = getWeeksInMonth(selectedMonth);

  const getMonthlyRows = () => {
    let rows = [];
    const processedMemberIds = new Set();

    activePledgerMembers.forEach(m => {
      const mid = String(m.id);
      if (processedMemberIds.has(mid)) return;

      const partner = getPartner(m);

      if (partner) {
        processedMemberIds.add(mid);
        processedMemberIds.add(String(partner.id));

        const primary = parseInt(mid) < parseInt(partner.id) ? m : partner;
        const secondary = parseInt(mid) < parseInt(partner.id) ? partner : m;

        const primaryPledges = pledges.filter(p => String(p.member_id) === String(primary.id));

        const weeklyData = weeks.map(week => {
          let weekAmount = 0;
          let weekRecords = [];
          primaryPledges.forEach(p => {
            const day = parseInt(p.date.split('-')[2]);
            if (day >= week.start && day <= week.end) {
              weekAmount += parseFloat(p.amount || 0);
              weekRecords.push(p);
            }
          });
          return {
            ...week,
            records: weekRecords,
            record: weekRecords[0] || null,
            amount: weekAmount
          };
        });

        const total = weeklyData.reduce((sum, w) => sum + w.amount, 0);

        rows.push({
          memberId: primary.id,
          name: `${primary.first_name} ${primary.last_name}`,
          totalPledges: total,
          weeklyData,
          isVirtual: false,
          memberObj: primary,
          isBoundPair: true,
          partnerName: `${secondary.first_name} ${secondary.last_name}`
        });
      } else {
        processedMemberIds.add(mid);

        const memberPledges = pledges.filter(p => String(p.member_id) === mid);
        const weeklyData = weeks.map(week => {
          const weekRecords = memberPledges.filter(p => {
            const day = parseInt(p.date.split('-')[2]);
            return day >= week.start && day <= week.end;
          });
          const weekAmount = weekRecords.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
          return { ...week, records: weekRecords, record: weekRecords[0] || null, amount: weekAmount };
        });
        const total = weeklyData.reduce((sum, w) => sum + w.amount, 0);

        rows.push({
          memberId: mid,
          name: `${m.first_name} ${m.last_name}`,
          totalPledges: total,
          weeklyData,
          isVirtual: false,
          memberObj: m,
          isBoundPair: false
        });
      }
    });

    const anonymousPledges = pledges.filter(p => !p.member_id);
    if (anonymousPledges.length > 0) {
      const weeklyData = weeks.map(week => {
        const weekRecords = anonymousPledges.filter(p => {
          const day = parseInt(p.date.split('-')[2]);
          return day >= week.start && day <= week.end;
        });
        const weekAmount = weekRecords.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        return { ...week, records: weekRecords, record: weekRecords[0] || null, amount: weekAmount };
      });
      const total = weeklyData.reduce((sum, w) => sum + w.amount, 0);
      rows.push({
        memberId: "anonymous",
        name: "Anonymous",
        totalPledges: total,
        weeklyData,
        isVirtual: true,
        memberObj: { id: "anonymous", first_name: "Anonymous", last_name: "", bindedto: null },
        isBoundPair: false
      });
    }

    return rows;
  };

  const getAnnualRows = () => {
    let rows = [];
    const processedMemberIds = new Set();

    activePledgerMembers.forEach(m => {
      const mid = String(m.id);
      if (processedMemberIds.has(mid)) return;

      const partner = getPartner(m);

      if (partner) {
        processedMemberIds.add(mid);
        processedMemberIds.add(String(partner.id));

        const primary = parseInt(mid) < parseInt(partner.id) ? m : partner;
        const secondary = parseInt(mid) < parseInt(partner.id) ? partner : m;

        const primaryPledges = allYearPledges.filter(p => String(p.member_id) === String(primary.id));

        let runningTotal = 0;
        const monthlyTotals = MONTH_NAMES.map((_, index) => {
          const monthNum = String(index + 1).padStart(2, '0');
          const monthPrefix = `${currentYear}-${monthNum}`;

          let monthSum = 0;
          primaryPledges.forEach(p => {
            if (p.date.startsWith(monthPrefix)) {
              monthSum += parseFloat(p.amount || 0);
            }
          });

          runningTotal += monthSum;
          return { amount: monthSum };
        });

        rows.push({
          memberId: primary.id,
          name: `${primary.first_name} ${primary.last_name}`,
          months: monthlyTotals,
          grandTotal: runningTotal,
          isVirtual: false,
          isBoundPair: true,
          partnerName: `${secondary.first_name} ${secondary.last_name}`
        });
      } else {
        processedMemberIds.add(mid);

        const memberPledges = allYearPledges.filter(p => String(p.member_id) === mid);
        let runningTotal = 0;
        const monthlyTotals = MONTH_NAMES.map((_, index) => {
          const monthNum = String(index + 1).padStart(2, '0');
          const sum = memberPledges
            .filter(p => p.date.startsWith(`${currentYear}-${monthNum}`))
            .reduce((s, item) => s + parseFloat(item.amount || 0), 0);
          runningTotal += sum;
          return { amount: sum };
        });

        rows.push({
          memberId: mid,
          name: `${m.first_name} ${m.last_name}`,
          months: monthlyTotals,
          grandTotal: runningTotal,
          isVirtual: false,
          isBoundPair: false
        });
      }
    });

    const anonymousPledges = allYearPledges.filter(p => !p.member_id);
    if (anonymousPledges.length > 0) {
      let runningTotal = 0;
      const monthlyTotals = MONTH_NAMES.map((_, index) => {
        const monthNum = String(index + 1).padStart(2, '0');
        const sum = anonymousPledges
          .filter(p => p.date.startsWith(`${currentYear}-${monthNum}`))
          .reduce((s, item) => s + parseFloat(item.amount || 0), 0);
        runningTotal += sum;
        return { amount: sum };
      });
      rows.push({
        memberId: "anonymous",
        name: "Anonymous",
        months: monthlyTotals,
        grandTotal: runningTotal,
        isVirtual: true,
        isBoundPair: false
      });
    }

    return rows;
  };

  const activePledgerMembers = members.filter(member => member.is_pledger === true);
  const monthlyRows = getMonthlyRows();
  const annualRows = getAnnualRows();

  const filteredRows = monthlyRows.filter(row => row.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAnnualRows = annualRows.filter(row => row.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const overallTotal = filteredRows.reduce((sum, r) => sum + r.totalPledges, 0);
  const annualGrandTotal = filteredAnnualRows.reduce((sum, r) => sum + r.grandTotal, 0);
  const monthlyColumnGrandTotals = MONTH_NAMES.map((_, idx) => filteredAnnualRows.reduce((sum, r) => sum + r.months[idx].amount, 0));

  const filteredRosterConfig = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(rosterSearchQuery.toLowerCase())
  );

  // Today tab data — deduplicated total
  const todayVisibleMembers = activePledgerMembers.filter(m => {
    const partner = getPartner(m);
    if (!partner) return true;
    return parseInt(m.id) < parseInt(partner.id);
  });

  const todayTotal = (() => {
    let total = 0;
    activePledgerMembers.forEach(m => {
      const partner = getPartner(m);
      if (!partner || parseInt(m.id) < parseInt(partner.id)) {
        const t = getTodayPledge(m.id);
        if (t) total += parseFloat(t.amount);
      }
    });
    return total;
  })();

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const wsMonthly = workbook.addWorksheet("Monthly Pledge View");
    const totalWeeks = weeks.length;

    wsMonthly.columns = [
      { key: "name", width: 26 },
      ...weeks.map((_, idx) => ({ key: `week_${idx}`, width: 13 })),
      { key: "totalPledges", width: 16 }
    ];

    wsMonthly.mergeCells("A1:E1");
    wsMonthly.mergeCells("A2:E2");

    const titleCell = wsMonthly.getCell("A1");
    titleCell.value = "Modern Acts Church - Olongapo";
    titleCell.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };

    const subtitleCell = wsMonthly.getCell("A2");
    subtitleCell.value = `Pledge Report — Monthly Detail Window (${selectedMonth})`;
    subtitleCell.font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsMonthly.getRow(4).values = ["TOTAL"];
    wsMonthly.getRow(5).values = [overallTotal];

    const cardStyles = {
      A: { color: "FF2563EB", bg: "FFEBF5FF", bold: true, numFormat: "₱#,##0.00" }
    };

    ["A"].forEach(col => {
      wsMonthly.getCell(`${col}4`).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF94A3B8" } };
      wsMonthly.getCell(`${col}4`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: cardStyles[col].bg } };
      wsMonthly.getCell(`${col}4`).alignment = { horizontal: "center" };

      const val = wsMonthly.getCell(`${col}5`);
      val.font = { name: "Segoe UI", size: 14, bold: cardStyles[col].bold, color: { argb: cardStyles[col].color } };
      val.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cardStyles[col].bg } };
      val.alignment = { horizontal: "center" };
      if (cardStyles[col].numFormat) val.numFmt = cardStyles[col].numFormat;
    });

    wsMonthly.getRow(7).values = ["Name", ...weeks.map((_, idx) => `Week ${idx + 1}`), "Total Pledges"];
    wsMonthly.getRow(7).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    filteredRows.forEach((row, rIdx) => {
      const rowValues = [row.name, ...row.weeklyData.map(w => w.amount), row.totalPledges];
      const newRow = wsMonthly.addRow(rowValues);

      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (colIdx === 1) cell.alignment = { horizontal: "left" };
        else if (colIdx > 1 && colIdx <= (totalWeeks + 1)) {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = "₱#,##0.00";
        } else {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = "₱#,##0.00";
          cell.font = { name: "Segoe UI", size: 10, bold: true };
        }
      });
    });

    const wsAnnual = workbook.addWorksheet("Annual 12-Month Matrix");
    wsAnnual.columns = [
      { key: "name", width: 26 },
      ...MONTH_NAMES.map(m => ({ key: m.toLowerCase(), width: 13 })),
      { key: "annualSum", width: 16 }
    ];

    wsAnnual.mergeCells("A1:O1");
    wsAnnual.mergeCells("A2:O2");
    wsAnnual.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsAnnual.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsAnnual.getCell("A2").value = `Annual Ledger — 12-Month Pledges Summary Table (Calendar Year ${currentYear})`;
    wsAnnual.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsAnnual.getRow(4).values = ["ANNUAL CONSOLIDATED TOTAL"];
    wsAnnual.getCell("A4").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF94A3B8" } };
    wsAnnual.getRow(5).values = [annualGrandTotal];
    wsAnnual.getCell("A5").font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF2563EB" } };
    wsAnnual.getCell("A5").numFmt = "₱#,##0.00";

    wsAnnual.getRow(7).values = ["Member Name", ...MONTH_NAMES, "Annual Total"];
    wsAnnual.getRow(7).eachCell(cell => {
      cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    filteredAnnualRows.forEach((row, rIdx) => {
      const rowValues = [row.name, ...row.months.map(m => m.amount), row.grandTotal];
      const newRow = wsAnnual.addRow(rowValues);
      const rowBgColor = rIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";

      newRow.eachCell((cell, colIdx) => {
        cell.font = { name: "Segoe UI", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (colIdx === 1) {
          cell.alignment = { horizontal: "left" };
          if (row.isVirtual) cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF2563EB" } };
        } else {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = "₱#,##0.00";
          if (colIdx === 14) cell.font = { name: "Segoe UI", size: 10, bold: true };
        }
      });
    });

    const summaryRow = wsAnnual.addRow(["Total Cumulative", ...monthlyColumnGrandTotals, annualGrandTotal]);
    summaryRow.eachCell((cell, colIdx) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      if (colIdx > 1 && colIdx < 15) {
        cell.numFmt = "₱#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Pledges_Master_Report_${currentYear}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased">
      <div className="fixed top-3 left-3 z-50 sm:top-4 sm:left-4">
        <Link to="/ministries/finance" className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm">
          <FaHome /><span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pt-16 sm:pt-20">
        {/* Title + Month Picker */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight">
              Pledge <span className="text-blue-600">Tracker</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">Target Window:</span>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            STICKY CONTROLS — Tabs, Stats, and Search stay visible
            ═══════════════════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-30 bg-[#f5f7fb] -mx-3 px-3 sm:-mx-6 sm:px-6 py-2 space-y-4 mb-2">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 gap-1 sm:gap-2">
            <button onClick={() => setActiveTab("today")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "today" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              <FaCalendarDay /> <span>Today</span>
            </button>
            <button onClick={() => setActiveTab("monthly")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "monthly" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              <FaTable /> <span className="hidden xs:inline">Monthly Detail</span><span className="xs:hidden">Monthly</span>
            </button>
            <button onClick={() => setActiveTab("annual")}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "annual" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              <FaCalendarAlt /> <span className="hidden xs:inline">Annual Summary</span><span className="xs:hidden">Annual</span>
            </button>
          </div>

          {/* Stats */}
          {activeTab === "today" && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              {[
                { label: "Date", value: todayStr, color: "text-slate-600" },
                { label: "Today's Total", value: `₱${formatCurrency(todayTotal)}`, color: "text-blue-600" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-2.5 sm:px-4 sm:py-2.5 shadow-sm min-w-[80px] sm:min-w-[90px]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</div>
                  <div className={`text-sm sm:text-base md:text-lg font-black truncate ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}
          {activeTab === "monthly" && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {[
                { label: "Total", value: `₱${formatCurrency(overallTotal)}`, color: "text-blue-600" },
                { label: "Pledgers", value: activePledgerMembers.length, color: "text-slate-600" },
                { label: "Records", value: pledges.length, color: "text-emerald-600" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-2.5 sm:px-4 sm:py-2.5 shadow-sm min-w-[80px] sm:min-w-[90px]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</div>
                  <div className={`text-sm sm:text-base md:text-lg font-black truncate ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}
          {activeTab === "annual" && (
            <div className="flex gap-3">
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm w-full sm:w-auto sm:min-w-[240px]">
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Annual Cumulative Grand Total ({currentYear})</div>
                <div className="text-lg sm:text-xl md:text-2xl font-black text-blue-600">₱{formatCurrency(annualGrandTotal)}</div>
              </div>
            </div>
          )}

          {/* Search + Buttons */}
          <div className="flex flex-col md:flex-row gap-2 sm:gap-3 pb-2">
            <div className="bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-sm flex items-center gap-2 flex-1">
              <FaSearch className="text-slate-400 text-xs sm:text-sm ml-1" />
              <input type="text" placeholder="Search pledgers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 focus:outline-none" />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleExportExcel}
                className="flex-1 sm:flex-initial bg-white border border-slate-200 hover:border-emerald-300 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-600 transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer">
                <FaFileExcel className="text-sm sm:text-base text-emerald-600" /><span>Excel</span>
              </button>

              <button onClick={() => { setRosterSearchQuery(""); setShowPledgerRosterModal(true); }}
                className="flex-1 sm:flex-initial bg-white border border-slate-200 hover:border-blue-300 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer">
                <FaUserCog className="text-sm sm:text-base" /><span>Manage Roster</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TODAY TAB
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "today" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                <span className="text-sm text-slate-400">Loading...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4 min-w-[180px]">Name</th>
                      <th className="py-3 px-4 text-right min-w-[140px]">Amount (PHP)</th>
                      <th className="py-3 px-4 text-center min-w-[100px]">Saved</th>
                      <th className="py-3 px-4 text-center min-w-[80px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {todayVisibleMembers.filter(m => {
                      const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
                      return fullName.includes(searchQuery.toLowerCase());
                    }).map(m => {
                      const existing = getTodayPledge(m.id);
                      const partner = getPartner(m);
                      const isSavingThis = todaySavingId === m.id;
                      const displayAmount = todayAmounts[m.id] !== undefined ? todayAmounts[m.id] : (existing ? existing.amount : "");

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{m.first_name} {m.last_name}</span>
                              {partner && (
                                <span className="text-[9px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {partner.first_name} {partner.last_name}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={displayAmount}
                              onChange={(e) => handleTodayAmountChange(m.id, e.target.value)}
                              onKeyDown={(e) => handleTodayKeyDown(e, m)}
                              className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500 text-right"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            {existing ? (
                              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                ₱{formatCurrency(existing.amount)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleTodaySave(m)}
                              disabled={isSavingThis || !todayAmounts[m.id]}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isSavingThis || !todayAmounts[m.id] ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                              {isSavingThis ? '...' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {todayVisibleMembers.length === 0 && (
                      <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm">No active pledgers.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            MONTHLY TAB — Mobile Cards + Desktop Table
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "monthly" && (
          <>
            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3 mb-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                  <span className="text-sm text-slate-400">Loading...</span>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No recorded profiles matched.</div>
              ) : filteredRows.map((row) => {
                const isExpanded = !!expandedMembers[row.memberId];
                const currentMemberObj = row.isVirtual
                  ? { id: "anonymous", first_name: "Anonymous", last_name: "" }
                  : members.find(m => m.id === row.memberId);

                return (
                  <div key={row.memberId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-sm ${row.isVirtual ? 'text-blue-600' : 'text-slate-900'}`}>{row.name}</span>
                          {row.isBoundPair && (
                            <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {row.partnerName}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-slate-900">₱{formatCurrency(row.totalPledges)}</div>
                        <button onClick={() => toggleExpand(row.memberId)}
                          className="text-[10px] text-blue-600 font-bold mt-0.5 flex items-center gap-0.5 ml-auto">
                          {isExpanded ? <>Less <FaChevronDown className="text-[8px]" /></> : <>Details <FaChevronRight className="text-[8px]" /></>}
                        </button>
                      </div>
                    </div>

                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-5 gap-1.5">
                        {row.weeklyData.map((week, widx) => {
                          const hasValue = week.amount > 0;
                          const recordCount = week.records?.length || 0;
                          return (
                            <button key={widx} onClick={() => openWeekEditModal(currentMemberObj, week)}
                              className={`py-2 px-1 rounded-lg font-mono font-bold text-[10px] transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[48px] ${
                                hasValue
                                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-500 border border-slate-100"
                              }`}>
                              <span className="text-[8px] font-bold text-slate-400 mb-0.5">W{widx + 1}</span>
                              <span>{hasValue ? formatCurrency(week.amount) : "—"}</span>
                              {recordCount > 1 && (
                                <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded-full mt-0.5">{recordCount}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Week Breakdown</div>
                        <div className="grid grid-cols-2 gap-2">
                          {row.weeklyData.map((week, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                              <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Week {idx + 1} ({week.label})</div>
                              <div className="text-sm font-mono font-bold text-slate-800">
                                {week.amount > 0 ? `₱${formatCurrency(week.amount)}` : <span className="text-slate-300">—</span>}
                              </div>
                              {week.records?.length > 0 && (
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
                        {row.isBoundPair && (
                          <div className="mt-2 text-[10px] text-purple-600 font-bold bg-purple-50 border border-purple-200 rounded-lg p-2">
                            Bound with: {row.partnerName} — Both share the same pledge amount
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                  <span className="text-xs sm:text-sm text-slate-400">Syncing database registry matrix...</span>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3 sm:px-4 min-w-[120px] sm:min-w-[150px]">Name</th>
                        {weeks.map((week, idx) => (
                          <th key={idx} className="py-3 px-1 sm:px-2 text-center min-w-[65px] sm:min-w-[75px]">W{idx + 1}</th>
                        ))}
                        <th className="py-3 px-2 sm:px-3 text-right min-w-[80px] sm:min-w-[90px]">Total</th>
                        <th className="py-3 px-2 sm:px-3 text-center min-w-[50px] sm:min-w-[60px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {filteredRows.length === 0 ? (
                        <tr><td colSpan={weeks.length + 4} className="py-12 text-center text-slate-400 text-sm">No records found.</td></tr>
                      ) : filteredRows.map((row) => {
                        const isExpanded = !!expandedMembers[row.memberId];
                        const hasBindedPartner = row.memberObj && row.memberObj.bindedto;

                        return (
                          <React.Fragment key={row.memberId}>
                            <tr className={`${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'} transition-colors`}>
                              <td className="py-2.5 px-3 sm:px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-bold ${row.isVirtual ? 'text-blue-600' : 'text-slate-900'}`}>{row.name}</span>
                                  {row.isBoundPair && (
                                    <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {row.partnerName}</span>
                                  )}
                                  {hasBindedPartner && !row.isBoundPair && (
                                    <span className="text-[8px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-bold">LINKED</span>
                                  )}
                                </div>
                              </td>

                              {row.weeklyData.map((week, widx) => {
                                const hasValue = week.amount > 0;
                                const recordCount = week.records?.length || 0;
                                return (
                                  <td key={widx} className="py-2.5 px-1 sm:px-2 text-center">
                                    <button
                                      onClick={() => openWeekEditModal(row.memberObj, week)}
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

                              <td className="py-2.5 px-2 sm:px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(row.totalPledges)}</td>

                              <td className="py-2.5 px-2 sm:px-3 text-center">
                                <button onClick={() => toggleExpand(row.memberId)}
                                  className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded cursor-pointer active:scale-90 transition-colors ${isExpanded ? "bg-slate-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                  {isExpanded ? <FaMinus className="text-[10px]" /> : <FaEdit className="text-[10px]" />}
                                </button>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="bg-slate-50/50">
                                <td colSpan={weeks.length + 4} className="py-3 px-4 sm:px-6">
                                  <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Week Breakdown</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {row.weeklyData.map((week, idx) => (
                                      <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Week {idx + 1} ({week.label})</div>
                                        <div className="text-sm font-mono font-bold text-slate-800">
                                          {week.amount > 0 ? `₱${formatCurrency(week.amount)}` : <span className="text-slate-300">—</span>}
                                        </div>
                                        {week.records?.length > 0 && (
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
                                  {row.isBoundPair && (
                                    <div className="mt-2 text-[10px] text-purple-600 font-bold bg-purple-50 border border-purple-200 rounded-lg p-2">
                                      Bound with: {row.partnerName} — Both share the same pledge amount
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
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ANNUAL TAB
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "annual" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                <span className="text-sm text-slate-400">Loading...</span>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Member Name</th>
                      {MONTH_NAMES.map((m) => (
                        <th key={m} className="py-3 px-1 text-right">{m}</th>
                      ))}
                      <th className="py-3 px-3 text-right">Annual Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-semibold">
                    {filteredAnnualRows.length === 0 ? (
                      <tr><td colSpan={14} className="py-12 text-center text-slate-400 text-sm">No records found.</td></tr>
                    ) : filteredAnnualRows.map((row) => (
                      <tr key={row.memberId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.name}
                          {row.isBoundPair && (
                            <span className="text-[9px] font-normal text-purple-500 ml-1">+ {row.partnerName}</span>
                          )}
                        </td>
                        {row.months.map((m, idx) => (
                          <td key={idx} className={`py-3 px-1 text-right font-mono ${m.amount > 0 ? 'text-slate-800 font-bold' : 'text-slate-300'}`}>
                            {m.amount > 0 ? formatCurrency(m.amount) : "—"}
                          </td>
                        ))}
                        <td className="py-3 px-3 text-right font-mono font-black text-blue-600 bg-blue-50/20">{formatCurrency(row.grandTotal)}</td>
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
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ROSTER MODAL */}
      {showPledgerRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base sm:text-lg">Manage Pledger Roster</h3>
                <p className="text-xs text-slate-400">Toggle tracking status and setup bound relationship pipelines.</p>
              </div>
              <button onClick={() => setShowPledgerRosterModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <FaTimes />
              </button>
            </div>
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <FaSearch className="text-slate-400 text-xs" />
              <input type="text" placeholder="Filter configuration list..." value={rosterSearchQuery} onChange={(e) => setRosterSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none" />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {members.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400 mb-2">No members loaded from database.</p>
                  <button onClick={fetchPledgeData} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors">
                    Retry Loading
                  </button>
                </div>
              ) : filteredRosterConfig.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No members match your search.</div>
              ) : filteredRosterConfig.map((m) => (
                <div key={m.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 rounded-xl transition-all">
                  <div>
                    <span className="font-bold text-sm text-slate-800">{m.first_name} {m.last_name}</span>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Binded To:</span>
                      <select value={m.bindedto || ""} onChange={(e) => handleUpdateBinding(m.id, e.target.value)}
                        className="bg-white border border-slate-200 rounded px-1 py-0.5 font-medium text-slate-600 focus:outline-none">
                        <option value="">None</option>
                        {members.filter(opt => opt.id !== m.id).map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.first_name} {opt.last_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => handleTogglePledgerStatus(m.id, m.is_pledger)} className="self-start sm:self-auto cursor-pointer border-none bg-transparent">
                    {m.is_pledger ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                        <FaToggleOn className="text-sm" /> Active
                      </div>
                    ) : (
                      <div className="flex items-center flex-col sm:flex-row gap-1.5 text-slate-400 font-medium text-xs bg-slate-100 px-2 py-1 rounded-lg">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSavePledge} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider">
                  {editingPledgeId ? "Update" : "Set"} Week PledgeS
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedMember.first_name} {selectedMember.last_name}</p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><FaTimes /></button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              {selectedMember.bindedto && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Linked Partner</div>
                  {(() => {
                    const partner = members.find(m => String(m.id) === String(selectedMember.bindedto));
                    return partner ? (
                      <div className="text-sm font-bold text-slate-800">
                        {partner.first_name} {partner.last_name}
                        <span className="text-xs font-normal text-slate-500 ml-1">will also receive ₱{editAmount || "0.00"}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {editingPledgeId && (
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

              {findWeekPledges(selectedMember.id, selectedWeek).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Existing Records This Week</div>
                  <div className="space-y-1">
                    {findWeekPledges(selectedMember.id, selectedWeek).map((rec, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-600">{rec.date}</span>
                        <span className="font-mono font-bold text-slate-800">₱{formatCurrency(rec.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-amber-200 pt-1 mt-1 flex justify-between text-xs font-bold">
                      <span className="text-amber-700">Current Total</span>
                      <span className="font-mono text-amber-700">
                        ₱{formatCurrency(findWeekPledges(selectedMember.id, selectedWeek).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0))}
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
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional memo..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {editingPledgeId && saveMode === "overwrite" && (
                <>
                  <button type="button" onClick={async () => {
                    try {
                      await supabase.from("church_finance").delete().eq("id", editingPledgeId);
                      const partner = selectedMember.bindedto ? members.find(m => String(m.id) === String(selectedMember.bindedto)) : null;
                      if (partner) {
                        const partnerRecords = findWeekPledges(partner.id, selectedWeek).filter(t => t.date === originalEditDate);
                        for (const rec of partnerRecords) {
                          await supabase.from("church_finance").delete().eq("id", rec.id);
                        }
                      }
                      setShowEditModal(false);
                      await fetchPledgeData(true);
                    } catch (err) { alert(`Error deleting: ${err.message}`); }
                  }} className="px-3 sm:px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Delete</button>

                  <button type="button" onClick={async () => {
                    try {
                      await deleteWeekPledges(selectedMember.id, selectedWeek);
                      const partner = selectedMember.bindedto ? members.find(m => String(m.id) === String(selectedMember.bindedto)) : null;
                      if (partner) {
                        await deleteWeekPledges(partner.id, selectedWeek);
                      }
                      setShowEditModal(false);
                      await fetchPledgeData(true);
                    } catch (err) { alert(`Error deleting all: ${err.message}`); }
                  }} className="px-3 sm:px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Delete All</button>
                </>
              )}
              <button type="button" onClick={() => setShowEditModal(false)} className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSaving}
                className={`bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isSaving ? 'Saving...' : `${saveMode === "add" ? "Add" : (editingPledgeId ? "Update" : "Set")} Amount`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
