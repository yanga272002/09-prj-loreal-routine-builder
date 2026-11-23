/* ==========================================================================
   L'ORÉAL SMART ROUTINE & PRODUCT ADVISOR
   ========================================================================== */

/* —— 1. References to DOM Elements —— */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearAllBtn = document.getElementById("clearAllBtn");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatbox = document.querySelector(".chatbox");
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

/* Modal Dialog Elements for Product Descriptions */
const productModal = document.getElementById("productModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalImg = document.getElementById("modalImg");
const modalBrand = document.getElementById("modalBrand");
const modalTitle = document.getElementById("modalTitle");
const modalCategory = document.getElementById("modalCategory");
const modalDescription = document.getElementById("modalDescription");
const modalSelectBtn = document.getElementById("modalSelectBtn");

/* —— 2. Cloudflare Worker API URL —— */
// Proxies requests securely to OpenAI without exposing API keys on the client
const WORKER_URL = "https://orealworker.wufferssss.workers.dev";

/* —— 3. System Prompt & Topic Guardrails —— */
// Ensures the chatbot focuses strictly on routines and beauty topics
const SYSTEM_PROMPT = `You are the L'Oréal Smart Routine & Product Advisor, an expert beauty and skincare consultant.

Your rules:
1. ONLY answer questions related to the user's generated beauty routine, L'Oréal Group products, skincare, haircare, makeup, suncare, hair styling/color, and fragrances.
2. For follow-up questions, always reference the user's generated routine, previously discussed products, application steps, and formulations to provide cohesive and personalized advice.
3. STRICT GUARDRAIL: If the user asks about ANY topic unrelated to beauty, skincare, haircare, makeup, fragrances, or their routine (such as coding, math, general trivia, politics, sports, history, weather, etc.), politely decline to answer.
Example refusal: "I am specifically trained as a L'Oréal beauty advisor. I can only assist with your personalized routine, skincare, haircare, makeup, and fragrance questions. How can I help with your beauty routine today?"
4. Keep your guidance encouraging, warm, professional, and structured step-by-step.`;

// Full conversation history sent to OpenAI on each turn so the advisor remembers context
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

/* —— 4. Application State & Storage Key —— */
const STORAGE_KEY = "loreal_selected_products";
let allProducts = [];
let selectedProducts = [];
let currentModalProductId = null;

/* —— 5. LocalStorage Persistence Functions —— */

// Load saved products from localStorage on page startup
function loadSelectedProductsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      selectedProducts = JSON.parse(saved);
    }
  } catch (error) {
    console.error("Could not load selected products from localStorage:", error);
    selectedProducts = [];
  }
}

// Save current selected products to localStorage
function saveSelectedProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
  } catch (error) {
    console.error("Could not save selected products to localStorage:", error);
  }
}

/* —— 6. Initial UI Setup —— */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category above to explore products
  </div>
`;

// Retrieve any previously saved products from localStorage
loadSelectedProductsFromStorage();
renderSelectedProducts();

// Welcome message in the chat consultation window
chatWindow.innerHTML = `
  <div class="assistant-message">
    <p>Welcome to <strong>L'Oréal Smart Routine &amp; Product Advisor</strong>! Select your preferred products above and click <strong>Generate Routine</strong> to receive a personalized, step-by-step beauty ritual crafted just for you.</p>
  </div>
