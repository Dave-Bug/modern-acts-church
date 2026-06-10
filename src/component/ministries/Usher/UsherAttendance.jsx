import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaCheckCircle, FaSpinner, FaSave, FaSearch, FaUserPlus, FaTimes, FaFileDownload } from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function UsherAttendance() {
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [roleFilter, setRoleFilter] = useState("All"); 
  const [showAddVisitor, setShowAddVisitor] = useState(false);
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
        console.error("Roster parsing timeline error:", err.message);
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

  const handleBulkVisitorSubmit = (e) => {
    e.preventDefault();
    if (!visitorText.trim()) return;

    const lines = visitorText.split("\n").map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const timestamp = Date.now();
    const addedPersons = [];
    const newAttendanceUpdates = {};

    lines.forEach((line, index) => {
      const parts = line.split(/\s+/);
      const firstName = parts[0] || "Visitor";
      const lastName = parts.slice(1).join(" ") || "";
      const temporaryId = `visitor-new-${timestamp}-${index}`;

      addedPersons.push({
        id: temporaryId,
        first_name: firstName,
        last_name: lastName,
        role: "Visitor",
        tribe: "N/A", 
        invited_by: invitedBy.trim() || "" 
      });

      newAttendanceUpdates[temporaryId] = "Present";
    });

    setMembers(prev => [...prev, ...addedPersons]);
    setAttendance(prev => ({ ...prev, ...newAttendanceUpdates }));

    setVisitorText("");
    setInvitedBy("");
    setShowAddVisitor(false);
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const activeService = getServiceName(selectedDate);
      
      const payload = members.map(member => {
        const fullName = `${member.first_name} ${member.last_name || ""}`.trim();
        return {
          name: fullName,
          date: selectedDate,
          tribe: member.tribe || "N/A",
          invited_by: member.role === "Visitor" ? (member.invited_by || "") : "",
          status: attendance[member.id] || "Absent",
          service: activeService
        };
      });

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
      return [
        fullName,
        selectedDate,
        member.tribe || "N/A",
        member.role === "Visitor" ? (member.invited_by || "N/A") : "",
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

  const handleRoleFilterChange = (newRole) => {
    setRoleFilter(newRole);
    setShowAddVisitor(false);
  };

  const filteredMembers = members.filter(member => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || (member.role || "Member").toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const presentCount = Object.values(attendance).filter(v => v === "Present").length;
  const absentCount = Object.values(attendance).filter(v => v === "Absent").length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12">
      {/* Home / Back Action Button */}
     <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-16 md:pt-20">
        
        {/* Header Title (Scrolls away) */}
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

        {/* Date Selection Box (Scrolls away) */}
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

        {/* Dynamic Stats Row Dashboard (Scrolls away) */}
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

        {/* ONLY THIS ROW IS STICKY
            Pins your search bar and action buttons to the top when scrolling down.
        */}
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
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-xs md:text-sm font-bold text-slate-600 cursor-pointer focus:ring-0"
              >
                <option value="All">All Roles</option>
                <option value="Member">Members</option>
                <option value="Minister">Ministers</option>
                <option value="Visitor">Visitors</option>
              </select>
            </div>

            <div className="grid grid-cols-3 sm:flex gap-2">
              <button
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
                onClick={handleExportToExcel}
                className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs md:text-sm transition-colors sm:min-w-[95px]"
              >
                <FaFileDownload className="text-slate-500" /> Export
              </button>

              <button
                onClick={handleSaveAttendance}
                disabled={loading || saving || members.length === 0}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 font-bold py-2 px-4 rounded-xl text-xs md:text-sm transition-colors shadow-sm sm:min-w-[95px]"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Insert Visitor Form Drawer (Stays neatly grouped inside the sticky frame) */}
          {showAddVisitor && (
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-md relative animate-fadeIn">
              <h3 className="text-xs md:text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <span>📋 Quick Record Insertion</span>
              </h3>
              <form onSubmit={handleBulkVisitorSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Names (One per line)</label>
                    <textarea
                      rows={2}
                      placeholder={"Kyle Korver\nLeBron James"}
                      required
                      value={visitorText}
                      onChange={(e) => setVisitorText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Invited By Reference</label>
                    <input
                      type="text"
                      placeholder="Optional details"
                      value={invitedBy}
                      onChange={(e) => setInvitedBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => { setShowAddVisitor(false); setVisitorText(""); }}
                    className="bg-slate-100 text-slate-600 font-bold rounded-lg text-[11px] py-1.5 px-3"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="bg-emerald-600 font-bold rounded-lg text-[11px] py-1.5 px-3.5">
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Scrollable Data List Container */}
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
                    {/* Identity Details Panel */}
                    <div className="flex-1 pr-4 truncate">
                      <p className="font-semibold text-slate-700 text-s md:text-sm tracking-tight truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      {member.role === "Visitor" && (
                        <span className="inline-block text-[9px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded border border-orange-100 mt-0.5 max-w-full truncate">
                          Visitor {member.invited_by ? `• via ${member.invited_by}` : ""}
                        </span>
                      )}
                    </div>

                    {/* Interactive Status Input Trigger Button */}
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
    </div>
  );
}

