import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Ministries from "./component/home/Ministries";

import DiscipleshipJourney from "./component/ministries/DiscipleshipJourney/DiscipleshipJourney";

import Administration from "./component/ministries/Admin/Administration";
import AdminTask from "./component/ministries/Admin/AdminTask";
import AdminAccount from "./component/ministries/Admin/AdminAccount";
import AdminEvent from "./component/ministries/Admin/AdminEvent";

import Finance from "./component/ministries/Finance/FinanceLedger";
import FinanceThites from "./component/ministries/Finance/FinanceThites";
import FinanceOffering from "./component/ministries/Finance/FinanceOffering";
import FinancePledge from "./component/ministries/Finance/FinancePledge";
import FinanceExpenses from "./component/ministries/Finance/FinanceExpenses";
import FinanceTotalIncome from "./component/ministries/Finance/FinanceTotalIncome";
import FinanceTotalTransaction from "./component/ministries/Finance/FinanceTransaction";
//usher
import Usher from "./component/ministries/Usher/UsherDashboard";
import UsherMembers from "./component/ministries/Usher/UsherMembers";
import UsherAttendance from "./component/ministries/Usher/UsherAttendance";
import UsherAttendanceDashboard from "./component/ministries/Usher/UsherAttendanceDashboard";

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
        <Route path="/ministries/discipleshipjourney" element={<DiscipleshipJourney/>}/>

        <Route path="/ministries/administration" element={<Administration />} />
        <Route path="/ministries/administration/task" element={<AdminTask />} />
        <Route path="/ministries/administration/event" element={<AdminEvent />} />
        <Route path = "/ministries/administration/accounts" element={<AdminAccount />} />

        <Route path="/ministries/finance" element={<Finance />} />
        <Route path="/ministries/finance/tithes" element={<FinanceThites />} />
        <Route path="/ministries/finance/offering" element={<FinanceOffering />} />
        <Route path="/ministries/finance/pledge" element={<FinancePledge />} />
        <Route path="/ministries/finance/expenses" element={<FinanceExpenses />} />
        <Route path="/ministries/finance/total-income" element={<FinanceTotalIncome />} />
        <Route path="/ministries/finance/total-transaction" element={<FinanceTotalTransaction />} />

        <Route path="/ministries/usher" element={<Usher />} />
        <Route path="/ministries/usher/ushermember" element={<UsherMembers />} />
        <Route path="/ministries/usher/usherattendance" element={<UsherAttendance />} />
         <Route path="/ministries/usher/usherdashboard" element={<UsherAttendanceDashboard />} />

        <Route path="/ministries/media" element={<Media />} />
        <Route path="/ministries/media/personnel" element={<MediaPersonnel />} />
        <Route path="/ministries/media/pending" element={<MediaPending />} />
        <Route path="/ministries/media/inprogress" element={<MediaInProgress />} />
        <Route path="/ministries/media/completed" element={<MediaCompleted />} />
      </Routes>
    </BrowserRouter>
  );
}