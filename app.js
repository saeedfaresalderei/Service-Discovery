let services = [];
let activeCategory = "All";

const resultsGrid = document.getElementById("resultsGrid");
const resultsCount = document.getElementById("resultsCount");
const noResults = document.getElementById("noResults");
const searchInput = document.getElementById("searchInput");
const categoryFilters = document.getElementById("categoryFilters");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderCategoryChips() {
  const categories = ["All", ...new Set(services.map((s) => s.category))];
  categoryFilters.innerHTML = categories
    .map(
      (cat) =>
        `<button class="category-chip${cat === activeCategory ? " active" : ""}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    )
    .join("");

  categoryFilters.querySelectorAll(".category-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      renderCategoryChips();
      renderResults();
    });
  });
}

function matchesQuery(service, query) {
  if (!query) return true;
  const haystack = [
    service.name,
    service.category,
    service.description,
    ...(service.tags || []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderResults() {
  const query = searchInput.value.trim();
  const filtered = services.filter(
    (s) =>
      (activeCategory === "All" || s.category === activeCategory) &&
      matchesQuery(s, query)
  );

  resultsCount.textContent = `${filtered.length} service${filtered.length === 1 ? "" : "s"} found`;
  noResults.hidden = filtered.length !== 0;

  resultsGrid.innerHTML = filtered
    .map(
      (s) => `
      <article class="service-card">
        <span class="service-category">${escapeHtml(s.category)}</span>
        ${s.isCustom ? '<span class="custom-badge">Community-submitted</span>' : ""}
        <h3>${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.description)}</p>
        <div class="service-meta">📍 ${escapeHtml(s.location)}</div>
        <div class="service-meta">🕒 ${escapeHtml(s.hours)}</div>
        <div class="service-meta">📞 <a href="tel:${escapeHtml(s.phone)}">${escapeHtml(s.phone)}</a></div>
        ${s.isCustom ? `<button class="remove-btn" data-id="${escapeHtml(s.id)}" type="button">Remove this listing</button>` : ""}
      </article>
    `
    )
    .join("");

  resultsGrid.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeCustomService(btn.dataset.id));
  });
}

function removeCustomService(id) {
  if (!confirm("Remove this listing? This can't be undone.")) return;
  const custom = loadCustomServices().filter((s) => s.id !== id);
  saveCustomServices(custom);
  services = services.filter((s) => s.id !== id);
  renderCategoryChips();
  renderResults();
}

const CUSTOM_KEY = "alqua-custom-services";

function loadCustomServices() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCustomServices(list) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

async function init() {
  const res = await fetch(`data/services.json?v=${Date.now()}`, { cache: "no-store" });
  const baseServices = await res.json();
  services = [...baseServices, ...loadCustomServices().map((s) => ({ ...s, isCustom: true }))];
  renderCategoryChips();
  renderResults();
}

const PHONE_PATTERN = /^\+?[0-9\s-]{7,}$/;

function validateService(data) {
  const errors = [];

  if (!data.name || data.name.length < 3) {
    errors.push("Name must be at least 3 characters.");
  }
  if (!data.category || data.category.length < 3) {
    errors.push("Category must be at least 3 characters.");
  }
  if (!data.description || data.description.length < 10) {
    errors.push("Description must be at least 10 characters — explain what the service does.");
  }
  if (!data.location) {
    errors.push("Location is required.");
  }
  if (!data.hours) {
    errors.push("Hours are required.");
  }
  if (!data.phone || !PHONE_PATTERN.test(data.phone)) {
    errors.push("Phone number looks invalid. Use digits, spaces, or + only, at least 7 digits.");
  }

  const isDuplicate = services.some(
    (s) =>
      s.name.toLowerCase() === data.name.toLowerCase() ||
      s.phone.replace(/\s|-/g, "") === data.phone.replace(/\s|-/g, "")
  );
  if (isDuplicate) {
    errors.push("A service with this name or phone number already exists.");
  }

  return errors;
}

searchInput.addEventListener("input", renderResults);

const addServiceBtn = document.getElementById("addServiceBtn");
const addServiceDialog = document.getElementById("addServiceDialog");
const addServiceForm = document.getElementById("addServiceForm");
const cancelAddBtn = document.getElementById("cancelAddBtn");

addServiceBtn.addEventListener("click", () => addServiceDialog.showModal());
cancelAddBtn.addEventListener("click", () => addServiceDialog.close());

const formErrors = document.getElementById("formErrors");

addServiceForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(addServiceForm);

  const draft = {
    name: formData.get("name").trim(),
    category: formData.get("category").trim(),
    description: formData.get("description").trim(),
    location: formData.get("location").trim(),
    hours: formData.get("hours").trim(),
    phone: formData.get("phone").trim(),
    tags: formData
      .get("tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };

  const errors = validateService(draft);
  if (errors.length > 0) {
    formErrors.innerHTML = errors.map((err) => `<li>${escapeHtml(err)}</li>`).join("");
    formErrors.hidden = false;
    return;
  }
  formErrors.hidden = true;

  const summary = `Please confirm this is correct before adding it:\n\n${draft.name}\n${draft.category}\n${draft.location}\n${draft.hours}\n${draft.phone}`;
  if (!confirm(summary)) return;

  const newService = { id: `custom-${Date.now()}`, ...draft, isCustom: true };

  const custom = loadCustomServices();
  custom.push(newService);
  saveCustomServices(custom);

  services.push(newService);
  renderCategoryChips();
  renderResults();

  addServiceForm.reset();
  addServiceDialog.close();
});

init();
