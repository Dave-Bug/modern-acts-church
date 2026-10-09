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

const getCurrentMonthString = () => getTodayString().slice(0, 7);

const getDaysInMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

const getWeeksInMonth = (yearMonth) => {
  const days = getDaysInMonth(yearMonth);
  const weeks = [];
  for (let i = 1; i <= days; i += 7) {
    const end = Math.min(i + 6, days);
    weeks.push({ start: i, end, label: `${i}-${end}` });
  }
  return weeks;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

const dedupeByKey = (items, keyFn) => {
  const map = new Map();
  items.forEach(item => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, item);
  });
  return [...map.values()];
};

const sumAmounts = (items) => items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

/* ─── NEW: Infer bind date from duplicate transactions ─── */
const getBindDate = (primary, secondary, allTithes) => {
  const primaryTithes = allTithes.filter(t => String(t.member_id) === String(primary.id));
  const secondaryTithes = allTithes.filter(t => String(t.member_id) === String(secondary.id));

  const primaryMap = new Map(primaryTithes.map(t => [t.date, t.amount]));
  const secondaryMap = new Map(secondaryTithes.map(t => [t.date, t.amount]));

  let earliestBindDate = null;

  for (const [date, pAmount] of primaryMap) {
    if (secondaryMap.has(date) && secondaryMap.get(date) === pAmount) {
      if (!earliestBindDate || date < earliestBindDate) {
        earliestBindDate = date;
      }
    }
  }

  return earliestBindDate;
};

