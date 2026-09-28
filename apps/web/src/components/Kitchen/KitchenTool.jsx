/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config";
import { getAuthHeaders } from "../../shared/api/client";

// --- LOCAL DETERMINISTIC ENGINE ---
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

// Renders a quantity badge, folding in any compound "extra" quantities
// (units that couldn't be merged into the primary number) as "+ N unit".
function formatQtyDisplay(item, isPantry) {
  const primaryQty = isPantry ? item.currentQuantity : item.quantity;
  const parts = [`${primaryQty} ${item.unit || ""}`.trim()];
  if (Array.isArray(item.extra)) {
    item.extra.forEach((e) => {
      parts.push(`${e.quantity} ${e.unit || ""}`.trim());
    });
  }
  return parts.join(" + ");
}

const KitchenTool = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("list");
  const [kitchenData, setKitchenData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");

  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editExtra, setEditExtra] = useState([]);

  // sk's currently mid fade-out (marked bought / deleted) so the row plays
  // its leave animation before actually being removed from kitchenData.
  const [leavingSks, setLeavingSks] = useState(() => new Set());

  // --- Quick Meals: build/edit modal ---
  const [isQuickMealModalOpen, setIsQuickMealModalOpen] = useState(false);
  const [editingQuickMeal, setEditingQuickMeal] = useState(null);
  const [quickMealName, setQuickMealName] = useState("");
  const [quickMealItems, setQuickMealItems] = useState([]);
  // "pick" = choosing which pantry item to add, "qty" = entering how much
  // of the just-picked item, "custom" = adding an item that isn't tracked
  // in the pantry at all, null = no sub-step showing.
  const [pantryPickerStep, setPantryPickerStep] = useState(null);
  const [pendingPantryItem, setPendingPantryItem] = useState(null);
  const [pendingPantryQty, setPendingPantryQty] = useState("1");
  const [pendingCustomName, setPendingCustomName] = useState("");
  const [pendingCustomUnit, setPendingCustomUnit] = useState("");

  // --- Quick Meals: "paste a list" (reuses the same AI parsing action the
  // old Recipes feature used) — one Gemini call per explicit tap.
  const [ingredientsText, setIngredientsText] = useState("");
  const [parsingIngredients, setParsingIngredients] = useState(false);

  // --- Quick Meals: per-card quantities, adjustable inline via +/- before
  // logging. Keyed by quick meal sk; falls back to the saved item defaults
  // until the user actually nudges something for that card.
  const [quickMealQuantities, setQuickMealQuantities] = useState({});
  // sk's whose "Ate It" button is briefly showing a confirmation state.
  const [justLoggedSks, setJustLoggedSks] = useState(() => new Set());

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
  const quickMeals = kitchenData.filter((item) => item.pk === "QUICKMEAL");

  const handleAddGrocery = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    const name = newItemName;
    const quantity = Number(newItemQty) || 1;
    const unit = newItemUnit || "item";
    setNewItemName("");
    setNewItemQty("");
    setNewItemUnit("");
    try {
      const res = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ pk: "GROCERY", name, quantity, unit }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const savedItem = await res.json();
      // Insert/merge the authoritative saved item directly instead of a
      // full reload — it fades in via the list item's mount animation.
      setKitchenData((prev) => [
        ...prev.filter((i) => i.sk !== savedItem.sk),
        savedItem,
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to add item. Please try again.");
    }
  };

  const handleMarkBought = async (item) => {
    // Kick off the leave animation immediately so the row starts moving
    // right away instead of sitting frozen while the request is in flight.
    setLeavingSks((prev) => new Set(prev).add(item.sk));

    const requestPromise = (async () => {
      const res = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: "PURCHASE_GROCERY", item }),
      });
      if (!res.ok) throw new Error("Failed to move item to pantry");
      return res.json();
    })();
    const animationDone = new Promise((resolve) => setTimeout(resolve, 280));

    try {
      const [result] = await Promise.all([requestPromise, animationDone]);
      setKitchenData((prev) => {
        const withoutOld = prev.filter(
          (i) =>
            i.sk !== item.sk &&
            !(i.pk === "INVENTORY" && i.sk === result.pantryItem.sk),
        );
        return [...withoutOld, result.pantryItem];
      });
    } catch (e) {
      console.error(e);
      alert("Failed to move item to the pantry. Please try again.");
    } finally {
      setLeavingSks((prev) => {
        const next = new Set(prev);
        next.delete(item.sk);
        return next;
      });
    }
  };

  const updateEditExtraField = (idx, field, value) => {
    setEditExtra((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    );
  };
  const addEditExtraRow = () =>
    setEditExtra((prev) => [...prev, { quantity: "", unit: "" }]);
  const removeEditExtraRow = (idx) =>
    setEditExtra((prev) => prev.filter((_, i) => i !== idx));

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const updatedItem = { ...editingItem, unit: editUnit };
    if (editingItem.pk === "GROCERY") updatedItem.quantity = Number(editQty);
    else if (editingItem.pk === "INVENTORY")
      updatedItem.currentQuantity = Number(editQty);

    const cleanedExtra = editExtra
      .map((e) => ({
        quantity: Number(e.quantity),
        unit: (e.unit || "").trim(),
      }))
      .filter((e) => e.unit && !isNaN(e.quantity) && e.quantity > 0);
    if (cleanedExtra.length > 0) updatedItem.extra = cleanedExtra;
    else delete updatedItem.extra;

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

  // --- Quick Meals ---

  const openNewQuickMeal = () => {
    setEditingQuickMeal(null);
    setQuickMealName("");
    setQuickMealItems([]);
    setIsQuickMealModalOpen(true);
  };

  const openEditQuickMeal = (qm) => {
    setEditingQuickMeal(qm);
    setQuickMealName(qm.name);
    setQuickMealItems((qm.items || []).map((i) => ({ ...i })));
    setIsQuickMealModalOpen(true);
  };

  const startAddQuickMealItem = () => {
    setPendingPantryItem(null);
    setPendingPantryQty("1");
    setPantryPickerStep("pick");
  };

  const pickPantryItemForQuickMeal = (item) => {
    setPendingPantryItem(item);
    setPendingPantryQty("1");
    setPantryPickerStep("qty");
  };

  const confirmAddQuickMealItem = () => {
    if (!pendingPantryItem) return;
    // Blank/0 is allowed on purpose, same as an unquantified recipe
    // ingredient — it just means this item has no default amount and won't
    // decrement anything unless it's bumped up before logging.
    const raw = pendingPantryQty.trim();
    const qty = raw === "" ? 0 : Number(raw);
    if (isNaN(qty) || qty < 0) return;
    setQuickMealItems((prev) => [
      ...prev,
      {
        pantrySk: pendingPantryItem.sk,
        name: pendingPantryItem.name,
        quantity: qty,
        unit: pendingPantryItem.unit || "",
      },
    ]);
    setPantryPickerStep(null);
    setPendingPantryItem(null);
  };

  const removeQuickMealItem = (idx) =>
    setQuickMealItems((prev) => prev.filter((_, i) => i !== idx));

  // Not everything in a Quick Meal has to be a pantry item you track (hot
  // sauce, a side you don't inventory, etc.) — this is the other path out of
  // the picker, alongside choosing an existing pantry row.
  const startAddCustomQuickMealItem = () => {
    setPendingCustomName("");
    setPendingCustomUnit("");
    setPendingPantryQty("1");
    setPantryPickerStep("custom");
  };

  const confirmAddCustomQuickMealItem = () => {
    const name = pendingCustomName.trim();
    if (!name) return;
    const raw = pendingPantryQty.trim();
    const qty = raw === "" ? 0 : Number(raw);
    if (isNaN(qty) || qty < 0) return;
    setQuickMealItems((prev) => [
      ...prev,
      { pantrySk: null, name, quantity: qty, unit: pendingCustomUnit.trim() },
    ]);
    setPantryPickerStep(null);
    setPendingCustomName("");
    setPendingCustomUnit("");
  };

  // Best-effort link to an existing pantry row by name, same exact/fuzzy
  // matching convention used elsewhere in this file (getAvailablePantryQty) —
  // used when parsed ingredients happen to match something already tracked.
  const findPantryMatch = (name) => {
    const target = normalizeName(name);
    return (
      pantry.find((p) => normalizeName(p.name) === target) ||
      pantry.find((p) => {
        const n = normalizeName(p.name);
        return n && target && (n.includes(target) || target.includes(n));
      })
    );
  };

  // Paste a whole ingredient list and have it parsed into individual Quick
  // Meal item rows in one shot — reuses the same AI action the old Recipes
  // feature used. One Gemini call per explicit tap, never automatic.
  const handleParseIngredients = async () => {
    if (!ingredientsText.trim()) return;
    setParsingIngredients(true);
    try {
      const res = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: "PARSE_INGREDIENTS",
          ingredientsText,
        }),
      });
      const data = await res.json();
      if (!data.ingredients || data.ingredients.length === 0) {
        alert(
          "Couldn't read any ingredients from that text. Try simplifying it.",
        );
        return;
      }
      const newItems = data.ingredients.map((ing) => {
        const match = findPantryMatch(ing.name);
        return {
          pantrySk: match ? match.sk : null,
          name: match ? match.name : ing.name,
          quantity: Number(ing.quantity) || 0,
          unit: ing.unit || match?.unit || "",
        };
      });
      setQuickMealItems((prev) => [...prev, ...newItems]);
      setIngredientsText("");
    } catch (e) {
      console.error(e);
      alert("Failed to parse ingredients.");
    }
    setParsingIngredients(false);
  };

  const handleSaveQuickMeal = async () => {
    if (!quickMealName.trim())
      return alert("Give this Quick Meal a name first.");
    if (quickMealItems.length === 0)
      return alert("Add at least one item from your pantry.");

    const payload = {
      pk: "QUICKMEAL",
      name: quickMealName.trim(),
      items: quickMealItems,
    };
    if (editingQuickMeal) payload.sk = editingQuickMeal.sk;

    try {
      const res = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save Quick Meal");
      const savedItem = await res.json();
      setKitchenData((prev) => [
        ...prev.filter((i) => i.sk !== savedItem.sk),
        savedItem,
      ]);
      setIsQuickMealModalOpen(false);
    } catch (e) {
      alert("Failed to save Quick Meal.");
    }
  };

  // The quantities currently showing on a Quick Meal's card — the saved
  // defaults until the user has nudged something with +/- this session.
  const getQuickMealQuantities = (qm) =>
    quickMealQuantities[qm.sk] || qm.items || [];

  // How much of this item is actually sitting in the pantry right now, in
  // the same unit the Quick Meal item is tracked in — used only to flag a
  // heads-up, never to block logging.
  const getAvailablePantryQty = (item) => {
    const match =
      pantry.find((p) => p.sk === item.pantrySk) ||
      pantry.find((p) => normalizeName(p.name) === normalizeName(item.name));
    if (!match) return 0;
    const raw = Number(match.currentQuantity) || 0;
    const converted = convertUnit(raw, match.unit, item.unit);
    return converted !== null ? converted : raw;
  };

  const isQuickMealItemLow = (item) => {
    const qty = Number(item.quantity) || 0;
    return qty > 0 && qty > getAvailablePantryQty(item);
  };

  const adjustQuickMealQty = (qm, idx, delta) => {
    setQuickMealQuantities((prev) => {
      const current = prev[qm.sk] || (qm.items || []).map((i) => ({ ...i }));
      const updated = current.map((item, i) =>
        i === idx
          ? {
              ...item,
              quantity: Math.max(0, (Number(item.quantity) || 0) + delta),
            }
          : item,
      );
      return { ...prev, [qm.sk]: updated };
    });
  };

  const handleLogQuickMeal = async (qm) => {
    const items = getQuickMealQuantities(qm);
    try {
      const res = await fetch(`${API_BASE}/kitchen`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: "LOG_QUICK_MEAL",
          items: items.map((i) => ({
            pantrySk: i.pantrySk,
            name: i.name,
            quantity: Number(i.quantity) || 0,
            unit: i.unit,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to log meal");
      const data = await res.json();
      const updatedByS = new Map(
        (data.pantryItems || []).map((p) => [p.sk, p]),
      );
      setKitchenData((prev) =>
        prev.map((item) =>
          item.pk === "INVENTORY" && updatedByS.has(item.sk)
            ? updatedByS.get(item.sk)
            : item,
        ),
      );
      // Reset back to the saved defaults, ready for next time.
      setQuickMealQuantities((prev) => {
        const next = { ...prev };
        delete next[qm.sk];
        return next;
      });
      setJustLoggedSks((prev) => new Set(prev).add(qm.sk));
      setTimeout(() => {
        setJustLoggedSks((prev) => {
          const next = new Set(prev);
          next.delete(qm.sk);
          return next;
        });
      }, 1300);
    } catch (e) {
      alert("Failed to log this meal. Please try again.");
    }
  };

  return (
    <div className="view tool-view">
      <header className="ios-nav-bar">
        <button onClick={() => navigate("/")} className="ios-back-btn">
          ‹ Hub
        </button>
        <h2>Kitchen</h2>
        {activeTab === "meals" ? (
          <button className="ios-add-btn" onClick={openNewQuickMeal}>
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
          Quick Meals
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
                <div
                  key={item.sk}
                  className={`kitchen-list-item${leavingSks.has(item.sk) ? " kitchen-item-leaving" : ""}`}
                >
                  <div className="item-left-group">
                    <button
                      className="clean-checkbox"
                      onClick={() => handleMarkBought(item)}
                    ></button>
                    <span className="kitchen-item-name">{item.name}</span>
                  </div>
                  <div className="item-right-group">
                    <span className="qty-badge">
                      {formatQtyDisplay(item, false)}
                    </span>
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEditingItem(item);
                        setEditQty(item.quantity);
                        setEditUnit(item.unit || "");
                        setEditExtra(
                          Array.isArray(item.extra)
                            ? item.extra.map((e) => ({ ...e }))
                            : [],
                        );
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
                      {formatQtyDisplay(item, true)}
                    </span>
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEditingItem(item);
                        setEditQty(item.currentQuantity);
                        setEditUnit(item.unit || "");
                        setEditExtra(
                          Array.isArray(item.extra)
                            ? item.extra.map((e) => ({ ...e }))
                            : [],
                        );
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
            {quickMeals.length === 0 ? (
              <div className="empty-state">
                <p>No quick meals yet.</p>
                <small>
                  Tap + above to build one from your pantry, or paste a list of
                  ingredients — handy for things like breakfast that don't need
                  a full recipe.
                </small>
              </div>
            ) : (
              quickMeals.map((qm) => (
                <div key={qm.sk} className="recipe-card quick-meal-card">
                  <div className="recipe-header">
                    <h3 className="recipe-title">{qm.name}</h3>
                    <div>
                      <button
                        className="icon-btn"
                        onClick={() => openEditQuickMeal(qm)}
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => handleDeleteItem(qm, "QUICKMEAL")}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="quick-meal-items">
                    {getQuickMealQuantities(qm).map((item, idx) => (
                      <div key={idx} className="quick-meal-item-row">
                        <span className="quick-meal-item-name">
                          {item.name}
                          {!item.pantrySk && (
                            <span className="untracked-badge">not tracked</span>
                          )}
                        </span>
                        <div className="qty-stepper">
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            onClick={() => adjustQuickMealQty(qm, idx, -1)}
                          >
                            −
                          </button>
                          <span
                            key={item.quantity}
                            className="qty-stepper-value"
                            title={
                              isQuickMealItemLow(item)
                                ? "More than what's in your pantry — will just floor at 0"
                                : undefined
                            }
                            style={{
                              color: !item.quantity
                                ? "#c4cfc5"
                                : isQuickMealItemLow(item)
                                  ? "#e64848"
                                  : "#3a3d36",
                            }}
                          >
                            {item.quantity || 0} {item.unit}
                          </span>
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            onClick={() => adjustQuickMealQty(qm, idx, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className={`cooked-btn quick-meal-ate-btn${justLoggedSks.has(qm.sk) ? " just-logged" : ""}`}
                    onClick={() => handleLogQuickMeal(qm)}
                    disabled={justLoggedSks.has(qm.sk)}
                    style={{
                      backgroundColor: justLoggedSks.has(qm.sk)
                        ? "#2e7d32"
                        : "#4C664D",
                      color: "#FFF",
                    }}
                  >
                    {justLoggedSks.has(qm.sk) ? "✓ Pantry Updated" : "Ate It"}
                  </button>
                  <div className="quick-meal-caption">
                    Removes these amounts from your pantry
                  </div>
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
                className="edit-extra-row"
                style={{ marginBottom: editExtra.length ? "12px" : "24px" }}
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

              {editExtra.map((entry, idx) => (
                <div className="edit-extra-row" key={idx}>
                  <input
                    className="ios-input-modal"
                    style={{ flex: 1 }}
                    type="number"
                    value={entry.quantity}
                    onChange={(e) =>
                      updateEditExtraField(idx, "quantity", e.target.value)
                    }
                  />
                  <input
                    className="ios-input-modal"
                    style={{ flex: 2 }}
                    value={entry.unit}
                    onChange={(e) =>
                      updateEditExtraField(idx, "unit", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="icon-btn delete"
                    onClick={() => removeEditExtraRow(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addEditExtraRow}
                className="add-quantity-btn"
              >
                + Add another quantity
              </button>

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

      {isQuickMealModalOpen && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              {editingQuickMeal ? "Edit Quick Meal" : "New Quick Meal"}
              <button
                className="ios-modal-close"
                onClick={() => setIsQuickMealModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              <input
                className="ios-input-modal"
                placeholder="e.g. Breakfast"
                value={quickMealName}
                onChange={(e) => setQuickMealName(e.target.value)}
                style={{ marginBottom: "16px", width: "100%" }}
              />

              {quickMealItems.map((item, idx) => (
                <div className="edit-extra-row" key={idx}>
                  <span style={{ flex: 2, fontSize: "14px" }}>
                    {item.name}
                    {!item.pantrySk && (
                      <span className="untracked-badge">not tracked</span>
                    )}
                  </span>
                  <span style={{ flex: 1, fontSize: "14px", color: "#8c9288" }}>
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    type="button"
                    className="icon-btn delete"
                    onClick={() => removeQuickMealItem(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={startAddQuickMealItem}
                className="add-quantity-btn"
              >
                + Add item from pantry
              </button>

              <div className="paste-ingredients-section">
                <label className="field-label">
                  Or paste a list of ingredients
                </label>
                <textarea
                  className="ios-input-modal"
                  placeholder={"2 eggs\n4 sausage links\n2 slices toast"}
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  style={{ minHeight: "70px", width: "100%" }}
                />
                <button
                  type="button"
                  onClick={handleParseIngredients}
                  className="add-quantity-btn"
                  disabled={parsingIngredients || !ingredientsText.trim()}
                >
                  {parsingIngredients ? "Parsing with AI..." : "Parse & Add"}
                </button>
              </div>

              <button
                onClick={handleSaveQuickMeal}
                className="ios-submit-btn full-width"
              >
                Save Quick Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {pantryPickerStep === "pick" && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              Choose an item
              <button
                className="ios-modal-close"
                onClick={() => setPantryPickerStep(null)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              <button
                type="button"
                className="add-quantity-btn"
                onClick={startAddCustomQuickMealItem}
              >
                + Item not in my pantry
              </button>
              <div className="pantry-picker-list">
                {pantry.length === 0 ? (
                  <p style={{ fontSize: "14px", color: "#8c9288" }}>
                    Your pantry is empty.
                  </p>
                ) : (
                  pantry.map((p) => (
                    <button
                      type="button"
                      key={p.sk}
                      className="pantry-picker-row"
                      onClick={() => pickPantryItemForQuickMeal(p)}
                    >
                      <span>{p.name}</span>
                      <span className="qty-badge">
                        {formatQtyDisplay(p, true)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {pantryPickerStep === "qty" && pendingPantryItem && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              How much {pendingPantryItem.name}?
              <button
                className="ios-modal-close"
                onClick={() => setPantryPickerStep(null)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              <div className="edit-extra-row" style={{ marginBottom: "24px" }}>
                <input
                  className="ios-input-modal"
                  style={{ flex: 1 }}
                  type="number"
                  autoFocus
                  value={pendingPantryQty}
                  onChange={(e) => setPendingPantryQty(e.target.value)}
                />
                <span style={{ flex: 1, fontSize: "14px", color: "#8c9288" }}>
                  {pendingPantryItem.unit}
                </span>
              </div>
              <button
                onClick={confirmAddQuickMealItem}
                className="ios-submit-btn full-width"
              >
                Add to Quick Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {pantryPickerStep === "custom" && (
        <div className="ios-modal-overlay">
          <div className="ios-modal">
            <div className="ios-modal-header">
              Add an item
              <button
                className="ios-modal-close"
                onClick={() => setPantryPickerStep(null)}
              >
                ✕
              </button>
            </div>
            <div className="ios-modal-content">
              <input
                className="ios-input-modal"
                placeholder="Item name"
                autoFocus
                value={pendingCustomName}
                onChange={(e) => setPendingCustomName(e.target.value)}
                style={{ marginBottom: "12px", width: "100%" }}
              />
              <div className="edit-extra-row" style={{ marginBottom: "8px" }}>
                <input
                  className="ios-input-modal"
                  style={{ flex: 1 }}
                  type="number"
                  value={pendingPantryQty}
                  onChange={(e) => setPendingPantryQty(e.target.value)}
                />
                <input
                  className="ios-input-modal"
                  style={{ flex: 1 }}
                  placeholder="Unit"
                  value={pendingCustomUnit}
                  onChange={(e) => setPendingCustomUnit(e.target.value)}
                />
              </div>
              <div className="field-help">
                Not linked to your pantry — this is just a reminder, it won't
                decrement anything when you log this meal.
              </div>
              <button
                onClick={confirmAddCustomQuickMealItem}
                className="ios-submit-btn full-width"
              >
                Add to Quick Meal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenTool;
