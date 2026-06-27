import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../Services/supabase";
import { FaHome, FaCheck, FaLock } from "react-icons/fa";

export default function InProgressTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔒 Role state
  const [userStatus, setUserStatus] = useState("Viewer");
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("church_session_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const status = parsed.status || "Viewer";
        setUserStatus(status);
        setIsEditor(
          status.toLowerCase() === "admin" ||
          status.toLowerCase() === "editor"
        );
      }
    } catch (err) {
      console.error("Role check failed:", err);
    }
    fetchInProgressTasks();
  }, []);

  const isViewer = !isEditor;

  const fetchInProgressTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("media_tasks")
        .select("*")
        .eq("status", "In Progress")
        .order("id", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching in-progress tasks:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const moveToCompleted = async (taskId) => {
    if (isViewer) {
      alert("View-only access: You cannot update tasks.");
      return;
    }
    try {
      const { error } = await supabase
        .from("media_tasks")
        .update({ status: "Done" })
        .eq("id", taskId);

      if (error) throw error;
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error updating task status:", error.message);
      alert(`Could not update task: ${error.message}`);
    }
  };

  const getUrgencyBg = (urgency) => {
    const u = urgency?.toLowerCase();
    if (u === "high") return "bg-red-50 text-red-600";
    if (u === "mid" || u === "medium") return "bg-amber-50 text-amber-600";
    return "bg-slate-100 text-slate-500";
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/Ministries/Media"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome />
          Dashboard
        </Link>
      </div>

      {/* 🔒 Role Badge */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border
          ${!isViewer
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-slate-100 text-slate-500 border-slate-200"}
        `}>
          {isViewer && <FaLock className="text-[10px]" />}
          {userStatus}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 pt-16">
        <div className="text-center mb-8 md:mb-10">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-5xl font-black">
            In Progress <span className="text-blue-600">Tasks</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2">
            Tasks currently under pipeline execution
          </p>
          {isViewer && (
            <p className="text-amber-600 text-xs mt-2 font-medium">
              🔒 You have view-only access. Contact an Admin for editing privileges.
            </p>
          )}
        </div>

        <div className="flex justify-center mb-8">
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide">
            {tasks.length} Active Items
          </span>
        </div>

        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
              <p className="text-slate-500 text-sm">Synchronizing task queues...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">✅</div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">All Clear</h3>
              <p className="text-slate-500 text-sm">No active tasks running right now. All pipelines clear.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm text-slate-900 truncate">{task.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getUrgencyBg(task.urgency)}`}>
                      {task.urgency || "Mid"}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {task.due_to
                      ? `Due: ${new Date(task.due_to).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : "No deadline assigned"}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                  <div
                    className="w-7 h-7 md:w-8 md:h-8 bg-slate-700 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                    title={`Assigned to ${task.assigned_to || "Unassigned"}`}
                  >
                    {task.assigned_to ? task.assigned_to.substring(0, 2).toUpperCase() : "??"}
                  </div>

                  {/* 🔒 Action Button */}
                  {isViewer ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs cursor-not-allowed">
                      <FaLock className="text-[9px]" />
                      <span className="hidden sm:inline">Locked</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => moveToCompleted(task.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-xs transition-colors"
                      title="Promote task to Completed"
                    >
                      <FaCheck className="text-[9px]" />
                      <span className="hidden sm:inline">Mark as Done</span>
                      <span className="sm:hidden">Done</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}