`;

/* —— 7. Load Products from JSON File —— */
async function loadProducts() {
  if (allProducts.length === 0) {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
  }
  return allProducts;
}

/* —— 8. Display Product Cards in the Grid —— */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if product is currently in the selectedProducts list
      const isSelected = selectedProducts.some((p) => p.id === product.id);

      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button 
              type="button" 
              class="details-btn" 
              data-id="${product.id}"
              aria-label="View description and details for ${product.name}"
            >
              <i class="fa-solid fa-circle-info"></i> View Details
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

/* —— 9. Render the "Selected Products" Section —— */
function renderSelectedProducts() {
  // If no products are selected, show empty state message and hide "Clear All"
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="no-selection-message">No products selected yet. Click on any product above to add it to your routine.</p>
    `;
    if (clearAllBtn) clearAllBtn.classList.add("hidden");
    return;
  }

  // Show the "Clear All" button when there are selected items
  if (clearAllBtn) clearAllBtn.classList.remove("hidden");

  // Render each selected product as an interactive chip with a remove (×) button
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-chip">
        <span class="chip-name">${product.name}</span>
        <button 
          type="button" 
          class="remove-btn" 
          data-id="${product.id}" 
          aria-label="Remove ${product.name}"
          title="Remove product"
        >&times;</button>
      </div>
    `
    )
    .join("");
}

/* —— 10. Synchronize Selection Highlights in Grid & Modal —— */
function updateGridSelection() {
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    const cardId = Number(card.dataset.id);
    const isSelected = selectedProducts.some((p) => p.id === cardId);
    card.classList.toggle("selected", isSelected);
  });
  updateModalSelectButton();
}

/* —— 11. Toggle Product Selection (Add / Remove) —— */
function toggleProductSelection(productId) {
  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    // Already selected: remove it
    selectedProducts.splice(existingIndex, 1);
  } else {
    // Not yet selected: find and add it
    const productToAdd = allProducts.find((p) => p.id === productId);
    if (productToAdd) {
      selectedProducts.push(productToAdd);
    }
  }

  // Persist updated list to localStorage
  saveSelectedProducts();
  renderSelectedProducts();
  updateGridSelection();
}

/* —— 12. Remove Individual Item from Selected List —— */
function removeProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  // Persist updated list to localStorage
  saveSelectedProducts();
  renderSelectedProducts();
  updateGridSelection();
}

/* —— 13. Clear All Selections at Once —— */
function clearAllSelections() {
  selectedProducts = [];
  // Persist empty list to localStorage
  saveSelectedProducts();
  renderSelectedProducts();
  updateGridSelection();
}

/* —— 14. Product Description Modal Dialog —— */
function openProductModal(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  currentModalProductId = productId;
  modalImg.src = product.image;
  modalImg.alt = product.name;
  modalBrand.textContent = product.brand;
  modalTitle.textContent = product.name;
  modalCategory.textContent = product.category;
  modalDescription.textContent = product.description;

  updateModalSelectButton();

  productModal.classList.remove("hidden");
  productModal.setAttribute("aria-hidden", "false");
  modalCloseBtn.focus();
}

function closeProductModal() {
  productModal.classList.add("hidden");
  productModal.setAttribute("aria-hidden", "true");
  currentModalProductId = null;
}

function updateModalSelectButton() {
  if (!currentModalProductId) return;
  const isSelected = selectedProducts.some((p) => p.id === currentModalProductId);
  if (isSelected) {
    modalSelectBtn.innerHTML = `<i class="fa-solid fa-check"></i> In Your Routine`;
    modalSelectBtn.classList.add("is-selected");
  } else {
    modalSelectBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Add to Routine`;
    modalSelectBtn.classList.remove("is-selected");
  }
}

/* —— 15. Chat Display & Routine Rendering Helpers —— */

// Formats basic markdown returned by OpenAI into readable HTML
function formatMarkdown(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**text**) and Italics (*text*)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Headings (### and ##)
  html = html.replace(/^### (.*$)/gim, "<h4>$1</h4>");
  html = html.replace(/^## (.*$)/gim, "<h3>$1</h3>");

  // Process line by line to structure paragraphs and lists
  const lines = html.split("\n");
  let inList = false;
  let listType = "ul";
  let result = [];

  for (let line of lines) {
    const trimmed = line.trim();

    // Check for bullet list item (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ul>");
        inList = true;
        listType = "ul";
      }
      const itemContent = trimmed.replace(/^[-*]\s+/, "");
      result.push(`<li>${itemContent}</li>`);
      continue;
    }

    // Check for numbered list item (e.g. 1. 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!inList || listType !== "ol") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ol>");
        inList = true;
        listType = "ol";
      }
      result.push(`<li>${numMatch[2]}</li>`);
      continue;
    }

    // If previous lines were a list and current line is not, close the list
    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
    }

    // Headings do not need extra <p> tags
    if (/^<h[2-4]>/.test(trimmed)) {
      result.push(trimmed);
    } else if (trimmed.length > 0) {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join("\n");
}

// Appends user or assistant message to chat window
function appendMessage(text, sender, isWarning = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `${sender}-message${isWarning ? " warning-message" : ""}`;

  if (sender === "assistant" && !isWarning) {
    messageDiv.classList.add("routine-content");
    messageDiv.innerHTML = formatMarkdown(text);
  } else {
    const p = document.createElement("p");
    p.textContent = text;
    messageDiv.appendChild(p);
  }

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageDiv;
}