export default function FinanceTithes() {
  const [activeTab, setActiveTab] = useState("today");
  const [tithes, setTithes] = useState([]);
  const [allYearTithes, setAllYearTithes] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [expandedMembers, setExpandedMembers] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastEditDate, setLastEditDate] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showTitherRosterModal, setShowTitherRosterModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingTitheId, setEditingTitheId] = useState(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");

  const [saveMode, setSaveMode] = useState("overwrite");
  const [originalEditDate, setOriginalEditDate] = useState(null);

  const [todayAmounts, setTodayAmounts] = useState({});
  const [todaySavingId, setTodaySavingId] = useState(null);

  const todayStr = getTodayString();
  const currentYear = selectedMonth.split('-')[0];

  useEffect(() => { fetchTithesData(); }, [selectedMonth]);

  async function fetchTithesData(silent = false) {
    try {
      if (!silent) setLoading(true);

      const [{ data: ledger }, { data: yearLedger }, { data: roster }] = await Promise.all([
        supabase.from("church_finance").select("*").eq("category", "Tithes")
          .gte("date", `${selectedMonth}-01`).lte("date", `${selectedMonth}-${getDaysInMonth(selectedMonth)}`),
        supabase.from("church_finance").select("*").eq("category", "Tithes")
          .gte("date", `${currentYear}-01-01`).lte("date", `${currentYear}-12-31`),
        supabase.from("usher_members").select("id, first_name, last_name, gross, is_tither, bindedto, binded_at")
          .order("first_name", { ascending: true })
      ]);

      setMembers(roster || []);
      setTithes(ledger || []);
      setAllYearTithes(yearLedger || []);
    } catch (err) {
      console.error("Error fetching database records:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const calculateStatus = (total, gross) => {
    const g = parseFloat(gross || 0);
    const t = parseFloat(total || 0);
    if (g === 0) return 'No Goal';
    if (t >= g) return 'Met';
    return 'Short';
  };

  const getMemberMonthlyStatus = (memberId, yearMonth) => {
    const memberMonthTithes = tithes.filter(t => 
      String(t.member_id) === String(memberId) && 
      t.date.startsWith(yearMonth)
    );

    if (memberMonthTithes.length === 0) {
      return null;
    }

    const mostRecent = memberMonthTithes.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    )[0];

    return {
      status: mostRecent.status,
      gross: parseFloat(mostRecent.gross || 0),
      totalTithes: sumAmounts(memberMonthTithes)
    };
  };

  const getMemberAnnualStatus = (memberId, year) => {
    const memberYearTithes = allYearTithes.filter(t => 
      String(t.member_id) === String(memberId) && 
      t.date.startsWith(year)
    );

    const monthData = {};
    memberYearTithes.forEach(t => {
      const month = parseInt(t.date.split('-')[1]);
      if (!monthData[month] || new Date(t.created_at) > new Date(monthData[month].created_at)) {
        monthData[month] = t;
      }
    });

    return monthData;
  };

  const getPartner = (member) => {
    if (!member?.bindedto) return null;
    return members.find(m => String(m.id) === String(member.bindedto)) || null;
  };

  const activeTitherMembers = members.filter(m => m.is_tither === true);

  const toggleExpand = (memberId) => {
    setExpandedMembers(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const handleToggleTitherStatus = async (memberId, currentStatus) => {
    try {
      const { error } = await supabase.from("usher_members")
        .update({ is_tither: !currentStatus }).eq("id", memberId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_tither: !currentStatus } : m));
    } catch (err) {
      console.error("Error changing status:", err.message);
      alert(`Could not save: ${err.message}`);
    }
  };

  const handleUpdateBinding = async (memberId, targetBindedId) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (member.bindedto) {
        await supabase.from("usher_members").update({ bindedto: null, binded_at: null }).eq("id", member.bindedto);
      }

      const updates = { bindedto: targetBindedId || null };
      if (targetBindedId) {
        updates.binded_at = new Date().toISOString().split('T')[0];
      } else {
        updates.binded_at = null;
      }

      await supabase.from("usher_members").update(updates).eq("id", memberId);
      if (targetBindedId) {
        await supabase.from("usher_members").update({ 
          bindedto: memberId, 
          binded_at: updates.binded_at 
        }).eq("id", targetBindedId);
      }
      await fetchTithesData(true);
    } catch (err) {
      console.error("Error updating binding link:", err.message);
      alert(`Could not save connection: ${err.message}`);
    }
  };

  const findWeekTithes = (memberId, week) => tithes.filter(t => {
    if (String(t.member_id) !== String(memberId)) return false;
    const day = parseInt(t.date.split('-')[2]);
    return day >= week.start && day <= week.end;
  });

  const deleteWeekTithes = async (memberId, week) => {
    const startDate = `${selectedMonth}-${String(week.start).padStart(2, '0')}`;
    const endDate = `${selectedMonth}-${String(week.end).padStart(2, '0')}`;
    const { error } = await supabase.from("church_finance").delete()
      .eq("category", "Tithes").eq("member_id", memberId)
      .gte("date", startDate).lte("date", endDate);
    if (error) throw error;
  };

  const openWeekEditModal = (member, week) => {
    setSelectedMember(member);
    setSelectedWeek(week);
    setSaveMode("overwrite");

    const existing = findWeekTithes(member.id, week);
    const firstRecord = existing[0];

    if (firstRecord) {
      setEditingTitheId(firstRecord.id);
      setEditAmount(firstRecord.amount);
      setEditDate(firstRecord.date);
      setOriginalEditDate(firstRecord.date);
      setEditDescription(firstRecord.description || "None");
    } else {
      setEditingTitheId(null);
      setEditAmount("");
      const weekStart = `${selectedMonth}-${String(week.start).padStart(2, '0')}`;
      const weekEnd = `${selectedMonth}-${String(week.end).padStart(2, '0')}`;
      let defaultDate = weekStart;

      if (lastEditDate && lastEditDate >= weekStart && lastEditDate <= weekEnd) {
        defaultDate = lastEditDate;
      }

      setEditDate(defaultDate);
      setOriginalEditDate(null);
      setEditDescription("None");
    }
    setShowEditModal(true);
  };

  const getTodayTithe = (memberId) => {
    const matches = tithes.filter(t => String(t.member_id) === String(memberId) && t.date === todayStr);
    return matches.sort((a, b) => b.id - a.id)[0] || null;
  };

  const handleTodayAmountChange = (memberId, value) => {
    setTodayAmounts(prev => ({ ...prev, [memberId]: value }));
  };

  const todayVisibleMembers = activeTitherMembers.filter(m => {
    const partner = getPartner(m);
    if (!partner) return true; 
    return parseInt(m.id) < parseInt(partner.id);
  });

  const buildTithePayload = (amount, date, memberId, description = "None") => {
    const member = members.find(m => String(m.id) === String(memberId));
    let gross = 0;
    if (member) {
      gross = parseFloat(member.gross || 0);
    }

    const [year, month] = date.slice(0, 7).split('-');
    const existingMonthTithes = tithes.filter(t => 
      String(t.member_id) === String(memberId) && 
      t.date.startsWith(`${year}-${month}`)
    );
    const currentTotal = sumAmounts(existingMonthTithes) + parseFloat(amount || 0);

    const status = calculateStatus(currentTotal, gross);

    return {
      date,
      transaction_type: "Income",
      category: "Tithes",
      amount: parseFloat(amount || 0),
      description: description || "None",
      member_id: memberId,
      status,
      gross
    };
  };

  const handleTodaySave = async (member) => {
    const amount = parseFloat(todayAmounts[member.id]) || 0;
    if (amount <= 0) return;

    setTodaySavingId(member.id);
    try {
      const partner = getPartner(member);
      const parsedMemberId = isNaN(member.id) ? member.id : parseInt(member.id, 10);

      const payload = buildTithePayload(amount, todayStr, parsedMemberId, "None");

      const existingPrimary = getTodayTithe(member.id);
      const existingPartner = partner ? getTodayTithe(partner.id) : null;

      if (existingPrimary) {
        const { error } = await supabase.from("church_finance").update(payload).eq("id", existingPrimary.id);
        if (error) throw error;
        await supabase.from("church_finance").delete()
          .eq("category", "Tithes")
          .eq("member_id", parsedMemberId)
          .eq("date", todayStr)
          .neq("id", existingPrimary.id);
      } else {
        const { error } = await supabase.from("church_finance").insert([payload]);
        if (error) throw error;
      }

      if (partner) {
        const parsedPartnerId = isNaN(partner.id) ? partner.id : parseInt(partner.id, 10);
        const partnerPayload = buildTithePayload(amount, todayStr, parsedPartnerId, `Synced from ${member.first_name}`);

        if (existingPartner) {
          const { error } = await supabase.from("church_finance").update(partnerPayload).eq("id", existingPartner.id);
          if (error) throw error;
          await supabase.from("church_finance").delete()
            .eq("category", "Tithes")
            .eq("member_id", parsedPartnerId)
            .eq("date", todayStr)
            .neq("id", existingPartner.id);
        } else {
          const { error } = await supabase.from("church_finance").insert([partnerPayload]);
          if (error) throw error;
        }
      }

      await fetchTithesData(true);
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

  const handleGrossUpdate = async (memberId, newGrossValue) => {
    try {
      const { error } = await supabase.from("usher_members")
        .update({ gross: parseFloat(newGrossValue) || 0 }).eq("id", memberId);
      if (error) throw error;
      await fetchTithesData(true);
    } catch (err) {
      alert(`Could not save goal: ${err.message}`);
    }
  };

  const handleSaveTithe = async (e) => {
    e.preventDefault();
    if (isSaving || !editAmount || !editDate || !selectedMember || !selectedWeek) return;

    setIsSaving(true);
    const amount = parseFloat(editAmount) || 0;
    const member = selectedMember;
    const partner = getPartner(member);

    try {
      const parsedMemberId = isNaN(member.id) ? member.id : parseInt(member.id, 10);

      const payload = buildTithePayload(amount, editDate, parsedMemberId, editDescription || "None");

      if (saveMode === "add") {
        const { error } = await supabase.from("church_finance").insert([payload]);
        if (error) throw error;
        if (partner) {
          const parsedPartnerId = isNaN(partner.id) ? partner.id : parseInt(partner.id, 10);
          const partnerPayload = buildTithePayload(amount, editDate, parsedPartnerId, `Synced from ${member.first_name}`);
          const { error: pErr } = await supabase.from("church_finance").insert([partnerPayload]);
          if (pErr) throw pErr;
        }
      } else {
        if (editingTitheId) {
          const { error } = await supabase.from("church_finance").update(payload).eq("id", editingTitheId);
          if (error) throw error;
          if (partner) {
            const partnerRecords = findWeekTithes(partner.id, selectedWeek)
              .filter(t => t.date === originalEditDate);
            for (const rec of partnerRecords) {
              const partnerPayload = buildTithePayload(amount, editDate, rec.member_id, `Synced from ${member.first_name}`);
              const { error: pErr } = await supabase.from("church_finance").update(partnerPayload).eq("id", rec.id);
              if (pErr) throw pErr;
            }
          }
        } else {
          const { error } = await supabase.from("church_finance").insert([payload]);
          if (error) throw error;
          if (partner) {
            const parsedPartnerId = isNaN(partner.id) ? partner.id : parseInt(partner.id, 10);
            const partnerPayload = buildTithePayload(amount, editDate, parsedPartnerId, `Synced from ${member.first_name}`);
            const { error: pErr } = await supabase.from("church_finance").insert([partnerPayload]);
            if (pErr) throw pErr;
          }
        }
      }

      await fetchTithesData(true);
      setLastEditDate(editDate);  
      setShowEditModal(false);
      setEditAmount(""); setEditDescription(""); setEditingTitheId(null);
      setSelectedMember(null); setSelectedWeek(null);
      setSaveMode("overwrite"); setOriginalEditDate(null);
    } catch (err) {
      console.error("Error saving tithe:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getMonthlyRows = () => buildRows(activeTitherMembers, tithes, true);
  const getAnnualRows = () => buildRows(activeTitherMembers, allYearTithes, false);

  const buildRows = (sourceMembers, sourceTithes, isMonthly) => {
    const weeks = isMonthly ? getWeeksInMonth(selectedMonth) : null;
    const processed = new Set();
    const rows = [];

    sourceMembers.forEach(m => {
      const mid = String(m.id);
      if (processed.has(mid)) return;

      const partner = getPartner(m);
      const targetGross = parseFloat(m.gross || 0);

      if (partner) {
        processed.add(mid);
        processed.add(String(partner.id));
        const primary = parseInt(mid) < parseInt(partner.id) ? m : partner;
        const secondary = parseInt(mid) < parseInt(partner.id) ? partner : m;
        const primaryGross = parseFloat(primary.gross || 0);

        const allPrimaryTithes = sourceTithes.filter(t => String(t.member_id) === String(primary.id));
        const allSecondaryTithes = sourceTithes.filter(t => String(t.member_id) === String(secondary.id));

        const storedBindDate = primary.binded_at || partner.binded_at || null;
        const inferredBindDate = getBindDate(primary, secondary, sourceTithes);
        const bindDate = storedBindDate || inferredBindDate;

        let combinedTithes = [];

        if (bindDate) {
          const preBindPrimary = allPrimaryTithes.filter(t => t.date < bindDate);
          const preBindSecondary = allSecondaryTithes.filter(t => t.date < bindDate);
          const postBindPrimary = allPrimaryTithes.filter(t => t.date >= bindDate);
          combinedTithes = [...preBindPrimary, ...preBindSecondary, ...postBindPrimary];
        } else {
          combinedTithes = [...allPrimaryTithes, ...allSecondaryTithes];
        }

        if (isMonthly) {
          const weeklyData = weeks.map(week => {
            let weekAmount = 0, weekRecords = [];
            combinedTithes.forEach(t => {
              const day = parseInt(t.date.split('-')[2]);
              if (day >= week.start && day <= week.end) {
                weekAmount += parseFloat(t.amount || 0);
                weekRecords.push(t);
              }
            });
            return { ...week, records: weekRecords, amount: weekAmount };
          });
          const total = weeklyData.reduce((s, w) => s + w.amount, 0);

          const monthStatus = getMemberMonthlyStatus(primary.id, selectedMonth);

          let displayGross, displayStatus, isAchieved;

          if (monthStatus) {
            displayGross = monthStatus.gross;
            displayStatus = monthStatus.status;
            isAchieved = displayStatus === 'Met';
          } else {
            displayGross = primaryGross;
            displayStatus = primaryGross === 0 ? 'No Goal' : 'Short';
            isAchieved = false;
          }

          rows.push({
            memberId: primary.id, name: `${primary.first_name} ${primary.last_name}`,
            totalTithes: total, gross: displayGross,
            isAchieved: isAchieved,
            monthlyStatus: displayStatus,
            weeklyData, isVirtual: false, isBoundPair: true,
            partnerName: `${secondary.first_name} ${secondary.last_name}`
          });
        } else {
          let runningTotal = 0;
          const annualStatusData = getMemberAnnualStatus(primary.id, currentYear);
          let metCount = 0;

          const months = MONTH_NAMES.map((_, idx) => {
            const prefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
            const sum = sumAmounts(combinedTithes.filter(t => t.date.startsWith(prefix)));
            runningTotal += sum;

            const monthRecord = annualStatusData[idx + 1];
            let met;
            if (monthRecord) {
              met = monthRecord.status === 'Met';
            } else {
              met = false;
            }
            if (met) metCount++;

            return { amount: sum, isMet: met };
          });
          rows.push({
            memberId: primary.id, name: `${primary.first_name} ${primary.last_name}`,
            months, grandTotal: runningTotal,
            scoreText: primaryGross > 0 ? `${metCount}/12` : "0/12",
            scoreRaw: metCount, hasGoal: primaryGross > 0,
            targetGross: primaryGross, isVirtual: false, isBoundPair: true,
            partnerName: `${secondary.first_name} ${secondary.last_name}`
          });
        }
      } else {
        processed.add(mid);
        const memberTithes = sourceTithes.filter(t => String(t.member_id) === mid);

        if (isMonthly) {
          const weeklyData = weeks.map(week => {
            const weekRecords = memberTithes.filter(t => {
              const day = parseInt(t.date.split('-')[2]);
              return day >= week.start && day <= week.end;
            });
            const weekAmount = sumAmounts(weekRecords);
            return { ...week, records: weekRecords, amount: weekAmount };
          });
          const total = weeklyData.reduce((s, w) => s + w.amount, 0);

          const monthStatus = getMemberMonthlyStatus(m.id, selectedMonth);

          let displayGross, displayStatus, isAchieved;

          if (monthStatus) {
            displayGross = monthStatus.gross;
            displayStatus = monthStatus.status;
            isAchieved = displayStatus === 'Met';
          } else {
            displayGross = targetGross;
            displayStatus = targetGross === 0 ? 'No Goal' : 'Short';
            isAchieved = false;
          }

          rows.push({
            memberId: m.id, name: `${m.first_name} ${m.last_name}`,
            totalTithes: total, gross: displayGross,
            isAchieved: isAchieved,
            monthlyStatus: displayStatus,
            weeklyData, isVirtual: false, isBoundPair: false
          });
        } else {
          const deduped = dedupeByKey(memberTithes, t => `${t.date}_${t.amount}`);
          let runningTotal = 0;
          const annualStatusData = getMemberAnnualStatus(m.id, currentYear);
          let metCount = 0;

          const months = MONTH_NAMES.map((_, idx) => {
            const prefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
            const sum = sumAmounts(deduped.filter(t => t.date.startsWith(prefix)));
            runningTotal += sum;

            const monthRecord = annualStatusData[idx + 1];
            let met;
            if (monthRecord) {
              met = monthRecord.status === 'Met';
            } else {
              met = false;
            }
            if (met) metCount++;

            return { amount: sum, isMet: met };
          });
          rows.push({
            memberId: m.id, name: `${m.first_name} ${m.last_name}`,
            months, grandTotal: runningTotal,
            scoreText: targetGross > 0 ? `${metCount}/12` : "0/12",
            scoreRaw: metCount, hasGoal: targetGross > 0,
            targetGross: targetGross, isVirtual: false, isBoundPair: false
          });
        }
      }
    });

    const unassigned = sourceTithes.filter(t => !t.member_id);
    if (unassigned.length > 0) {
      if (isMonthly) {
        const weeklyData = weeks.map(week => {
          const weekRecords = unassigned.filter(t => {
            const day = parseInt(t.date.split('-')[2]);
            return day >= week.start && day <= week.end;
          });
          const weekAmount = sumAmounts(weekRecords);
          return { ...week, records: weekRecords, amount: weekAmount };
        });
        const total = weeklyData.reduce((s, w) => s + w.amount, 0);
        rows.push({
          memberId: "anonymous", name: "Anonymous", totalTithes: total,
          gross: 0, isAchieved: false, monthlyStatus: 'N/A',
          weeklyData, isVirtual: true, isBoundPair: false
        });
      } else {
        let runningTotal = 0;
        const months = MONTH_NAMES.map((_, idx) => {
          const prefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
          const sum = sumAmounts(unassigned.filter(t => t.date.startsWith(prefix)));
          runningTotal += sum;
          return { amount: sum, isMet: true };
        });
        rows.push({
          memberId: "anonymous", name: "Anonymous", months,
          grandTotal: runningTotal, scoreText: "N/A", scoreRaw: 0,
          hasGoal: false, targetGross: 0, isVirtual: true, isBoundPair: false
        });
      }
    }

    return rows;
  };

  const weeks = getWeeksInMonth(selectedMonth);
  const monthlyRows = getMonthlyRows();
  const annualRows = getAnnualRows();

  const filteredMonthly = monthlyRows.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAnnual = annualRows.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const overallTotal = filteredMonthly.reduce((s, r) => s + r.totalTithes, 0);
  const annualGrandTotal = filteredAnnual.reduce((s, r) => s + r.grandTotal, 0);
  const monthlyColTotals = MONTH_NAMES.map((_, idx) => filteredAnnual.reduce((s, r) => s + r.months[idx].amount, 0));

  const achievedCount = filteredMonthly.filter(r => r.monthlyStatus === 'Met' && !r.isVirtual).length;
  const notAchievedCount = filteredMonthly.filter(r => r.monthlyStatus === 'Short' && !r.isVirtual).length;
  const noBaselineCount = filteredMonthly.filter(r => (r.monthlyStatus === 'No Goal' || r.gross === 0) && !r.isVirtual).length;

  const filteredRoster = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(rosterSearchQuery.toLowerCase())
  );

  const todayTotal = (() => {
    let total = 0;
    activeTitherMembers.forEach(m => {
      const partner = getPartner(m);
      if (!partner || parseInt(m.id) < parseInt(partner.id)) {
        const t = getTodayTithe(m.id);
        if (t) total += parseFloat(t.amount);
      }
    });
    return total;
  })();

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const wsM = workbook.addWorksheet("Monthly Tracker View");
    wsM.columns = [{ key: "name", width: 26 }, ...weeks.map((_, i) => ({ key: `w${i}`, width: 13 })),
      { key: "total", width: 16 }, { key: "goal", width: 14 }, { key: "status", width: 13 }];
    wsM.mergeCells("A1:E1"); wsM.mergeCells("A2:E2");
    wsM.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsM.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsM.getCell("A2").value = `Finance Report — Monthly Detail Window (${selectedMonth})`;
    wsM.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsM.getRow(4).values = ["MET", "SHORT", "NO GOAL", "TOTAL"];
    wsM.getRow(5).values = [achievedCount, notAchievedCount, noBaselineCount, overallTotal];

    wsM.getRow(7).values = ["Name", ...weeks.map((_, i) => `Week ${i + 1}`), "Total Tithes", "Goal", "Status"];
    wsM.getRow(7).eachCell(c => {
      c.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });

    filteredMonthly.forEach((row, i) => {
      const status = row.isVirtual ? "N/A" : row.monthlyStatus || "N/A";
      const r = wsM.addRow([row.name, ...row.weeklyData.map(w => w.amount), row.totalTithes, row.gross, status]);
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      r.eachCell((c, ci) => {
        c.font = { name: "Segoe UI", size: 10 };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        c.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (ci === 1) c.alignment = { horizontal: "left" };
        else if (ci > 1 && ci <= weeks.length + 3) { c.alignment = { horizontal: "right" }; c.numFmt = "₱#,##0.00"; }
        else { c.alignment = { horizontal: "center" }; }
      });
    });

    const wsA = workbook.addWorksheet("Annual 12-Month Matrix");
    wsA.columns = [{ key: "name", width: 26 }, ...MONTH_NAMES.map(m => ({ key: m.toLowerCase(), width: 13 })),
      { key: "annualSum", width: 16 }, { key: "score", width: 14 }];
    wsA.mergeCells("A1:O1"); wsA.mergeCells("A2:O2");
    wsA.getCell("A1").value = "Modern Acts Church - Olongapo";
    wsA.getCell("A1").font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    wsA.getCell("A2").value = `Annual Ledger — 12-Month Tithes Summary Table (Calendar Year ${currentYear})`;
    wsA.getCell("A2").font = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF64748B" } };

    wsA.getRow(4).values = ["ANNUAL CONSOLIDATED TOTAL"];
    wsA.getRow(5).values = [annualGrandTotal];
    wsA.getCell("A5").font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF2563EB" } };
    wsA.getCell("A5").numFmt = "₱#,##0.00";

    wsA.getRow(7).values = ["Member Name", ...MONTH_NAMES, "Annual Total", "Achieved"];
    wsA.getRow(7).eachCell(c => {
      c.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });

    filteredAnnual.forEach((row, i) => {
      const r = wsA.addRow([row.name, ...row.months.map(m => m.amount), row.grandTotal, row.scoreText]);
      const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      r.eachCell((c, ci) => {
        c.font = { name: "Segoe UI", size: 10 };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        c.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (ci === 1) c.alignment = { horizontal: "left" };
        else { c.alignment = { horizontal: "right" }; c.numFmt = "₱#,##0.00"; }
      });
    });

    const sumR = wsA.addRow(["Total Cumulative", ...monthlyColTotals, annualGrandTotal, ""]);
    sumR.eachCell((c, ci) => {
      c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      if (ci > 1 && ci < 15) { c.numFmt = "₱#,##0.00"; c.alignment = { horizontal: "right" }; }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Tithes_Master_Report_${currentYear}.xlsx`);
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
      <Icon className="text-xs" /> <span>{label}</span>
    </button>
  );

  const StatCard = ({ label, value, color }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:px-4 sm:py-2.5 shadow-sm">
      <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-base sm:text-lg md:text-xl font-black truncate ${color}`}>{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased">
      <div className="fixed top-3 left-3 z-50 sm:top-4 sm:left-4">
        <Link to="/ministries/finance" className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm">
          <FaHome /><span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pt-14 sm:pt-20">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Tithe <span className="text-blue-600">Tracker</span>
          </h1>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase hidden sm:inline">Target Window:</span>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm" />
          </div>
        </div>

        <div className="flex border-b border-slate-200 mb-4 gap-1 sm:gap-2">
          <TabButton id="today" icon={FaCalendarDay} label="Today" />
          <TabButton id="monthly" icon={FaTable} label="Monthly" />
          <TabButton id="annual" icon={FaCalendarAlt} label="Annual" />
        </div>

        {activeTab === "monthly" && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 mb-4">
            <StatCard label="Met" value={achievedCount} color="text-emerald-600" />
            <StatCard label="Short" value={notAchievedCount} color="text-rose-600" />
            <StatCard label="No Goal" value={noBaselineCount} color="text-slate-500" />
            <StatCard label="Total" value={`₱${formatCurrency(overallTotal)}`} color="text-blue-600" />
          </div>
        )}
        {activeTab === "today" && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 mb-4">
            <StatCard label="Date" value={todayStr} color="text-slate-600" />
            <StatCard label="Today's Total" value={`₱${formatCurrency(todayTotal)}`} color="text-blue-600" />
          </div>
        )}
        {activeTab === "annual" && (
          <div className="mb-4">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-3 shadow-sm w-full sm:w-auto sm:min-w-[240px]">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Annual Cumulative Grand Total ({currentYear})</div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-blue-600">₱{formatCurrency(annualGrandTotal)}</div>
            </div>
          </div>
        )}

        <div className="sticky top-0 z-30 bg-[#f5f7fb] py-2 mb-2 -mx-3 px-3 sm:-mx-6 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex items-center gap-2 flex-1">
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
        </div>

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
                      const existing = getTodayTithe(m.id);
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
                    {activeTitherMembers.length === 0 && (
                      <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm">No active tithers.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "monthly" && (
          <>
            <div className="lg:hidden space-y-3 mb-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                  <span className="text-sm text-slate-400">Loading...</span>
                </div>
              ) : filteredMonthly.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No recorded profiles matched.</div>
              ) : filteredMonthly.map(row => {
                const isExpanded = !!expandedMembers[row.memberId];
                const memberObj = row.isVirtual
                  ? { id: "anonymous", first_name: "Anonymous", last_name: "" }
                  : members.find(m => m.id === row.memberId);

                return (
                  <div key={row.memberId} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-sm ${row.isVirtual ? 'text-blue-600' : 'text-slate-900'}`}>{row.name}</span>
                          {row.isBoundPair && <span className="text-[8px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {row.partnerName}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {row.isVirtual || row.monthlyStatus === 'No Goal' ? (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">N/A</span>
                          ) : row.monthlyStatus === 'Met' ? (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Met</span>
                          ) : (
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Short</span>
                          )}
                          <span className="text-[10px] text-slate-400">Goal: ₱{formatCurrency(row.gross)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-slate-900">₱{formatCurrency(row.totalTithes)}</div>
                        <button onClick={() => toggleExpand(row.memberId)} className="text-[10px] text-blue-600 font-bold mt-0.5 flex items-center gap-0.5 ml-auto">
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
                            <button key={widx} onClick={() => openWeekEditModal(memberObj, week)}
                              className={`py-2 px-1 rounded-lg font-mono font-bold text-[10px] transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[48px] ${
                                hasValue ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-500 border border-slate-100"
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
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Goal Setting</span>
                          {row.isVirtual ? <span className="text-slate-300 text-xs">—</span> : (
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
                        <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Records This Week</div>
                        <div className="space-y-1">
                          {row.weeklyData.map((week, idx) => (
                            week.records?.length > 0 && (
                              <div key={idx} className="text-xs text-slate-500">
                                <span className="font-bold">Week {idx + 1}:</span> {week.records.map(r => `₱${formatCurrency(r.amount)} (${r.date})`).join(", ")}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                  <span className="text-xs sm:text-sm text-slate-400">Syncing database registry matrix...</span>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4 min-w-[180px]">Name</th>
                        {weeks.map((week, idx) => <th key={idx} className="py-3 px-2 text-center min-w-[75px]">W{idx + 1}</th>)}
                        <th className="py-3 px-3 text-right min-w-[90px]">Total</th>
                        <th className="py-3 px-3 text-right min-w-[80px]">Goal</th>
                        <th className="py-3 px-3 text-center min-w-[70px]">Status</th>
                        <th className="py-3 px-3 text-center min-w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredMonthly.length === 0 ? (
                        <tr><td colSpan={weeks.length + 6} className="py-12 text-center text-slate-400 text-sm">No recorded profiles matched.</td></tr>
                      ) : filteredMonthly.map(row => {
                        const isExpanded = !!expandedMembers[row.memberId];
                        const memberObj = row.isVirtual ? { id: "anonymous", first_name: "Anonymous", last_name: "" } : members.find(m => m.id === row.memberId);

                        return (
                          <React.Fragment key={row.memberId}>
                            <tr className={`${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'} transition-colors`}>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-bold ${row.isVirtual ? 'text-blue-600' : 'text-slate-900'}`}>{row.name}</span>
                                  {row.isBoundPair && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded font-bold">+ {row.partnerName}</span>}
                                  {!row.isBoundPair && memberObj?.bindedto && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-bold">LINKED</span>}
                                </div>
                              </td>
                              {row.weeklyData.map((week, widx) => {
                                const hasValue = week.amount > 0;
                                const recordCount = week.records?.length || 0;
                                return (
                                  <td key={widx} className="py-2.5 px-2 text-center">
                                    <button onClick={() => openWeekEditModal(memberObj, week)}
                                      className={`w-full py-1 px-1 rounded font-mono font-bold text-xs transition-colors cursor-pointer ${hasValue ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"}`}>
                                      {hasValue ? formatCurrency(week.amount) : "—"}
                                      {recordCount > 1 && (
                                        <span className="ml-1 text-[8px] bg-emerald-200 text-emerald-800 px-1 rounded-full">{recordCount}</span>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(row.totalTithes)}</td>
                              <td className="py-2.5 px-3 text-right">
                                {row.isVirtual ? <span className="text-slate-300">—</span> : (
                                  <input type="number" step="0.01" min="0" defaultValue={row.gross || ""} placeholder="0"
                                    onBlur={(e) => handleGrossUpdate(row.memberId, e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                                    className="w-20 bg-transparent text-right font-mono font-semibold text-slate-700 text-sm focus:outline-none border-b border-transparent focus:border-blue-400" />
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {row.isVirtual || row.monthlyStatus === 'No Goal' ? <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">N/A</span> :
                                  row.monthlyStatus === 'Met' ? <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Met</span> :
                                    <span className="text-xs text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Short</span>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button onClick={() => toggleExpand(row.memberId)} className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer active:scale-90 transition-colors ${isExpanded ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
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
              )}
            </div>
          </>
        )}

        {activeTab === "annual" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <FaSpinner className="animate-spin text-blue-500 text-xl mr-2" />
                <span className="text-sm text-slate-400">Loading...</span>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Member Name</th>
                      {MONTH_NAMES.map(m => <th key={m} className="py-3 px-1 text-right">{m}</th>)}
                      <th className="py-3 px-3 text-right">Annual Total</th>
                      <th className="py-3 px-3 text-center">Achieved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                    {filteredAnnual.length === 0 ? (
                      <tr><td colSpan={14} className="py-12 text-center text-slate-400 text-sm">No records found.</td></tr>
                    ) : filteredAnnual.map(row => (
                      <tr key={row.memberId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.name}
                          {row.isBoundPair && <span className="text-[9px] font-normal text-purple-500 ml-1">+ {row.partnerName}</span>}
                        </td>
                        {row.months.map((m, idx) => (
                          <td key={idx} className={`py-3 px-1 text-right font-mono ${m.amount > 0 ? (m.isMet ? 'text-slate-800 font-bold' : 'text-rose-600 font-bold') : 'text-slate-300'}`}>
                            {m.amount > 0 ? formatCurrency(m.amount) : "—"}
                          </td>
                        ))}
                        <td className="py-3 px-3 text-right font-mono font-black text-blue-600 bg-blue-50/20">{formatCurrency(row.grandTotal)}</td>
                        <td className="py-3 px-3 text-center">
                          {row.isVirtual ? <span className="text-slate-300">—</span> : (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${row.scoreRaw >= 6 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {row.scoreText}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100/50 font-black border-t border-slate-200">
                      <td className="py-3 px-4 text-slate-900 text-xs uppercase">Total Cumulative</td>
                      {monthlyColTotals.map((mTotal, idx) => (
                        <td key={idx} className="py-3 px-1 text-right font-mono text-slate-900">{mTotal > 0 ? formatCurrency(mTotal) : "—"}</td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono text-blue-600 bg-blue-100/30">{formatCurrency(annualGrandTotal)}</td>
                      <td className="py-3 px-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

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
              {filteredRoster.map(m => (
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

      {showEditModal && selectedMember && selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleSaveTithe} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-3 sm:p-4 bg-slate-900 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xs sm:text-sm text-white uppercase tracking-wider">
                  {editingTitheId ? "Update" : "Set"} Week Tithes
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

              {editingTitheId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Save Mode</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSaveMode("overwrite")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        saveMode === "overwrite"
                          ? "bg-blue-600 text-emerald-600"
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
                          ? "bg-emerald-600 text-emerald-600"
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

              {findWeekTithes(selectedMember.id, selectedWeek).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Existing Records This Week</div>
                  <div className="space-y-1">
                    {findWeekTithes(selectedMember.id, selectedWeek).map((rec, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-600">{rec.date}</span>
                        <span className="font-mono font-bold text-slate-800">₱{formatCurrency(rec.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-amber-200 pt-1 mt-1 flex justify-between text-xs font-bold">
                      <span className="text-amber-700">Current Total</span>
                      <span className="font-mono text-amber-700">
                        ₱{formatCurrency(sumAmounts(findWeekTithes(selectedMember.id, selectedWeek)))}
                      </span>
                    </div>
                  </div>
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
              {editingTitheId && saveMode === "overwrite" && (
                <>
                  <button type="button" onClick={async () => {
                    try {
                      await supabase.from("church_finance").delete().eq("id", editingTitheId);
                      const partner = selectedMember.bindedto ? members.find(m => String(m.id) === String(selectedMember.bindedto)) : null;
                      if (partner) {
                        const partnerRecords = findWeekTithes(partner.id, selectedWeek)
                          .filter(t => t.date === originalEditDate);
                        for (const rec of partnerRecords) {
                          await supabase.from("church_finance").delete().eq("id", rec.id);
                        }
                      }
                      setShowEditModal(false);
                      await fetchTithesData(true);
                    } catch (err) { alert(`Error deleting: ${err.message}`); }
                  }} className="px-3 sm:px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Delete</button>

                  <button type="button" onClick={async () => {
                    try {
                      await deleteWeekTithes(selectedMember.id, selectedWeek);
                      const partner = selectedMember.bindedto ? members.find(m => String(m.id) === String(selectedMember.bindedto)) : null;
                      if (partner) {
                        await deleteWeekTithes(partner.id, selectedWeek);
                      }
                      setShowEditModal(false);
                      await fetchTithesData(true);
                    } catch (err) { alert(`Error deleting all: ${err.message}`); }
                  }} className="px-3 sm:px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-700 cursor-pointer">Delete All</button>
                </>
              )}
              <button type="button" onClick={() => setShowEditModal(false)} className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSaving}
                className={`bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isSaving ? 'Saving...' : `${saveMode === "add" ? "Add" : (editingTitheId ? "Update" : "Set")} Amount`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
