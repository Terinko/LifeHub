import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { RequireAuth } from "./RequireAuth";
import { LoadingScreen } from "./LoadingScreen";

// Each tool is its own bundle chunk, downloaded the first time it's opened.
const Login = lazy(() => import("../components/Auth/Login"));
const Admin = lazy(() => import("../components/Auth/Admin"));
const Hub = lazy(() => import("../components/Hub/Hub"));
const BillsPage = lazy(() => import("../features/bills"));
const KitchenPage = lazy(() => import("../features/kitchen"));
const PokerPage = lazy(() => import("../features/poker"));
const FantasyPage = lazy(() => import("../features/fantasy"));
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
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/poker" element={<PokerPage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/fantasy" element={<FantasyPage />} />
            <Route path="/weather" element={<WeatherTool />} />
            <Route path="/applications" element={<ApplicationsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