// Loading indicator while waiting for OpenAI API response
function appendLoadingMessage(text) {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "assistant-message loading";
  loadingDiv.id = "chatLoadingIndicator";
  loadingDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${text}</span>`;
  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return loadingDiv;
}

function removeLoadingMessage() {
  const loading = document.getElementById("chatLoadingIndicator");
  if (loading) loading.remove();
}

function setButtonsDisabled(disabled) {
  generateRoutineBtn.disabled = disabled;
  sendBtn.disabled = disabled;
  userInput.disabled = disabled;
}

/* —— 16. Generate Routine via OpenAI API —— */
async function handleGenerateRoutine() {
  // 1. Guard check: Ensure at least one product is selected
  if (selectedProducts.length === 0) {
    appendMessage(
      "Please select at least one product from the catalog above before generating a routine.",
      "assistant",
      true
    );
    chatbox.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // 2. Collect JSON data of ONLY selected products
  const selectedProductsData = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  // 3. Update UI to show progress
  chatbox.scrollIntoView({ behavior: "smooth" });
  const productNames = selectedProducts.map((p) => p.name).join(", ");
  appendMessage(`Please create a personalized routine with my selected products: ${productNames}`, "user");

  appendLoadingMessage("Formulating your personalized L'Oréal beauty routine...");
  setButtonsDisabled(true);

  // 4. Build prompt sending the full JSON data of selected products
  const userPrompt = `Here are the products I have selected for my routine in JSON format:
${JSON.stringify(selectedProductsData, null, 2)}

Please build a personalized, step-by-step beauty routine using these products. Include:
1. When to use each product (Morning, Evening, or both).
2. The recommended application order (Step 1, Step 2, etc.) and application technique.
3. Why these specific products work well together and their key benefits based on their descriptions.
4. Expert tips for optimal skincare results.`;

  messages.push({
    role: "user",
    content: userPrompt,
  });

  try {
    // 5. Send full conversation history to Cloudflare Worker
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 6. Save reply to conversation history
    messages.push({
      role: "assistant",
      content: reply,
    });

    // 7. Display generated routine in the chat window
    removeLoadingMessage();
    appendMessage(reply, "assistant");
  } catch (error) {
    console.error("Error generating routine:", error);
    removeLoadingMessage();
    appendMessage(
      "Sorry, there was an issue communicating with the beauty advisor. Please try again.",
      "assistant",
      true
    );
  } finally {
    setButtonsDisabled(false);
  }
}

/* —— 17. Follow-Up Questions Chat Form Submission —— */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const query = userInput.value.trim();
  if (!query) return;

  // Append user's follow-up question to chat
  appendMessage(query, "user");
  userInput.value = "";

  // Add question to messages history so the model remembers full context
  messages.push({
    role: "user",
    content: query,
  });

  appendLoadingMessage("Consulting L'Oréal beauty advisor...");
  setButtonsDisabled(true);

  try {
    // Send updated conversation history including follow-up question
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Add advisor's response to history
    messages.push({
      role: "assistant",
      content: reply,
    });

    removeLoadingMessage();
    appendMessage(reply, "assistant");
  } catch (error) {
    console.error("Error sending message:", error);
    removeLoadingMessage();
    appendMessage(
      "Sorry, there was an issue getting a response. Please try again.",
      "assistant",
      true
    );
  } finally {
    setButtonsDisabled(false);
  }
});

/* —— 18. Event Listeners —— */

// Category Filter change
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

// Product Grid clicks: Handles both "View Details" button and card selection click
productsContainer.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest(".details-btn");
  if (detailsBtn) {
    e.stopPropagation();
    const productId = Number(detailsBtn.dataset.id);
    openProductModal(productId);
    return;
  }

  const card = e.target.closest(".product-card");
  if (!card) return;

  const productId = Number(card.dataset.id);
  toggleProductSelection(productId);
});

// Selected Products list individual item removal
selectedProductsList.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".remove-btn");
  if (!removeBtn) return;

  const productId = Number(removeBtn.dataset.id);
  removeProduct(productId);
});

// Clear all selections button
if (clearAllBtn) {
  clearAllBtn.addEventListener("click", clearAllSelections);
}

// Modal toggle selection button
modalSelectBtn.addEventListener("click", () => {
  if (currentModalProductId) {
    toggleProductSelection(currentModalProductId);
  }
});

// Modal close button
modalCloseBtn.addEventListener("click", closeProductModal);

// Close modal when clicking directly on backdrop
productModal.addEventListener("click", (e) => {
  if (e.target === productModal) {
    closeProductModal();
  }
});

// Close modal when pressing Escape key
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !productModal.classList.contains("hidden")) {
    closeProductModal();
  }
});

// "Generate Routine" button click
generateRoutineBtn.addEventListener("click", handleGenerateRoutine);
