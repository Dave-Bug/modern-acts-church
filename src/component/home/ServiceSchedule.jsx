// Services.jsx

import Container from "../layout/Container";
import {
  FaPrayingHands,
  FaUsers,
  FaChild,
  FaMoon,
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
} from "react-icons/fa";

const services = [
  {
    title: "Prayer Works",
    schedule: "Every Wednesday • 6:00 PM",
    description: "Midweek prayer and worship gathering.",
    icon: <FaPrayingHands />,
  },
  {
    title: "Family Celebration",
    schedule: "Every Sunday • 4:00 PM",
    description: "Worship and teaching for the whole family.",
    icon: <FaUsers />,
  },
  {
    title: "MAC Kids",
    schedule: "Every Sunday • 4:00 PM",
    description: "Fun and faith-filled church experience for kids.",
    icon: <FaChild />,
  },
  {
    title: "Young Adults Night",
    schedule: "Last Saturday • Monthly",
    description: "Community and worship for young adults.",
    icon: <FaMoon />,
  },
];

export default function ServiceSchedule() {
  return (
    <section
      id="services"
      className="relative min-h-screen flex flex-col bg-slate-950 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-slate-950 to-blue-900/10" />

      <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-sky-500/5 rounded-full blur-[120px]" />

      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px]" />

      {/* Main Content */}
      <Container className="relative z-10 flex-1 py-20 md:py-28">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">

          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 md:w-12 h-[2px] bg-sky-400 rounded-full" />

            <p className="uppercase tracking-[0.25em] text-sky-400 font-semibold text-[11px] md:text-xs">
              Worship With Us
            </p>

            <div className="w-10 md:w-12 h-[2px] bg-sky-400 rounded-full" />
          </div>

          <h2
            className="
              text-white
              font-black
              leading-tight
              mb-5
              text-3xl
              sm:text-4xl
              md:text-5xl
              lg:text-6xl
            "
          >
            Church
            <span className="text-sky-400"> Services</span>
          </h2>

          <p
            className="
              text-slate-400
              leading-relaxed
              text-sm
              sm:text-base
              md:text-lg
            "
          >
            Join us in worship, prayer, and fellowship throughout the week
            as we grow together in faith and community.
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-7">

          {services.map((service, index) => (
            <div
              key={index}
              className="
                group
                relative
                bg-white/5
                backdrop-blur-sm
                border border-white/10
                rounded-3xl
                p-6 md:p-7
                hover:-translate-y-1
                hover:bg-white/[0.08]
                hover:border-sky-500/20
                transition-all duration-300
              "
            >
              {/* Icon */}
              <div
                className="
                  w-14 h-14
                  rounded-2xl
                  bg-gradient-to-br
                  from-sky-500/10
                  to-blue-600/10
                  border border-sky-500/10
                  flex items-center justify-center
                  text-sky-400
                  text-2xl
                  mb-5
                  group-hover:from-sky-500
                  group-hover:to-blue-600
                  group-hover:text-white
                  transition-all duration-300
                "
              >
                {service.icon}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-xl mb-2">
                {service.title}
              </h3>

              {/* Schedule */}
              <p className="text-sky-300 text-sm mb-3">
                {service.schedule}
              </p>

              {/* Description */}
              <p className="text-slate-400 text-sm leading-relaxed">
                {service.description}
              </p>

              {/* Accent Line */}
              <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-sky-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </Container>

      {/* Footer */}
<footer className="relative z-10 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl">

  <Container className="py-6 md:py-8">

    <div className="grid md:grid-cols-2 gap-8 md:gap-10">

      {/* Left */}
      <div>

        <h3 className="text-white font-bold text-lg md:text-xl mb-2">
          Modern Acts Church Olongapo
        </h3>

        <p className="text-slate-400 text-sm leading-relaxed max-w-md mb-4">
          A community where faith grows and lives are transformed through Christ.
        </p>

        {/* Socials */}
        <div className="flex gap-3">

          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-400/30 transition-all duration-300 cursor-pointer">
            <FaFacebook className="text-sm" />
          </div>

          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-400/30 transition-all duration-300 cursor-pointer">
            <FaInstagram className="text-sm" />
          </div>

          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-400/30 transition-all duration-300 cursor-pointer">
            <FaYoutube className="text-sm" />
          </div>

        </div>
      </div>

      {/* Right */}
      <div className="space-y-3 text-slate-400 text-sm">

        <div className="flex items-start gap-3">
          <FaMapMarkerAlt className="text-sky-400 mt-1 flex-shrink-0 text-sm" />

          <p>
            Acayan St. East Tapinac,
            Olongapo City
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FaEnvelope className="text-sky-400 flex-shrink-0 text-sm" />

          <p className="break-all">
            modernactschurcholongapo@gmail.com
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FaPhone className="text-sky-400 flex-shrink-0 text-sm" />

          <p>+63 912 345 6789</p>
        </div>

      </div>
    </div>

    {/* Bottom */}
    <div className="border-t border-white/5 mt-5 pt-3 text-center">

      <p className="text-slate-500 text-[11px] sm:text-xs">
        © {new Date().getFullYear()} Modern Acts Church Olongapo
      </p>

    </div>
  </Container>
</footer>
    </section>
  );
}