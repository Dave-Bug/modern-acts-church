import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Ministries from "./component/home/Ministries";
import Media from "./component/ministries/Media";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ministries" element={<Ministries />} />
        <Route path="/ministries/media" element={<Media />} />
      </Routes>
    </BrowserRouter>
  );
}