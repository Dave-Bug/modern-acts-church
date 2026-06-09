import Container from "../layout/Container";
import { Link } from "react-router-dom";

import {
  FaVideo,
  FaMusic,
  FaHandsHelping,
  FaPiggyBank,
  FaUserCog,
  FaShieldAlt,
  FaBookOpen,
  FaArrowRight,
  FaHome,
} from "react-icons/fa";

const ministries = [
  { name: "Media Team", icon: FaVideo, desc: "Livestream & media production.", color: "blue", path: "/ministries/media" },
  { name: "Worship Team", icon: FaMusic, desc: "Leads worship & praise.", color: "sky", path: "/ministries/worship" },
  { name: "Usher", icon: FaHandsHelping, desc: "Welcomes attendees.", color: "indigo", path: "/ministries/usher" },
  { name: "Finance", icon: FaPiggyBank, desc: "Handles church giving.", color: "slate", path: "/ministries/finance" },
  { name: "Admin", icon: FaUserCog, desc: "Church coordination.", color: "blue", path: "/ministries/administration" },
  { name: "Marshall", icon: FaShieldAlt, desc: "Safety & order.", color: "sky", path: "/ministries/marshall" },
  { name: "Discipleship", icon: FaBookOpen, desc: "Spiritual growth.", color: "indigo", path: "/ministries/discipleshipjourney" },
];

const colorMap = {
  blue: { bg: "bg-blue-100", icon: "text-blue-600" },
  sky: { bg: "bg-sky-100", icon: "text-sky-600" },
  indigo: { bg: "bg-indigo-100", icon: "text-indigo-600" },
  slate: { bg: "bg-slate-200", icon: "text-slate-700" },
};

export default function Ministries() {
  return (
    <section className="min-h-screen flex flex-col bg-[#f5f7fb] text-slate-900 relative overflow-hidden">

      {/* Header */}
      <Container className="flex-1 py-10 md:py-14">

        <div className="fixed top-4 left-4 z-50">
        <a
          href="/"
          className="flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 shadow-sm px-3 py-2 rounded-xl text-sm font-medium hover:text-blue-600"
        >
          <FaHome />
          Home
        </a>
      </div>

        {/* Title */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-3xl md:text-5xl font-black mb-2">
            Church <span className="text-blue-600">Ministries</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 max-w-6xl mx-auto">

          {ministries.map((m, i) => {
            const Icon = m.icon;
            const theme = colorMap[m.color];

            return (
              <Link
                key={i}
                to={m.path}
                className="
                  group
                  bg-white/80 backdrop-blur
                  border border-slate-200
                  rounded-xl
                  p-4 md:p-5
                  hover:shadow-md
                  hover:-translate-y-1
                  transition-all duration-300
                  block
                "
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg ${theme.bg} ${theme.icon} flex items-center justify-center mb-3`}>
                  <Icon />
                </div>

                {/* Title */}
                <h3 className="font-bold text-base md:text-lg mb-1">
                  {m.name}
                </h3>

                {/* Desc */}
                <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-3">
                  {m.desc}
                </p>

                {/* Action */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition">
                  SEE MORE
                  <FaArrowRight size={10} className="group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}

        </div>
      </Container>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 text-center py-6 bg-white/60 backdrop-blur">
        <p className="text-slate-500 text-xs md:text-sm">
          Serve • Grow • Make Disciples
        </p>
      </footer>

    </section>
  );
}