let services = [];
let activeCategory = "All";
let currentLang = localStorage.getItem("alqua-lang") || "en";

const resultsGrid = document.getElementById("resultsGrid");
const resultsCount = document.getElementById("resultsCount");
const noResults = document.getElementById("noResults");
const searchInput = document.getElementById("searchInput");
const categoryFilters = document.getElementById("categoryFilters");
const langToggle = document.getElementById("langToggle");

const UI_TEXT = {
  en: {
    title: "Al Qua'a Service Discovery",
    tagline: "Find local services, support, and opportunities in Al Qua'a — fast.",
    searchPlaceholder: "What do you need? e.g. clinic, transport, camel, permit...",
    addServiceBtn: "+ Add a service",
    addServiceTitle: "Add a local service",
    fieldName: "Name",
    fieldCategory: "Category",
    fieldDescription: "Description",
    fieldLocation: "Location",
    fieldHours: "Hours",
    fieldPhone: "Phone",
    fieldTags: "Tags (comma-separated)",
    cancel: "Cancel",
    saveService: "Save service",
    emergencyLabel: "Emergency?",
    emergencyText: "Civil Defense & Emergency Response is available 24/7 —",
    emergencyCall: "call +971-3-700-0006",
    noResults: "No services match your search. Try a different keyword.",
    footer: "Built for the Tatweer Hackathon 2026 — Service Discovery Challenge — Al Qua'a, Al Ain.",
    getDirections: "Get directions",
    communityBadge: "Community-submitted",
    removeListing: "Remove this listing",
    resultsFound: (n) => `${n} service${n === 1 ? "" : "s"} found`,
    toggleLabel: "العربية",
  },
  ar: {
    title: "دليل خدمات القُعة",
    tagline: "اعثر على الخدمات المحلية والدعم والفرص في القُعة — بسرعة.",
    searchPlaceholder: "ما الذي تحتاجه؟ مثل: عيادة، نقل، إبل، تصريح...",
    addServiceBtn: "+ أضف خدمة",
    addServiceTitle: "إضافة خدمة محلية",
    fieldName: "الاسم",
    fieldCategory: "الفئة",
    fieldDescription: "الوصف",
    fieldLocation: "الموقع",
    fieldHours: "ساعات العمل",
    fieldPhone: "الهاتف",
    fieldTags: "الكلمات الدلالية (مفصولة بفواصل)",
    cancel: "إلغاء",
    saveService: "حفظ الخدمة",
    emergencyLabel: "حالة طارئة؟",
    emergencyText: "الدفاع المدني والاستجابة للطوارئ متوفرة على مدار الساعة —",
    emergencyCall: "اتصل بـ ٠٠٦-٧٠٠-٣-٩٧١+",
    noResults: "لا توجد خدمات مطابقة لبحثك. حاول استخدام كلمة أخرى.",
    footer: "صُمم لهاكاثون تطوير ٢٠٢٦ — تحدي اكتشاف الخدمات — القُعة، العين.",
    getDirections: "احصل على الاتجاهات",
    communityBadge: "مُقدّمة من المجتمع",
    removeListing: "إزالة هذه الخدمة",
    resultsFound: (n) => `تم العثور على ${n} خدمة`,
    toggleLabel: "English",
  },
};

const CATEGORY_TRANSLATIONS = {
  Healthcare: "الرعاية الصحية",
  Government: "الحكومة",
  "Agriculture & Livestock": "الزراعة والثروة الحيوانية",
  Education: "التعليم",
  Transport: "النقل",
  Emergency: "الطوارئ",
  "Tourism & Events": "السياحة والفعاليات",
  Entrepreneurship: "ريادة الأعمال",
};

function t(key) {
  return UI_TEXT[currentLang][key];
}

function translateCategory(cat) {
  if (currentLang === "ar") {
    return CATEGORY_TRANSLATIONS[cat] || cat;
  }
  return cat;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (UI_TEXT[currentLang][key] === undefined) return;
    if (el.tagName === "LABEL") {
      el.childNodes[0].textContent = UI_TEXT[currentLang][key];
    } else {
      el.textContent = UI_TEXT[currentLang][key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = UI_TEXT[currentLang][key];
  });

  langToggle.textContent = t("toggleLabel");
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("alqua-lang", lang);
  applyStaticTranslations();
  renderCategoryChips();
  renderResults();
}

langToggle.addEventListener("click", () => {
  setLanguage(currentLang === "en" ? "ar" : "en");
});

function renderCategoryChips() {
  const categories = ["All", ...new Set(services.map((s) => s.category))];
  categoryFilters.innerHTML = categories
    .map((cat) => {
      const label = cat === "All" ? (currentLang === "ar" ? "الكل" : "All") : translateCategory(cat);
      return `<button class="category-chip${cat === activeCategory ? " active" : ""}" data-category="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
    })
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
    service.nameAr,
    service.category,
    service.description,
    service.descriptionAr,
    ...(service.tags || []),
    ...(service.tagsAr || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function displayField(service, field) {
  if (currentLang === "ar" && service[`${field}Ar`]) {
    return service[`${field}Ar`];
  }
  return service[field];
}

function renderResults() {
  const query = searchInput.value.trim();
  const filtered = services.filter(
    (s) =>
      (activeCategory === "All" || s.category === activeCategory) &&
      matchesQuery(s, query)
  );

  resultsCount.textContent = t("resultsFound")(filtered.length);
  noResults.hidden = filtered.length !== 0;

  resultsGrid.innerHTML = filtered
    .map((s) => {
      const name = displayField(s, "name");
      const description = displayField(s, "description");
      const location = displayField(s, "location");
      const hours = displayField(s, "hours");
      const mapsQuery = encodeURIComponent(`${s.location} ${s.name}`);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

      return `
      <article class="service-card">
        <span class="service-category">${escapeHtml(translateCategory(s.category))}</span>
        ${s.isCustom ? `<span class="custom-badge">${escapeHtml(t("communityBadge"))}</span>` : ""}
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(description)}</p>
        <div class="service-meta">📍 ${escapeHtml(location)}
          — <a href="${mapsUrl}" target="_blank" rel="noopener">${escapeHtml(t("getDirections"))}</a>
        </div>
        <div class="service-meta">🕒 ${escapeHtml(hours)}</div>
        <div class="service-meta">📞 <a href="tel:${escapeHtml(s.phone)}">${escapeHtml(s.phone)}</a></div>
        ${s.isCustom ? `<button class="remove-btn" data-id="${escapeHtml(s.id)}" type="button">${escapeHtml(t("removeListing"))}</button>` : ""}
      </article>
    `;
    })
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
  applyStaticTranslations();

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
