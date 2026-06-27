import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAc0RJbg4sQD1dGsWvusVAuuw8kqmnJMks",
  authDomain: "alqua-service-discovery.firebaseapp.com",
  projectId: "alqua-service-discovery",
  storageBucket: "alqua-service-discovery.firebasestorage.app",
  messagingSenderId: "574788845441",
  appId: "1:574788845441:web:1874be84cf244aaf37b280",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const servicesCollection = collection(db, "services");

let baseServices = [];
let approvedCustomServices = [];
let pendingCustomServices = [];
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
    resultsFound: (n) => `${n} service${n === 1 ? "" : "s"} found`,
    toggleLabel: "العربية",
  },
  ar: {
    title: "دليل خدمات القوع",
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

function recomputeServices() {
  services = [...baseServices, ...approvedCustomServices];
}

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

function buildMapsUrl(location, name) {
  const trimmed = location.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const plainCoords = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (plainCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${plainCoords[1]},${plainCoords[2]}`;
  }

  const degreeCoords = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*°?\s*([NS])\s*,\s*(\d+(?:\.\d+)?)\s*°?\s*([EW])$/i
  );
  if (degreeCoords) {
    const lat = degreeCoords[2].toUpperCase() === "S" ? -degreeCoords[1] : +degreeCoords[1];
    const lng = degreeCoords[4].toUpperCase() === "W" ? -degreeCoords[3] : +degreeCoords[3];
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${trimmed} ${name}`)}`;
}

function renderResults() {
  const query = searchInput.value.trim();
  const filtered = services.filter(
    (s) => (activeCategory === "All" || s.category === activeCategory) && matchesQuery(s, query)
  );

  resultsCount.textContent = t("resultsFound")(filtered.length);
  noResults.hidden = filtered.length !== 0;

  resultsGrid.innerHTML = filtered
    .map((s) => {
      const name = displayField(s, "name");
      const description = displayField(s, "description");
      const location = displayField(s, "location");
      const hours = displayField(s, "hours");
      const mapsUrl = buildMapsUrl(s.location, s.name);

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
      </article>
    `;
    })
    .join("");
}

async function init() {
  applyStaticTranslations();

  const res = await fetch(`data/services.json?v=${Date.now()}`, { cache: "no-store" });
  baseServices = await res.json();
  recomputeServices();
  renderCategoryChips();
  renderResults();

  onSnapshot(query(servicesCollection, where("status", "==", "approved")), (snapshot) => {
    approvedCustomServices = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), isCustom: true }));
    recomputeServices();
    renderCategoryChips();
    renderResults();
  });
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

addServiceForm.addEventListener("submit", async (e) => {
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
      .map((tag) => tag.trim())
      .filter(Boolean),
  };

  const errors = validateService(draft);
  if (errors.length > 0) {
    formErrors.innerHTML = errors.map((err) => `<li>${escapeHtml(err)}</li>`).join("");
    formErrors.hidden = false;
    return;
  }
  formErrors.hidden = true;

  const summary = `Please confirm this is correct before submitting it for review:\n\n${draft.name}\n${draft.category}\n${draft.location}\n${draft.hours}\n${draft.phone}`;
  if (!confirm(summary)) return;

  try {
    await addDoc(servicesCollection, { ...draft, status: "pending" });
    addServiceForm.reset();
    addServiceDialog.close();
    alert("Thanks! Your submission is pending admin review and will appear once approved.");
  } catch (err) {
    formErrors.innerHTML = `<li>Could not submit: ${escapeHtml(err.message)}</li>`;
    formErrors.hidden = false;
  }
});

// --- Admin login + review panel ---

const adminBtn = document.getElementById("adminBtn");
const adminDialog = document.getElementById("adminDialog");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginErrors = document.getElementById("adminLoginErrors");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminPanel = document.getElementById("adminPanel");
const adminPendingList = document.getElementById("adminPendingList");
const adminApprovedList = document.getElementById("adminApprovedList");
const closeAdminBtn = document.getElementById("closeAdminBtn");
const closeAdminPanelBtn = document.getElementById("closeAdminPanelBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

let unsubscribePending = null;
let unsubscribeApprovedAdmin = null;

adminBtn.addEventListener("click", () => {
  adminDialog.showModal();
});

closeAdminBtn.addEventListener("click", () => adminDialog.close());
closeAdminPanelBtn.addEventListener("click", () => adminDialog.close());

adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminLoginErrors.hidden = true;
  try {
    await signInWithEmailAndPassword(auth, adminEmail.value.trim(), adminPassword.value);
  } catch (err) {
    adminLoginErrors.textContent = "Login failed: " + err.message;
    adminLoginErrors.hidden = false;
  }
});

adminLogoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    adminLoginForm.hidden = true;
    adminPanel.hidden = false;
    adminPassword.value = "";
    subscribeAdminData();
  } else {
    adminLoginForm.hidden = false;
    adminPanel.hidden = true;
    if (unsubscribePending) unsubscribePending();
    if (unsubscribeApprovedAdmin) unsubscribeApprovedAdmin();
  }
});

function subscribeAdminData() {
  unsubscribePending = onSnapshot(query(servicesCollection, where("status", "==", "pending")), (snapshot) => {
    pendingCustomServices = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAdminPending();
  });

  unsubscribeApprovedAdmin = onSnapshot(
    query(servicesCollection, where("status", "==", "approved")),
    (snapshot) => {
      renderAdminApproved(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
  );
}

function renderAdminPending() {
  if (pendingCustomServices.length === 0) {
    adminPendingList.innerHTML = "<p>No pending submissions.</p>";
    return;
  }

  adminPendingList.innerHTML = pendingCustomServices
    .map(
      (s) => `
      <div class="admin-pending-card">
        <h4>${escapeHtml(s.name)}</h4>
        <p><strong>${escapeHtml(s.category)}</strong></p>
        <p>${escapeHtml(s.description)}</p>
        <p>📍 ${escapeHtml(s.location)} &nbsp; 🕒 ${escapeHtml(s.hours)} &nbsp; 📞 ${escapeHtml(s.phone)}</p>
        <div class="admin-actions">
          <button type="button" class="approve-btn" data-id="${escapeHtml(s.id)}">Approve</button>
          <button type="button" class="reject-btn" data-id="${escapeHtml(s.id)}">Reject</button>
        </div>
      </div>
    `
    )
    .join("");

  adminPendingList.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateDoc(doc(db, "services", btn.dataset.id), { status: "approved" }));
  });
  adminPendingList.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteDoc(doc(db, "services", btn.dataset.id)));
  });
}

function renderAdminApproved(approved) {
  if (approved.length === 0) {
    adminApprovedList.innerHTML = "<p>No community-submitted listings live yet.</p>";
    return;
  }

  adminApprovedList.innerHTML = approved
    .map(
      (s) => `
      <div class="admin-pending-card">
        <h4>${escapeHtml(s.name)}</h4>
        <p><strong>${escapeHtml(s.category)}</strong></p>
        <div class="admin-actions">
          <button type="button" class="reject-btn" data-id="${escapeHtml(s.id)}">Remove</button>
        </div>
      </div>
    `
    )
    .join("");

  adminApprovedList.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Remove this live listing?")) {
        deleteDoc(doc(db, "services", btn.dataset.id));
      }
    });
  });
}

init();
