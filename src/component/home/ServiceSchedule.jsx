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
  FaCalendarAlt,
} from "react-icons/fa";

// Import your update images here
// import fathersDayImg from "../../assets/updates/fathers-day.jpg";
// import youthCampImg from "../../assets/updates/youth-camp.jpg";

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

const updates = [
  {
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80", // Replace with your uploaded image
    title: "Father's Day Celebration",
    date: "June 15, 2025",
    description: "Join us as we honor and celebrate all fathers in our church family.",
  },
  {
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80", // Replace with your uploaded image
    title: "Youth Summer Camp",
    date: "July 20-22, 2025",
    description: "A weekend of fun, fellowship, and growing deeper in faith for our youth.",
  },
  {
    image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80", // Replace with your uploaded image
    title: "Community Outreach",
    date: "August 5, 2025",
    description: "Serving our local community with the love of Christ through outreach programs.",
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

      <Container className="relative z-10 flex-1 py-14 md:py-20">

        {/* ─── HEADER ─── */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">

          <div className="flex items-center justify-center gap-3 mb-4">
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
              mb-4
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

        {/* ─── SERVICE CARDS (Moved Up) ─── */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16">

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
                p-5 md:p-6
                hover:-translate-y-1
                hover:bg-white/[0.08]
                hover:border-sky-500/20
                transition-all duration-300
              "
            >
              {/* Icon */}
              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  bg-gradient-to-br
                  from-sky-500/10
                  to-blue-600/10
                  border border-sky-500/10
                  flex items-center justify-center
                  text-sky-400
                  text-xl
                  mb-4
                  group-hover:from-sky-500
                  group-hover:to-blue-600
                  group-hover:text-white
                  transition-all duration-300
                "
              >
                {service.icon}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-lg mb-1">
                {service.title}
              </h3>

              {/* Schedule */}
              <p className="text-sky-300 text-sm mb-2">
                {service.schedule}
              </p>

              {/* Description */}
              <p className="text-slate-400 text-sm leading-relaxed">
                {service.description}
              </p>

              {/* Accent Line */}
              <div className="absolute bottom-0 left-5 right-5 h-[2px] bg-sky-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>

        {/* ─── UPDATES / ANNOUNCEMENTS (Middle Section) ─── */}
        <div className="mb-12 md:mb-16">
          
          {/* Section Label */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 md:w-12 h-[2px] bg-sky-400 rounded-full" />
            <p className="uppercase tracking-[0.25em] text-sky-400 font-semibold text-[11px] md:text-xs">
              What's Happening
            </p>
            <div className="w-10 md:w-12 h-[2px] bg-sky-400 rounded-full" />
          </div>

          <h2
            className="
              text-white
              font-black
              leading-tight
              mb-8
              text-center
              text-2xl
              sm:text-3xl
              md:text-4xl
            "
          >
            Latest <span className="text-sky-400">Updates</span>
          </h2>

          {/* Update Cards - Horizontal Scroll on Mobile, Grid on Desktop */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {updates.map((update, index) => (
              <div
                key={index}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/[0.03]
                  transition-all
                  duration-300
                  hover:border-sky-500/20
                  hover:bg-white/[0.05]
                "
              >
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={update.image}
                    alt={update.title}
                    className="
                      w-full
                      h-full
                      object-cover
                      transition-transform
                      duration-700
                      group-hover:scale-105
                    "
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                  
                  {/* Date Badge */}
                  <div
                    className="
                      absolute
                      top-3
                      left-3
                      flex
                      items-center
                      gap-1.5
                      rounded-lg
                      bg-black/50
                      backdrop-blur-md
                      border
                      border-white/10
                      px-2.5
                      py-1
                    "
                  >
                    <FaCalendarAlt className="text-sky-400 text-[10px]" />
                    <span className="text-white text-[10px] font-medium">
                      {update.date}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 md:p-5">
                  <h3 className="text-white font-bold text-base md:text-lg mb-1.5">
                    {update.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {update.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </Container>

      {/* ─── FOOTER (Pushed Down) ─── */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl mt-auto">

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