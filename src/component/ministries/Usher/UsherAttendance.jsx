import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FaHome, 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaSpinner, 
  FaSave, 
  FaSearch, 
  FaUserPlus, 
  FaTimes, 
  FaFileDownload, 
  FaEye,
  FaArrowUp
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

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

  // Advanced Filter States
  const [primaryFilter, setPrimaryFilter] = useState("All"); 
  const [selectedTribe, setSelectedTribe] = useState(""); 

  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [showCheckedModal, setShowCheckedModal] = useState(false);
  const [modalTab, setModalTab] = useState("present"); // "present" | "absent"
  const [visitorText, setVisitorText] = useState(""); 
  const [invitedBy, setInvitedBy] = useState(""); 

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
    const handleScrollVisibility = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScrollVisibility);
    return () => window.removeEventListener("scroll", handleScrollVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    async function initializeModule() {
      try {
        setLoading(true);

        const { data: roster, error: rosterErr } = await supabase
          .from("usher_members")
          .select("id, first_name, last_name, role, tribe")
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

        const savedVisitors = [];
        existingRecords.forEach((record, index) => {
          const nameExistsInRoster = baseRoster.some(m => {
            const fullName = `${m.first_name} ${m.last_name || ""}`.trim();
            return fullName.toLowerCase() === record.name.toLowerCase();
          });

          if (!nameExistsInRoster) {
            const tempId = `visitor-saved-${index}`;
            const parts = record.name.split(/\s+/);
            const firstName = parts[0] || "Visitor";
            const lastName = parts.slice(1).join(" ") || "";

            savedVisitors.push({
              id: tempId,
              first_name: firstName,
              last_name: lastName,
              role: "Visitor",
              tribe: record.tribe || "N/A",
              invited_by: record.invited_by || ""
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
    initializeModule();
  }, [selectedDate]);

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

      if (inviterMatch && inviterMatch.tribe) {
        inheritedTribe = inviterMatch.tribe;
      }
    }

    lines.forEach((line) => {
      const parts = line.split(/\s+/);

      let firstName = "";
      let middleInitial = null;
      let lastName = "";

      if (parts.length === 1) {
        firstName = parts[0];
      } else if (parts.length === 2) {
        firstName = parts[0];
        lastName = parts[1];
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
        invited_by: invitedBy.trim() || null
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

      newlyCreatedMembers.forEach(newMember => {
        newAttendanceUpdates[newMember.id] = "Present";
      });

      setMembers(prev => [...prev, ...newlyCreatedMembers]);
      setAttendance(prev => ({ ...prev, ...newAttendanceUpdates }));

      setVisitorText("");
      setInvitedBy("");
      setInsertRole("Visitor");
      setShowAddVisitor(false);
      setShowInviterDropdown(false);

      alert(`Successfully saved ${newlyCreatedMembers.length} records! Tribe set to: ${inheritedTribe}`);
    } catch (err) {
      console.error("Database write error:", err);
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
          const inviterMatch = members.find(m => {
            const fName = `${m.first_name} ${m.last_name || ""}`.trim();
            return fName.toLowerCase() === member.invited_by.trim().toLowerCase();
          });
          if (inviterMatch && inviterMatch.tribe) {
            finalTribe = inviterMatch.tribe;
          }
        }

        uniquePayloadMap.set(fullName, {
          name: fullName,
          date: selectedDate,
          tribe: finalTribe,
          invited_by: member.invited_by || "",
          status: attendance[member.id] || "Absent",
          service: activeService
        });
      });

      const payload = Array.from(uniquePayloadMap.values());

      if (payload.length > 0) {
        const { error } = await supabase
          .from("usher_attendance")
          .upsert(payload, { onConflict: "date, name" });

        if (error) throw error;
      }

      setShowAddVisitor(false);
      alert(`Attendance successfully saved!`);
    } catch (err) {
      console.error("Database upsert failure:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportToExcel = () => {
    if (filteredMembers.length === 0) {
      alert("No records to export.");
      return;
    }

    const headers = ["Name", "Date", "Tribe", "Invited By", "Status", "Service"];
    const activeService = getServiceName(selectedDate);

    const rows = filteredMembers.map(member => {
      const fullName = `${member.first_name} ${member.last_name || ""}`.trim();

      let finalTribe = member.tribe || "N/A";
      if (member.invited_by) {
        const inviterMatch = members.find(m => `${m.first_name} ${m.last_name || ""}`.trim().toLowerCase() === member.invited_by.trim().toLowerCase());
        if (inviterMatch) finalTribe = inviterMatch.tribe;
      }

      return [
        fullName,
        selectedDate,
        finalTribe,
        member.invited_by || "N/A",
        attendance[member.id] || "Absent",
        activeService
      ];
    });

    const csvContent = [
      headers,
      ...rows
    ].map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `${activeService.replace(/\s+/g, '_')}_Report_${selectedDate}.csv`);
    downloadLink.style.visibility = "hidden";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrimaryFilterChange = (value) => {
    setPrimaryFilter(value);
    setSelectedTribe(""); 
    setShowAddVisitor(false);
  };

  const filteredMembers = members.filter(member => {
    const fullName = `${member.first_name} ${member.last_name || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());

    let matchesCriteria = true;
    if (primaryFilter === "Minister") {
      matchesCriteria = (member.role || "").toLowerCase() === "minister";
    } else if (primaryFilter === "1st Timer") {
      matchesCriteria = (member.role || "").toLowerCase() === "1st timer";
    } else if (primaryFilter === "2nd Timer") {
      matchesCriteria = (member.role || "").toLowerCase() === "2nd timer";
    } else if (primaryFilter === "Visitor") {
      matchesCriteria = (member.role || "").toLowerCase() === "visitor";
    } else if (primaryFilter === "Member") { 
      matchesCriteria = (member.role || "").toLowerCase() === "member";
    } else if (primaryFilter === "Tribe") {
      if (selectedTribe !== "") {
        let assignedTribe = member.tribe || "N/A";
        if (member.invited_by) {
          const inviterMatch = members.find(m => `${m.first_name} ${m.last_name || ""}`.trim().toLowerCase() === member.invited_by.trim().toLowerCase());
          if (inviterMatch && inviterMatch.tribe) {
            assignedTribe = inviterMatch.tribe;
          }
        }
        matchesCriteria = assignedTribe.toLowerCase() === selectedTribe.toLowerCase();
      }
    }

    return matchesSearch && matchesCriteria;
  });

  const presentCount = Object.values(attendance).filter(v => v === "Present").length;
  const absentCount = Object.values(attendance).filter(v => v === "Absent").length;

  // ═══════════════════════════════════════════════════════════════════════════════
  // TABBED MODAL HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const presentList = filteredMembers.filter(m => attendance[m.id] === "Present");
  const absentList = filteredMembers.filter(m => attendance[m.id] !== "Present");

  const formatMemberName = (member) => {
    const name = `${member.first_name} ${member.last_name || ""}`.trim();
    return member.invited_by ? `${name} (Invited by: ${member.invited_by})` : name;
  };

  const generateTabText = (tab) => {
    const list = tab === "present" ? presentList : absentList;
    const label = tab === "present" ? "CHECKED (Present)" : "UNCHECKED (Absent)";

    let output = `${label} — ${list.length}\n`;
    output += `${"─".repeat(30)}\n`;

    if (list.length === 0) {
      output += tab === "present" ? "No checked records.\n" : "No unchecked records.\n";
    } else {
      output += list.map(formatMemberName).join("\n");
    }

    return output;
  };

  const handleCopyActiveTab = () => {
    const text = generateTabText(modalTab);
    navigator.clipboard.writeText(text);
    alert(`${modalTab === "present" ? "Present" : "Absent"} list copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12">
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-16 md:pt-20">
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            📋
          </div>
          <h1 className="text-3xl md:text-5xl font-black">
            Service <span className="text-blue-600">Roll Call</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-sm mx-auto">
            Current Active Track: <span className="text-blue-600 font-bold">{getServiceName(selectedDate)}</span>
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-3 mb-4 shadow-sm flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <FaCalendarAlt className="text-blue-500 text-sm flex-shrink-0" />
            <div className="flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs md:text-sm font-bold text-slate-800 bg-transparent border-none focus:outline-none p-0 cursor-pointer w-full focus:ring-0"
              />
            </div>
          </div>
          <span className="text-[10px] md:text-xs bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-md max-w-[140px] md:max-w-none truncate">
            {getServiceName(selectedDate)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-slate-100 rounded-xl p-2.5 text-center shadow-sm">
            <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Total</p>
            <p className="text-base md:text-xl font-black text-slate-800 mt-0.5">{members.length}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-2.5 text-center shadow-sm">
            <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Present</p>
            <p className="text-base md:text-xl font-black text-emerald-600 mt-0.5">{presentCount}</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-2.5 text-center shadow-sm">
            <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Absent</p>
            <p className="text-base md:text-xl font-black text-rose-500 mt-0.5">{absentCount}</p>
          </div>
        </div>

        <div className="sticky top-0 z-40 bg-[#f8fafc] py-3 border-b border-slate-200/50 shadow-[0_4px_6px_-1px_rgba(248,250,252,0.9)] mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-white border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
              <FaSearch className="text-slate-400 text-xs flex-shrink-0" />
              <input
                type="text"
                placeholder="Search name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs md:text-sm bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="bg-white border border-slate-100 rounded-xl px-2 py-2 flex items-center shadow-sm sm:w-44">
              <select
                value={primaryFilter}
                onChange={(e) => handlePrimaryFilterChange(e.target.value)}
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
              <div className="bg-white border border-blue-200 rounded-xl px-2 py-2 flex items-center shadow-sm sm:w-44 animate-fadeIn">
                <select
                  value={selectedTribe}
                  onChange={(e) => setSelectedTribe(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-xs md:text-sm font-bold text-blue-600 cursor-pointer focus:ring-0"
                >
                  <option value="">Select Tribe</option>
                  <option value="Samuel/Abraham">Samuel/Abraham</option>
                  <option value="Leah/Ruth">Leah/Ruth</option>
                  <option value="Yeshua">Yeshua</option>
                  <option value="Daniel">Daniel</option>
                  <option value="Esther">Esther</option>
                  <option value="Sarah">Sarah</option>
                  <option value="Josiah">Josiah</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-4 sm:flex gap-2">
              <button
                type="button"
                onClick={() => setShowCheckedModal(true)}
                className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-2 rounded-xl text-xs md:text-sm transition-colors sm:min-w-[95px]"
              >
                <FaEye className="text-blue-500" />
                <span>Checked</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddVisitor(prev => !prev)}
                className={`flex items-center justify-center gap-1.5 font-bold py-2 px-3 rounded-xl text-xs md:text-sm transition-colors border sm:min-w-[95px] ${
                  showAddVisitor 
                    ? "bg-rose-50 border-rose-200 text-rose-600" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showAddVisitor ? <FaTimes /> : <FaUserPlus />}
                <span>Insert</span>
              </button>

              <button
                type="button"
                onClick={handleExportToExcel}
                className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs md:text-sm transition-colors sm:min-w-[95px]"
              >
                <FaFileDownload className="text-slate-500" /> <span>Export</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={loading || saving || members.length === 0}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 font-bold py-2 px-4 rounded-xl text-xs md:text-sm transition-colors shadow-sm sm:min-w-[95px]"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                <span>Save</span>
              </button>
            </div>
          </div>

          {showAddVisitor && (
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-md relative animate-fadeIn">
              <h3 className="text-xs md:text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <span>📋 Quick Database Member Insertion</span>
              </h3>
              <form onSubmit={handleBulkVisitorSubmit} className="flex flex-col gap-3">

                <div className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-center gap-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Select Database Role:</label>
                  <div className="flex gap-2">
                    {["Visitor", "Member", "Minister", "1st Timer", "2nd Timer"].map((roleOption) => (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => setInsertRole(roleOption)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                          insertRole === roleOption
                            ? "bg-blue-650 text-green font-green"
                            : "bg-blue border border-slate-250 text-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {roleOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Names (One per line)
                    </label>
                    <textarea
                      rows={3}
                      placeholder={"First Name Middle Initial Last Name\nChristian S. Carmesis\n"}
                      required
                      value={visitorText}
                      onChange={(e) => setVisitorText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      * Rules: Last word becomes the last name. Single letter before the last word becomes Middle Initial.
                    </p>
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Invited By Reference
                    </label>
                    <input
                      type="text"
                      placeholder="Type to search members..."
                      value={invitedBy}
                      onChange={(e) => {
                        setInvitedBy(e.target.value);
                        setShowInviterDropdown(true);
                      }}
                      onFocus={() => setShowInviterDropdown(true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />

                    {showInviterDropdown && invitedBy.trim() !== "" && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                        {filteredInviters.length > 0 ? (
                          filteredInviters.map((m) => {
                            const fullName = `${m.first_name} ${m.last_name || ""}`.trim();
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setInvitedBy(fullName);
                                  setShowInviterDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex justify-between items-center border-b border-slate-50 last:border-none"
                              >
                                <span className="font-medium">{fullName}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">
                                  {m.role || "Member"}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-400 italic">
                            No matching member found (Custom name)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => { 
                      setShowAddVisitor(false); 
                      setVisitorText(""); 
                      setInsertRole("1st Timer"); 
                      setShowInviterDropdown(false);
                    }}
                    className="bg-slate-100 text-slate-600 font-bold rounded-lg text-[11px] py-1.5 px-3"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-emerald-600 font-bold rounded-lg text-[11px] py-1.5 px-3.5 flex items-center gap-1 disabled:opacity-70"
                  >
                    {saving ? "Inserting..." : "Confirm & Save"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FaSpinner className="animate-spin text-blue-500 text-lg mb-2" />
              <p className="text-slate-400 text-xs">Syncing logs...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center">
              <h3 className="text-xs font-bold text-slate-400">No matching items found</h3>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredMembers.map((member) => {
                const isPresent = attendance[member.id] === "Present";

                return (
                  <div
                    key={member.id}
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(member.id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all min-w-[90px] md:min-w-[105px] justify-center ${
                          isPresent 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                            : "bg-white text-slate-400 border-slate-200"
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

      {/* ═══════════════════════════════════════════════════════════════════════════════
          TABBED ATTENDANCE SUMMARY MODAL
          ═══════════════════════════════════════════════════════════════════════════════ */}
      {showCheckedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Attendance Summary
              </h2>
              <button 
                type="button"
                onClick={() => setShowCheckedModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setModalTab("present")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all relative ${
                  modalTab === "present"
                    ? "text-emerald-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <FaCheckCircle size={14} />
                Checked
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  modalTab === "present" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {presentList.length}
                </span>
                {modalTab === "present" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("absent")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all relative ${
                  modalTab === "absent"
                    ? "text-rose-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <FaTimes size={14} />
                Unchecked
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  modalTab === "absent" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {absentList.length}
                </span>
                {modalTab === "absent" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Copy Button Row */}
            <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleCopyActiveTab}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
              >
                <FaFileDownload size={12} />
                Copy {modalTab === "present" ? "Checked" : "Unchecked"} List
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {modalTab === "present" ? (
                presentList.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaCheckCircle className="text-emerald-300" size={20} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No checked records yet</p>
                    <p className="text-xs text-slate-300 mt-1">Mark members as present to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {presentList.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50/40 border border-emerald-100/50 rounded-xl"
                      >
                        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FaCheckCircle className="text-emerald-500" size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          {member.invited_by && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              via {member.invited_by}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          Present
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                absentList.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaTimes className="text-rose-300" size={20} />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No unchecked records</p>
                    <p className="text-xs text-slate-300 mt-1">Everyone is present!</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {absentList.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-3 py-2.5 bg-rose-50/40 border border-rose-100/50 rounded-xl"
                      >
                        <div className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FaTimes className="text-rose-400" size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          {member.invited_by && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              via {member.invited_by}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          Absent
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <p className="text-[10px] text-slate-400 font-medium">
                Showing {modalTab === "present" ? presentList.length : absentList.length} of {filteredMembers.length} filtered
              </p>
              <button
                type="button"
                onClick={() => setShowCheckedModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Scroll to top"
        >
          <FaArrowUp className="text-sm md:text-base" />
        </button>
      )}
    </div>
  );
}