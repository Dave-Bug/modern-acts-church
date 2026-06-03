import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaHome, FaSearch, FaSpinner, FaUser, FaPiggyBank } from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

export default function FinanceTithes() {
  const [tithes, setTithes] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTithesData();
  }, []);

  async function fetchTithesData() {
    try {
      setLoading(true);
      const { data: ledger, error: ledgerErr } = await supabase
        .from("church_finance")
        .select("*")
        .eq("category", "Tithes")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (ledgerErr) throw ledgerErr;

      const { data: roster, error: rosterErr } = await supabase
        .from("usher_members")
        .select("id, first_name, last_name");
      if (rosterErr) throw rosterErr;

      setMembers(roster || []);
      setTithes(ledger || []);
    } catch (err) {
      console.error("Error fetching tithes data:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const getMemberName = (id) => {
    if (!id) return "General";
    const match = members.find((m) => m.id === parseInt(id));
    return match ? `${match.first_name} ${match.last_name}` : "General";
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  const filteredTithes = tithes.filter((item) => {
    const contributorName = getMemberName(item.member_id).toLowerCase();
    const notes = (item.description || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return contributorName.includes(query) || notes.includes(query);
  });

  const displayedTithes = filteredTithes.slice(0, 15);
  const totalAmount = displayedTithes.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/finance"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
        >
          <FaHome /> Back
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 pt-16">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-black">
            Tithes <span className="text-blue-600">Records</span>
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-lg p-3 md:p-4">
            <p className="text-[9px] md:text-[10px] font-bold uppercase text-slate-500">Total Records</p>
            <p className="text-lg md:text-xl font-bold text-slate-900">{displayedTithes.length}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 md:p-4">
            <p className="text-[9px] md:text-[10px] font-bold uppercase text-emerald-600">Total Amount</p>
            <p className="text-lg md:text-xl font-bold text-emerald-700">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <FaSearch className="text-slate-400 text-sm flex-shrink-0" />
          <input
            type="text"
            placeholder="Search contributor or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded font-bold transition-colors flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* Records */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-blue-500 mr-2" />
              <span className="text-sm text-slate-500">Loading...</span>
            </div>
          ) : displayedTithes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No matching tithe records found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Contributor</div>
                <div className="col-span-5">Notes</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              {displayedTithes.map((item) => (
                <div key={item.id} className="flex flex-col md:grid md:grid-cols-12 md:gap-4 px-4 md:px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className="md:col-span-2 mb-1 md:mb-0">
                    <p className="text-[10px] md:text-xs font-bold text-slate-400">{formatDate(item.date)}</p>
                  </div>
                  <div className="md:col-span-3 mb-1 md:mb-0">
                    <p className="text-xs md:text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <FaUser className={`w-3 h-3 ${item.member_id ? "text-blue-500" : "text-slate-300"}`} />
                      {getMemberName(item.member_id)}
                    </p>
                  </div>
                  <div className="md:col-span-5 mb-1 md:mb-0">
                    <p className="text-xs text-slate-600 truncate">{item.description || "No notes"}</p>
                  </div>
                  <div className="md:col-span-2 flex md:justify-end">
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredTithes.length > 15 && (
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400">Showing 15 of {filteredTithes.length} entries</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}