import Container from "../layout/Container";

import {
  FaBible,
  FaEye,
  FaBullseye,
} from "react-icons/fa";

import aboutImage from "../../assets/about.jpg";

const values = [
  {
    icon: <FaBullseye size={20} />,
    title: "Mission",
    description:
       "To glorify God by making disciples who love God, love people, and transform communities.",
  },
  {
    icon: <FaEye size={20} />,
    title: "Vision",
    description:
      "To glorify God by making disciples who love God, love people, and transform communities.",
  },
  {
    icon: <FaBible size={20} />,
    title: "Make Disciples",
    description:
      "We guide people to follow Jesus and grow deeper in His Word daily.",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="
        relative
        overflow-hidden
        bg-slate-950
        py-20
        md:py-28
      "
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[150px]" />

      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[140px]" />

      <Container className="relative z-10">

        <div
          className="
            grid
            lg:grid-cols-2
            gap-14
            lg:gap-24
            items-center
          "
        >

          {/* IMAGE SIDE */}
          <div className="relative group">

            {/* Main Image */}
            <div
              className="
                relative
                overflow-hidden
                rounded-[28px]
                aspect-[4/5]
                max-w-sm
                sm:max-w-md
                mx-auto
                lg:mx-0
                shadow-2xl
                border
                border-white/10
              "
            >
              <img
                src={aboutImage}
                alt="Modern Acts Church"
                className="
                  w-full
                  h-full
                  object-cover
                  transition-transform
                  duration-700
                  group-hover:scale-105
                "
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

              {/* Floating Card */}
              <div
                className="
                  absolute
                  bottom-4
                  left-4
                  right-4
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/35
                  backdrop-blur-xl
                  p-4
                  sm:p-5
                "
              >
                <p
                  className="
                    text-sky-400
                    text-[10px]
                    sm:text-xs
                    uppercase
                    tracking-[0.25em]
                    font-semibold
                    mb-1
                  "
                >
                  Est. 2023
                </p>

                <h3
                  className="
                    text-white
                    font-bold
                    text-base
                    sm:text-lg
                  "
                >
                  Growing in Faith Together
                </h3>
              </div>
            </div>

            {/* Decorative Frame */}
            <div
              className="
                absolute
                -top-4
                -right-4
                w-full
                h-full
                rounded-[28px]
                border
                border-sky-500/20
                -z-10
              "
            />
          </div>

          {/* CONTENT SIDE */}
          <div>

            {/* Small Label */}
            <div className="flex items-center gap-3 mb-6">

              <div className="w-12 h-[2px] bg-sky-400 rounded-full" />

              <p
                className="
                  uppercase
                  tracking-[0.25em]
                  text-sky-400
                  text-[11px]
                  md:text-xs
                  font-semibold
                "
              >
                Who We Are
              </p>
            </div>

            {/* Heading */}
            <h2
              className="
                text-white
                font-black
                leading-[1.05]
                mb-6
                text-3xl
                sm:text-4xl
                md:text-5xl
                lg:text-6xl
              "
            >
              A Church That
              <span className="block text-sky-400 mt-1">
                Feels Like Home
              </span>
            </h2>

            {/* Description */}
            <p
              className="
                text-slate-300
                leading-relaxed
                text-sm
                sm:text-base
                md:text-lg
                mb-5
                max-w-2xl
              "
            >
              Modern Acts Church is a vibrant community in
              Olongapo City where people encounter God,
              grow in faith, and build meaningful
              relationships centered on Christ.
            </p>

            <p
              className="
                text-slate-400
                leading-relaxed
                text-sm
                sm:text-base
                md:text-lg
                mb-10
                max-w-2xl
              "
            >
              Whether you're exploring faith for the first
              time or searching for a church family, you'll
              find authentic community, hope, and belonging
              here.
            </p>

            {/* Values */}
            <div className="space-y-5">

              {values.map((value, index) => (
                <div
                  key={index}
                  className="
                    group
                    flex
                    items-start
                    gap-4
                    rounded-2xl
                    border
                    border-white/5
                    bg-white/[0.03]
                    p-4
                    transition-all
                    duration-300
                    hover:border-sky-500/20
                    hover:bg-white/[0.05]
                  "
                >

                  {/* Icon */}
                  <div
                    className="
                      flex-shrink-0
                      w-11
                      h-11
                      rounded-xl
                      flex
                      items-center
                      justify-center
                      bg-gradient-to-br
                      from-sky-500/15
                      to-blue-600/15
                      text-sky-400
                      border
                      border-sky-500/20
                      transition-all
                      duration-300
                      group-hover:scale-110
                      group-hover:bg-sky-500
                      group-hover:text-white
                    "
                  >
                    {value.icon}
                  </div>

                  {/* Text */}
                  <div>

                    <h3
                      className="
                        text-white
                        font-bold
                        text-base
                        sm:text-lg
                        mb-1
                      "
                    >
                      {value.title}
                    </h3>

                    <p
                      className="
                        text-slate-400
                        text-sm
                        leading-relaxed
                      "
                    >
                      {value.description}
                    </p>

                  </div>
                </div>
              ))}

            </div>

          </div>
        </div>
      </Container>
    </section>
  );
}