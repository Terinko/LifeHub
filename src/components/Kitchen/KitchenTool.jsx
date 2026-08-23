/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import "./KitchenTool.css";

const API_BASE = "https://9im6v06twk.execute-api.us-east-1.amazonaws.com";

// --- LOCAL DETERMINISTIC ENGINE ---
const PANTRY_STAPLES = [
  "salt",
  "pepper",
  "black pepper",
  "oil",
  "olive oil",
  "vegetable oil",
  "butter",
  "water",
  "sugar",
];
const VOLUME_TO_ML = {
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
  fl_oz: 29.5735,
  ml: 1,
  l: 1000,
};
const WEIGHT_TO_G = { oz: 28.3495, lb: 453.592, g: 1, kg: 1000 };
const UNIT_ALIASES = {
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  "fl oz": "fl_oz",
  fl_oz: "fl_oz",
  "fluid ounce": "fl_oz",
  "fluid ounces": "fl_oz",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  pinch: "pinch",
  pinches: "pinch",
  item: "item",
  pieces: "item",
  clove: "item",
};

function normalizeName(name) {
  return (name || "").toString().trim().toLowerCase().replace(/s$/, "");
}
function normalizeUnit(unit) {
  const key = (unit || "item").toString().trim().toLowerCase();
  return UNIT_ALIASES[key] || key;
}
function convertUnit(quantity, fromUnit, toUnit) {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (from === to) return quantity;
  if (VOLUME_TO_ML[from] && VOLUME_TO_ML[to])
    return (quantity * VOLUME_TO_ML[from]) / VOLUME_TO_ML[to];
  if (WEIGHT_TO_G[from] && WEIGHT_TO_G[to])
    return (quantity * WEIGHT_TO_G[from]) / WEIGHT_TO_G[to];
  return null;
}

