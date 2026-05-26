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
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-slate-950 to-blue-900/20" />

      {/* CONTENT */}
      <Container className="relative z-10 flex-1 py-35">

        {/* HEADER */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-5">
            Church <span className="text-sky-400">Services</span>
          </h2>
          <p className="text-slate-300 text-lg leading-8">
            Join us in worship, prayer, and fellowship throughout the week.
          </p>
        </div>

        {/* CARDS */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="
                bg-white/10
                border border-white/10
                rounded-3xl
                p-8
                hover:-translate-y-2
                hover:bg-white/15
                transition-all duration-300
              "
            >
              {/* ICON */}
              <div className="text-sky-400 text-4xl mb-6">
                {service.icon}
              </div>

              {/* TITLE */}
              <h3 className="text-white font-bold text-2xl mb-2">
                {service.title}
              </h3>

              {/* SCHEDULE */}
              <p className="text-sky-300 text-sm mb-3">
                {service.schedule}
              </p>

              {/* DESCRIPTION */}
              <p className="text-slate-300 text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </Container>

      {/* FOOTER (FORCED BOTTOM) */}
      <div className="mt-auto border-t border-white/10 bg-slate-950/80 backdrop-blur-md">
        <Container className="py-4 grid md:grid-cols-2 gap-12">

          {/* LEFT */}
          <div>
            <h3 className="text-white text-2xl font-bold mb-4">
              Modern Acts Church Olongapo
            </h3>

            <p className="text-slate-400 mb-6">
              A community where faith grows and lives are transformed through Christ.
            </p>

            <div className="flex gap-4 text-slate-400 text-xl">
              <FaFacebook className="hover:text-sky-400 cursor-pointer" />
              <FaInstagram className="hover:text-sky-400 cursor-pointer" />
              <FaYoutube className="hover:text-sky-400 cursor-pointer" />
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4 text-slate-400">
            <div className="flex items-center gap-3">
              <FaMapMarkerAlt className="text-sky-400" />
              Acayan St. East Tapinac, Olongapo City, Philippines
            </div>

            <div className="flex items-center gap-3">
              <FaEnvelope className="text-sky-400" />
              modernactschurcholongapo@gmail.com
            </div>

            <div className="flex items-center gap-3">
              <FaPhone className="text-sky-400" />
              +63 912 345 6789
            </div>
          </div>

        </Container>

        <div className="text-center text-slate-500 text-sm py-6 border-t border-white/5">
          © {new Date().getFullYear()} Modern Acts Church
        </div>
      </div>
    </section>
  );
}