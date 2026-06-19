// Pages/Process.jsx
import React, { useState } from "react";
import Consolidation from "./Consolidation";
import SoulWinning from "./SoulWinning";
import Soaking from "./Soaking";
import Schooling from "./Schooling";

export default function Process() {
  const [activeTab, setActiveTab] = useState("Consolidation");
  const tabs = ["Consolidation", "Soul Winning", "Soaking", "Schooling"];

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === tab 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <div className="mt-4">
        {activeTab === "Consolidation" && <Consolidation />}
        {activeTab === "Soul Winning" && <SoulWinning />}
        {activeTab === "Soaking" && <Soaking />}
        {activeTab === "Schooling" && <Schooling />}
      </div>
    </div>
  );
}