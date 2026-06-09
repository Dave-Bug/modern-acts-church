import { useState, useEffect } from "react";
import { FaSearch, FaSpinner, FaGraduationCap, FaRegSquare, FaCheckSquare } from "react-icons/fa";
import { supabase } from "../../../../Services/supabase";

export default function Schooling() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Women");
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchSchoolingData();
  }, []);

  async function fetchSchoolingData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("consolidation_pipeline")
        .select("*")
        .eq("current_stage", "Schooling")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Schooling matrix loading fault:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const parseBool = (val) => {
    if (val === true || val === 1) return true;
    if (!val) return false;
    const str = String(val).trim().toUpperCase();
    return str === "TRUE" || str === "COMPLETED";
  };

  const toggleCheckbox = async (id, field, currentVal) => {
    const parsedCurrent = parseBool(currentVal);
    const newVal = !parsedCurrent;

    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: newVal })
        .eq("id", id);

      if (error) throw error;
      setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: newVal } : r));
    } catch (err) {
      console.error("SOD database column status toggle error:", err.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ schooling_status: newStatus })
        .eq("id", id);

      if (error) throw error;
      setRecords(prev => prev.map(r => r.id === id ? { ...r, schooling_status: newStatus } : r));
    } catch (err) {
      console.error("Schooling tracking status error:", err.message);
    }
  };

  const saveTextUpdate = async (id, field) => {
    try {
      const trimmedValue = editValue.trim();
      const { error } = await supabase
        .from("consolidation_pipeline")
        .update({ [field]: trimmedValue || null })
        .eq("id", id);

      if (error) throw error;
      setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: trimmedValue } : r));
      setEditingCell(null);
    } catch (err) {
      console.error("Sync data error:", err.message);
    }
  };

  const handleGraduation = async (record) => {
    if (window.confirm(`Graduating ${record.full_name} will complete their consolidation processing track. Proceed?`)) {
      try {
        const { error } = await supabase
          .from("consolidation_pipeline")
          .update({
            current_stage: "Graduated",
            schooling_status: "Completed"
          })
          .eq("id", record.id);

        if (error) throw error;
        setRecords(prev => prev.filter(r => r.id !== record.id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredRecords = records.filter((r) => {
    const dbGender = String(r.gender_category || "").trim().toUpperCase();
    const currentTab = String(activeTab || "").trim().toUpperCase();
    if (dbGender !== currentTab) return false;

    const term = searchQuery.toLowerCase();
    return (
      (r.full_name || "").toLowerCase().includes(term) ||
      (r.tribe || "").toLowerCase().includes(term) ||
      (r.mentor || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">School of Discipleship (SOD)</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Track leadership validation courses, doctrine classes, and preaching tests</p>
      </div>

      <div className="flex border-b border-slate-200 gap-4">
        {["Women", "Men"].map((gender) => (
          <button
            key={gender}
            onClick={() => setActiveTab(gender)}
            className={`pb-2.5 px-1.5 text-xs sm:text-sm font-black border-b-2 relative top-[2px] transition-all cursor-pointer ${
              activeTab === gender ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {gender}'s SOD Track
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex items-center gap-2 max-w-md">
        <FaSearch className="text-slate-400 ml-1.5 text-xs" />
        <input
          type="text"
          placeholder="Search disciple name, tribe, or mentor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16"><FaSpinner className="animate-spin text-cyan-500 text-lg" /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400 p-6">
            <div className="max-w-sm mx-auto space-y-1">
              <p className="text-slate-700 font-extrabold text-sm">Schooling Submodule Pipeline Empty</p>
              <p className="text-slate-400 text-[11px] font-normal">Complete foundational entry checks inside the Soaking Pipeline stage to populate matching records here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Names</th>
                  <th className="py-3 px-3">Date Invited</th>
                  <th className="py-3 px-3">Invited By</th>
                  <th className="py-3 px-2 text-center">Age</th>
                  <th className="py-3 px-3">Tribes</th>
                  <th className="py-3 px-4 border-r border-slate-200">Mentor</th>
                  <th className="py-3 px-4 text-center bg-blue-50/30 text-blue-800">VLC</th>
                  <th className="py-3 px-4 text-center bg-blue-50/30 text-blue-800">SOD 1</th>
                  <th className="py-3 px-4 text-center bg-blue-50/30 text-blue-800">SOD 2</th>
                  <th className="py-3 px-4 text-center bg-blue-50/30 text-blue-800">SOD 3</th>
                  <th className="py-3 px-5 text-center bg-indigo-50/40 text-indigo-800 border-r border-slate-200">Preaching Test</th>
                  <th className="py-3 px-4 text-center border-r border-slate-200">Proceed</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                {filteredRecords.map((person) => {
                  const hasVlc = parseBool(person.vlc);
                  const hasSod1 = parseBool(person.sod_1);
                  const hasSod2 = parseBool(person.sod_2);
                  const hasSod3 = parseBool(person.sod_3);
                  const hasPreachingTest = parseBool(person.preaching_test);
                  const isStatusActive = String(person.schooling_status || "").trim().toUpperCase() === "ACTIVE";

                  const isReadyToGraduate = hasVlc && hasSod1 && hasSod2 && hasSod3 && hasPreachingTest && isStatusActive;

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 capitalize">{person.full_name}</td>
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{person.date_invited || "—"}</td>
                      <td className="py-3.5 px-3 text-slate-500 text-[11px] font-bold">{person.invited_by || "—"}</td>
                      <td className="py-3.5 px-2 text-center font-mono">{person.age || "—"}</td>
                      <td className="py-3.5 px-3">
                        <span className="text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          {person.tribe || "VISITOR"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 border-r border-slate-200">
                        {editingCell?.id === person.id && editingCell?.field === "mentor" ? (
                          <input
                            type="text" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveTextUpdate(person.id, "mentor")}
                            onKeyDown={(e) => e.key === "Enter" && saveTextUpdate(person.id, "mentor")}
                            autoFocus
                            className="border border-slate-300 text-xs px-1.5 py-0.5 rounded focus:outline-none w-full max-w-[130px]"
                          />
                        ) : (
                          <div 
                            onClick={() => { setEditingCell({ id: person.id, field: "mentor" }); setEditValue(person.mentor || ""); }}
                            className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                          >
                            {person.mentor || "Assign Mentor +"}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center bg-blue-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "vlc", hasVlc)} className="text-base text-blue-600 cursor-pointer align-middle focus:outline-none">
                          {hasVlc ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-blue-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "sod_1", hasSod1)} className="text-base text-blue-600 cursor-pointer align-middle focus:outline-none">
                          {hasSod1 ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-blue-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "sod_2", hasSod2)} className="text-base text-blue-600 cursor-pointer align-middle focus:outline-none">
                          {hasSod2 ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-blue-50/10">
                        <button onClick={() => toggleCheckbox(person.id, "sod_3", hasSod3)} className="text-base text-blue-600 cursor-pointer align-middle focus:outline-none">
                          {hasSod3 ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>
                      
                      <td className="py-3.5 px-5 text-center bg-indigo-50/10 border-r border-slate-200">
                        <button onClick={() => toggleCheckbox(person.id, "preaching_test", hasPreachingTest)} className="text-base text-indigo-600 cursor-pointer align-middle focus:outline-none">
                          {hasPreachingTest ? <FaCheckSquare /> : <FaRegSquare className="text-slate-300" />}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center border-r border-slate-200 font-bold">
                        {isReadyToGraduate ? (
                          <button
                            onClick={() => handleGraduation(person)}
                            className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-600 text-black hover:bg-emerald-700 px-2.5 py-1 rounded-md shadow-xs transition-all cursor-pointer"
                          >
                            Graduate <FaGraduationCap className="text-xs" />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-bold text-[11px]">Onprocess</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={isStatusActive ? "Active" : "Inactive"}
                          onChange={(e) => handleStatusChange(person.id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer transition-colors uppercase ${
                            !isStatusActive
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}