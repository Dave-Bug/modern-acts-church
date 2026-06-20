import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaHome,
  FaMusic,
  FaCalendarAlt,
  FaUsers,
  FaMicrophone,
  FaPlus,
  FaChevronDown,
  FaUserCheck,
} from "react-icons/fa";
import { supabase } from "../../Services/supabase";

// ============================================================
// HELPER: Fetch members by ministry name from usher_members
// ============================================================
async function getMinistryMembers(ministryFilter) {
  try {
    const { data, error } = await supabase
      .from("usher_members")
      .select(
        "id, first_name, last_name, middle_initial, ministry, role, tribe, invited_by"
      )
      .ilike("ministry", `%${ministryFilter}%`)
      .order("last_name", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
    };
  } catch (err) {
    console.error(`Error fetching ${ministryFilter} members:`, err);
    return { success: false, error: err.message, data: [], count: 0 };
  }
}

function getFullName(member) {
  const parts = [member.first_name, member.middle_initial, member.last_name].filter(
    Boolean
  );
  return parts.join(" ");
}

export default function WorshipTeam() {
  const [schedules, setSchedules] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedLeader, setSelectedLeader] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [schedulesResult, membersResult] = await Promise.all([
      supabase
        .from("worship_schedules")
        .select("*")
        .order("date", { ascending: true }),
      getMinistryMembers("Worship Team"),
    ]);

    if (!schedulesResult.error) setSchedules(schedulesResult.data || []);
    if (membersResult.success) setMembers(membersResult.data);

    setLoading(false);
  };

  const handleAssignLeader = async (scheduleId, memberId) => {
    if (!memberId) return;
    setSaving(true);
    const selected = members.find((m) => m.id.toString() === memberId);
    const { error } = await supabase
      .from("worship_schedules")
      .update({ leader: getFullName(selected) })
      .eq("id", scheduleId);

    if (!error) {
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === scheduleId ? { ...s, leader: getFullName(selected) } : s
        )
      );
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-3 left-3 z-50 sm:top-4 sm:left-4">
        <Link
          to="/Ministries"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome />
          <span className="hidden sm:inline">Back</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 md:py-14 pt-16 sm:pt-20">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            <FaMusic />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black">
            Worship <span className="text-sky-600">Team</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-sm mx-auto">
            Schedule worship services, manage song lineups, and coordinate team
            rotations.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 max-w-3xl mx-auto mb-8">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaCalendarAlt className="text-sky-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">
              {schedules.length}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">
              Upcoming
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaUsers className="text-sky-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">
              {members.length}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">
              Roster
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 text-center">
            <FaMicrophone className="text-sky-500 text-lg mx-auto mb-2" />
            <div className="text-xl font-black text-slate-800">
              {schedules.filter((s) => s.leader).length}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">
              Assigned
            </div>
          </div>
        </div>

        {/* Team Roster Dropdown */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-sky-100 text-sky-600 p-2 rounded-lg">
              <FaUserCheck />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Worship Team Roster
              </h2>
              <p className="text-xs text-slate-500">
                Members from usher_members with Worship Team assignment
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400">Loading roster...</div>
          ) : members.length === 0 ? (
            <div className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
              No members found with "Worship Team" in their ministry record.
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedLeader}
                onChange={(e) => setSelectedLeader(e.target.value)}
                className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer"
              >
                <option value="">-- Select a worship team member --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {getFullName(m)}
                    {m.role ? ` • ${m.role}` : ""}
                    {m.tribe ? ` • ${m.tribe}` : ""}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
            </div>
          )}
        </div>

        {/* Schedule List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">
              Service Schedule
            </h2>
            <button className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer">
              <FaPlus size={10} /> New Schedule
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-sm text-slate-400">
                Loading schedules...
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <FaMusic className="text-slate-200 text-4xl mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-500">
                  No upcoming schedules
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a new worship service lineup to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-sky-200 transition-colors gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">
                        {s.title || "Worship Service"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(s.date).toLocaleDateString()} •{" "}
                        {s.time || "TBD"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {s.leader ? (
                        <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100 whitespace-nowrap">
                          {s.leader}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 whitespace-nowrap">
                          Unassigned
                        </span>
                      )}

                      <div className="relative flex-1 sm:flex-none min-w-[160px]">
                        <select
                          disabled={saving}
                          value=""
                          onChange={(e) =>
                            handleAssignLeader(s.id, e.target.value)
                          }
                          className="w-full appearance-none px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">Assign...</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {getFullName(m)}
                            </option>
                          ))}
                        </select>
                        <FaChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}