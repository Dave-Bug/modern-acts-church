import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../Services/supabase";
import { 
  FaUserShield, 
  FaCheck, 
  FaTrashAlt, 
  FaClock, 
  FaExclamationCircle, 
  FaArrowLeft,
  FaUsers,
  FaUserEdit,
  FaUserClock,
  FaUserCheck
} from "react-icons/fa";

export default function AdminAccount() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "active"

  // Fetch all accounts (Pending and Approved)
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("church_auth")
        .select("id, name, ministry, status, access, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      setPendingUsers(data.filter(u => u.access === "Pending") || []);
      setApprovedUsers(data.filter(u => u.access === "Approved") || []);
    } catch (err) {
      setError("Failed to download account logs.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // --- 👍 APPROVAL ACTION ---
  const handleApprove = async (id) => {
    try {
      setActionLoadingId(id);
      const { error } = await supabase
        .from("church_auth")
        .update({ access: "Approved" })
        .eq("id", id);

      if (error) throw error;
      
      const userToApprove = pendingUsers.find(u => u.id === id);
      setPendingUsers((prev) => prev.filter((user) => user.id !== id));
      if (userToApprove) {
        setApprovedUsers((prev) => [...prev, { ...userToApprove, access: "Approved" }]);
      }
    } catch (err) {
      alert("Failed to finalize approval change state.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 👎 REJECT/REVOKE ACTION ---
  const handleRejectOrRevoke = async (id, isRevoking = false) => {
    const confirmMessage = isRevoking 
      ? "Are you sure you want to revoke this user's access and delete their account?" 
      : "Are you sure you want to permanently reject and clear this access request?";
      
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setActionLoadingId(id);
      const { error } = await supabase
        .from("church_auth")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      if (isRevoking) {
        setApprovedUsers((prev) => prev.filter((user) => user.id !== id));
      } else {
        setPendingUsers((prev) => prev.filter((user) => user.id !== id));
      }
    } catch (err) {
      alert("Failed to clean authorization log row.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- ✏️ UPDATE STATUS/ROLE ACTION ---
  const handleStatusChange = async (id, newStatus) => {
    try {
      setActionLoadingId(id);
      const { error } = await supabase
        .from("church_auth")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setApprovedUsers((prev) => 
        prev.map((user) => user.id === id ? { ...user, status: newStatus } : user)
      );
    } catch (err) {
      alert("Failed to update user role.");
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = pendingUsers.length;
  const activeCount = approvedUsers.length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back Button Navigation */}
        <div className="flex items-center text-black">
          <Link
            to="/ministries/administration"
            className="group flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm hover:shadow-md"
          >
            <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-pulse">
            <FaExclamationCircle className="text-lg" /> <span>{error}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-indigo-100 text-indigo-600 p-3.5 rounded-2xl shadow-inner">
              <FaUserShield className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Account Gatekeeper</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Manage ministry account registrations and system access levels.</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === "pending"
                  ? "bg-white text-amber-600 shadow-sm border border-amber-100"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <FaUserClock className="text-sm" />
              Pending
              {pendingCount > 0 && (
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === "active"
                  ? "bg-white text-blue-600 shadow-sm border border-blue-100"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <FaUserCheck className="text-sm" />
              Active
              {activeCount > 0 && (
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === "active" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
              <div className="text-sm font-bold text-slate-400">Loading account directory...</div>
            </div>
          ) : activeTab === "pending" ? (
            /* ========== PENDING TAB ========== */
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50/50 to-white px-6 py-5 border-b border-slate-100 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl">
                    <FaUserClock className="text-xl" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Credential Approval Queue</h2>
                    <p className="text-sm text-slate-500">Review and accept incoming ministry account registrations.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {pendingUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="bg-slate-50 p-5 rounded-full shadow-sm mb-5 border border-slate-100">
                      <FaClock className="text-slate-300 text-4xl" />
                    </div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Queue Cleared</p>
                    <p className="text-sm text-slate-400 font-medium mt-2 max-w-sm">
                      No accounts are currently awaiting access authorization.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="group flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 border border-slate-200 hover:border-amber-300 p-5 rounded-2xl gap-5 transition-all duration-300 hover:shadow-md hover:bg-white"
                      >
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{user.name}</h3>
                          <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                            Ministry: <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">{user.ministry}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Requested: {user.status}
                            </span>
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                              <FaClock className="text-slate-300" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-center w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <button
                            disabled={actionLoadingId !== null}
                            onClick={() => handleApprove(user.id)}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-emerald-600 text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-emerald-200 hover:-translate-y-0.5"
                          >
                            <FaCheck /> Approve
                          </button>
                          <button
                            disabled={actionLoadingId !== null}
                            onClick={() => handleRejectOrRevoke(user.id, false)}
                            className="flex justify-center items-center bg-white border-2 border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reject Application"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========== ACTIVE TAB ========== */
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50/50 to-white px-6 py-5 border-b border-slate-100 sm:px-8">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl">
                    <FaUsers className="text-xl" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">Active Accounts Directory</h2>
                    <p className="text-sm text-slate-500">Manage approved users and update their system clearance levels.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {approvedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="bg-slate-50 p-5 rounded-full shadow-sm mb-5 border border-slate-100">
                      <FaUsers className="text-slate-300 text-4xl" />
                    </div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No Active Users</p>
                    <p className="text-sm text-slate-400 font-medium mt-2 max-w-sm">
                      No approved accounts found in the system.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="group flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 border border-slate-200 hover:border-blue-300 p-5 rounded-2xl gap-5 transition-all duration-300 hover:shadow-md hover:bg-white"
                      >
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{user.name}</h3>
                          <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mb-2">
                            Ministry: <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">{user.ministry}</span>
                          </p>
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 w-max bg-slate-100 px-3 py-1 rounded-full">
                            <FaClock className="text-slate-300" />
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 self-start md:self-center w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-200">
                          <div className="relative flex-1 md:flex-none">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaUserEdit className="text-slate-400" />
                            </div>
                            <select
                              value={user.status}
                              onChange={(e) => handleStatusChange(user.id, e.target.value)}
                              disabled={actionLoadingId !== null}
                              className={`w-full md:w-40 pl-9 pr-8 py-2.5 text-sm font-bold rounded-xl border appearance-none transition-colors cursor-pointer outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400
                                ${user.status === 'Admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 
                                  user.status === 'Editor' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                                  'bg-slate-50 border-slate-200 text-slate-700'}`}
                            >
                              <option value="Viewer">Viewer</option>
                              <option value="Editor">Editor</option>
                              <option value="Admin">Admin</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          <button
                            disabled={actionLoadingId !== null}
                            onClick={() => handleRejectOrRevoke(user.id, true)}
                            className="flex justify-center items-center bg-white border-2 border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Revoke Access"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}