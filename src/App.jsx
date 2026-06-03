import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Ministries from "./component/home/Ministries";

import Finance from "./component/ministries/Finance/FinanceLedger";
import FinanceThites from "./component/ministries/Finance/FinanceThites";
import FinanceBasket from "./component/ministries/Finance/FinanceBasket";
import FinancePledge from "./component/ministries/Finance/FinancePledge";
//usher
import Usher from "./component/ministries/Usher/UsherDashboard";
import UsherMembers from "./component/ministries/Usher/UsherMembers";
import UsherAttendance from "./component/ministries/Usher/UsherAttendance";

//media
import Media from "./component/ministries/Media/MediaDashboard";
import MediaPersonnel from "./component/ministries/Media/MediaPersonnel";
import MediaPending from "./component/ministries/Media/Pending";
import MediaInProgress from "./component/ministries/Media/InProgress";
import MediaCompleted from "./component/ministries/Media/Completed";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ministries" element={<Ministries />} />
        <Route path="/ministries/finance" element={<Finance />} />
        <Route path="/ministries/finance/tithes" element={<FinanceThites />} />
        <Route path="/ministries/finance/basket" element={<FinanceBasket />} />
        <Route path="/ministries/finance/pledge" element={<FinancePledge />} />

        <Route path="/ministries/usher" element={<Usher />} />
        <Route path="/ministries/usher/ushermember" element={<UsherMembers />} />
        <Route path="/ministries/usher/usherattendance" element={<UsherAttendance />} />

        <Route path="/ministries/media" element={<Media />} />
        <Route path="/ministries/media/personnel" element={<MediaPersonnel />} />
        <Route path="/ministries/media/pending" element={<MediaPending />} />
        <Route path="/ministries/media/inprogress" element={<MediaInProgress />} />
        <Route path="/ministries/media/completed" element={<MediaCompleted />} />
      </Routes>
    </BrowserRouter>
  );
}