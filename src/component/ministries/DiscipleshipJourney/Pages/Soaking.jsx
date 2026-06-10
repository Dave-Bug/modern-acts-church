import { useState, useEffect } from "react";
import { 
  FaSearch, FaSpinner, FaRegSquare, FaCheckSquare, FaChevronRight,
  FaChevronDown, FaChevronUp, FaUserCheck 
} from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function Soaking() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");
  const [editingCell, setEditingCell] = useState(null); 
  const [editValue, setEditValue] = useState("");
  
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
    <div className="space-y-5 animate-fadeIn w-full px-1 mx-auto max-w-[100vw]">
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
            className={`pb-2 px-1 text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeTab === gender ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender}'s Soaking
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center gap-2 max-w-xs">
        <FaSearch className="text-slate-400 ml-1 text-xs" />
        <input
          type="text"
          placeholder="Search track profiles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* Main Container Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-cyan-500 text-base" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-sm font-bold text-slate-400">No active profiles processing in this tract.</div>
        ) : (
          <>
            {/* ================= DESKTOP VIEW ================= */}
            {/* Table layout style fluid optimization to snap perfectly to screen dimensions without rendering horizontal scroll */}
            <div className="hidden md:block w-full overflow-hidden selection:bg-slate-100">
              <table className="w-full text-left border-collapse table-fixed text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-black uppercase text-slate-300 tracking-wider text-center">
                    <th colSpan="5" className="py-2.5 border-r border-slate-800 text-left px-3">Demographics Info</th>
                    <th colSpan="1" className="py-2.5 border-r border-slate-800 bg-slate-800/60">Life</th>
                    <th colSpan="5" className="py-2.5 border-r border-slate-800 bg-cyan-950/40 text-cyan-300">Life Start Lessons</th>
                    <th colSpan="1" className="py-2.5 border-r border-slate-800">Oversight</th>
                    <th colSpan="2" className="py-2.5 border-r border-slate-800 bg-indigo-950/40 text-indigo-300">Retreat</th>
                    <th colSpan="1" className="py-2.5 border-r border-slate-800 bg-slate-800">Status</th>
                    <th colSpan="1" className="py-2.5 bg-slate-950 text-slate-200">Schooling</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-tight whitespace-nowrap">
                    <th className="py-2 px-3 w-[15%]">Full Name</th>
                    <th className="py-2 px-2 w-[9%]">Date Invited</th>
                    <th className="py-2 px-2 w-[10%]">Invited By</th>
                    <th className="py-2 px-1 text-center w-[4%]">Age</th>
                    <th className="py-2 px-2 w-[8%]">Tribe</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-center bg-slate-100/50 w-[12%]">Assigned Mentor</th>
                    <th className="py-2 px-1 text-center bg-cyan-50/10 text-cyan-700 w-[3.5%]">WTL</th>
                    <th className="py-2 px-1 text-center bg-cyan-50/10 text-cyan-700 w-[3.5%]">Bible</th>
                    <th className="py-2 px-1 text-center bg-cyan-50/10 text-cyan-700 w-[3.5%]">Pray</th>
                    <th className="py-2 px-1 text-center bg-cyan-50/10 text-cyan-700 w-[3.5%]">Group</th>
                    <th className="py-2 px-1 text-center bg-cyan-50/10 text-cyan-700 border-r border-slate-200 w-[3.5%]">Share</th>
                    <th className="py-2 px-2 border-r border-slate-200 text-center w-[7%]">Remarks</th>
                    <th className="py-2 px-1 text-center bg-indigo-50/10 text-indigo-700 w-[3.5%]">Pre</th>
                    <th className="py-2 px-1 text-center bg-indigo-50/10 text-indigo-700 border-r border-slate-200 w-[4.5%]">Encounter</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 w-[8%]">State</th>
                    <th className="py-2 px-2 text-center text-slate-700 w-[7%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                  {filteredRecords.map((person) => {
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
                      <tr key={person.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-2 px-3 font-black text-slate-900 text-xs truncate" title={person.full_name}>
                          {person.full_name}
                        </td>
                        <td className="py-2 px-2 text-slate-400 font-mono text-xs truncate">{person.date_invited || "—"}</td>
                        <td className="py-2 px-2 text-slate-500 font-black text-xs truncate" title={person.invited_by || ""}>{person.invited_by || "—"}</td>
                        <td className="py-2 px-1 text-center font-mono text-xs">{person.age || "—"}</td>
                        <td className="py-2 px-2 truncate">
                          <span className="text-cyan-700 bg-cyan-50 border border-cyan-100 px-1 py-0.5 rounded font-black text-[10px] uppercase tracking-tight block text-center truncate">
                            {person.tribe || "VISIT"}
                          </span>
                        </td>

                        {/* Mentor Dropdown Field */}
                        <td className="py-1 px-3 border-r border-slate-200 text-center">
                          {editingCell?.id === person.id && editingCell?.field === "mentor" ? (
                            <select
                              value={person.mentor || ""}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                saveTextUpdate(person.id, "mentor", e.target.value);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="border border-slate-300 rounded px-1 py-0.5 text-xs bg-white font-bold text-slate-700 focus:outline-none w-full shadow-inner"
                            >
                              <option value="">None</option>
                              {ministers.map((m, idx) => {
                                const fullName = `${m.first_name} ${m.last_name}`;
                                return <option key={idx} value={fullName}>{fullName}</option>;
                              })}
                            </select>
                          ) : (
                            <div 
                              onClick={() => { setEditingCell({ id: person.id, field: "mentor" }); setEditValue(person.mentor || ""); }}
                              className="text-blue-600 hover:text-blue-700 font-black text-xs cursor-pointer hover:underline truncate"
                              title="Click to assign mentor"
                            >
                              {person.mentor || "Assign Mentor +"}
                            </div>
                          )}
                        </td>

                        {/* Checkbox Matrix Fields */}
                        <td className="py-2 px-1 text-center bg-cyan-50/5">
                          <button onClick={() => toggleCheckbox(person.id, "ls_wtl", isWtlChecked)} className="text-base text-cyan-600 focus:outline-none align-middle inline-block cursor-pointer transform active:scale-90 transition-transform">
                            {isWtlChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300 hover:text-slate-400" />}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-center bg-cyan-50/5">
                          <button onClick={() => toggleCheckbox(person.id, "ls_bible_devotion", isBibleChecked)} className="text-base text-cyan-600 focus:outline-none align-middle inline-block cursor-pointer transform active:scale-90 transition-transform">
                            {isBibleChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-center bg-cyan-50/5">
                          <button onClick={() => toggleCheckbox(person.id, "ls_prayer", isPrayerChecked)} className="text-base text-cyan-600 focus:outline-none align-middle inline-block cursor-pointer transform active:scale-90 transition-transform">
                            {isPrayerChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-center bg-cyan-50/5">
                          <button onClick={() => toggleCheckbox(person.id, "ls_lifegroup_church", isGroupChecked)} className="text-base text-cyan-600 focus:outline-none align-middle inline-block cursor-pointer transform active:scale-90 transition-transform">
                            {isGroupChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-center bg-cyan-50/5 border-r border-slate-200">
                          <button onClick={() => toggleCheckbox(person.id, "ls_sharing_others", isSharingChecked)} className="text-base text-cyan-600 focus:outline-none align-middle inline-block cursor-pointer transform active:scale-90 transition-transform">
                            {isSharingChecked ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>

                        {/* Remarks Status Field */}
                        <td className="py-1 px-1 border-r border-slate-200">
                          <select
                            value={isRemarksReady ? "Ready" : "Unready"}
                            onChange={(e) => handleRemarksChange(person.id, e.target.value)}
                            className={`text-[11px] font-black px-1.5 py-1 rounded-lg border focus:outline-none cursor-pointer w-full text-center shadow-xs transition-colors ${
                              isRemarksReady ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            <option value="Ready">Ready</option>
                            <option value="Unready">Unready</option>
                          </select>
                        </td>

                        {/* Retreat Checkboxes */}
                        <td className="py-2 px-1 text-center bg-indigo-50/5">
                          <button onClick={() => toggleCheckbox(person.id, "lr_pre_retreat", hasPreRetreat)} className="text-base text-indigo-600 focus:outline-none align-middle inline-block cursor-pointer transform active:scale-90 transition-transform">
                            {hasPreRetreat ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>
                        <td className="py-2 px-1 text-center bg-indigo-50/5 border-r border-slate-200">
                          <button onClick={() => toggleCheckbox(person.id, "lr_life_retreat", hasLifeRetreat)} className="text-base text-indigo-600 focus:outline-none align-middle inline-block cursor-pointer transform active:scale-90 transition-transform">
                            {hasLifeRetreat ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                          </button>
                        </td>

                        {/* Operational Pipeline State Selector */}
                        <td className="py-1 px-1 border-r border-slate-200">
                          <select
                            value={isStatusActive ? "Active" : "Inactive"}
                            onChange={(e) => handleStatusChange(person.id, e.target.value)}
                            className={`text-[11px] font-black px-1 py-1 rounded-lg border focus:outline-none cursor-pointer w-full text-center uppercase shadow-xs transition-colors ${
                              isStatusActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>

                        {/* Handoff Module Action Trigger */}
                        <td className="py-1 px-1 text-center">
                          {isReadyToProceed ? (
                            <button
                              onClick={() => handleProceedToSchooling(person)}
                              className="inline-flex items-center justify-center gap-0.5 text-[11px] font-black bg-blue-600 hover:bg-blue-700 w-full py-1 rounded-lg transition-all cursor-pointer active:scale-95 shadow-sm"
                            >
                              Proceed <FaChevronRight className="text-[7px]" />
                            </button>
                          ) : (
                            <span className="text-slate-300 font-bold text-[11px] tracking-wide block text-center">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ================= MOBILE CARDS VIEW ================= */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredRecords.map((person) => {
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
                  <div key={person.id} className="p-3 bg-white space-y-2">
                    <div 
                      onClick={() => toggleCardExpansion(person.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{person.full_name}</h4>
                        <p className="text-xs text-slate-400">
                          Tribe: <span className="text-cyan-600 font-bold">{person.tribe || "VISITOR"}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          isStatusActive ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
                        }`}>
                          {isStatusActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                        <div className="text-slate-400 p-0.5">
                          {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-3 text-xs text-slate-600 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Invited By</span>
                            <span className="text-slate-700 truncate block">{person.invited_by || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Date / Age</span>
                            <span className="text-slate-700">{person.date_invited || "—"} ({person.age || "—"})</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <FaUserCheck /> Assigned Mentor
                          </label>
                          <select
                            value={person.mentor || ""}
                            onChange={(e) => saveTextUpdate(person.id, "mentor", e.target.value)}
                            className="w-full border border-slate-200 bg-white font-bold rounded-lg px-2 h-8 text-xs text-slate-700 focus:outline-none"
                          >
                            <option value="">Select Mentor</option>
                            {ministers.map((m, idx) => {
                              const fullName = `${m.first_name} ${m.last_name}`;
                              return <option key={idx} value={fullName}>{fullName}</option>;
                            })}
                          </select>
                        </div>

                        <div className="space-y-1.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-xs">
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Lessons Tracker</span>
                          <div className="grid grid-cols-2 gap-y-1.5 font-bold text-slate-700">
                            <button onClick={() => toggleCheckbox(person.id, "ls_wtl", isWtlChecked)} className="flex items-center gap-1.5 text-left focus:outline-none">
                              {isWtlChecked ? <FaCheckSquare className="text-cyan-600" /> : <FaRegSquare className="text-slate-300" />}
                              <span>LS: WTL</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_bible_devotion", isBibleChecked)} className="flex items-center gap-1.5 text-left focus:outline-none">
                              {isBibleChecked ? <FaCheckSquare className="text-cyan-600" /> : <FaRegSquare className="text-slate-300" />}
                              <span>LS: Bible Dev</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_prayer", isPrayerChecked)} className="flex items-center gap-1.5 text-left focus:outline-none">
                              {isPrayerChecked ? <FaCheckSquare className="text-cyan-600" /> : <FaRegSquare className="text-slate-300" />}
                              <span>LS: Prayer</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_lifegroup_church", isGroupChecked)} className="flex items-center gap-1.5 text-left focus:outline-none">
                              {isGroupChecked ? <FaCheckSquare className="text-cyan-600" /> : <FaRegSquare className="text-slate-300" />}
                              <span>LS: Group/Ch</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "ls_sharing_others", isSharingChecked)} className="flex items-center gap-1.5 text-left focus:outline-none">
                              {isSharingChecked ? <FaCheckSquare className="text-cyan-600" /> : <FaRegSquare className="text-slate-300" />}
                              <span>LS: Sharing</span>
                            </button>
                          </div>

                          <div className="border-t border-slate-200 pt-1.5 mt-1.5 grid grid-cols-2 gap-y-1.5 font-bold text-slate-700">
                            <button onClick={() => toggleCheckbox(person.id, "lr_pre_retreat", hasPreRetreat)} className="flex items-center gap-1.5 text-left focus:outline-none">
                              {hasPreRetreat ? <FaCheckSquare className="text-indigo-600" /> : <FaRegSquare className="text-slate-300" />}
                              <span>Pre-Retreat</span>
                            </button>
                            <button onClick={() => toggleCheckbox(person.id, "lr_life_retreat", hasLifeRetreat)} className="flex items-center gap-1.5 text-left focus:outline-none">
                              {hasLifeRetreat ? <FaCheckSquare className="text-indigo-600" /> : <FaRegSquare className="text-slate-300" />}
                              <span>Encounter</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Remarks</label>
                            <select
                              value={isRemarksReady ? "Ready" : "Unready"}
                              onChange={(e) => handleRemarksChange(person.id, e.target.value)}
                              className={`text-xs font-bold px-2 h-8 rounded-lg border w-full focus:outline-none cursor-pointer ${
                                isRemarksReady ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                              }`}
                            >
                              <option value="Ready">Ready</option>
                              <option value="Unready">Unready</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Pipeline Status</label>
                            <select
                              value={isStatusActive ? "Active" : "Inactive"}
                              onChange={(e) => handleStatusChange(person.id, e.target.value)}
                              className={`text-xs font-bold px-2 h-8 rounded-lg border w-full focus:outline-none cursor-pointer uppercase ${
                                isStatusActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                              }`}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-1">
                          <button
                            onClick={() => handleProceedToSchooling(person)}
                            disabled={!isReadyToProceed}
                            className={`w-full flex items-center justify-center gap-2 text-xs font-black uppercase py-2 rounded-xl transition-all ${
                              isReadyToProceed 
                                ? "bg-slate-900 hover:bg-slate-800" 
                                : "bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed"
                            }`}
                          >
                            {isReadyToProceed ? <>Proceed to Schooling <FaChevronRight className="text-[8px]" /></> : "Pending Metrics"}
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