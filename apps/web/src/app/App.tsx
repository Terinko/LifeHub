import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { RequireAuth } from "./RequireAuth";
import { LoadingScreen } from "./LoadingScreen";

// Each tool is its own bundle chunk, downloaded the first time it's opened.
const LoginPage = lazy(() => import("../features/auth"));
const AdminPage = lazy(() => import("../features/admin"));
const HubPage = lazy(() => import("../features/hub"));
const BillsPage = lazy(() => import("../features/bills"));
const KitchenPage = lazy(() => import("../features/kitchen"));
const PokerPage = lazy(() => import("../features/poker"));
const FantasyPage = lazy(() => import("../features/fantasy"));
const ApplicationsPage = lazy(() => import("../features/applications"));
const WeatherPage = lazy(() => import("../features/weather"));

export function App() {
  const { isInitializing, setIsAuthenticated } = useAuth();

  if (isInitializing) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage onSignedIn={() => setIsAuthenticated(true)} />}
          />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HubPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/poker" element={<PokerPage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/fantasy" element={<FantasyPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
