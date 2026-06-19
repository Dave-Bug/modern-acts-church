import { useEffect, useState } from "react";
import { supabase } from "../../../Services/supabase";
import { FaUserShield, FaCheck, FaTrashAlt, FaClock, FaExclamationCircle } from "react-icons/fa";

export default function AdminAccount() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  // Fetch all pending requests from database
  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("church_auth")
        .select("id, name, ministry, status, created_at")
        .eq("access", "Pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (err) {
      setError("Failed to download incoming queue logs.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
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
      
      // Update local UI array state instantly
      setPendingUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      alert("Failed to finalize approval change state.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // --- 👎 REJECT/DELETE ACTION ---
  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to permanently reject and clear this access request?")) return;
    
    try {
      setActionLoadingId(id);
      const { error } = await supabase
        .from("church_auth")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setPendingUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      alert("Failed to clean authorization log row.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto text-slate-900 bg-[#f5f7fb] min-h-screen">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        
        {/* Title Block */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl text-lg">
            <FaUserShield />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Credential Approval Gate</h2>
            <p className="text-xs text-slate-400 font-semibold">Review and accept incoming ministry account registrations</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <FaExclamationCircle /> <span>{error}</span>
          </div>
        )}

        {/* Dynamic Queue Content */}
        {loading ? (
          <div className="text-center py-12 text-xs font-bold text-slate-400">Loading incoming registration fields...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
            <FaClock className="mx-auto text-slate-300 text-2xl mb-2" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Queue Cleared</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">No accounts are currently awaiting access authorization.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div 
                key={user.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 bg-slate-50/30 hover:bg-slate-50 p-4 rounded-xl gap-4 transition-all"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{user.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Ministries: <span className="font-semibold text-slate-700">{user.ministry}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-md">
                      Requested Level: {user.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Registered: {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Control Interactive Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    disabled={actionLoadingId !== null}
                    onClick={() => handleApprove(user.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FaCheck size={11} /> Approve
                  </button>
                  <button
                    disabled={actionLoadingId !== null}
                    onClick={() => handleReject(user.id)}
                    className="bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 p-2 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
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
  );
}