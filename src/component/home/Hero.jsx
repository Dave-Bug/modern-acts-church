import Container from "../layout/Container";
import background from "../../assets/background.jpg";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background Image */}
      <div
        className="
          absolute inset-0
          bg-cover bg-center
          scale-105
        "
        style={{
          backgroundImage: `url(${background})`,
        }}
      />

      {/* Main Overlay */}
      <div className="absolute inset-0 bg-slate-950/55" />

      {/* Cinematic Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/30 to-sky-900/10" />

      {/* Bottom Fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

      {/* Sky Glow */}
      <div className="absolute top-[-120px] right-[-120px] w-[500px] h-[500px] bg-sky-400/20 blur-[140px] rounded-full" />

      {/* Blue Accent Glow */}
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full" />

      {/* Hero Content */}
      <Container className="relative z-10 w-full">
        <div
          className="
            max-w-5xl
            px-4 sm:px-6 md:px-10 lg:px-24
            pt-28 md:pt-32
            pb-20
          "
        >
          {/* Label */}
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <div className="w-10 md:w-14 h-[2px] bg-sky-400 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)]" />

            <p
              className="
                uppercase
                tracking-[3px]
                md:tracking-[5px]
                text-sky-300
                font-semibold
                text-[11px]
                md:text-sm
              "
            >
              Modern Acts Church Olongapo
            </p>
          </div>

          {/* Main Heading */}
          <h1
            className="
              text-white
              font-black
              leading-[0.92]
              mb-6
              text-4xl
              sm:text-5xl
              md:text-6xl
              lg:text-7xl
              xl:text-[95px]
              drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]
            "
          >
            A Place Where
            <span className="block text-sky-400 mt-2">
              You Truly Belong
            </span>
          </h1>

          {/* Tagline */}
          <h2
            className="
              text-white
              font-semibold
              leading-snug
              mb-6
              text-lg
              sm:text-xl
              md:text-2xl
              lg:text-3xl
            "
          >
            Come As You Are,
            <span className="text-sky-300">
              {" "}Stay As You Grow
            </span>
          </h2>

          {/* Description */}
          <p
            className="
              text-slate-200
              leading-relaxed
              max-w-2xl
              mb-8
              text-sm
              sm:text-base
              md:text-lg
              backdrop-blur-[1px]
            "
          >
            Step into a place of worship, encounter,
            and transformation — where lives are renewed,
            hearts are restored, and Jesus is at the center
            of everything we do.
          </p>

          {/* Verse */}
          <div
            className="
              border-l-2 border-sky-400
              pl-4
              max-w-xl
            "
          >
            <p
              className="
                text-slate-300
                italic
                leading-relaxed
                text-xs
                sm:text-sm
                md:text-base
              "
            >
              “For where two or three gather in My name,
              there am I with them.”
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-4 mt-10">
            <a
              href="#about"
              className="
                px-6 py-3
                rounded-2xl
                bg-sky-500
                hover:bg-sky-400
                text-white
                font-semibold
                shadow-lg shadow-sky-500/20
                transition-all duration-300
              "
            >
              Learn More
            </a>

            <a
              href="#services"
              className="
                px-6 py-3
                rounded-2xl
                border border-white/15
                bg-white/5
                hover:bg-white/10
                backdrop-blur-md
                text-white
                font-semibold
                transition-all duration-300
              "
            >
              Join Us
            </a>
          </div>
        </div>
      </Container>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 w-full h-32 md:h-40 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}