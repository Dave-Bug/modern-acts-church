import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList 
} from "recharts";
import { 
  FaHome, FaChartBar, FaChartLine, FaFilter, FaSpinner, FaUsers, FaCheckCircle, FaStar, FaUserClock 
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const ROLE_OPTIONS = ["Member", "Minister", "Visitor", "1st Timer", "2nd Timer"];

export default function UsherAttendanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [rawAttendance, setRawAttendance] = useState([]);
  
  const [viewType, setViewType] = useState("All"); 
  const [selectedTribe, setSelectedTribe] = useState("All");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");

  const [tribesList, setTribesList] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("usher_attendance")
          .select("date, name, tribe, service, status");

        if (error) throw error;

        const { data: roster, error: rosterErr } = await supabase
          .from("usher_members")
          .select("first_name, last_name, role");

        if (rosterErr) throw rosterErr;

        const roleByName = {};
        (roster || []).forEach(m => {
          const fullName = `${m.first_name || ""} ${m.last_name || ""}`.trim().toLowerCase();
          if (fullName) roleByName[fullName] = m.role || "Unspecified";
        });

        const records = (data || []).map(r => {
          const normalizedName = (r.name || "").trim().toLowerCase();
          return { ...r, role: roleByName[normalizedName] || "Unspecified" };
        });

        setRawAttendance(records);

        const uniqueTribes = [...new Set(records.map(r => r.tribe || "N/A"))].filter(Boolean);
        const uniqueServices = [...new Set(records.map(r => r.service || "Regular Service"))].filter(Boolean);
        
        setTribesList(uniqueTribes);
        setServicesList(uniqueServices);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const generateChartData = () => {
    const monthlyMap = MONTHS.reduce((acc, month) => {
      acc[month] = { month, Present: 0, Absent: 0 };
      return acc;
    }, {});

    const dynamicKeys = new Set();

    rawAttendance.forEach(record => {
      if (!record.date) return;
      
      const dateObj = new Date(record.date);
      if (isNaN(dateObj.getTime())) return;
      
      const monthName = MONTHS[dateObj.getMonth()];
      const status = record.status === "Present" ? "Present" : "Absent";
      const tribe = record.tribe || "N/A";
      const service = record.service || "Regular Service";
      const role = record.role || "Unspecified";

      if (viewType === "All") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (selectedService !== "All" && service !== selectedService) return;
        if (selectedRole !== "All" && role !== selectedRole) return;
        
        monthlyMap[monthName][status] += 1;
      } 
      else if (viewType === "Per Tribe") {
        if (selectedService !== "All" && service !== selectedService) return;
        if (selectedRole !== "All" && role !== selectedRole) return;
        if (status === "Present") { 
          dynamicKeys.add(tribe);
          monthlyMap[monthName][tribe] = (monthlyMap[monthName][tribe] || 0) + 1;
        }
      } 
      else if (viewType === "Per Service") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (selectedRole !== "All" && role !== selectedRole) return;
        if (status === "Present") {
          dynamicKeys.add(service);
          monthlyMap[monthName][service] = (monthlyMap[monthName][service] || 0) + 1;
        }
      }
      else if (viewType === "Per Role") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (selectedService !== "All" && service !== selectedService) return;
        if (status === "Present") {
          dynamicKeys.add(role);
          monthlyMap[monthName][role] = (monthlyMap[monthName][role] || 0) + 1;
        }
      }
    });

    return {
      chartData: MONTHS.map(m => monthlyMap[m]),
      keys: Array.from(dynamicKeys)
    };
  };

  const { chartData, keys } = generateChartData();
  const colors = ["#ec4899", "#2563eb", "#64748b", "#f97316", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6"];

  const totalPresentCount = rawAttendance.filter(r => r.status === "Present").length;
  const totalRecordsCount = rawAttendance.length;
  const firstTimerPresentCount = rawAttendance.filter(r => r.status === "Present" && r.role === "1st Timer").length;
  const secondTimerPresentCount = rawAttendance.filter(r => r.status === "Present" && r.role === "2nd Timer").length;

  return (
    /* 💡 Container uses natural block layout with flex-col. No absolute vertical centering, prevents top-cutoffs */
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-8 overflow-x-hidden flex flex-col items-center pt-4 md:pt-6 px-3 sm:px-6 box-border">
      
      {/* 💡 Expanded max-width up to 1400px so it's not a compact column on desktop */}
      <div className="w-full max-w-[1400px] flex flex-col gap-4 md:gap-5">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              to="/ministries/usher"
              className="flex items-center justify-center bg-white border border-slate-200 w-10 h-10 md:w-12 md:h-12 rounded-xl text-slate-600 hover:text-blue-600 hover:shadow-sm transition-all"
              title="Go Back"
            >
              <FaHome size={18} />
            </Link>
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-800 leading-none">
                Attendance <span className="text-blue-600">Overview</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Summary Cards with LARGER NUMBERS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 md:p-4 bg-blue-50 text-blue-600 rounded-xl hidden sm:block"><FaUsers size={24}/></div>
            <div>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Total Records</p>
              <p className="text-3xl md:text-5xl font-black text-slate-800 leading-none">{totalRecordsCount}</p>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 md:p-4 bg-emerald-50 text-emerald-600 rounded-xl hidden sm:block"><FaCheckCircle size={24}/></div>
            <div>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Present</p>
              <p className="text-3xl md:text-5xl font-black text-emerald-600 leading-none">{totalPresentCount}</p>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 md:p-4 bg-amber-50 text-amber-500 rounded-xl hidden sm:block"><FaStar size={24}/></div>
            <div>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">1st Timers</p>
              <p className="text-3xl md:text-5xl font-black text-amber-500 leading-none">{firstTimerPresentCount}</p>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 md:p-4 bg-purple-50 text-purple-600 rounded-xl hidden sm:block"><FaUserClock size={24}/></div>
            <div>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">2nd Timers</p>
              <p className="text-3xl md:text-5xl font-black text-purple-600 leading-none">{secondTimerPresentCount}</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="sticky top-0 z-40 bg-[#f8fafc]/95 backdrop-blur-sm py-1">
          <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto">
              <FaFilter className="text-blue-500 text-sm flex-shrink-0 hidden md:block"/>
              <div className="bg-slate-100/80 p-1.5 rounded-lg flex gap-1.5 w-full md:w-auto min-w-max">
                {["All", "Per Tribe", "Per Service", "Per Role"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewType(mode)}
                    className={`px-4 py-2 md:px-5 md:py-2.5 text-xs md:text-sm font-bold rounded-md transition-all whitespace-nowrap flex-1 text-center ${
                      viewType === mode
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* 💡 Mobile Grid fix: grid-cols-1 on small screens so they stack safely, sm:grid-cols-3 for desktop/tablet */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
              <select
                disabled={viewType === "Per Tribe"}
                value={selectedTribe}
                onChange={(e) => setSelectedTribe(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs md:text-sm font-semibold rounded-lg px-3 py-2.5 md:py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 appearance-none cursor-pointer"
              >
                <option value="All">All Tribes</option>
                {tribesList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select
                disabled={viewType === "Per Service"}
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs md:text-sm font-semibold rounded-lg px-3 py-2.5 md:py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 appearance-none cursor-pointer"
              >
                <option value="All">All Services</option>
                {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                disabled={viewType === "Per Role"}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs md:text-sm font-semibold rounded-lg px-3 py-2.5 md:py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 appearance-none cursor-pointer"
              >
                <option value="All">All Roles</option>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center h-[350px] shadow-sm">
            <FaSpinner className="animate-spin text-blue-500 text-3xl md:text-4xl mb-4" />
            <p className="text-slate-500 text-sm font-medium">Loading your dashboard data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            
            {/* BAR CHART */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm flex flex-col">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 md:mb-6">
                <FaChartBar className="text-blue-500" /> Monthly Headcount
              </h2>
              {/* 💡 Slightly taller charts on desktop (md:h-[320px]) so labels aren't squished */}
              <div className="w-full h-[260px] md:h-[320px] text-xs font-medium flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 12}} dy={10} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.4 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px' }} />
                    <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#475569' }} />
                    
                    {viewType === "All" ? (
                      <>
                        <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50}>
                          <LabelList dataKey="Present" position="top" fill="#475569" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                        </Bar>
                        <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50}>
                          <LabelList dataKey="Absent" position="top" fill="#475569" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                        </Bar>
                      </>
                    ) : (
                      keys.map((key, index) => (
                        <Bar key={key} dataKey={key} fill={colors[index % colors.length]} name={key} radius={[2, 2, 0, 0]} stackId="a" maxBarSize={60}>
                          <LabelList dataKey={key} position="center" fill="#ffffff" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '12px', fontWeight: '900', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }} />
                        </Bar>
                      ))
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LINE CHART */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm flex flex-col">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 md:mb-6">
                <FaChartLine className="text-blue-500" /> Trends Over Time
              </h2>
              <div className="w-full h-[260px] md:h-[320px] text-xs font-medium flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontWeight: 600, fontSize: 12}} dy={10} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px' }} />
                    <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#475569' }} />
                    
                    {viewType === "All" ? (
                      <>
                        <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }}>
                          <LabelList dataKey="Present" position="top" fill="#047857" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '12px', fontWeight: 'bold' }} dy={-6} />
                        </Line>
                        <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }}>
                          <LabelList dataKey="Absent" position="bottom" fill="#b91c1c" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '12px', fontWeight: 'bold' }} dy={6} />
                        </Line>
                      </>
                    ) : (
                      keys.map((key, index) => (
                        <Line key={key} type="monotone" dataKey={key} stroke={colors[index % colors.length]} name={key} strokeWidth={3} dot={{ r: 4 }}>
                          <LabelList dataKey={key} position="top" fill={colors[index % colors.length]} formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '12px', fontWeight: '900' }} dy={-4} />
                        </Line>
                      ))
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

