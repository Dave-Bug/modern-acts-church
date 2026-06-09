import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FaHome, FaSearch, FaSpinner, FaClipboardList, 
  FaPlus, FaCheckCircle, FaRegCircle, FaTrash, FaClock, FaTimes,
  FaInfoCircle, FaTags, FaEdit, FaArrowRight
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function AdminTask() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedTask, setSelectedTask] = useState(null);

  // Form Fields State
  const [taskTitle, setTaskTitle] = useState("");
  const [department, setDepartment] = useState("General Office");
  const [targetDate, setTargetDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [description, setDescription] = useState("");
  const [itemsList, setItemsList] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [taskStatus, setTaskStatus] = useState("Pending");

  useEffect(() => {
    fetchAdminTasks();
    setTargetDate(new Date().toISOString().split('T')[0]);
  }, []);

  async function fetchAdminTasks() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("administration_logs")
        .select("*")
        .eq("type", "task") 
        .order("target_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching administrative tasks:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const updateTaskStatusDirect = async (taskObj, nextStatus) => {
    try {
      const { error } = await supabase
        .from("administration_logs")
        .update({ status: nextStatus })
        .eq("id", taskObj.id);

      if (error) throw error;

      setTasks(tasks.map(t => t.id === taskObj.id ? { ...t, status: nextStatus } : t));
      if (selectedTask && selectedTask.id === taskObj.id) {
        setSelectedTask({ ...selectedTask, status: nextStatus });
      }
    } catch (err) {
      console.error("Failed to promote task status:", err.message);
      alert(`Error moving task to ${nextStatus}: ${err.message}`);
    }
  };

  const addChecklistItem = () => {
    if (!newItemName.trim()) return;
    setItemsList([
      ...itemsList, 
      { id: crypto.randomUUID(), name: newItemName.trim(), checked: false }
    ]);
    setNewItemName("");
  };

  const removeChecklistItem = (id) => {
    setItemsList(itemsList.filter((item) => item.id !== id));
  };

  const toggleTaskItemCheckDirect = async (taskObj, itemIndex) => {
    const updatedItems = taskObj.needed_items.map((item, idx) => 
      idx === itemIndex ? { ...item, checked: !item.checked } : item
    );

    try {
      const { error } = await supabase
        .from("administration_logs")
        .update({ needed_items: updatedItems })
        .eq("id", taskObj.id);

      if (error) throw error;

      setTasks(tasks.map(t => t.id === taskObj.id ? { ...t, needed_items: updatedItems } : t));
      if (selectedTask && selectedTask.id === taskObj.id) {
        setSelectedTask({ ...selectedTask, needed_items: updatedItems });
      }
    } catch (err) {
      console.error("Failed to sync subtask item update:", err.message);
    }
  };

  const resetFormModal = () => {
    setIsModalOpen(false);
    setTaskTitle("");
    setDepartment("General Office");
    setTaskTime("");
    setDescription("");
    setItemsList([]);
    setNewItemName("");
    setSelectedTask(null);
    setModalMode("create");
    setTaskStatus("Pending");
    setTargetDate(new Date().toISOString().split('T')[0]);
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setDepartment(task.department);
    setTargetDate(task.target_date);
    setTaskTime(task.event_time || "");
    setDescription(task.description || "");
    setItemsList(task.needed_items?.map(i => i.id ? i : { ...i, id: crypto.randomUUID() }) || []);
    setTaskStatus(task.status || "Pending");
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();

    if (!taskTitle.trim() || !targetDate) {
      alert("Please fill out both the Task Name and Due Date.");
      return;
    }

    const payload = {
      type: "task",
      target_date: targetDate,
      title: taskTitle.trim(),
      department: department,
      description: description.trim(),
      event_time: taskTime || null,
      needed_items: itemsList,
      status: taskStatus
    };

    try {
      if (modalMode === "edit" && selectedTask) {
        const { error } = await supabase
          .from("administration_logs")
          .update(payload)
          .eq("id", selectedTask.id);

        if (error) throw error;

        setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...payload } : t));
      } else {
        const { data, error } = await supabase
          .from("administration_logs")
          .insert([payload])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setTasks([data[0], ...tasks]);
        }
      }

      resetFormModal();
    } catch (err) {
      console.error(`Error saving operational action item (${modalMode}):`, err.message);
      alert(`Error saving task: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter((item) => {
    const titleText = (item.title || "").toLowerCase();
    const assignedDept = (item.department || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = titleText.includes(query) || assignedDept.includes(query);
    const matchesStatus = statusFilter === "All" || (item.status || "Pending") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 antialiased overflow-x-hidden relative">
      <div className="fixed top-3 left-3 z-40 sm:top-4 sm:left-4">
        <Link
          to="/ministries/administration"
          className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome className="text-base" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-6 md:py-8 pt-14 sm:pt-16">
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              <FaClipboardList className="text-emerald-600 text-lg sm:text-xl" /> Operational <span className="text-emerald-600">Tasks</span>
            </h1>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase mt-0.5 tracking-wider">
              Track running logistics and checklist pipelines
            </p>
          </div>

          <button
            onClick={() => { setModalMode("create"); setIsModalOpen(true); }}
            className="sm:self-end bg-slate-900 text-white font-black text-[11px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <FaPlus /> Create Task Entry
          </button>
        </div>

        {/* Searching Filtering Deck System */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-sm flex items-center gap-2.5 flex-1">
              <FaSearch className="text-slate-400 ml-1 text-sm flex-shrink-0" />
              <input
                type="text"
                placeholder="Search action lists or operational divisions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/40 self-start md:self-auto">
              {["All", "Pending", "Active", "Completed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-2 rounded-lg transition-all cursor-pointer ${
                    statusFilter === status ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Table Element Board Component */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12 sm:py-16"><FaSpinner className="animate-spin text-emerald-500 text-xl" /></div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-10 sm:py-12 text-center text-sm text-slate-400 font-bold">No active task profiles found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Timeline Deadline</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Task / Action Profile</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Status</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Responsible Division</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">Execution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {filteredTasks.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap font-bold text-slate-400 text-[10px] sm:text-xs">
                          {item.target_date} {item.event_time ? `| ${item.event_time}` : ""}
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-slate-800">{item.title}</td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                            item.status === "Completed" ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                            item.status === "Active" ? "bg-amber-50 border-amber-200 text-amber-600" :
                            "bg-slate-100 border-slate-200 text-slate-500"
                          }`}>
                            {item.status || "Pending"}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <span className="inline-flex items-center bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] px-2 py-0.5 rounded border border-slate-200 font-bold">
                            {item.department}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setSelectedTask(item); setModalMode("view"); setIsModalOpen(true); }}
                              className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold px-2 sm:px-3 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer active:scale-95 transition-transform"
                            >
                              Track Metrics
                            </button>
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-[10px] sm:text-xs bg-slate-50 text-slate-600 border border-slate-200 font-bold p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer active:scale-95 transition-transform"
                              title="Edit Task"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action View Task Modal Box */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">

            <div className="bg-slate-50 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-1.5">
                  <FaClipboardList className={modalMode === "view" ? "text-emerald-600" : "text-blue-600"} />
                  {modalMode === "view" ? "Task Check-off Sheet" : modalMode === "edit" ? "Modify Operational Task" : "Generate Operational Task"}
                </h3>
              </div>
              <button onClick={resetFormModal} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer active:scale-95 transition-transform"><FaTimes /></button>
            </div>

            {modalMode === "view" && selectedTask ? (
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-0.5">Task Description Line</span>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">{selectedTask.title}</h2>
                </div>

                {/* Status Flow Progression Deck */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Lifecycle Promotion Pipeline</span>
                  <div className="flex items-center justify-between gap-1">

                    <button 
                      onClick={() => updateTaskStatusDirect(selectedTask, "Pending")}
                      className={`flex-1 text-[10px] sm:text-[11px] font-black py-1.5 px-1 sm:px-2 rounded-lg text-center border transition-all cursor-pointer active:scale-95 ${
                        (selectedTask.status || "Pending") === "Pending" 
                          ? "bg-slate-200 border-slate-400 text-slate-800 shadow-sm" 
                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Pending
                    </button>

                    <FaArrowRight className="text-[9px] sm:text-[10px] text-slate-300 flex-shrink-0" />

                    <button 
                      onClick={() => updateTaskStatusDirect(selectedTask, "Active")}
                      className={`flex-1 text-[10px] sm:text-[11px] font-black py-1.5 px-1 sm:px-2 rounded-lg text-center border transition-all cursor-pointer active:scale-95 ${
                        selectedTask.status === "Active" 
                          ? "bg-amber-100 border-amber-400 text-amber-700 shadow-sm" 
                          : "bg-white border-slate-200 text-slate-400 hover:text-amber-500"
                      }`}
                    >
                      Active
                    </button>

                    <FaArrowRight className="text-[9px] sm:text-[10px] text-slate-300 flex-shrink-0" />

                    <button 
                      onClick={() => updateTaskStatusDirect(selectedTask, "Completed")}
                      className={`flex-1 text-[10px] sm:text-[11px] font-black py-1.5 px-1 sm:px-2 rounded-lg text-center border transition-all cursor-pointer active:scale-95 ${
                        selectedTask.status === "Completed" 
                          ? "bg-emerald-100 border-emerald-400 text-emerald-700 shadow-sm" 
                          : "bg-white border-slate-200 text-slate-400 hover:text-emerald-500"
                      }`}
                    >
                      Completed
                    </button>

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-150/60">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Target Division</span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                      <FaTags className="text-[10px] text-emerald-500" /> {selectedTask.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Target Date Deadline</span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                      <FaClock className="text-[10px] text-amber-500" /> {selectedTask.target_date}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Item Checklist Progress</span>
                  {(!selectedTask.needed_items || selectedTask.needed_items.length === 0) ? (
                    <p className="text-xs font-medium text-slate-400 italic bg-slate-50 text-center py-3 sm:py-4 rounded-xl border border-dashed">
                      No standalone subtask components mapped.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 sm:max-h-48 overflow-y-auto pr-1">
                      {selectedTask.needed_items.map((item, index) => (
                        <button
                          key={item.id || index}
                          onClick={() => toggleTaskItemCheckDirect(selectedTask, index)}
                          className="w-full flex items-center gap-3 bg-white px-3 py-2 border border-slate-150/80 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer shadow-sm select-none active:scale-[0.99]"
                        >
                          {item.checked ? (
                            <FaCheckCircle className="text-emerald-500 text-base flex-shrink-0" />
                          ) : (
                            <FaRegCircle className="text-slate-300 text-base flex-shrink-0" />
                          )}
                          <span className={`text-xs font-bold text-slate-700 ${item.checked ? "line-through text-slate-400 font-normal decoration-slate-300" : ""}`}>
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTask.description && (
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">Context Guidelines</span>
                    <div className="bg-slate-50/50 border rounded-xl p-2.5 text-xs font-medium text-slate-600 leading-relaxed">
                      {selectedTask.description}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 italic flex items-center gap-1">
                    <FaInfoCircle /> Set status above to track lifecycle progression
                  </span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => { openEditModal(selectedTask); }}
                      className="text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer active:scale-95 transition-transform"
                    >
                      Edit Details
                    </button>
                    <button onClick={resetFormModal} className="text-[10px] sm:text-xs font-black px-4 sm:px-5 py-1.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 cursor-pointer active:scale-95 transition-transform">
                      Finish Review
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveTask} noValidate className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Task Name / Summary Title *</label>
                  <input
                    type="text" required placeholder="e.g., File Weekly Audits Report"
                    value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-800 border border-slate-200 focus:border-emerald-500 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Division</label>
                    <select
                      value={department} onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2 py-2 focus:outline-none cursor-pointer"
                    >
                      <option value="General Office">General Office</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Media & IT">Media & IT</option>
                      <option value="Sanctuary Maintenance">Sanctuary Maintenance</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Due Date</label>
                    <input
                      type="date" required
                      value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Time Slot (Opt)</label>
                    <input
                      type="text" placeholder="e.g., 5:00 PM"
                      value={taskTime} onChange={(e) => setTaskTime(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2 py-2 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Initial Status</label>
                    <select
                      value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 border border-slate-200 bg-slate-50/50 rounded-xl px-2 py-2 focus:outline-none cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-2.5 sm:p-3 bg-slate-50/30">
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Action Checklist Breakdowns</label>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text" placeholder="Add step (e.g., Sign off ledger files)"
                      value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                      className="w-full text-xs font-medium text-slate-800 border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                    />
                    <button type="button" onClick={addChecklistItem} className="bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0 cursor-pointer active:scale-95 transition-transform"><FaPlus /> Include</button>
                  </div>

                  {itemsList.length > 0 && (
                    <div className="space-y-1 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
                      {itemsList.map((item, index) => (
                        <div key={item.id || index} className="flex items-center justify-between bg-white px-2 py-1.5 border border-slate-100 rounded-lg shadow-sm">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                            {item.checked ? "✓" : "○"} {item.name}
                          </span>
                          <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-rose-500 p-0.5 cursor-pointer active:scale-95 transition-transform"><FaTrash className="text-[9px]" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Additional Action Details</label>
                  <textarea
                    rows="2" placeholder="Provide description criteria..."
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 border border-slate-200 focus:border-emerald-500 bg-slate-50/50 rounded-xl px-3 py-2 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={resetFormModal} className="text-xs font-bold px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer active:scale-95 transition-transform">Cancel</button>
                  <button type="submit" disabled={!taskTitle.trim()} className="text-xs font-black px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-40 cursor-pointer active:scale-95 transition-transform">
                    {modalMode === "edit" ? "Update Task Entry" : "Save Task Line"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

