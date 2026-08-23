// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";
import "./App.css";

import Hub from "./components/Hub/Hub";
import BillsTool from "./components/Bills/BillsTool";
import KitchenTool from "./components/Kitchen/KitchenTool";
import PokerTool from "./components/Poker/PokerTool";
import Login from "./components/Auth/Login";
import Admin from "./components/Auth/Admin";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check if the user is already logged in when they open the app
    getCurrentUser()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsInitializing(false));
  }, []);

  if (isInitializing) {
    return (
      <div className="view">
        <header className="ios-nav-bar">
          <h2>Loading...</h2>
        </header>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={<Login setSession={setIsAuthenticated} />}
        />

        {/* Protected Routes */}
        <Route
          path="/admin"
          element={isAuthenticated ? <Admin /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <Hub /> : <Navigate to="/login" />}
        />
        <Route
          path="/bills"
          element={isAuthenticated ? <BillsTool /> : <Navigate to="/login" />}
        />
        <Route
          path="/poker"
          element={isAuthenticated ? <PokerTool /> : <Navigate to="/login" />}
        />
        <Route
          path="/kitchen"
          element={isAuthenticated ? <KitchenTool /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
};

export default App;
