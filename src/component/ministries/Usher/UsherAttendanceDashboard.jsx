import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList // 💡 Imported LabelList for data value renderings
} from "recharts";
import { 
  FaHome, FaChartBar, FaChartLine, FaFilter, FaSpinner, FaUsers, FaCheckCircle 
} from "react-icons/fa";
import { supabase } from "../../../Services/supabase";

// Constant array for sorting and mapping calendar months
const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export default function UsherAttendanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [rawAttendance, setRawAttendance] = useState([]);
  
  // Filter states
  const [viewType, setViewType] = useState("All"); // "All" | "Per Tribe" | "Per Service"
  const [selectedTribe, setSelectedTribe] = useState("All");
  const [selectedService, setSelectedService] = useState("All");

  // Dynamically populated unique lists from DB rows
  const [tribesList, setTribesList] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Pulling core metrics needed for monthly aggregations
        const { data, error } = await supabase
          .from("usher_attendance")
          .select("date, name, tribe, service, status");

        if (error) throw error;

        const records = data || [];
        setRawAttendance(records);

        // Extract unique Tribes and Services for dropdown menus
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

  // Process data for charts based on selected filters
  const generateChartData = () => {
    // 1. Initialize empty structural map for January - December
    const monthlyMap = MONTHS.reduce((acc, month) => {
      acc[month] = { month, Present: 0, Absent: 0 };
      // If broken down by sub-categories, we dynamically track them inside each month
      return acc;
    }, {});

    // 2. Track all unique categories found globally to use as Bar/Line data keys
    const dynamicKeys = new Set();

    // 3. Filter and aggregate raw entries
    rawAttendance.forEach(record => {
      if (!record.date) return;
      
      const dateObj = new Date(record.date);
      if (isNaN(dateObj.getTime())) return;
      
      const monthName = MONTHS[dateObj.getMonth()];
      const status = record.status === "Present" ? "Present" : "Absent";
      const tribe = record.tribe || "N/A";
      const service = record.service || "Regular Service";

      // Apply the interactive filter layout controls
      if (viewType === "All") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (selectedService !== "All" && service !== selectedService) return;
        
        monthlyMap[monthName][status] += 1;
      } 
      else if (viewType === "Per Tribe") {
        if (selectedService !== "All" && service !== selectedService) return;
        if (status === "Present") { // Charting trends for present members per category
          dynamicKeys.add(tribe);
          monthlyMap[monthName][tribe] = (monthlyMap[monthName][tribe] || 0) + 1;
        }
      } 
      else if (viewType === "Per Service") {
        if (selectedTribe !== "All" && tribe !== selectedTribe) return;
        if (status === "Present") {
          dynamicKeys.add(service);
          monthlyMap[monthName][service] = (monthlyMap[monthName][service] || 0) + 1;
        }
      }
    });

    // Convert map object back to an ordered array matching sequential calendar flow
    return {
      chartData: MONTHS.map(m => monthlyMap[m]),
      keys: Array.from(dynamicKeys)
    };
  };

  const { chartData, keys } = generateChartData();

  // Color Palette Array for Dynamic Segmenting
  const colors = ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316", "#64748b"];

  // Quick summary card computations
  const totalPresentCount = rawAttendance.filter(r => r.status === "Present").length;
  const totalRecordsCount = rawAttendance.length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12">
      {/* Navigation Header bar */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          to="/ministries/usher"
          className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors shadow-sm"
        >
          <FaHome />
          Back
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-16 md:pt-20">
        {/* Title Heading */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
            📊
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Attendance <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-2">
            January - December Historical Trends Dashboard
          </p>
        </div>

        {/* Global Summary Metric Snippets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FaUsers className="text-xl"/></div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Headcount Logs</p>
              <p className="text-2xl font-black text-slate-800">{totalRecordsCount}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><FaCheckCircle className="text-xl"/></div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Confirmed Present</p>
              <p className="text-2xl font-black text-emerald-600">{totalPresentCount}</p>
            </div>
          </div>
        </div>

        {/* Interactive Filtering Configuration Dashboard Container */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Main Toggle Segment Options */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <FaFilter className="text-blue-500 text-[10px]"/> Breakdown Mode
              </label>
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-start">
                {["All", "Per Tribe", "Per Service"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewType(mode)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      viewType === mode
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub Filter Dropdowns Contextual States */}
            <div className="flex flex-wrap gap-3">
              {viewType !== "Per Tribe" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Tribe</label>
                  <select
                    value={selectedTribe}
                    onChange={(e) => setSelectedTribe(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Tribes</option>
                    {tribesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {viewType !== "Per Service" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Service</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All">All Services</option>
                    {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>

          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-100 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
            <FaSpinner className="animate-spin text-blue-600 text-2xl mb-2" />
            <p className="text-slate-400 text-sm font-medium">Aggregating records graph...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. BAR CHART CONTAINER */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                <FaChartBar className="text-blue-500" /> Monthly Volume Distribution
              </h2>
              <div className="w-full h-80 text-xs font-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    
                    {viewType === "All" ? (
                      <>
                        <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30}>
                          {/* 💡 Added labels inside/above bars, hides rendering if the month's total value is 0 */}
                          <LabelList dataKey="Present" position="top" fill="#475569" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        </Bar>
                        <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}>
                          <LabelList dataKey="Absent" position="top" fill="#475569" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        </Bar>
                      </>
                    ) : (
                      keys.map((key, index) => (
                        <Bar 
                          key={key} 
                          dataKey={key} 
                          fill={colors[index % colors.length]} 
                          name={key}
                          radius={[4, 4, 0, 0]}
                          stackId="a"
                        >
                          {/* 💡 Stacked view labels appear inside sections natively when positioned "center" */}
                          <LabelList dataKey={key} position="center" fill="#ffffff" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        </Bar>
                      ))
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. LINE CHART CONTAINER */}
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                <FaChartLine className="text-blue-500" /> Attendance Trajectory Timeline
              </h2>
              <div className="w-full h-80 text-xs font-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    
                    {viewType === "All" ? (
                      <>
                        <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }}>
                          {/* 💡 Places numerical metrics hovering right above trend data points */}
                          <LabelList dataKey="Present" position="top" fill="#047857" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        </Line>
                        <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3 }}>
                          <LabelList dataKey="Absent" position="top" fill="#b91c1c" formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '10px' }} />
                        </Line>
                      </>
                    ) : (
                      keys.map((key, index) => (
                        <Line 
                          key={key} 
                          type="monotone"
                          dataKey={key} 
                          stroke={colors[index % colors.length]} 
                          name={key}
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        >
                          <LabelList dataKey={key} position="top" fill={colors[index % colors.length]} formatter={(val) => val > 0 ? val : ""} style={{ fontSize: '10px', fontWeight: 'bold' }} />
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