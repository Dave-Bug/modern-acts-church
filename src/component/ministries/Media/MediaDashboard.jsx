// MediaDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../Services/supabase";
import { FaHome, FaLock } from "react-icons/fa";
import { Link as RouterLink } from "react-router-dom";

export default function MediaDashboard() {
  const [pendingCount, setPendingCount] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [progressCount, setProgressCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [memberCount, setMemberCount] = useState(0);

  // 🔒 Role state
  const [userStatus, setUserStatus] = useState("Viewer"); // default
  const [userMinistry, setUserMinistry] = useState("");
  const [isMediaMember, setIsMediaMember] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [personnel, setPersonnel] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    assignedTo: "",
    description: "",
    urgency: "Mid",
    created: "",
    dueTo: "",
  });

  // 🔒 Check user role on mount
  useEffect(() => {
    const checkUserRole = () => {
      try {
        const stored = localStorage.getItem("church_session_user");
        if (!stored) return;

        const parsed = JSON.parse(stored);
        setUserStatus(parsed.status || "Viewer");
        setUserMinistry(parsed.ministry || "");

        // Check if user has Multimedia in their ministry
        const ministries = (parsed.ministry || "").toLowerCase();
        setIsMediaMember(ministries.includes("multimedia"));
      } catch (err) {
        console.error("Role check failed:", err);
      }
    };
    checkUserRole();
  }, []);

  const isAdmin = userStatus.toLowerCase() === "admin";
  const isEditor = isAdmin || userStatus.toLowerCase() === "editor";
  const isViewer = !isEditor; // Viewer or any other role

  useEffect(() => {
    fetchPersonnel();
    loadDashboard();
    fetchRecentTasks();
  }, []);

  useEffect(() => {
    if (activeTab === "pending") {
      setFilteredTasks(tasks.filter((t) => t.status === "Pending"));
    } else if (activeTab === "completed") {
      setFilteredTasks(tasks.filter((t) => t.status === "Done"));
    } else {
      setFilteredTasks(tasks);
    }
  }, [activeTab, tasks]);

  const fetchPersonnel = async () => {
    const { data, error } = await supabase
      .from("media_personnel")
      .select("id, name");

    if (error) {
      console.error(error);
    } else {
      setPersonnel(data);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fetchRecentTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_tasks")
      .select("*")
      .order("id", { ascending: false })
      .limit(10);

    if (!error) {
      setTasks(data);
    } else {
      console.error("Error reading top 10 records:", error.message);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert("Task Title is required!");
      return;
    }

    try {
      const payload = {
        title: formData.title,
        assigned_to: formData.assignedTo || null,
        description: formData.description || null,
        urgency: formData.urgency,
        status: "Pending"
      };

      if (formData.dueTo) {
        payload.due_to = formData.dueTo;
      }

      if (formData.created) {
        payload.created = formData.created;
      }

      const { data, error } = await supabase
        .from("media_tasks")
        .insert([payload]);

      if (error) {
        console.error("Supabase Insertion Error Details:", error.message, error.details, error.hint);
        alert(`Failed to save task: ${error.message}`);
        return;
      }

      setShowModal(false);
      setFormData({
        title: "",
        assignedTo: "",
        description: "",
        urgency: "Mid",
        created: "",
        dueTo: ""
      });

      await loadDashboard();

    } catch (err) {
      console.error("Unexpected submission error:", err);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const { data: realTasks, error: tasksError } = await supabase
        .from("media_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (!tasksError && realTasks) {
        setTasks(realTasks);
      }

      const [pending, progress, completed, members] = await Promise.all([
        supabase
          .from("media_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "Pending"),
        supabase
          .from("media_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "In Progress"),
        supabase
          .from("media_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "Done"),
        supabase
          .from("media_personnel")
          .select("*", { count: "exact", head: true }),
      ]);

      setPendingCount(pending.count || 0);
      setProgressCount(progress.count || 0);
      setCompletedCount(completed.count || 0);
      setMemberCount(members.count || 0);
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (status) => {
    if (status === "Done") return 100;
    if (status === "In Progress") return 50;
    return 0;
  };

  const getStatusColor = (status) => {
    if (status === "Done" || status === "Completed") return "bg-emerald-500";
    if (status === "In Progress") return "bg-blue-500";
    return "bg-amber-500";
  };

  const getStatusBg = (status) => {
    if (status === "Done" || status === "Completed") return "bg-emerald-50 text-emerald-700";
    if (status === "In Progress") return "bg-blue-50 text-blue-700";
    return "bg-amber-50 text-amber-700";
  };

  const getUrgencyBg = (urgency) => {
    const u = urgency?.toLowerCase();
    if (u === "high") return "bg-red-50 text-red-600";
    if (u === "mid" || u === "medium") return "bg-amber-50 text-amber-600";
    return "bg-slate-100 text-slate-500";
  };

  // 🔒 Navigation handler with role check
  const handleNavigate = (path) => {
    if (isViewer) {
      // Viewers can see the page but can't perform actions there
      // Still allow navigation to view details
      navigate(path);
    } else {
      navigate(path);
    }
  };

  // 🔒 Create task handler
  const handleCreateTask = () => {
    if (isViewer) {
      alert("View-only access: You cannot create tasks. Contact an Admin or Editor.");
      return;
    }
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/Ministries"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Back
        </Link>
      </div>

      {/* 🔒 Role Badge */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border
          ${isAdmin ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
            isEditor ? "bg-blue-50 text-blue-700 border-blue-200" :
            "bg-slate-100 text-slate-500 border-slate-200"}
        `}>
          {isViewer && <FaLock className="text-[10px]" />}
          {userStatus}
          {!isMediaMember && <span className="text-red-500 ml-1">(Not Media)</span>}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 pt-16">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            🎥
          </div>
          <h1 className="text-3xl md:text-5xl font-black">
            Media <span className="text-blue-600">Ministry</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2">Dashboard Overview</p>
          {isViewer && (
            <p className="text-amber-600 text-xs mt-2 font-medium">
              🔒 You have view-only access. Contact an Admin for editing privileges.
            </p>
          )}
        </div>

        {/* Modal */}
        {showModal && isEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white w-full max-w-lg rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Create New Task</h2>
                <p className="text-sm text-slate-500 mt-1">Fill in the details to assign a new ministry task.</p>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Task Title <span className="text-red-500">*</span></label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Sunday Service Recording"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <input
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="e.g. Further Information of the Task"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Assigned To</label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a team member...</option>
                    {personnel.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Urgency Level</label>
                  <div className="flex gap-3">
                    {["Low", "Mid", "High"].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({ ...formData, urgency: level })}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                          formData.urgency === level
                            ? level === "High"
                              ? "bg-red-50 border-red-300 text-red-700"
                              : level === "Mid"
                              ? "bg-amber-50 border-amber-300 text-amber-700"
                              : "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <input
                    type="date"
                    name="dueTo"
                    value={formData.dueTo}
                    onChange={handleChange}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-black font-medium text-sm hover:bg-blue-700 transition-colors"
                >
                  Save Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Mobile: 2 cols, Desktop: 4 cols */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-8">
          {/* Pending Card */}
          <div 
            onClick={() => handleNavigate("/ministries/media/pending")}
            className={`
              bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5 
              transition-all duration-300
              ${isEditor ? "hover:shadow-md hover:-translate-y-1 cursor-pointer" : "cursor-default opacity-90"}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium">Pending</p>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
                  {loading ? "..." : pendingCount}
                </h2>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* In Progress Card */}
          <div 
            onClick={() => handleNavigate("/ministries/media/inprogress")}
            className={`
              bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5 
              transition-all duration-300
              ${isEditor ? "hover:shadow-md hover:-translate-y-1 cursor-pointer" : "cursor-default opacity-90"}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium">In Progress</p>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
                  {loading ? "..." : progressCount}
                </h2>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed Card */}
          <div 
            onClick={() => handleNavigate("/ministries/media/completed")}
            className={`
              bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5 
              transition-all duration-300
              ${isEditor ? "hover:shadow-md hover:-translate-y-1 cursor-pointer" : "cursor-default opacity-90"}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium">Completed</p>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
                  {loading ? "..." : completedCount}
                </h2>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Team Members Card */}
          <div
            onClick={() => handleNavigate("/ministries/media/personnel")}
            className={`
              rounded-xl p-4 md:p-5 text-white transition-all duration-300
              ${isEditor 
                ? "bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:-translate-y-1 cursor-pointer" 
                : "bg-blue-500/80 cursor-default"}
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm font-medium">Team Members</p>
                <h2 className="text-2xl md:text-3xl font-bold mt-1">{loading ? "..." : memberCount}</h2>
                <span className="text-xs text-blue-200 mt-1 inline-block">
                  View Personnel →
                </span>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m10-10a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Mobile: stacked, Desktop: 2/3 + 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">Recent Tasks</h2>
                <p className="text-xs text-slate-500 mt-0.5">Showing the top 10 most recent updates</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl overflow-hidden">
              {loading ? (
                <p className="p-6 text-slate-500 text-sm">Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="p-6 text-slate-500 text-sm text-center">No tasks found here.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(task.status)}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`font-medium text-sm truncate ${
                            task.status === "Done" || task.status === "Completed"
                              ? "text-slate-400 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </h3>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getUrgencyBg(task.urgency)}`}>
                          {task.urgency || "Mid"}
                        </span>

                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${getStatusBg(task.status)}`}>
                          {task.status || "Pending"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {task.due_to ? `Due: ${new Date(task.due_to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : "No due date set"}
                      </p>
                    </div>

                    {/* Progress - hidden on very small screens */}
                    <div className="hidden sm:block w-16 md:w-20 flex-shrink-0">
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getStatusColor(task.status)}`}
                          style={{ width: `${getProgressPercentage(task.status)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 text-right">
                        {getProgressPercentage(task.status)}%
                      </p>
                    </div>

                    <div className="w-7 h-7 md:w-8 md:h-8 bg-slate-700 rounded-md flex items-center justify-center text-white text-[10px] md:text-xs font-bold flex-shrink-0">
                      {task.assigned_to ? task.assigned_to.substring(0, 2).toUpperCase() : "??"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar - stacks below on mobile */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 md:p-5">
              <h3 className="font-bold text-slate-900 mb-4 text-base">Quick Actions</h3>
              <div className="space-y-3">
                {/* Create Task Button */}
                <button
                  onClick={handleCreateTask}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl border shadow-sm transition-all text-left group
                    ${isEditor 
                      ? "bg-white border-slate-200 hover:shadow-md hover:border-blue-300 cursor-pointer" 
                      : "bg-slate-50 border-slate-100 cursor-not-allowed opacity-70"}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                    ${isEditor ? "bg-blue-50 group-hover:bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}
                  `}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-sm font-semibold transition-colors ${isEditor ? "text-slate-800 group-hover:text-blue-600" : "text-slate-500"}`}>
                      Create Task
                    </p>
                    <p className="text-xs text-slate-500">
                      {isEditor ? "Add new ministry task" : "View-only: Cannot create"}
                    </p>
                  </div>
                  {isViewer && <FaLock className="ml-auto text-slate-300 text-xs" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}