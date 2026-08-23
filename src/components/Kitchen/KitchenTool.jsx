/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth"; // <-- ADDED AUTH IMPORT
import "./KitchenTool.css";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

const KitchenTool = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("list");
  const [kitchenData, setKitchenData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [recipeIngredientsText, setRecipeIngredientsText] = useState("");

  const [editingRecipe, setEditingRecipe] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");

  const [checkingRecipeId, setCheckingRecipeId] = useState(null);
  const [recipePlan, setRecipePlan] = useState(null);

  const [portionBySk, setPortionBySk] = useState({});
  const getPortion = (sk) => portionBySk[sk] || 1;

  // --- NEW AUTH HELPER ---
  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/kitchen`, {
        headers: await getAuthHeaders(), // <-- SECURED
      });
      const data = await response.json();
      if (!response.ok) {
        setKitchenData([]);
        return;
      }
      setKitchenData(Array.isArray(data) ? data : []);
    } catch (error) {
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

  const handleAddGrocery = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    try {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(), // <-- SECURED
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

  const handleMarkBought = async (item) => {
    try {
      const authHeaders = await getAuthHeaders(); // <-- Fetch securely once for both calls
      await fetch(`${API_BASE}/kitchen/${item.sk}?pk=GROCERY`, {
        method: "DELETE",
        headers: authHeaders,
      });
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: authHeaders,
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

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditQty(item.pk === "GROCERY" ? item.quantity : item.currentQuantity);
    setEditUnit(item.unit || "");
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const updatedItem = { ...editingItem, unit: editUnit };
    if (editingItem.pk === "GROCERY") updatedItem.quantity = Number(editQty);
    else if (editingItem.pk === "INVENTORY")
      updatedItem.currentQuantity = Number(editQty);

    try {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(), // <-- SECURED
        body: JSON.stringify(updatedItem),
      });
      setEditingItem(null);
      loadData();
    } catch (e) {
      alert("Failed to update item.");
    }
  };

  const handleDeleteItem = async (item, pkType) => {
    try {
      await fetch(`${API_BASE}/kitchen/${item.sk}?pk=${pkType}`, {
        method: "DELETE",
        headers: await getAuthHeaders(), // <-- SECURED
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const [savingRecipe, setSavingRecipe] = useState(false);

  const handleSaveRecipe = async () => {
    if (!recipeName || !recipeIngredientsText)
      return alert("Please provide a name and paste the ingredients!");
    setSavingRecipe(true);

    const payload = {
      pk: "RECIPE",
      name: recipeName,
      url: recipeUrl,
      ingredientsText: recipeIngredientsText,
    };

    if (editingRecipe) {
      payload.sk = editingRecipe.sk;
    }

    try {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(), // <-- SECURED
        body: JSON.stringify(payload),
      });

      setRecipeName("");
      setRecipeUrl("");
      setRecipeIngredientsText("");
      setEditingRecipe(null);
      setIsRecipeModalOpen(false);
      loadData();
    } catch (e) {
      alert("Failed to save recipe.");
    }
    setSavingRecipe(false);
  };

  const handleCheckRecipe = async (recipe) => {
    setCheckingRecipeId(recipe.sk);
    try {
      const response = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(), // <-- SECURED
        body: JSON.stringify({
          action: "CHECK_RECIPE",
          recipe: recipe,
          inventory: pantry,
          multiplier: getPortion(recipe.sk),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setRecipePlan(result.aiMath);
    } catch (e) {
      alert(e.message);
    }
    setCheckingRecipeId(null);
  };

  const handleAddMissingToList = async () => {
    if (!recipePlan || !recipePlan.missingIngredients) return;

    const authHeaders = await getAuthHeaders(); // <-- Grab token before loop
    for (const missing of recipePlan.missingIngredients) {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: authHeaders, // <-- SECURED
        body: JSON.stringify({
          pk: "GROCERY",
          name: missing.name,
          quantity: missing.quantity,
          unit: missing.unit,
        }),
      });
    }
    setRecipePlan(null);
    loadData();
    alert("Missing items added to your grocery list!");
  };

  const handleExecuteCook = async () => {
    if (!recipePlan || !recipePlan.updatedInventory) return;

    setKitchenData((prevData) => {
      let nextData = [...prevData];
      for (const item of recipePlan.updatedInventory) {
        if (item.currentQuantity <= 0) {
          nextData = nextData.filter((i) => i.sk !== item.sk);
        } else {
          const index = nextData.findIndex((i) => i.sk === item.sk);
          if (index !== -1) {
            nextData[index] = {
              ...nextData[index],
              currentQuantity: item.currentQuantity,
            };
          }
        }
      }
      return nextData;
    });

    const authHeaders = await getAuthHeaders(); // <-- Grab token before loop
    for (const item of recipePlan.updatedInventory) {
      if (item.currentQuantity <= 0) {
        await fetch(`${API_BASE}/kitchen/${item.sk}?pk=INVENTORY`, {
          method: "DELETE",
          headers: authHeaders, // <-- SECURED
        });
      } else {
        const originalItem = pantry.find((i) => i.sk === item.sk);
        if (originalItem) {
          await fetch(`${API_BASE}/kitchen`, {
            method: "POST",
            headers: authHeaders, // <-- SECURED
            body: JSON.stringify({
              ...originalItem,
              currentQuantity: item.currentQuantity,
            }),
          });
        }
      }
    }

    setRecipePlan(null);
    loadData();
    alert("Inventory updated! Hope it was delicious.");
  };

  const getTabSummary = () => {
    if (activeTab === "list") return `${groceries.length} items to buy`;
    if (activeTab === "pantry") return `${pantry.length} items in stock`;
    if (activeTab === "meals") return `${recipes.length} saved recipes`;
    return "";
  };

  const closeRecipeModal = () => {
    setIsRecipeModalOpen(false);
    setEditingRecipe(null);
    setRecipeName("");
    setRecipeUrl("");
    setRecipeIngredientsText("");
  };

  const openRecipeEdit = (recipe) => {
    setEditingRecipe(recipe);
    setRecipeName(recipe.name);
    setRecipeUrl(recipe.url || "");
    setRecipeIngredientsText(recipe.ingredientsText || "");
    setIsRecipeModalOpen(true);
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
            onClick={() => {
              setEditingRecipe(null);
              setRecipeName("");
              setRecipeUrl("");
              setRecipeIngredientsText("");
              setIsRecipeModalOpen(true);
            }}
          >
            +
          </button>
        ) : (
          <div style={{ width: "36px" }}></div>
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

      <div className="tool-content">
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
                    <div>
                      <button
                        className="icon-btn"
                        onClick={() => openRecipeEdit(recipe)}
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => handleDeleteItem(recipe, "RECIPE")}
                      >
                        ✕
                      </button>
                    </div>
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

                  <div
                    className="portion-selector"
                    style={{ display: "flex", gap: "6px", margin: "8px 0" }}
                  >
                    {[0.5, 1, 2, 3].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setPortionBySk((prev) => ({
                            ...prev,
                            [recipe.sk]: p,
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          borderRadius: "8px",
                          border: "1px solid #D8D8D2",
                          background:
                            getPortion(recipe.sk) === p ? "#3A3D36" : "#F4F4F0",
                          color:
                            getPortion(recipe.sk) === p ? "#fff" : "#3A3D36",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {p}x
                      </button>
                    ))}
                  </div>

                  <button
                    className="cooked-btn"
                    onClick={() => handleCheckRecipe(recipe)}
                    disabled={checkingRecipeId === recipe.sk}
                    style={{
                      opacity: checkingRecipeId === recipe.sk ? 0.7 : 1,
                    }}
                  >
                    {checkingRecipeId === recipe.sk
                      ? "Checking Pantry..."
                      : `Can I make ${getPortion(recipe.sk)}x this?`}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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

      {recipePlan && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              {recipePlan.canMake ? "Yes, you can!" : "Not quite..."}
              <button
                className="ios-modal-close"
                onClick={() => setRecipePlan(null)}
              >
                ✕
              </button>
            </div>

            <div className="ios-modal-content">
              {recipePlan.canMake ? (
                <>
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      color: "#4C664D",
                      fontWeight: "600",
                    }}
                  >
                    You have everything you need:
                  </p>
                  <ul
                    style={{
                      paddingLeft: "20px",
                      marginBottom: "24px",
                      color: "#3A3D36",
                    }}
                  >
                    {recipePlan.requiredIngredients.map((ing, idx) => (
                      <li key={idx} style={{ marginBottom: "6px" }}>
                        {ing.quantity} {ing.unit} {ing.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleExecuteCook}
                    className="ios-submit-btn full-width"
                  >
                    Cooked This (Update Pantry)
                  </button>
                </>
              ) : (
                <>
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      color: "#E64848",
                      fontWeight: "600",
                    }}
                  >
                    You are missing:
                  </p>
                  <ul
                    style={{
                      paddingLeft: "20px",
                      marginBottom: "24px",
                      color: "#3A3D36",
                    }}
                  >
                    {recipePlan.missingIngredients.map((ing, idx) => (
                      <li key={idx} style={{ marginBottom: "6px" }}>
                        {ing.quantity} {ing.unit} {ing.name}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setRecipePlan(null)}
                      className="ios-submit-btn full-width"
                      style={{ background: "#F4F4F0", color: "#3A3D36" }}
                    >
                      No Thanks
                    </button>
                    <button
                      onClick={handleAddMissingToList}
                      className="ios-submit-btn full-width"
                    >
                      Add to List
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isRecipeModalOpen && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              {editingRecipe ? "Edit Recipe" : "New Recipe"}
              <button className="ios-modal-close" onClick={closeRecipeModal}>
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
                disabled={savingRecipe}
                style={{ opacity: savingRecipe ? 0.7 : 1 }}
              >
                {savingRecipe ? "Parsing ingredients..." : "Save Recipe"}
              </button>
            </div>
          </div>
        </div>
      )}

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
