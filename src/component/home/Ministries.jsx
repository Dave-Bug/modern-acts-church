import Container from "../layout/Container";

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
  {
    name: "Media Team",
    icon: FaVideo,
    desc: "Handles livestream and media production.",
    color: "blue",
  },
  {
    name: "Worship Team",
    icon: FaMusic,
    desc: "Leads the church in worship and praise.",
    color: "sky",
  },
  {
    name: "Usher",
    icon: FaHandsHelping,
    desc: "Welcomes and assists attendees.",
    color: "indigo",
  },
  {
    name: "Finance",
    icon: FaPiggyBank,
    desc: "Manages church finances and giving.",
    color: "slate",
  },
  {
    name: "Admin",
    icon: FaUserCog,
    desc: "Supports church coordination tasks.",
    color: "blue",
  },
  {
    name: "Marshall",
    icon: FaShieldAlt,
    desc: "Maintains safety and order.",
    color: "sky",
  },
  {
    name: "Discipleship",
    icon: FaBookOpen,
    desc: "Guides spiritual growth and mentoring.",
    color: "indigo",
  },
];

const colorMap = {
  blue: {
    bg: "bg-blue-100",
    icon: "text-blue-600",
    hover: "group-hover:text-blue-600",
  },

  sky: {
    bg: "bg-sky-100",
    icon: "text-sky-600",
    hover: "group-hover:text-sky-600",
  },

  indigo: {
    bg: "bg-indigo-100",
    icon: "text-indigo-600",
    hover: "group-hover:text-indigo-600",
  },

  slate: {
    bg: "bg-slate-200",
    icon: "text-slate-700",
    hover: "group-hover:text-slate-700",
  },
};

export default function Ministries() {
  return (
    <section
      id="ministries"
      className="
        min-h-screen
        bg-[#f5f7fb]
        text-slate-900
        relative overflow-hidden
      "
    >
      {/* Soft Background */}
      <div className="absolute top-0 inset-x-0 h-52 bg-gradient-to-b from-blue-100/50 to-transparent pointer-events-none" />

      {/* Home Button */}
      <div className="fixed top-5 left-5 z-50">
        <a
          href="/"
          className="
            flex items-center gap-2
            bg-white/80 backdrop-blur
            border border-slate-200
            shadow-sm
            px-4 py-2.5
            rounded-xl
            text-slate-700
            hover:text-blue-600
            transition
            font-medium
          "
        >
          <FaHome />
          Home
        </a>
      </div>

      <Container className="relative z-10 py-14">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Church{" "}
            <span className="text-blue-600">
              Ministries
            </span>
          </h2>

          <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Discover where your gifts can serve and grow within the church
            community.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {ministries.map((m, i) => {
            const Icon = m.icon;
            const theme = colorMap[m.color];

            return (
              <div
                key={i}
                className="
                  group
                  bg-white/80 backdrop-blur-sm
                  border border-slate-200
                  rounded-2xl
                  p-5
                  hover:shadow-md
                  hover:-translate-y-1
                  transition-all duration-300
                "
              >
                {/* Icon */}
                <div
                  className={`
                    w-11 h-11 rounded-xl
                    ${theme.bg}
                    ${theme.icon}
                    flex items-center justify-center
                    text-lg mb-4
                  `}
                >
                  <Icon />
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-900 mb-2">
                  {m.name}
                </h3>

                {/* Description */}
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  {m.desc}
                </p>

                {/* Link */}
                <div
                  className={`
                    flex items-center gap-2
                    text-xs font-semibold uppercase tracking-wide
                    text-slate-400
                    ${theme.hover}
                    transition-colors
                  `}
                >
                  Learn More

                  <FaArrowRight
                    size={10}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {/* Footer pushed bottom */} 
        <div className="mt-auto pt-4"> 
          <div className="border-t border-slate-250 pt-10 text-center">
             <p className="text-slate-400 text-sm tracking-wide mb-2"> Serve • Grow • Make Disciples </p> 
             <p className="text-slate-400 text-xs"> © {new Date().getFullYear()} Modern Acts Church Olongapo </p> 
          </div> 
        </div>
      </Container>
    </section>
  );
}