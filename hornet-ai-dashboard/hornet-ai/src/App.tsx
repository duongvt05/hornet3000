import { BrowserRouter as Router, Routes, Route } from "react-router";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Monitoring from "./pages/Monitoring/index";
import Analytics from "./pages/Analytics/index";
import AlertsCenter from "./pages/AlertsCenter/index";
import Settings from "./pages/Settings/index";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp"; // 1. THÊM DÒNG IMPORT NÀY
import NotFound from "./pages/OtherPage/NotFound";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/alerts-center" element={<AlertsCenter />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          
          {/* CÁC ROUTE KHÔNG NẰM TRONG LAYOUT CHÍNH (FULL MÀN HÌNH) */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} /> {/* 2. THÊM DÒNG ROUTE NÀY */}
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}