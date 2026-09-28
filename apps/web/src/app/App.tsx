import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { RequireAuth } from "./RequireAuth";
import { LoadingScreen } from "./LoadingScreen";

// Each tool is its own bundle chunk, downloaded the first time it's opened.
const Login = lazy(() => import("../components/Auth/Login"));
const Admin = lazy(() => import("../components/Auth/Admin"));
const Hub = lazy(() => import("../components/Hub/Hub"));
const BillsTool = lazy(() => import("../components/Bills/BillsTool"));
const KitchenTool = lazy(() => import("../components/Kitchen/KitchenTool"));
const PokerTool = lazy(() => import("../components/Poker/PokerTool"));
const FantasyTool = lazy(() => import("../components/Fantasy/FantasyTool"));
const ApplicationsPage = lazy(() => import("../features/applications"));
const WeatherTool = lazy(() => import("../components/Weather/WeatherTool"));

export function App() {
  const { isInitializing, setIsAuthenticated } = useAuth();

  if (isInitializing) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/login"
            element={<Login setSession={setIsAuthenticated} />}
          />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Hub />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/bills" element={<BillsTool />} />
            <Route path="/poker" element={<PokerTool />} />
            <Route path="/kitchen" element={<KitchenTool />} />
            <Route path="/fantasy" element={<FantasyTool />} />
            <Route path="/weather" element={<WeatherTool />} />
            <Route path="/applications" element={<ApplicationsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
