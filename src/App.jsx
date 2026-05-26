import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Ministries from "./component/home/Ministries";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ministries" element={<Ministries />} />
      </Routes>
    </BrowserRouter>
  );
}