import Container from "../layout/Container";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=2070')",
        }}
      />

      {/* Main Dark Overlay */}
      <div className="absolute inset-0 bg-slate-900/55" />

      {/* Soft Blue Lighting */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-transparent to-cyan-400/10" />
      
      {/* Cinematic Fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />

      {/* Content */}
      <Container className="relative z-10">

        <div className="max-w-5xl pl-2 md:pl-10 lg:pl-30">

          {/* Small Label */}
          <div className="flex items-center gap-3 mb-8">

            <div className="w-12 h-[5px]" />

            <p className="uppercase tracking-[4px] text-sky-400 font-semibold text-sm">
              Modern Acts Church Olongapo
            </p>

          </div>

          {/* Main Heading */}
          <h1 className="text-white font-black leading-[0.95] mb-8 text-6xl md:text-7xl lg:text-[95px]">

            A Place To
            <span className="block text-sky-400">
              Encounter God
            </span>

          </h1>

          {/* Description */}
          <p className="text-slate-100 text-lg md:text-xl leading-9 max-w-2xl mb-12">
            Experience passionate worship, authentic community,
            and life-changing messages centered on Christ.
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-5">
            <button className="bg-gradient-to-r from-sky-500 to-blue-700 text-white px-8 py-4 rounded-full font-semibold text-lg hover:scale-105 transition duration-300 shadow-[0_0_40px_rgba(14,165,233,0.35)]">
              Join Us Sunday

            </button>

            <button className="border border-white/15 bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition">

              Watch Sermons

            </button>

          </div>

        </div>

      </Container>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-slate-950 to-transparent" />

    </section>
  );
}