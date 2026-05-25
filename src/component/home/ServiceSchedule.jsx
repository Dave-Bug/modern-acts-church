import Container from "../layout/Container";
import {
  FaPrayingHands,
  FaUsers,
  FaChild,
  FaMoon,
  FaArrowRight,
} from "react-icons/fa";

const services = [
  {
    title: "Prayer Works",
    schedule: "Every Wednesday",
    time: "6:00 PM",
    description:
      "Midweek prayer and worship gathering to refresh your spirit and connect with God.",
    icon: <FaPrayingHands />,
    color: "from-violet-500 to-purple-600",
    glow: "violet-500",
  },
  {
    title: "Family Celebration",
    schedule: "Every Sunday",
    time: "4:00 PM",
    description:
      "Worship and teaching for the whole family in a vibrant, welcoming atmosphere.",
    icon: <FaUsers />,
    color: "from-sky-500 to-blue-600",
    glow: "sky-500",
  },
  {
    title: "MAC Kids",
    schedule: "Every Sunday",
    time: "4:00 PM",
    description:
      "Fun and faith-filled church experience designed specifically for children.",
    icon: <FaChild />,
    color: "from-emerald-500 to-teal-600",
    glow: "emerald-500",
  },
  {
    title: "Young Adults Night",
    schedule: "Last Saturday",
    time: "Monthly",
    description:
      "Community and worship tailored for young adults navigating life and faith.",
    icon: <FaMoon />,
    color: "from-amber-500 to-orange-600",
    glow: "amber-500",
  },
];

export default function ServiceSchedule() {
  return (
    <section
      id="services"
      className="relative min-h-screen flex items-center overflow-hidden bg-slate-900 py-32"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-400/5 via-slate-900 to-blue-900/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-sky-500/5 rounded-full blur-[150px]" />

      <Container className="relative z-10">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-8 h-[2px] bg-sky-400 rounded-full" />
            <p className="uppercase tracking-[0.2em] text-sky-400 font-semibold text-xs">
              Weekly Gatherings
            </p>
            <div className="w-8 h-[2px] bg-sky-400 rounded-full" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">Church Services</span>
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed">
            Join us in worship, fellowship, and spiritual growth throughout the week. 
            There's a place for everyone in our church family.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="group relative bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-8 hover:-translate-y-2 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-500"
            >
              {/* Hover Glow */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500`} />

              {/* Icon */}
              <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white text-xl mb-6 shadow-lg group-hover:shadow-${service.glow}/30 transition-shadow duration-500`}>
                {service.icon}
              </div>

              {/* Schedule Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <p className="text-sky-300 text-[11px] uppercase tracking-wider font-semibold">
                  {service.schedule}
                </p>
              </div>

              {/* Time */}
              <p className="text-white font-bold text-lg mb-3">
                {service.time}
              </p>

              {/* Title */}
              <h3 className="text-white text-2xl font-bold leading-tight mb-4">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-[15px] leading-relaxed mb-6">
                {service.description}
              </p>

              {/* CTA */}
              <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                <span>Learn More</span>
                <FaArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <a
            href="#contact"
            className="inline-flex items-center gap-3 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300"
          >
            View Full Calendar
            <FaArrowRight size={14} />
          </a>
        </div>
      </Container>
    </section>
  );
}