function calculateAvailability(recipeIngredients, inventory, multiplier) {
  if (
    !recipeIngredients ||
    !Array.isArray(recipeIngredients) ||
    recipeIngredients.length === 0
  ) {
    return {
      canMake: false,
      missingIngredients: [
        {
          name: "⚠️ Legacy format. Click edit and save.",
          quantity: "Any",
          unit: "",
        },
      ],
    };
  }

  const missingIngredients = [];
  let canMake = true;

  for (const req of recipeIngredients) {
    if (!req || !req.name) {
      canMake = false;
      continue;
    }
    if (PANTRY_STAPLES.includes(normalizeName(req.name))) continue;

    const target = normalizeName(req.name);
    let match = inventory.find((i) => normalizeName(i.name) === target);
    if (!match) {
      match = inventory.find((i) => {
        const invName = normalizeName(i.name);
        return (
          invName &&
          target &&
          (invName.includes(target) || target.includes(invName))
        );
      });
    }

    // 1. IS IT UNQUANTIFIED? (Fixes the "cheese" issue)
    const isUnquantified =
      req.quantity === undefined ||
      req.quantity === null ||
      req.quantity === "" ||
      isNaN(Number(req.quantity)) ||
      Number(req.quantity) === 0;

    if (isUnquantified) {
      if (!match) {
        canMake = false;
        missingIngredients.push({ name: req.name, quantity: "Any", unit: "" });
      }
      continue; // Skip the math completely!
    }

    const requiredQty = Number(req.quantity) * multiplier;

    if (!match) {
      canMake = false;
      missingIngredients.push({ ...req, quantity: requiredQty });
      continue;
    }

    const invQty = Number(match.currentQuantity) || 0;
    let have = convertUnit(invQty, match.unit, req.unit);

    // 2. FORGIVING UNIT FALLBACK (Fixes the "panini bread" issue)
    if (have === null) {
      have = invQty;
    }

    if (isNaN(have) || have < requiredQty) {
      canMake = false;
      missingIngredients.push({
        name: req.name,
        quantity: Math.round((requiredQty - (have || 0)) * 100) / 100,
        unit: req.unit || match.unit,
      });
    }
  }
  return { canMake, missingIngredients };
}

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

  const [checkingRecipe, setCheckingRecipe] = useState(null);
  const [portionBySk, setPortionBySk] = useState({});
  const getPortion = (sk) => portionBySk[sk] || 1;

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.tokens.idToken.toString()}`,
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/kitchen`, {
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
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

  const recipeAvailabilities = useMemo(() => {
    const acc = {};
    recipes.forEach((r) => {
      acc[r.sk] = calculateAvailability(
        r.ingredients,
        pantry,
        getPortion(r.sk),
      );
    });
    return acc;
  }, [recipes, pantry, portionBySk]);

  const handleAddGrocery = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    try {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
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
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "PURCHASE_GROCERY", item }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
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
        headers: await getAuthHeaders(),
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
        headers: await getAuthHeaders(),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const [savingRecipe, setSavingRecipe] = useState(false);
  const handleSaveRecipe = async () => {
    if (!recipeName || !recipeIngredientsText)
      return alert("Please provide a name and paste ingredients!");
    setSavingRecipe(true);

    try {
      const headers = await getAuthHeaders();
      const parseRes = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "PARSE_RECIPE",
          ingredientsText: recipeIngredientsText,
        }),
      });
      const parsedData = await parseRes.json();

      if (!parsedData.ingredients || parsedData.ingredients.length === 0) {
        setSavingRecipe(false);
        return alert(
          "The AI failed to read these ingredients. Try simplifying the text.",
        );
      }

      const payload = {
        pk: "RECIPE",
        name: recipeName,
        url: recipeUrl,
        ingredientsText: recipeIngredientsText,
        ingredients: parsedData.ingredients,
      };
      if (editingRecipe) payload.sk = editingRecipe.sk;

      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers,
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

  const handleExecuteCook = async (recipe) => {
    try {
      const res = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: "COOK_RECIPE",
          recipe,
          inventory: pantry,
          multiplier: getPortion(recipe.sk),
        }),
      });
      if (!res.ok)
        throw new Error("Failed to cook. Make sure you have the ingredients.");
      setCheckingRecipe(null);
      loadData();
      alert("Inventory updated! Hope it was delicious.");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAddMissingToList = async (missingIngredients) => {
    const authHeaders = await getAuthHeaders();
    for (const missing of missingIngredients) {
      await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: authHeaders,
        // Fallback to 1 if the quantity was "Any" so it doesn't break your shopping list
        body: JSON.stringify({
          pk: "GROCERY",
          name: missing.name,
          quantity: missing.quantity === "Any" ? 1 : missing.quantity,
          unit: missing.unit,
        }),
      });
    }
    setCheckingRecipe(null);
    loadData();
    alert("Missing items added to your grocery list!");
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

      <div className="tool-content">
        {activeTab === "list" && (
          <div className="list-container">
            {groceries.length === 0 ? (
              <div className="empty-state">
                <p>Your list is empty.</p>
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
                      onClick={() => {
                        setEditingItem(item);
                        setEditQty(item.quantity);
                        setEditUnit(item.unit || "");
                      }}
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
                <p>Your pantry is bare.</p>
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
                      onClick={() => {
                        setEditingItem(item);
                        setEditQty(item.currentQuantity);
                        setEditUnit(item.unit || "");
                      }}
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
                <p>No recipes saved.</p>
              </div>
            ) : (
              recipes.map((recipe) => {
                const avail = recipeAvailabilities[recipe.sk] || {
                  canMake: false,
                };
                return (
                  <div key={recipe.sk} className="recipe-card">
                    <div className="recipe-header">
                      <h3 className="recipe-title">{recipe.name}</h3>
                      <div>
                        <button
                          className="icon-btn"
                          onClick={() => {
                            setEditingRecipe(recipe);
                            setRecipeName(recipe.name);
                            setRecipeUrl(recipe.url || "");
                            setRecipeIngredientsText(
                              recipe.ingredientsText || "",
                            );
                            setIsRecipeModalOpen(true);
                          }}
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

                    <p
                      style={{
                        fontSize: "13px",
                        color: "#8c9288",
                        margin: "0 0 12px 0",
                        lineHeight: "1.4",
                      }}
                    >
                      {recipe.ingredients
                        ? recipe.ingredients
                            .map((i) => {
                              const qty = i.quantity ? i.quantity : "";
                              const unit = i.quantity && i.unit ? i.unit : "";
                              return `${qty} ${unit} ${i.name}`.trim();
                            })
                            .join(", ")
                        : "No parsed ingredients"}
                    </p>

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
                              getPortion(recipe.sk) === p
                                ? "#3A3D36"
                                : "#F4F4F0",
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
                      onClick={() => setCheckingRecipe(recipe)}
                      style={{
                        backgroundColor: avail.canMake ? "#4C664D" : "#D8D8D2",
                        color: avail.canMake ? "#FFF" : "#3A3D36",
                      }}
                    >
                      {avail.canMake
                        ? "✓ Ready to Cook!"
                        : "Missing Ingredients"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {activeTab === "list" && (
        <div className="sticky-add-bar">
          <form onSubmit={handleAddGrocery} className="add-grocery-form">
            <input
              className="ios-input-modal item-input"
              placeholder="Item"
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

      {checkingRecipe && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              {recipeAvailabilities[checkingRecipe.sk].canMake
                ? "Ready to Cook!"
                : "Missing Ingredients"}
              <button
                className="ios-modal-close"
                onClick={() => setCheckingRecipe(null)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              {recipeAvailabilities[checkingRecipe.sk].canMake ? (
                <button
                  onClick={() => handleExecuteCook(checkingRecipe)}
                  className="ios-submit-btn full-width"
                >
                  Cook & Deduct Pantry
                </button>
              ) : (
                <>
                  <ul style={{ paddingLeft: "20px", marginBottom: "24px" }}>
                    {recipeAvailabilities[
                      checkingRecipe.sk
                    ].missingIngredients.map((ing, idx) => (
                      <li key={idx}>
                        {ing.quantity === "Any" ? "" : ing.quantity} {ing.unit}{" "}
                        {ing.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() =>
                      handleAddMissingToList(
                        recipeAvailabilities[checkingRecipe.sk]
                          .missingIngredients,
                      )
                    }
                    className="ios-submit-btn full-width"
                  >
                    Add Missing to List
                  </button>
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
                style={{ marginBottom: "12px", width: "100%" }}
              />
              <input
                className="ios-input-modal"
                placeholder="Link"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                style={{ marginBottom: "12px", width: "100%" }}
              />
              <textarea
                className="ios-input-modal"
                placeholder="Paste ingredients..."
                value={recipeIngredientsText}
                onChange={(e) => setRecipeIngredientsText(e.target.value)}
                style={{
                  marginBottom: "24px",
                  minHeight: "100px",
                  width: "100%",
                }}
              />
              <button
                onClick={handleSaveRecipe}
                className="ios-submit-btn full-width"
                disabled={savingRecipe}
              >
                {savingRecipe ? "Parsing with AI..." : "Save Recipe"}
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
                  style={{ flex: 1 }}
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                />
                <input
                  className="ios-input-modal"
                  style={{ flex: 2 }}
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveEdit}
                className="ios-submit-btn full-width"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenTool;
