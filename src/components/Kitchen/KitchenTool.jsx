/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./KitchenTool.css";

// NOTE: Ensure your actual API URL is here!
const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const KitchenTool = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("list");
  const [kitchenData, setKitchenData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Grocery List State
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");

  // Recipe Modal State
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [recipeIngredientsText, setRecipeIngredientsText] = useState("");

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/kitchen`);
      const data = await response.json();
      if (!response.ok) {
        console.error("🚨 BACKEND ERROR:", data.error);
        setKitchenData([]);
        setLoading(false);
        return;
      }
      setKitchenData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Network or parsing error:", error);
      setKitchenData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const groceries = kitchenData.filter((item) => item.pk === "GROCERY");
  const pantry = kitchenData.filter((item) => item.pk === "INVENTORY");
  const recipes = kitchenData.filter((item) => item.pk === "RECIPE");

  // --- ADD GROCERY ITEM ---
  const handleAddGrocery = async (e) => {
    e.preventDefault();
    if (!newItemName) return;

    try {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pk: "GROCERY",
          name: newItemName,
          quantity: Number(newItemQty) || 1,
          unit: newItemUnit || "item",
        }),
      });
      setNewItemName("");
      setNewItemQty("");
      setNewItemUnit("");
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- MARK BOUGHT (Moves to Pantry) ---
  const handleMarkBought = async (item) => {
    try {
      await fetch(`${API_BASE}/kitchen/${item.sk}?pk=GROCERY`, {
        method: "DELETE",
      });
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pk: "INVENTORY",
          name: item.name,
          currentQuantity: item.quantity,
          unit: item.unit,
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- OPEN EDIT MODAL ---
  const openEditModal = (item) => {
    setEditingItem(item);
    setEditQty(item.pk === "GROCERY" ? item.quantity : item.currentQuantity);
    setEditUnit(item.unit || "");
  };

  // --- SAVE EDITED ITEM ---
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const updatedItem = { ...editingItem, unit: editUnit };

    if (editingItem.pk === "GROCERY") {
      updatedItem.quantity = Number(editQty);
    } else if (editingItem.pk === "INVENTORY") {
      updatedItem.currentQuantity = Number(editQty);
    }

    try {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });
      setEditingItem(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to update item.");
    }
  };

  // --- DELETE FUNCTIONS ---
  const handleDeleteItem = async (item, pkType) => {
    try {
      await fetch(`${API_BASE}/kitchen/${item.sk}?pk=${pkType}`, {
        method: "DELETE",
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- SAVE RECIPE WITH TEXT INGREDIENTS ---
  const handleSaveRecipe = async () => {
    if (!recipeName || !recipeIngredientsText) {
      alert("Please provide a name and paste the ingredients!");
      return;
    }

    try {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pk: "RECIPE",
          name: recipeName,
          url: recipeUrl,
          ingredientsText: recipeIngredientsText,
        }),
      });

      setRecipeName("");
      setRecipeUrl("");
      setRecipeIngredientsText("");
      setIsRecipeModalOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to save recipe.");
    }
  };

  // --- SMART AI ACTION: COOKED THIS ---
  const handleCookedThis = async (recipe) => {
    try {
      const response = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COOKED_RECIPE",
          recipe: recipe,
          inventory: pantry,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error || "Something went wrong processing the recipe.",
        );
      }
      alert("Recipe processed successfully!");
      loadData();
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  // --- DYNAMIC SUB-HEADER ---
  const getTabSummary = () => {
    if (activeTab === "list") return `${groceries.length} items to buy`;
    if (activeTab === "pantry") return `${pantry.length} items in stock`;
    if (activeTab === "meals") return `${recipes.length} saved recipes`;
    return "";
  };

  return (
    <div className="view tool-view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Kitchen</h2>
        {activeTab === "meals" ? (
          <button
            className="ios-add-btn"
            onClick={() => setIsRecipeModalOpen(true)}
          >
            +
          </button>
        ) : (
          <div style={{ width: "36px" }}></div> /* Spacer for alignment */
        )}
      </header>

      <div className="ios-segmented-control">
        <button
          className={`segmented-btn ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          List
        </button>
        <button
          className={`segmented-btn ${activeTab === "pantry" ? "active" : ""}`}
          onClick={() => setActiveTab("pantry")}
        >
          Pantry
        </button>
        <button
          className={`segmented-btn ${activeTab === "meals" ? "active" : ""}`}
          onClick={() => setActiveTab("meals")}
        >
          Meals
        </button>
      </div>

      <div className="tab-summary">{getTabSummary()}</div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="tool-content">
        {/* --- GROCERY LIST TAB --- */}
        {activeTab === "list" && (
          <div className="list-container">
            {groceries.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🛒</span>
                <p>Your list is empty.</p>
                <small>Add items below for your next run.</small>
              </div>
            ) : (
              groceries.map((item) => (
                <div key={item.sk} className="kitchen-list-item">
                  <div className="item-left-group">
                    <button
                      className="clean-checkbox"
                      onClick={() => handleMarkBought(item)}
                    ></button>
                    <span className="kitchen-item-name">{item.name}</span>
                  </div>
                  <div className="item-right-group">
                    <span className="qty-badge">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      className="icon-btn"
                      onClick={() => openEditModal(item)}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => handleDeleteItem(item, "GROCERY")}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- PANTRY TAB --- */}
        {activeTab === "pantry" && (
          <div className="list-container">
            {pantry.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🥫</span>
                <p>Your pantry is bare.</p>
                <small>Check off groceries to stock up.</small>
              </div>
            ) : (
              pantry.map((item) => (
                <div key={item.sk} className="kitchen-list-item">
                  <div className="item-left-group">
                    <span className="kitchen-item-name">{item.name}</span>
                  </div>
                  <div className="item-right-group">
                    <span className="qty-badge">
                      {item.currentQuantity} {item.unit}
                    </span>
                    <button
                      className="icon-btn"
                      onClick={() => openEditModal(item)}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => handleDeleteItem(item, "INVENTORY")}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- MEALS TAB --- */}
        {activeTab === "meals" && (
          <div className="list-container">
            {recipes.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">👨‍🍳</span>
                <p>No recipes saved.</p>
                <small>Click '+' to start building your menu.</small>
              </div>
            ) : (
              recipes.map((recipe) => (
                <div key={recipe.sk} className="recipe-card">
                  <div className="recipe-header">
                    <h3 className="recipe-title">{recipe.name}</h3>
                    <button
                      className="icon-btn delete"
                      onClick={() => handleDeleteItem(recipe, "RECIPE")}
                    >
                      ✕
                    </button>
                  </div>

                  {recipe.url && (
                    <a
                      href={recipe.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recipe-link"
                    >
                      🔗 View Recipe
                    </a>
                  )}

                  <button
                    className="cooked-btn"
                    onClick={() => handleCookedThis(recipe)}
                  >
                    Cooked This
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- STICKY BOTTOM BAR (List Tab Only) --- */}
      {activeTab === "list" && (
        <div className="sticky-add-bar">
          <form onSubmit={handleAddGrocery} className="add-grocery-form">
            <input
              className="ios-input-modal item-input"
              placeholder="Item (e.g. Milk)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <input
              className="ios-input-modal qty-input"
              placeholder="Qty"
              type="number"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
            />
            <input
              className="ios-input-modal unit-input"
              placeholder="Unit"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
            />
            <button type="submit" className="ios-submit-btn inline-add-btn">
              ↑
            </button>
          </form>
        </div>
      )}

      {/* --- ADD RECIPE MODAL --- */}
      {isRecipeModalOpen && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              New Recipe
              <button
                className="ios-modal-close"
                onClick={() => setIsRecipeModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              <input
                className="ios-input-modal"
                placeholder="Recipe Name"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                style={{ marginBottom: "12px" }}
              />
              <input
                className="ios-input-modal"
                placeholder="Link to recipe (optional)"
                type="url"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                style={{ marginBottom: "12px" }}
              />
              <textarea
                className="ios-input-modal"
                placeholder="Paste the exact ingredients list here..."
                value={recipeIngredientsText}
                onChange={(e) => setRecipeIngredientsText(e.target.value)}
                style={{
                  marginBottom: "24px",
                  minHeight: "100px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleSaveRecipe}
                className="ios-submit-btn full-width"
              >
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT ITEM MODAL --- */}
      {editingItem && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              Edit {editingItem.name}
              <button
                className="ios-modal-close"
                onClick={() => setEditingItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              <div
                style={{ display: "flex", gap: "12px", marginBottom: "24px" }}
              >
                <input
                  className="ios-input-modal"
                  style={{ flex: 1, margin: 0 }}
                  placeholder="Qty"
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                />
                <input
                  className="ios-input-modal"
                  style={{ flex: 2, margin: 0 }}
                  placeholder="Unit"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveEdit}
                className="ios-submit-btn full-width"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenTool;
