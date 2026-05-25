import {
  FaMusic,
  FaVideo,
  FaUsers,
} from "react-icons/fa";
import Container from "../layout/Container"; // ✅ add this

const ministries = [
  {
    icon: <FaUsers />,
    title: "Youth Ministry",
    description:
      "Helping young people grow spiritually and build lasting faith.",
  },
  {
    icon: <FaMusic />,
    title: "Music Ministry",
    description:
      "Leading the church into passionate worship and praise.",
  },
  {
    icon: <FaVideo />,
    title: "Media Ministry",
    description:
      "Using technology and creativity to spread the Gospel.",
  },
];

export default function Ministries() {
  return (
    <section
      id="ministries"
      className="py-32 bg-gray-100"
    >
      <Container>

        <div className="text-center mb-20">

          <p className="uppercase tracking-[5px] text-yellow-500 font-semibold mb-4">
            Ministries
          </p>

          <h2 className="text-5xl font-bold text-gray-900">
            Serve With Purpose
          </h2>

        </div>

        <div className="grid md:grid-cols-3 gap-10">

          {ministries.map((ministry, index) => (
            <div
              key={index}
              className="bg-white p-10 rounded-3xl shadow-lg hover:-translate-y-3 transition duration-300"
            >

              <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-2xl text-black mb-8">
                {ministry.icon}
              </div>

              <h3 className="text-2xl font-bold mb-5">
                {ministry.title}
              </h3>

              <p className="text-gray-600 leading-8">
                {ministry.description}
              </p>

            </div>
          ))}

        </div>
 </Container>
    </section>
  );
}