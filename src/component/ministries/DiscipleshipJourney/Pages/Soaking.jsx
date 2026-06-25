import { useState, useEffect } from "react";
import { 
  FaSearch, FaSpinner, FaRegSquare, FaCheckSquare, FaChevronRight,
  FaChevronDown, FaChevronUp, FaUser, FaCalendarAlt, FaUserCheck, FaAward 
} from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function Soaking() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");
  const [editingCell, setEditingCell] = useState(null); 
  const [editValue, setEditValue] = useState("");
  
  // State variables for drop-down resources and styling
  const [ministers, setMinisters] = useState([]);
  const [expandedCardId, setExpandedCardId] = useState(null);

  useEffect(() => {
    fetchSoakingData();
    fetchMinistersList();
  }, []);

  async function fetchSoakingData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("*")
        .ilike("current_stage", "Soaking")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Soaking data read error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMinistersList() {
    try {
      const { data, error } = await supabase
        .from("usher_members")
        .select("first_name, last_name")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setMinisters(data || []);
    } catch (err) {
      console.error("Error reading ministers list:", err.message);
    }
  }

  const parseBool = (val) => {
    if (val === true || val === 1) return true;
    if (!val) return false;
    const str = String(val).trim().toUpperCase();
    return str === "TRUE" || str === "COMPLETED";
  };

  const toggleCheckbox = async (id, field, currentVal) => {
    const newVal = currentVal ? "Pending" : "Completed";
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: newVal })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, [field]: newVal } : r));
    } catch (err) {
      console.error("Column status toggle fault:", err.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ soaking_status: newStatus })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, soaking_status: newStatus } : r));
    } catch (err) {
      console.error("Pipeline status update error:", err.message);
    }
  };

  const handleRemarksChange = async (id, newRemarks) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ remarks_for_lr: newRemarks })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, remarks_for_lr: newRemarks } : r));
    } catch (err) {
      console.error("Remarks update error:", err.message);
    }
  };

  const saveTextUpdate = async (id, field, selectedValue) => {
    const finalValue = selectedValue !== undefined ? selectedValue : editValue;
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: finalValue.trim() || null })
        .eq("id", id);

      if (error) throw error;
      setRecords(records.map(r => r.id === id ? { ...r, [field]: finalValue.trim() } : r));
      setEditingCell(null);
    } catch (err) {
      console.error("Sync error:", err.message);
    }
  };

  const handleProceedToSchooling = async (record) => {
    if (window.confirm(`Proceed ${record.full_name} to the Schooling Module?`)) {
      try {
        const { error } = await supabase
          .from("consolidation_pipeline")
          .update({ 
            current_stage: "Schooling",
            schooling_status: "Active"
          })
          .eq("id", record.id);

        if (error) throw error;
        setRecords(records.filter(r => r.id !== record.id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const toggleCardExpansion = (id) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const filteredRecords = records.filter((r) => {
    if (r.gender_category !== activeTab) return false;
    const term = searchQuery.toLowerCase();
    return (
      (r.full_name || "").toLowerCase().includes(term) ||
      (r.tribe || "").toLowerCase().includes(term) ||
      (r.mentor || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 animate-fadeIn pb-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">Soaking Pipeline</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage Life Class tracks, Life Start lessons, and Encounter processes</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        {["Women", "Men"].map((gender) => (
          <button
            key={gender}
            onClick={() => setActiveTab(gender)}
            className={`pb-2.5 px-1.5 text-xs sm:text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeTab === gender ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender}'s Soaking
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center gap-2 max-w-md">
        <FaSearch className="text-slate-400 ml-1.5 text-xs" />
        <input
          type="text"
          placeholder="Search name, tribe, or assigned mentor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSpinner className="animate-spin text-cyan-500 text-lg" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">No active profiles processing in this tract.</div>
        ) : (
          <>
            {/* ================= DESKTOP TABLE BREAKPOINT ================= */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px] lg:min-w-0 lg:w-full">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[9px] font-black uppercase text-slate-300 tracking-wider text-center">
                    <th colSpan="6" className="py-2 border-r border-slate-800 text-left px-4">Demographics Information</th>
                    <th colSpan="1" className="py-2 border-r border-slate-800 bg-slate-800/50">Life</th>
                    <th colSpan="5" className="py-2 border-r border-slate-800 bg-cyan-950/40 text-cyan-300">Life Start</th>
                    <th colSpan="1" className="py-2 border-r border-slate-800">Oversight</th>
                    <th colSpan="2" className="py-2 border-r border-slate-800 bg-indigo-950/40 text-indigo-300">Life Retreat Modules</th>
                    <th colSpan="1" className="py-2 border-r border-slate-800 bg-slate-800">Status</th>
                    <th colSpan="1" className="py-2 bg-slate-950 text-slate-200">Schooling</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-3">Date Invited</th>
                    <th className="py-3 px-3">Invited By</th>
                    <th className="py-3 px-2 text-center">Age</th>
                    <th className="py-3 px-3">Tribe</th>
                    <th className="py-3 px-4 border-r border-slate-200">Mentor Assignment</th>
                    <th className="py-3 px-3 text-center border-r border-slate-200 bg-slate-50/50">Life</th>
                    <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">WTL</th>
                    <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">Bible/Dev</th>
                    <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">Prayer</th>
                    <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700">Group/Ch</th>
                    <th className="py-3 px-3 text-center bg-cyan-50/20 text-cyan-700 border-r border-slate-200">Sharing</th>
                    <th className="py-3 px-4 border-r border-slate-200">Remarks for LR</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/20 text-indigo-700">Pre-Life</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/20 text-indigo-700 border-r border-slate-200">Retreat</th>
                    <th className="py-3 px-4 text-center border-r border-slate-200">Status</th>
                    <th className="py-3 px-4 text-center text-slate-700 font-extrabold">Schooling(SOD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {filteredRecords.map((person) => {
                    const isLifeClassChecked = parseBool(person.life_class);
                    const isWtlChecked = parseBool(person.ls_wtl);
                    const isBibleChecked = parseBool(person.ls_bible_devotion);
                    const isPrayerChecked = parseBool(person.ls_prayer);
                    const isGroupChecked = parseBool(person.ls_lifegroup_church);
                    const isSharingChecked = parseBool(person.ls_sharing_others);
                    
                    const hasPreRetreat = parseBool(person.lr_pre_retreat);
                    const hasLifeRetreat = parseBool(person.lr_life_retreat);

                    const isStatusActive = person.soaking_status?.toUpperCase() === "ACTIVE";
                    const isRemarksReady = person.remarks_for_lr?.toUpperCase() === "READY";
                    const isReadyToProceed = hasPreRetreat && hasLifeRetreat && isStatusActive && isRemarksReady;

                    return (
                      <tr key={person.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{person.full_name}</td>
                        <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{person.date_invited || "—"}</td>
                        <td className="py-3.5 px-3 text-slate-500 text-[11px] font-bold">{person.invited_by || "—"}</td>
                        <td className="py-3.5 px-2 text-center font-mono">{person.age || "—"}</td>
                        <td className="py-3.5 px-3">
                          <span className="text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                            {person.tribe || "VISITOR"}
                          </span>
                        </td>

                        {/* Mentor Dropdown Setup matches Soul Winning logic */}
                        <td className="py-3.5 px-4 border-r border-slate-200">
                          {editingCell?.id === person.id && editingCell?.field === "mentor" ? (
                            <select
                              value={person.mentor || ""}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                saveTextUpdate(person.id, "mentor", e.target.value);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="border border-slate-300 rounded-lg p-1 text-[11px] bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[150px]"
                            >
                              <option value="">Select Mentor</option>
                              {ministers.map((m, idx) => {
                                const fullName = `${m.first_name} ${m.last_name}`;
                                return <option key={idx} value={fullName}>{fullName}</option>;
                              })}
                            </select>
                          ) : (
                            <div 
                              onClick={() => { setEditingCell({ id: person.id, field: "mentor" }); setEditValue(person.mentor || ""); }}
                              className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                            >
                              {person.mentor || "Assign Mentor +"}
                            </div>
                          )}
                        </td>

                        {/* Checkboxes */}
                        <td className="py-3.5 px-3 text-center border-r border-slate-200 bg-slate-50/40">
                          <button onClick={() => toggleCheckbox(person.id, "life_class", isLifeClassChecked)} className="text-base text-cyan-600 focus:outline-none align-middle">
                            {isLifeClassChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                          <button onClick={() => toggleCheckbox(person.id, "ls_wtl", isWtlChecked)} className="text-base text-cyan-600 focus:outline-none align-middle">
                            {isWtlChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                          <button onClick={() => toggleCheckbox(person.id, "ls_bible_devotion", isBibleChecked)} className="text-base text-cyan-600 focus:outline-none align-middle">
                            {isBibleChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                          <button onClick={() => toggleCheckbox(person.id, "ls_prayer", isPrayerChecked)} className="text-base text-cyan-600 focus:outline-none align-middle">
                            {isPrayerChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-cyan-50/10">
                          <button onClick={() => toggleCheckbox(person.id, "ls_lifegroup_church", isGroupChecked)} className="text-base text-cyan-600 focus:outline-none align-middle">
                            {isGroupChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-cyan-50/10 border-r border-slate-200">
                          <button onClick={() => toggleCheckbox(person.id, "ls_sharing_others", isSharingChecked)} className="text-base text-cyan-600 focus:outline-none align-middle">
                            {isSharingChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 border-r border-slate-200 max-w-[160px]">
                          <select
                            value={isRemarksReady ? "Ready" : "Unready"}
                            onChange={(e) => handleRemarksChange(person.id, e.target.value)}
                            className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer transition-colors ${
                              isRemarksReady ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            <option value="Ready">Ready</option>
                            <option value="Unready">Unready</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-3 text-center bg-indigo-50/10">
                          <button onClick={() => toggleCheckbox(person.id, "lr_pre_retreat", hasPreRetreat)} className="text-base text-indigo-600 focus:outline-none align-middle">
                            {hasPreRetreat ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-center bg-indigo-50/10 border-r border-slate-200">
                          <button onClick={() => toggleCheckbox(person.id, "lr_life_retreat", hasLifeRetreat)} className="text-base text-indigo-600 focus:outline-none align-middle">
                            {hasLifeRetreat ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-center border-r border-slate-200">
                          <select
                            value={isStatusActive ? "Active" : "Inactive"}
                            onChange={(e) => handleStatusChange(person.id, e.target.value)}
                            className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer transition-colors uppercase ${
                              isStatusActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold">
                          {isReadyToProceed ? (
                            <button
                              onClick={() => handleProceedToSchooling(person)}
                              className="inline-flex items-center gap-1.5 text-[10px] font-black bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 shadow-blue-200"
                            >
                              Proceed <FaChevronRight className="text-[7px]" />
                            </button>
                          ) : (
                            <span className="text-slate-300 font-bold text-[11px]">Onprocess</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ================= MOBILE ADAPTIVE CARDS VIEW ================= */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredRecords.map((person) => {
                const isLifeClassChecked = parseBool(person.life_class);
                const isWtlChecked = parseBool(person.ls_wtl);
                const isBibleChecked = parseBool(person.ls_bible_devotion);
                const isPrayerChecked = parseBool(person.ls_prayer);
                const isGroupChecked = parseBool(person.ls_lifegroup_church);
                const isSharingChecked = parseBool(person.ls_sharing_others);
                const hasPreRetreat = parseBool(person.lr_pre_retreat);
                const hasLifeRetreat = parseBool(person.lr_life_retreat);

                const isStatusActive = person.soaking_status?.toUpperCase() === "ACTIVE";
                const isRemarksReady = person.remarks_for_lr?.toUpperCase() === "READY";
                const isReadyToProceed = hasPreRetreat && hasLifeRetreat && isStatusActive && isRemarksReady;
                const isExpanded = expandedCardId === person.id;

                return (
                  <div key={person.id} className="p-4 bg-white space-y-3">
                    <div 
                      onClick={() => toggleCardExpansion(person.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{person.full_name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tribe: <span className="text-cyan-600 font-bold">{person.tribe || "VISITOR"}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          isStatusActive ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
                        }`}>
                          {isStatusActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                        <div className="text-slate-400 p-1">
                          {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 space-y-4 text-xs text-slate-600 animate-fadeIn">
                        
                        {/* Summary Demographics Fields */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                          <div>
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Invited By</span>
                            <span className="text-slate-700 truncate block">{person.invited_by || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Date / Age</span>
                            <span className="text-slate-700">{person.date_invited || "—"}</span>
                            <span className="ml-2 font-mono text-slate-500">({person.age || "—"})</span>
                          </div>
                        </div>

                        {/* Dynamic Mentor Dropdown on Mobile */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FaUserCheck className="text-slate-400" /> Oversight Mentor
                          </label>
                          <select
                            value={person.mentor || ""}
                            onChange={(e) => saveTextUpdate(person.id, "mentor", e.target.value)}
                            className="w-full border border-slate-200 bg-white font-semibold rounded-xl px-3 py-2 text-xs text-slate-700 h-[38px] cursor-pointer"
                          >
                            <option value="">Select Mentor</option>
                            {ministers.map((m, idx) => {
                              const fullName = `${m.first_name} ${m.last_name}`;
                              return <option key={idx} value={fullName}>{fullName}</option>;
                            })}
                          </select>
                        </div>

                        {/* Metrics Checkbox Section */}
                        <div className="space-y-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Lesson Course Progress</span>
                          
                          <div className="grid grid-cols-2 gap-y-2 text-[11px] font-bold text-slate-700">
                            <button onClick={() => toggleCheckbox(person.id, "life_class", isLifeClassChecked)} className="flex items-center gap-2 text-left focus:outline-none">
                              {isLifeClassChecked ? <FaCheckSquare className="text-cyan-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>Life Class Track</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_wtl", isWtlChecked)} className="flex items-center gap-2 text-left focus:outline-none">
                              {isWtlChecked ? <FaCheckSquare className="text-cyan-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>LS: WTL</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_bible_devotion", isBibleChecked)} className="flex items-center gap-2 text-left focus:outline-none">
                              {isBibleChecked ? <FaCheckSquare className="text-cyan-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>LS: Bible Dev</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_prayer", isPrayerChecked)} className="flex items-center gap-2 text-left focus:outline-none">
                              {isPrayerChecked ? <FaCheckSquare className="text-cyan-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>LS: Prayer</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_lifegroup_church", isGroupChecked)} className="flex items-center gap-2 text-left focus:outline-none">
                              {isGroupChecked ? <FaCheckSquare className="text-cyan-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>LS: Group/Ch</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_sharing_others", isSharingChecked)} className="flex items-center gap-2 text-left focus:outline-none">
                              {isSharingChecked ? <FaCheckSquare className="text-cyan-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>LS: Sharing</span>
                            </button>
                          </div>

                          <div className="border-t border-slate-200/60 my-2 pt-2 grid grid-cols-2 gap-y-2 text-[11px] font-bold text-slate-700">
                            <button onClick={() => toggleCheckbox(person.id, "lr_pre_retreat", hasPreRetreat)} className="flex items-center gap-2 text-left focus:outline-none">
                              {hasPreRetreat ? <FaCheckSquare className="text-indigo-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>Pre-Retreat</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "lr_life_retreat", hasLifeRetreat)} className="flex items-center gap-2 text-left focus:outline-none">
                              {hasLifeRetreat ? <FaCheckSquare className="text-indigo-600 text-sm" /> : <FaRegSquare className="text-slate-300 text-sm" />}
                              <span>Life Retreat</span>
                            </button>
                          </div>
                        </div>

                        {/* Remarks Status */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Remarks for LR</label>
                            <select
                              value={isRemarksReady ? "Ready" : "Unready"}
                              onChange={(e) => handleRemarksChange(person.id, e.target.value)}
                              className={`text-[11px] font-bold px-2 py-1.5 rounded-xl border h-[36px] focus:outline-none cursor-pointer transition-colors ${
                                isRemarksReady ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                              }`}
                            >
                              <option value="Ready">Ready</option>
                              <option value="Unready">Unready</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Soaking Status</label>
                            <select
                              value={isStatusActive ? "Active" : "Inactive"}
                              onChange={(e) => handleStatusChange(person.id, e.target.value)}
                              className={`text-[11px] font-bold px-2 py-1.5 rounded-xl border h-[36px] focus:outline-none cursor-pointer transition-colors uppercase ${
                                isStatusActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                              }`}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>
                        </div>

                        {/* Action Handoff Button Control */}
                        <div className="pt-1">
                          <button
                            onClick={() => handleProceedToSchooling(person)}
                            disabled={!isReadyToProceed}
                            className={`w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all ${
                              isReadyToProceed 
                                ? "bg-slate-900 hover:bg-slate-800 shadow-sm" 
                                : "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            {isReadyToProceed ? (
                              <>Proceed to Schooling Module <FaChevronRight className="text-[8px]" /></>
                            ) : (
                              "Onprocess Verification"
                            )}
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

