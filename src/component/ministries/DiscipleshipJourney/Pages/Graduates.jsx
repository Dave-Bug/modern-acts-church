import { useState, useEffect } from "react";
import { 
  FaSearch, FaSpinner, FaAward, FaUser, 
  FaVenus, FaMars, FaGraduationCap, FaChevronRight,
  FaUndo, FaCheckCircle, FaCog, FaTimes, FaBriefcase,
  FaWrench, FaPlus, FaMinus
} from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

const MINISTRY_OPTIONS = [
  { id: "Usher",              label: "Usher" },
  { id: "Multimedia",         label: "Multimedia" },
  { id: "Worship Team",       label: "Worship Team" },
  { id: "Marshall",           label: "Marshall" },
  { id: "DJ Team",            label: "DJ Team" },
  { id: "Finance Department", label: "Finance Department" },
  { id: "Admin Department",   label: "Admin Department" },
  { id: "Mac Kids",           label: "Children Ministry" },
];

// ─── PARSE: text → array ───────────────────────────────────────────────────
// DB stores: "Multimedia, Usher"  →  JS: ["Multimedia", "Usher"]
function parseMinistry(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// ─── SERIALIZE: array → text ───────────────────────────────────────────────
// JS: ["Multimedia", "Usher"]  →  DB: "Multimedia, Usher"
function serializeMinistry(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.join(", ");
}

export default function Graduates() {
  const [graduates, setGraduates]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState("");
  const [activeGenderTab, setActiveGenderTab] = useState("All");
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Manage modal state
  const [manageModalOpen, setManageModalOpen]   = useState(false);
  const [managingRecord, setManagingRecord]     = useState(null);
  const [selectedMinistries, setSelectedMinistries] = useState([]);
  const [selectedRole, setSelectedRole]         = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");
  const [manageLoading, setManageLoading]       = useState(false);

  useEffect(() => { fetchGraduates(); }, []);

  // ─── FETCH ────────────────────────────────────────────────────────────────
  async function fetchGraduates() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("id, full_name, first_name, last_name, middle_initial, gender_category, date_invited, invited_by, age, tribe, mentor, ministry, role, function, life_class, schooling_status, current_stage")
        .eq("current_stage", "Graduated")
        .order("full_name", { ascending: true });

      if (error) throw error;

      // Normalize ministry to always be a JS array in local state
      const normalized = (data || []).map(r => ({
        ...r,
        ministry: parseMinistry(r.ministry),
      }));
      setGraduates(normalized);
    } catch (err) {
      console.error("Graduates fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── RESTORE ──────────────────────────────────────────────────────────────
  const handleRestoreToSchooling = async (record) => {
    if (!window.confirm(`Restore ${record.full_name} back to Schooling stage?`)) return;
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ current_stage: "Schooling", schooling_status: "Active" })
        .eq("id", record.id);

      if (error) throw error;
      setGraduates(prev => prev.filter(r => r.id !== record.id));
    } catch (err) {
      alert(err.message);
    }
  };

  // ─── OPEN MANAGE MODAL ────────────────────────────────────────────────────
  const openManageModal = (record) => {
    setManagingRecord(record);
    // ministry is already a normalized JS array from fetchGraduates()
    setSelectedMinistries(Array.isArray(record.ministry) ? [...record.ministry] : []);
    setSelectedRole(record.role || "");
    setSelectedFunction(record.function || "");
    setManageModalOpen(true);
  };

  const closeManageModal = () => {
    setManageModalOpen(false);
    setManagingRecord(null);
    setSelectedMinistries([]);
    setSelectedRole("");
    setSelectedFunction("");
  };

  const toggleMinistry = (ministryId) => {
    setSelectedMinistries(prev =>
      prev.includes(ministryId)
        ? prev.filter(m => m !== ministryId)
        : [...prev, ministryId]
    );
  };

  // ─── SAVE & SYNC ──────────────────────────────────────────────────────────
  const handleSaveManage = async () => {
    if (!managingRecord) return;
    setManageLoading(true);

    // Serialize: JS array → comma-separated string for DB
    const ministryString = serializeMinistry(selectedMinistries);

    try {
      // 1. Update consolidation_pipeline — ministry is TEXT (comma-separated)
      const { error: pipelineError } = await supabase
        .from("consolidation_pipeline")
        .update({
          ministry: ministryString,   // "Multimedia, Usher"
          role:     selectedRole,
          function: selectedFunction,
        })
        .eq("id", managingRecord.id);

      if (pipelineError) throw pipelineError;

      // 2. Update usher_members — ministry is also TEXT (comma-separated)
      const { data: usherRows, error: usherFetchError } = await supabase
        .from("usher_members")
        .select("id")
        .ilike("first_name", managingRecord.first_name || "")
        .ilike("last_name",  managingRecord.last_name  || "");

      if (usherFetchError) throw usherFetchError;

      if (usherRows && usherRows.length > 0) {
        const { error: usherUpdateError } = await supabase
          .from("usher_members")
          .update({
            ministry: ministryString,   // Same comma-separated format
            role:     selectedRole,
            function: selectedFunction,
          })
          .eq("id", usherRows[0].id);

        if (usherUpdateError) throw usherUpdateError;
      }

      // 3. Update local state — keep as JS array for React rendering
      const updated = {
        ...managingRecord,
        ministry: [...selectedMinistries],  // JS array for UI
        role:     selectedRole,
        function: selectedFunction,
      };
      setGraduates(prev => prev.map(r => r.id === managingRecord.id ? updated : r));

      closeManageModal();
      alert(`${managingRecord.full_name}'s assignment updated and synced successfully!`);

    } catch (err) {
      console.error("Save error:", err.message);
      alert("Failed to update: " + err.message);
    } finally {
      setManageLoading(false);
    }
  };

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const toggleCardExpansion = (id) =>
    setExpandedCardId(expandedCardId === id ? null : id);

  const filteredGraduates = graduates.filter((r) => {
    if (activeGenderTab !== "All" && r.gender_category !== activeGenderTab) return false;
    const term = searchQuery.toLowerCase();
    return (
      (r.full_name  || "").toLowerCase().includes(term) ||
      (r.tribe      || "").toLowerCase().includes(term) ||
      (r.mentor     || "").toLowerCase().includes(term) ||
      (r.role       || "").toLowerCase().includes(term) ||
      (r.function   || "").toLowerCase().includes(term) ||
      (Array.isArray(r.ministry) ? r.ministry.join(" ") : "").toLowerCase().includes(term)
    );
  });

  const genderCounts = {
    All:   graduates.length,
    Women: graduates.filter(r => r.gender_category === "Women").length,
    Men:   graduates.filter(r => r.gender_category === "Men").length,
  };

  // ─── MINISTRY BADGE helper ─────────────────────────────────────────────────
  const MinistryBadges = ({ ministry, justify = "center" }) => {
    const list = Array.isArray(ministry) ? ministry : [];
    if (list.length === 0)
      return <span className="text-slate-300 text-[10px]">—</span>;
    return (
      <div className={`flex flex-wrap gap-1 justify-${justify}`}>
        {list.map(min => (
          <span key={min} className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {min}
          </span>
        ))}
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fadeIn pb-6">

      {/* ── Header Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-amber-700">{graduates.length}</div>
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Graduates</div>
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-pink-600">{genderCounts.Women}</div>
          <div className="text-[10px] font-bold text-pink-500 uppercase tracking-wider">Women</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-blue-600">{genderCounts.Men}</div>
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Men</div>
        </div>
      </div>

      {/* ── Gender Tabs ── */}
      <div className="flex border-b border-slate-200 gap-4">
        {["All", "Women", "Men"].map(gender => (
          <button
            key={gender}
            onClick={() => setActiveGenderTab(gender)}
            className={`pb-2.5 px-1.5 text-xs sm:text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeGenderTab === gender
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender === "All" ? "All Graduates" : `${gender}'s Graduates`}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              activeGenderTab === gender ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
            }`}>
              {genderCounts[gender]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center gap-2 max-w-md">
        <FaSearch className="text-slate-400 ml-1.5 text-xs" />
        <input
          type="text"
          placeholder="Search graduate name, tribe, mentor, or ministry..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* ── List ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-amber-500 text-lg" />
          </div>
        ) : filteredGraduates.length === 0 ? (
          <div className="py-16 text-center">
            <FaAward className="text-4xl text-slate-200 mx-auto mb-3" />
            <div className="text-xs font-bold text-slate-400">No graduates found in this category.</div>
            <p className="text-[10px] text-slate-300 mt-1">Members appear here when their current stage is set to "Graduated"</p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase text-slate-300 tracking-wider">
                    <th className="py-3 px-3 text-left whitespace-nowrap">Name</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap">Tribe</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap">Gender</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap">Date Invited</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap">Mentor</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Role</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Ministry</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Function</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Life Class</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Schooling</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {filteredGraduates.map(person => (
                    <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">

                      {/* Name */}
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis" title={person.full_name}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <FaUser className="text-amber-600 text-[10px]" />
                          </div>
                          <span className="truncate">{person.full_name}</span>
                        </div>
                      </td>

                      {/* Tribe */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          {person.tribe || "N/A"}
                        </span>
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {person.gender_category === "Women" ? (
                          <span className="flex items-center gap-1 text-pink-600"><FaVenus className="text-xs" /> Women</span>
                        ) : (
                          <span className="flex items-center gap-1 text-blue-600"><FaMars className="text-xs" /> Men</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-400 font-mono whitespace-nowrap">
                        {person.date_invited || "—"}
                      </td>

                      {/* Mentor */}
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis" title={person.mentor}>
                        {person.mentor || "—"}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {person.role ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                            {person.role}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Ministry */}
                      <td className="py-3 px-3 text-center">
                        <MinistryBadges ministry={person.ministry} />
                      </td>

                      {/* Function */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {person.function ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                            <FaWrench className="text-[8px]" />{person.function}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Life Class */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border ${
                          person.life_class?.toUpperCase() === "COMPLETED" || person.life_class === true
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}>
                          <FaCheckCircle className="text-[8px]" />
                          {person.life_class?.toUpperCase() === "COMPLETED" || person.life_class === true ? "Done" : "Pending"}
                        </span>
                      </td>

                      {/* Schooling */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border ${
                          person.schooling_status?.toUpperCase() === "COMPLETED"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}>
                          <FaGraduationCap className="text-[8px]" />
                          {person.schooling_status || "N/A"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openManageModal(person)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                            title="Manage Ministry Assignment"
                          >
                            <FaCog className="text-[8px]" /> Manage
                          </button>
                          <button
                            onClick={() => handleRestoreToSchooling(person)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                            title="Restore to Schooling"
                          >
                            <FaUndo className="text-[8px]" /> Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredGraduates.map(person => (
                <div key={person.id} className="p-4 bg-white">
                  <div
                    onClick={() => toggleCardExpansion(person.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <FaUser className="text-amber-600 text-xs" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{person.full_name}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {person.tribe && (
                              <span className="text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase mr-2">
                                {person.tribe}
                              </span>
                            )}
                            <span className={person.gender_category === "Women" ? "text-pink-500" : "text-blue-500"}>
                              {person.gender_category}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                        <FaAward className="text-[8px]" /> GRAD
                      </span>
                      <FaChevronRight className={`text-xs text-slate-400 transition-transform ${expandedCardId === person.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {expandedCardId === person.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs text-slate-600 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Date Invited</span>
                          <span className="text-slate-700 font-mono">{person.date_invited || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Age</span>
                          <span className="text-slate-700 font-mono">{person.age || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Invited By</span>
                          <span className="text-slate-700 truncate block">{person.invited_by || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Mentor</span>
                          <span className="text-slate-700 truncate block">{person.mentor || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Role</span>
                          <span className="text-slate-700">{person.role || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Function</span>
                          <span className="text-slate-700 truncate block">{person.function || "—"}</span>
                        </div>
                      </div>

                      {/* Ministry */}
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider mb-1">Assigned Ministries</span>
                        <MinistryBadges ministry={person.ministry} justify="start" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                          <div className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Life Class</div>
                          <div className="text-sm font-black text-emerald-700">
                            {person.life_class?.toUpperCase() === "COMPLETED" || person.life_class === true ? "Completed" : "Pending"}
                          </div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                          <div className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Schooling</div>
                          <div className="text-sm font-black text-emerald-700">{person.schooling_status || "N/A"}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => openManageModal(person)}
                          className="flex-1 flex items-center justify-center gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          <FaCog className="text-[10px]" /> Manage
                        </button>
                        <button
                          onClick={() => handleRestoreToSchooling(person)}
                          className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2.5 rounded-xl transition-all cursor-pointer"
                        >
                          <FaUndo className="text-[10px]" /> Restore
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════ MANAGE MODAL ══════════════════ */}
      {manageModalOpen && managingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={closeManageModal} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FaBriefcase className="text-blue-600 text-sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Graduate</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{managingRecord.full_name}</p>
                </div>
              </div>
              <button
                onClick={closeManageModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <FaTimes size={14} />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Role Designation
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  <option value="Member">Member</option>
                  <option value="Minister">Minister</option>
                  <option value="Visitor">Visitor</option>
                  <option value="1st Timer">1st Timer</option>
                  <option value="2nd Timer">2nd Timer</option>
                </select>
              </div>

              {/* Function */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FaWrench className="text-slate-400" />
                  Specific Function
                </label>
                <input
                  type="text"
                  value={selectedFunction}
                  onChange={e => setSelectedFunction(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Lead Guitarist, Door Usher, Sound Engineer"
                />
              </div>

              {/* Ministry Toggle Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ministry Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {MINISTRY_OPTIONS.map((item) => {
                    const isSelected = selectedMinistries.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleMinistry(item.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-emerald-600 border-blue-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {isSelected ? <FaMinus className="text-[10px]" /> : <FaPlus className="text-[10px]" />}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Serialized Preview — shows how it will be saved to DB */}
              {selectedMinistries.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-2">
                    Saved As (Database Format)
                  </span>
                  <code className="text-sm font-mono text-blue-800 bg-white px-3 py-2 rounded border border-blue-100 block">
                    {serializeMinistry(selectedMinistries)}
                  </code>
                  <p className="text-[10px] text-blue-400 mt-1">
                    Stored as comma-separated text in both consolidation_pipeline and usher_members
                  </p>
                </div>
              )}

              {/* Function Preview */}
              {selectedFunction && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
                  <FaWrench className="text-slate-400 text-xs" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Function</span>
                    <span className="text-sm font-bold text-slate-700">{selectedFunction}</span>
                  </div>
                </div>
              )}

              {/* Sync notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <FaAward className="text-amber-500 text-xs mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  This will update <strong>ministry</strong> (as comma-separated text), <strong>role</strong>, and <strong>function</strong> in both tables.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeManageModal}
                  className="px-4 py-2.5 border border-slate-200 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveManage}
                  disabled={manageLoading}
                  className="px-5 py-2.5 bg-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {manageLoading ? (
                    <><FaSpinner className="animate-spin text-xs" /> Saving...</>
                  ) : (
                    <><FaCheckCircle className="text-xs" /> Save & Sync</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}