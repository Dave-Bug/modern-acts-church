import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaCheckCircle, FaSpinner, FaSave, FaSearch } from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function UsherAttendance() {
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function initializeModule() {
      try {
        setLoading(true);
        const { data: roster, error: rosterErr } = await supabase
          .from("usher_members")
          .select("id, first_name, last_name, ministry")
          .order("first_name", { ascending: true });

        if (rosterErr) throw rosterErr;
        setMembers(roster || []);
        await fetchAttendanceForDate(selectedDate, roster || []);
      } catch (err) {
        console.error("Database tracking initialization error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    initializeModule();
  }, [selectedDate]);

  const fetchAttendanceForDate = async (targetDate, rosterList) => {
    try {
      const { data: existingRecords, error } = await supabase
        .from("usher_attendance")
        .select("member_id, status")
        .eq("date", targetDate);

      if (error) throw error;

      const stateMap = {};
      rosterList.forEach(m => { stateMap[m.id] = "Absent"; });

      existingRecords?.forEach(record => {
        stateMap[record.member_id] = record.status;
      });

      setAttendance(stateMap);
    } catch (err) {
      console.error("Error matching localized date rows:", err.message);
    }
  };

  const handleToggleStatus = (memberId) => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: prev[memberId] === "Present" ? "Absent" : "Present"
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const payload = Object.entries(attendance).map(([memberId, currentStatus]) => ({
        date: selectedDate,
        member_id: parseInt(memberId),
        status: currentStatus
      }));

      const { error } = await supabase
        .from("usher_attendance")
        .upsert(payload, { onConflict: "date, member_id" });

      if (error) throw error;
      alert(`Attendance saved for ${formatDisplayDate(selectedDate)}!`);
    } catch (err) {
      console.error("Pipeline failure writing database rows:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const filteredMembers = members.filter(member => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const presentCount = Object.values(attendance).filter(v => v === "Present").length;
  const absentCount = Object.values(attendance).filter(v => v === "Absent").length;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 pt-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            📋
          </div>
          <h1 className="text-3xl md:text-5xl font-black">
            Service <span className="text-blue-600">Roll Call</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2 max-w-sm mx-auto">
            Select a date and mark attendance for your usher team members.
          </p>
        </div>

        {/* Date Picker + Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5 flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
              <FaCalendarAlt className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-bold text-slate-900 bg-transparent border-none focus:outline-none p-0"
              />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Members</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{members.length}</p>
          </div>

          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Present</p>
            <p className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">{presentCount}</p>
          </div>

          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Absent</p>
            <p className="text-2xl md:text-3xl font-bold text-rose-600 mt-1">{absentCount}</p>
          </div>
        </div>

        {/* Search + Save Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 bg-white/80 backdrop-blur border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <FaSearch className="text-slate-400 text-sm flex-shrink-0" />
            <input
              type="text"
              placeholder="Search member name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm bg-transparent border-none focus:outline-none placeholder:text-slate-400 font-medium text-slate-900"
            />
          </div>
          <button
            onClick={handleSaveAttendance}
            disabled={loading || saving || members.length === 0}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-black font-bold py-3 px-6 rounded-xl transition-colors flex-shrink-0"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
            <span className="hidden sm:inline">Save Attendance</span>
            <span className="sm:hidden">Save</span>
          </button>
        </div>

        {/* Members List */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FaSpinner className="animate-spin text-blue-500 text-2xl mb-3" />
              <p className="text-slate-500 text-sm">Loading members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
                🔍
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Members Found</h3>
              <p className="text-slate-500 text-sm">
                {searchTerm ? "No matches for your search." : "No registered members found."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-5">Name</div>
                <div className="col-span-3">Unit</div>
                <div className="col-span-4 text-center">Status</div>
              </div>

              {filteredMembers.map((member) => {
                const isPresent = attendance[member.id] === "Present";
                return (
                  <div
                    key={member.id}
                    className="flex flex-col md:grid md:grid-cols-12 md:gap-4 px-4 md:px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleToggleStatus(member.id)}
                  >
                    {/* Name */}
                    <div className="md:col-span-5 mb-2 md:mb-0">
                      <p className="font-semibold text-slate-900 text-sm">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-slate-400 md:hidden mt-0.5">
                        {member.ministry || "Usher"}
                      </p>
                    </div>

                    {/* Unit - hidden on mobile, shown on md+ */}
                    <div className="hidden md:col-span-3 md:flex items-center">
                      <span className="inline-block bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200">
                        {member.ministry || "Usher"}
                      </span>
                    </div>

                    {/* Status Toggle */}
                    <div className="md:col-span-4 flex md:justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(member.id);
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all w-full md:w-auto justify-center ${
                          isPresent
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
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