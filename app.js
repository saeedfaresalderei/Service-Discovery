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
        <h3>${escapeHtml(s.name)}</h3>
        <p>${escapeHtml(s.description)}</p>
        <div class="service-meta">📍 ${escapeHtml(s.location)}</div>
        <div class="service-meta">🕒 ${escapeHtml(s.hours)}</div>
        <div class="service-meta">📞 <a href="tel:${escapeHtml(s.phone)}">${escapeHtml(s.phone)}</a></div>
      </article>
    `
    )
    .join("");
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
  services = [...baseServices, ...loadCustomServices()];
  renderCategoryChips();
  renderResults();
}

searchInput.addEventListener("input", renderResults);

const addServiceBtn = document.getElementById("addServiceBtn");
const addServiceDialog = document.getElementById("addServiceDialog");
const addServiceForm = document.getElementById("addServiceForm");
const cancelAddBtn = document.getElementById("cancelAddBtn");

addServiceBtn.addEventListener("click", () => addServiceDialog.showModal());
cancelAddBtn.addEventListener("click", () => addServiceDialog.close());

addServiceForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(addServiceForm);

  const newService = {
    id: `custom-${Date.now()}`,
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
