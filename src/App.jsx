/* eslint-disable no-unused-vars */
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css"; // Global styles only

// Import our modular components
import Hub from "./components/Hub/Hub";
import BillsTool from "./components/Bills/BillsTool";
import KitchenTool from "./components/Kitchen/KitchenTool";
import PokerTool from "./components/Poker/PokerTool";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/bills" element={<BillsTool />} />
        <Route path="/poker" element={<PokerTool />} />
        <Route path="/kitchen" element={<KitchenTool />} />
      </Routes>
    </Router>
  );
};

export default App;
