import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaHome, FaCalendarAlt, FaCheckCircle, FaSpinner, FaSave,
  FaSearch, FaUserPlus, FaTimes, FaFileDownload, FaEye,
  FaArrowUp, FaUserCog, FaToggleOn, FaToggleOff, FaFilter
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

const TRIBES = [
  "Samuel/Abraham", "Leah/Ruth", "Yeshua", "Daniel",
  "Esther", "Sarah", "Josiah", "N/A"
];
const ROLES = ["All", "Minister", "Member", "Visitor", "1st Timer", "2nd Timer"];

export default function UsherAttendance() {
  const [showInviterDropdown, setShowInviterDropdown] = useState(false);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [insertRole, setInsertRole] = useState("Visitor");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [primaryFilter, setPrimaryFilter] = useState("All");
  const [selectedTribe, setSelectedTribe] = useState("");

  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [showCheckedModal, setShowCheckedModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [modalTab, setModalTab] = useState("present");
  const [visitorText, setVisitorText] = useState("");
  const [invitedBy, setInvitedBy] = useState("");

  // Roster modal filter state
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterTribeFilter, setRosterTribeFilter] = useState("");
  const [rosterRoleFilter, setRosterRoleFilter] = useState("All");
  const [allMembers, setAllMembers] = useState([]); // full DB roster for manage modal
  const [savingRoster, setSavingRoster] = useState(false);

  const getServiceName = (dateString) => {
    if (!dateString) return "Regular Service";
    const dateParts = dateString.split("-");
    if (dateParts.length !== 3) return "Regular Service";
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dayIndex = dateObj.getDay();
    if (dayIndex === 3) return "Prayer Works";
    if (dayIndex === 6) return "Y.A Service";
    if (dayIndex === 0) return "Sunday Service";
    return "Regular Service";
  };

  useEffect(() => {
    const handleScrollVisibility = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScrollVisibility);
    return () => window.removeEventListener("scroll", handleScrollVisibility);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  useEffect(() => {
    initializeModule();
  }, [selectedDate]);

  async function initializeModule() {
    try {
      setLoading(true);

      // Fetch only is_attendance = true members for the attendance list
      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name, role, tribe, invited_by, is_attendance")
        .eq("is_attendance", true)
        .order("first_name", { ascending: true });
      if (rosterErr) throw rosterErr;

      const baseRoster = roster || [];

      const { data: attendanceRecords, error: attErr } = await supabase
        .from("usher_attendance")
        .select("name, date, tribe, invited_by, status, service")
        .eq("date", selectedDate);
      if (attErr) throw attErr;

      const existingRecords = attendanceRecords || [];
      const stateMap = {};

      baseRoster.forEach(m => {
        const fullName = `${m.first_name} ${m.last_name || ""}`.trim();
        const match = existingRecords.find(r => r.name.toLowerCase() === fullName.toLowerCase());
        stateMap[m.id] = match ? match.status : "Absent";
      });

      // Saved visitors (not in roster) from attendance records
      const savedVisitors = [];
      existingRecords.forEach((record, index) => {
        const nameExistsInRoster = baseRoster.some(m => {
          const fullName = `${m.first_name} ${m.last_name || ""}`.trim();
          return fullName.toLowerCase() === record.name.toLowerCase();
        });
        if (!nameExistsInRoster) {
          const tempId = `visitor-saved-${index}`;
          const parts = record.name.split(/\s+/);
          savedVisitors.push({
            id: tempId,
            first_name: parts[0] || "Visitor",
            last_name: parts.slice(1).join(" ") || "",
            role: "Visitor",
            tribe: record.tribe || "N/A",
            invited_by: record.invited_by || "",
            is_attendance: true
          });
          stateMap[tempId] = record.status;
        }
      });

      setMembers([...baseRoster, ...savedVisitors]);
      setAttendance(stateMap);
    } catch (err) {
      console.error("Roster parsing error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Open Manage Roster modal — fetch ALL members
  const openRosterModal = async () => {
    try {
      const { data, error } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name, role, tribe, is_attendance")
        .order("first_name", { ascending: true });
      if (error) throw error;
      setAllMembers(data || []);
      setRosterSearch("");
      setRosterTribeFilter("");
      setRosterRoleFilter("All");
      setShowRosterModal(true);
    } catch (err) {
      alert("Could not load roster: " + err.message);
    }
  };

  // Toggle is_attendance for a member in the roster modal
  const handleToggleAttendance = async (memberId, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from("usher_members")
        .update({ is_attendance: newStatus })
        .eq("id", memberId);
      if (error) throw error;
      setAllMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, is_attendance: newStatus } : m)
      );
    } catch (err) {
      alert("Could not update: " + err.message);
    }
  };

  // Bulk toggle all visible filtered members ON
  const handleEnableAll = async (filteredList) => {
    setSavingRoster(true);
    try {
      const ids = filteredList.filter(m => !m.is_attendance).map(m => m.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("usher_members")
        .update({ is_attendance: true })
        .in("id", ids);
      if (error) throw error;
      setAllMembers(prev =>
        prev.map(m => ids.includes(m.id) ? { ...m, is_attendance: true } : m)
      );
    } catch (err) {
      alert("Bulk enable failed: " + err.message);
    } finally {
      setSavingRoster(false);
    }
  };

  // Bulk toggle all visible filtered members OFF
  const handleDisableAll = async (filteredList) => {
    setSavingRoster(true);
    try {
      const ids = filteredList.filter(m => m.is_attendance).map(m => m.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("usher_members")
        .update({ is_attendance: false })
        .in("id", ids);
      if (error) throw error;
      setAllMembers(prev =>
        prev.map(m => ids.includes(m.id) ? { ...m, is_attendance: false } : m)
      );
    } catch (err) {
      alert("Bulk disable failed: " + err.message);
    } finally {
      setSavingRoster(false);
    }
  };

  const handleToggleStatus = (memberId) => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: prev[memberId] === "Present" ? "Absent" : "Present"
    }));
  };

  const filteredInviters = members.filter(m => {
    const fullName = `${m.first_name} ${m.last_name || ""}`.trim().toLowerCase();
    return fullName.includes(invitedBy.toLowerCase());
  });

  const handleBulkVisitorSubmit = async (e) => {
    e.preventDefault();
    if (!visitorText.trim()) return;

    const lines = visitorText.split("\n").map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const payloadToInsert = [];
    let inheritedTribe = "N/A";

    if (invitedBy.trim() !== "") {
      const inviterMatch = members.find(m =>
        `${m.first_name} ${m.last_name || ""}`.trim().toLowerCase() === invitedBy.trim().toLowerCase()
      );
      if (inviterMatch?.tribe) inheritedTribe = inviterMatch.tribe;
    }

    lines.forEach((line) => {
      const parts = line.split(/\s+/);
      let firstName = "", middleInitial = null, lastName = "";
      if (parts.length === 1) {
        firstName = parts[0];
      } else if (parts.length === 2) {
        firstName = parts[0]; lastName = parts[1];
      } else {
        const tentativeInitialIndex = parts.length - 2;
        const tentativeInitial = parts[tentativeInitialIndex];
        if (tentativeInitial.length === 1) {
          middleInitial = tentativeInitial.toUpperCase();
          firstName = parts.slice(0, tentativeInitialIndex).join(" ");
          lastName = parts[parts.length - 1];
        } else {
          firstName = parts.slice(0, parts.length - 1).join(" ");
          lastName = parts[parts.length - 1];
        }
      }

      payloadToInsert.push({
        first_name: firstName,
        last_name: lastName,
        middle_initial: middleInitial,
        role: insertRole,
        tribe: inheritedTribe,
        invited_by: invitedBy.trim() || null,
        is_attendance: true   // ← auto-enable attendance tracking on insert
      });
    });

    try {
      setSaving(true);
      const { data: insertedRows, error: insertErr } = await supabase
        .from("usher_members")
        .insert(payloadToInsert)
        .select();
      if (insertErr) throw insertErr;

      const newlyCreatedMembers = insertedRows || [];
      const newAttendanceUpdates = {};
      newlyCreatedMembers.forEach(m => { newAttendanceUpdates[m.id] = "Present"; });

      setMembers(prev => [...prev, ...newlyCreatedMembers]);
      setAttendance(prev => ({ ...prev, ...newAttendanceUpdates }));

      setVisitorText(""); setInvitedBy(""); setInsertRole("Visitor");
      setShowAddVisitor(false); setShowInviterDropdown(false);
      alert(`Successfully saved ${newlyCreatedMembers.length} records! Tribe: ${inheritedTribe}`);
    } catch (err) {
      alert(`Insertion Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const activeService = getServiceName(selectedDate);
      const uniquePayloadMap = new Map();

      members.forEach(member => {
        const fullName = `${member.first_name} ${member.last_name || ""}`.trim();
        let finalTribe = member.tribe || "N/A";
        if (member.invited_by) {
          const inviterMatch = members.find(m =>
            `${m.first_name} ${m.last_name || ""}`.trim().toLowerCase() === member.invited_by.trim().toLowerCase()
          );
          if (inviterMatch?.tribe) finalTribe = inviterMatch.tribe;
        }
        uniquePayloadMap.set(fullName, {
          name: fullName, date: selectedDate, tribe: finalTribe,
          invited_by: member.invited_by || "", status: attendance[member.id] || "Absent",
          service: activeService
        });
      });

      const payload = Array.from(uniquePayloadMap.values());
      if (payload.length > 0) {
        const { error } = await supabase.from("usher_attendance").upsert(payload, { onConflict: "date, name" });
        if (error) throw error;
      }
      setShowAddVisitor(false);
      alert("Attendance successfully saved!");
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportToExcel = () => {
    if (filteredMembers.length === 0) { alert("No records to export."); return; }
    const headers = ["Name", "Date", "Tribe", "Invited By", "Status", "Service"];
    const activeService = getServiceName(selectedDate);
    const rows = filteredMembers.map(member => {
      const fullName = `${member.first_name} ${member.last_name || ""}`.trim();
      let finalTribe = member.tribe || "N/A";
      if (member.invited_by) {
        const inviterMatch = members.find(m =>
          `${m.first_name} ${m.last_name || ""}`.trim().toLowerCase() === member.invited_by.trim().toLowerCase()
        );
        if (inviterMatch) finalTribe = inviterMatch.tribe;
      }
      return [fullName, selectedDate, finalTribe, member.invited_by || "N/A", attendance[member.id] || "Absent", activeService];
    });
    const csvContent = [headers, ...rows].map(row =>
      row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${activeService.replace(/\s+/g, '_')}_Report_${selectedDate}.csv`;
    a.style.visibility = "hidden";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handlePrimaryFilterChange = (value) => {
    setPrimaryFilter(value); setSelectedTribe(""); setShowAddVisitor(false);
  };

  const filteredMembers = members.filter(member => {
    const fullName = `${member.first_name} ${member.last_name || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    let matchesCriteria = true;
    if (primaryFilter === "Minister") matchesCriteria = (member.role || "").toLowerCase() === "minister";
    else if (primaryFilter === "1st Timer") matchesCriteria = (member.role || "").toLowerCase() === "1st timer";
    else if (primaryFilter === "2nd Timer") matchesCriteria = (member.role || "").toLowerCase() === "2nd timer";
    else if (primaryFilter === "Visitor") matchesCriteria = (member.role || "").toLowerCase() === "visitor";
    else if (primaryFilter === "Member") matchesCriteria = (member.role || "").toLowerCase() === "member";
    else if (primaryFilter === "Tribe") {
      if (selectedTribe !== "") {
        let assignedTribe = member.tribe || "N/A";
        if (member.invited_by) {
          const inviterMatch = members.find(m =>
            `${m.first_name} ${m.last_name || ""}`.trim().toLowerCase() === member.invited_by.trim().toLowerCase()
          );
          if (inviterMatch?.tribe) assignedTribe = inviterMatch.tribe;
        }
        matchesCriteria = assignedTribe.toLowerCase() === selectedTribe.toLowerCase();
      }
    }
    return matchesSearch && matchesCriteria;
  });

  // Roster modal filtered list
  const rosterFiltered = allMembers.filter(m => {
    const fullName = `${m.first_name} ${m.last_name || ""}`.toLowerCase();
    const matchSearch = fullName.includes(rosterSearch.toLowerCase());
    const matchTribe = rosterTribeFilter === "" || (m.tribe || "N/A") === rosterTribeFilter;
    const matchRole = rosterRoleFilter === "All" || (m.role || "").toLowerCase() === rosterRoleFilter.toLowerCase();
    return matchSearch && matchTribe && matchRole;
  });

  const trackedCount = rosterFiltered.filter(m => m.is_attendance).length;

  const presentCount = Object.values(attendance).filter(v => v === "Present").length;
  const absentCount = Object.values(attendance).filter(v => v === "Absent").length;
  const presentList = filteredMembers.filter(m => attendance[m.id] === "Present");
  const absentList = filteredMembers.filter(m => attendance[m.id] !== "Present");

  const formatMemberName = (member) => {
    const name = `${member.first_name} ${member.last_name || ""}`.trim();
    return member.invited_by ? `${name} (Invited by: ${member.invited_by})` : name;
  };

  const generateTabText = (tab) => {
    const list = tab === "present" ? presentList : absentList;
    const label = tab === "present" ? "CHECKED (Present)" : "UNCHECKED (Absent)";
    let output = `${label} — ${list.length}\n${"─".repeat(30)}\n`;
    output += list.length === 0
      ? (tab === "present" ? "No checked records.\n" : "No unchecked records.\n")
      : list.map(formatMemberName).join("\n");
    return output;
  };

  const handleCopyActiveTab = () => {
    navigator.clipboard.writeText(generateTabText(modalTab));
    alert(`${modalTab === "present" ? "Present" : "Absent"} list copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12">
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome /> Back
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-16 md:pt-20">
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">📋</div>
          <h1 className="text-3xl md:text-5xl font-black">
            Service <span className="text-blue-600">Roll Call</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-sm mx-auto">
            Current Active Track: <span className="text-blue-600 font-bold">{getServiceName(selectedDate)}</span>
          </p>
        </div>

        {/* Date bar */}
        <div className="bg-white border border-slate-100 rounded-xl p-3 mb-4 shadow-sm flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <FaCalendarAlt className="text-blue-500 text-sm flex-shrink-0" />
            <input
              type="date" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs md:text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none p-0 cursor-pointer w-full focus:ring-0"
            />
          </div>
          <span className="text-[10px] md:text-xs bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-md max-w-[140px] md:max-w-none truncate">
            {getServiceName(selectedDate)}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total", value: members.length, color: "text-slate-800" },
            { label: "Present", value: presentCount, color: "text-emerald-600" },
            { label: "Absent", value: absentCount, color: "text-rose-500" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-2.5 text-center shadow-sm">
              <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">{s.label}</p>
              <p className={`text-base md:text-xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Sticky toolbar */}
        <div className="sticky top-0 z-40 bg-[#f8fafc] py-3 border-b border-slate-200/50 shadow-[0_4px_6px_-1px_rgba(248,250,252,0.9)] mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="flex-1 bg-white border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
              <FaSearch className="text-slate-400 text-xs flex-shrink-0" />
              <input
                type="text" placeholder="Search name..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs md:text-sm bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Role filter */}
            <div className="bg-white border border-slate-100 rounded-xl px-2 py-2 flex items-center shadow-sm sm:w-44">
              <select
                value={primaryFilter} onChange={(e) => handlePrimaryFilterChange(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-xs md:text-sm font-bold text-slate-600 cursor-pointer focus:ring-0"
              >
                <option value="All">All Roles</option>
                <option value="Tribe">By Tribe</option>
                <option value="Minister">Ministers</option>
                <option value="Member">Members</option>
                <option value="Visitor">Visitors</option>
                <option value="1st Timer">1st Timer</option>
                <option value="2nd Timer">2nd Timer</option>
              </select>
            </div>

            {primaryFilter === "Tribe" && (
              <div className="bg-white border border-blue-200 rounded-xl px-2 py-2 flex items-center shadow-sm sm:w-44">
                <select
                  value={selectedTribe} onChange={(e) => setSelectedTribe(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-xs md:text-sm font-bold text-blue-600 cursor-pointer focus:ring-0"
                >
                  <option value="">Select Tribe</option>
                  {TRIBES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-5 sm:flex gap-2">
              {/* Manage Roster — NEW */}
              <button
                type="button"
                onClick={openRosterModal}
                className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-700 font-bold py-2 px-2 rounded-xl text-xs transition-colors sm:min-w-[95px]"
              >
                <FaUserCog className="text-blue-400" />
                <span>Roster</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCheckedModal(true)}
                className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-2 rounded-xl text-xs transition-colors sm:min-w-[95px]"
              >
                <FaEye className="text-blue-500" />
                <span>Checked</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddVisitor(prev => !prev)}
                className={`flex items-center justify-center gap-1.5 font-bold py-2 px-3 rounded-xl text-xs transition-colors border sm:min-w-[95px] ${
                  showAddVisitor ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showAddVisitor ? <FaTimes /> : <FaUserPlus />}
                <span>Insert</span>
              </button>

              <button
                type="button"
                onClick={handleExportToExcel}
                className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition-colors sm:min-w-[95px]"
              >
                <FaFileDownload className="text-slate-500" /> <span>Export</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={loading || saving || members.length === 0}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-blue-500 font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm sm:min-w-[95px]"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Insert form */}
          {showAddVisitor && (
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-md animate-fadeIn">
              <h3 className="text-xs md:text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                📋 Quick Database Member Insertion
              </h3>
              <form onSubmit={handleBulkVisitorSubmit} className="flex flex-col gap-3">
                <div className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex flex-wrap items-center gap-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Role:</label>
                  <div className="flex flex-wrap gap-2">
                    {["Visitor", "Member", "Minister", "1st Timer", "2nd Timer"].map((roleOption) => (
                      <button key={roleOption} type="button" onClick={() => setInsertRole(roleOption)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                          insertRole === roleOption
                            ? "bg-blue-600 text-emerald-600"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}>
                        {roleOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-enable notice */}
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <FaToggleOn className="text-emerald-500 text-sm shrink-0" />
                  <p className="text-[11px] text-emerald-700 font-medium">
                    New members will automatically be enabled for attendance tracking.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Names (One per line)</label>
                    <textarea
                      rows={3}
                      placeholder={"First Name Middle Initial Last Name\nChristian S. Carmesis\n"}
                      required value={visitorText}
                      onChange={(e) => setVisitorText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      * Last word = last name. Single letter before last word = Middle Initial.
                    </p>
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Invited By</label>
                    <input
                      type="text" placeholder="Type to search members..."
                      value={invitedBy}
                      onChange={(e) => { setInvitedBy(e.target.value); setShowInviterDropdown(true); }}
                      onFocus={() => setShowInviterDropdown(true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                    {showInviterDropdown && invitedBy.trim() !== "" && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                        {filteredInviters.length > 0 ? (
                          filteredInviters.map((m) => {
                            const fullName = `${m.first_name} ${m.last_name || ""}`.trim();
                            return (
                              <button key={m.id} type="button"
                                onClick={() => { setInvitedBy(fullName); setShowInviterDropdown(false); }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex justify-between items-center border-b border-slate-50 last:border-none"
                              >
                                <span className="font-medium">{fullName}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">{m.role || "Member"}</span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-400 italic">No matching member found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-50">
                  <button type="button"
                    onClick={() => { setShowAddVisitor(false); setVisitorText(""); setInsertRole("1st Timer"); setShowInviterDropdown(false); }}
                    className="bg-slate-100 text-slate-600 font-bold rounded-lg text-[11px] py-1.5 px-3"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="bg-emerald-600 font-bold rounded-lg text-[11px] py-1.5 px-3.5 flex items-center gap-1 disabled:opacity-70"
                  >
                    {saving ? "Inserting..." : "Confirm & Save"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Attendance list */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FaSpinner className="animate-spin text-blue-500 text-lg mb-2" />
              <p className="text-slate-400 text-xs">Syncing logs...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs font-bold text-slate-400 mb-1">No members are being tracked.</p>
              <p className="text-[11px] text-slate-400">Click <span className="font-bold text-blue-500">Roster</span> to enable members for attendance.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredMembers.map((member) => {
                const isPresent = attendance[member.id] === "Present";
                return (
                  <div key={member.id}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => handleToggleStatus(member.id)}
                  >
                    <div className="flex-1 pr-4 truncate">
                      <p className="font-semibold text-slate-700 text-s md:text-sm tracking-tight truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      {member.invited_by && (
                        <span className="inline-block text-[9px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded border border-orange-100 mt-0.5 max-w-full truncate">
                          {member.role || "1st Timer"} {`• via ${member.invited_by}`}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(member.id); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all min-w-[90px] md:min-w-[105px] justify-center ${
                          isPresent ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-white text-slate-400 border-slate-200"
                        }`}
                      >
                        <FaCheckCircle className={isPresent ? "text-emerald-500" : "text-slate-300"} />
                        <span>{isPresent ? "Present" : "Absent"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ MANAGE ROSTER MODAL ═══════════════ */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden pb-4 sm:pb-0">

            {/* Modal header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <FaUserCog className="text-blue-500" /> Manage Attendance Roster
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enable members to appear in the Roll Call list.
                </p>
              </div>
              <button onClick={() => { setShowRosterModal(false); initializeModule(); }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full shrink-0 cursor-pointer">
                <FaTimes />
              </button>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-slate-100 bg-white shrink-0 flex flex-col gap-2">
              {/* Search */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
                <FaSearch className="text-slate-400 text-xs ml-1" />
                <input type="text" placeholder="Search members..."
                  value={rosterSearch} onChange={e => setRosterSearch(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {/* Tribe + Role filter row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Tribe</label>
                  <select value={rosterTribeFilter} onChange={e => setRosterTribeFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer mt-0.5">
                    <option value="">All Tribes</option>
                    {TRIBES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
                  <label className="text-[8px] font-bold text-slate-400 uppercase">Role</label>
                  <select value={rosterRoleFilter} onChange={e => setRosterRoleFilter(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer mt-0.5">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* Bulk actions + count */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  <span className="font-black text-blue-600">{trackedCount}</span> / {rosterFiltered.length} tracked
                </span>
                <div className="flex gap-1.5">
                  <button type="button" disabled={savingRoster}
                    onClick={() => handleEnableAll(rosterFiltered)}
                    className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Enable All
                  </button>
                  <button type="button" disabled={savingRoster}
                    onClick={() => handleDisableAll(rosterFiltered)}
                    className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Disable All
                  </button>
                </div>
              </div>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 px-1.5 py-1">
              {rosterFiltered.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">No members match the filter.</div>
              ) : (
                rosterFiltered.map((m) => (
                  <div key={m.id}
                    className="flex items-center justify-between px-2.5 py-2.5 hover:bg-slate-50 rounded-xl transition-all">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-bold text-xs text-slate-800 truncate">{m.first_name} {m.last_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {m.role || "Member"}
                        </span>
                        {m.tribe && m.tribe !== "N/A" && (
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {m.tribe}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(m.id, m.is_attendance)}
                      className="shrink-0 cursor-pointer border-none bg-transparent"
                    >
                      {m.is_attendance ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200">
                          <FaToggleOn className="text-base text-emerald-500" /> Enabled
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 font-medium text-[11px] bg-slate-100 px-2 py-1.5 rounded-lg">
                          <FaToggleOff className="text-base" /> Disabled
                        </div>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => { setShowRosterModal(false); initializeModule(); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Done — Refresh Attendance List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ ATTENDANCE SUMMARY MODAL ═══════════════ */}
      {showCheckedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Attendance Summary</h2>
              <button type="button" onClick={() => setShowCheckedModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="flex border-b border-slate-100">
              {["present", "absent"].map(tab => (
                <button key={tab} type="button" onClick={() => setModalTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all relative ${
                    modalTab === tab
                      ? tab === "present" ? "text-emerald-600" : "text-rose-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab === "present" ? <FaCheckCircle size={14} /> : <FaTimes size={14} />}
                  {tab === "present" ? "Checked" : "Unchecked"}
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                    modalTab === tab
                      ? tab === "present" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab === "present" ? presentList.length : absentList.length}
                  </span>
                  {modalTab === tab && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${tab === "present" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  )}
                </button>
              ))}
            </div>

            <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex justify-end">
              <button type="button" onClick={handleCopyActiveTab}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50">
                <FaFileDownload size={12} />
                Copy {modalTab === "present" ? "Checked" : "Unchecked"} List
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const list = modalTab === "present" ? presentList : absentList;
                const isEmpty = list.length === 0;
                const isPresent = modalTab === "present";
                if (isEmpty) return (
                  <div className="text-center py-12">
                    <div className={`w-12 h-12 ${isPresent ? "bg-emerald-50" : "bg-rose-50"} rounded-full flex items-center justify-center mx-auto mb-3`}>
                      {isPresent
                        ? <FaCheckCircle className="text-emerald-300" size={20} />
                        : <FaTimes className="text-rose-300" size={20} />}
                    </div>
                    <p className="text-sm font-bold text-slate-400">{isPresent ? "No checked records yet" : "No unchecked records"}</p>
                    <p className="text-xs text-slate-300 mt-1">{isPresent ? "Mark members as present to see them here" : "Everyone is present!"}</p>
                  </div>
                );
                return (
                  <div className="space-y-1.5">
                    {list.map(member => (
                      <div key={member.id}
                        className={`flex items-center gap-3 px-3 py-2.5 ${isPresent ? "bg-emerald-50/40 border-emerald-100/50" : "bg-rose-50/40 border-rose-100/50"} border rounded-xl`}
                      >
                        <div className={`w-7 h-7 ${isPresent ? "bg-emerald-100" : "bg-rose-100"} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          {isPresent
                            ? <FaCheckCircle className="text-emerald-500" size={12} />
                            : <FaTimes className="text-rose-400" size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{member.first_name} {member.last_name}</p>
                          {member.invited_by && <p className="text-[10px] text-slate-400 font-medium">via {member.invited_by}</p>}
                        </div>
                        <span className={`text-[10px] font-bold ${isPresent ? "text-emerald-600 bg-emerald-100" : "text-rose-600 bg-rose-100"} px-2 py-0.5 rounded-full flex-shrink-0`}>
                          {isPresent ? "Present" : "Absent"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <p className="text-[10px] text-slate-400 font-medium">
                Showing {modalTab === "present" ? presentList.length : absentList.length} of {filteredMembers.length} filtered
              </p>
              <button type="button" onClick={() => setShowCheckedModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to top */}
      {showScrollTop && (
        <button type="button" onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <FaArrowUp className="text-sm md:text-base" />
        </button>
      )}
    </div>
  );
}