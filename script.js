// =========================
//      FIREBASE SDK
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =========================
//      FIREBASE CONFIG
// =========================

const firebaseConfig = {
  apiKey: "AIzaSyABYy-3sg8XSo1uXAumImewmaC2B-GR528",
  authDomain: "music-school-web.firebaseapp.com",
  projectId: "music-school-web",
  storageBucket: "music-school-web.firebasestorage.app",
  messagingSenderId: "1010323859210",
  appId: "1:1010323859210:web:9b544077dadde4938e7cf3",
  measurementId: "G-65NS5LBCM5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =========================
//      CONSTANTS
// =========================

const USERS_COLLECTION = "users";
const TRIALS_COLLECTION = "trials";
const TRIAL_DRAFT_KEY = "ms_trial_draft";
const THEME_KEY = "ms_theme";

// =========================
//      GLOBAL USER
// =========================

let currentUserProfile = null;

function getCurrentUser() {
  return currentUserProfile;
}

function setCurrentUserProfile(profile) {
  currentUserProfile = profile;
}

// =========================
//   FIRESTORE HELPERS
// =========================

async function loadUserProfile(uid) {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: ref.id, ...snap.data() };
}

async function createUserProfile(uid, { name, email, level, role }) {
  const ref = doc(db, USERS_COLLECTION, uid);
  await setDoc(ref, {
    uid,
    name,
    email,
    level,
    role,
    createdAt: new Date().toISOString()
  });
  const snap = await getDoc(ref);
  return { id: ref.id, ...snap.data() };
}

// =========================
//   GLOBAL AUTH HANDLER
// =========================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setCurrentUserProfile(null);
    updateHeaderAuth();
    const protectedPages = ["profile.html", "admin.html"];
    if (protectedPages.some(p => window.location.pathname.endsWith(p))) {
      window.location.href = "auth.html";
    }
    return;
  }

  let profile = await loadUserProfile(user.uid);
  if (!profile) {
    profile = await createUserProfile(user.uid, {
      name: user.displayName || "",
      email: user.email,
      level: "",
      role: "user"
    });
  }

  setCurrentUserProfile(profile);
  updateHeaderAuth();
});

// =========================
//      UTILS
// =========================

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// =========================
//      TOAST
// =========================

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast " + (type === "error" ? "toast-error" : "toast-success");
  toast.innerHTML = `
    <span>${message}</span>
    <span class="toast-close">×</span>
  `;

  toast.querySelector(".toast-close").addEventListener("click", () => {
    container.removeChild(toast);
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (container.contains(toast)) container.removeChild(toast);
  }, 3500);
}

// =========================
//      THEME
// =========================

function applyTheme(theme) {
  const body = document.body;
  const label = document.querySelector("[data-theme-label]");
  if (theme === "light") {
    body.setAttribute("data-theme", "light");
    if (label) label.textContent = "Светлая";
  } else {
    body.removeAttribute("data-theme");
    if (label) label.textContent = "Тёмная";
  }
}

function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);

  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

// =========================
//      HEADER MENU
// =========================

function updateHeaderAuth() {
  const avatarBtn = document.querySelector("[data-profile-avatar]");
  const loginBtn = document.querySelector("[data-login-btn]");
  const menuHeader = document.querySelector("[data-profile-menu-header]");
  const menuAdmin = document.querySelector("[data-menu-admin]");

  const user = getCurrentUser();

  if (!avatarBtn || !loginBtn || !menuHeader || !menuAdmin) return;

  if (user) {
    const letter = (user.name || user.email || "U")[0].toUpperCase();
    avatarBtn.textContent = letter;
    avatarBtn.style.display = "flex";
    loginBtn.style.display = "none";
    menuHeader.textContent = `Привет, ${user.name || user.email}`;
    menuAdmin.style.display = user.role === "admin" ? "block" : "none";
  } else {
    avatarBtn.style.display = "none";
    loginBtn.style.display = "inline-flex";
    menuAdmin.style.display = "none";
  }
}

function setupProfileMenu() {
  const wrapper = document.querySelector("[data-profile-wrapper]");
  const avatarBtn = document.querySelector("[data-profile-avatar]");
  const menu = document.querySelector("[data-profile-menu]");
  const menuProfile = document.querySelector("[data-menu-profile]");
  const menuAdmin = document.querySelector("[data-menu-admin]");
  const menuLogout = document.querySelector("[data-menu-logout]");

  if (!wrapper || !avatarBtn || !menu || !menuProfile || !menuAdmin || !menuLogout) return;

  avatarBtn.addEventListener("click", () => {
    const isOpen = menu.classList.contains("open");
    document.querySelectorAll(".profile-menu").forEach(m => m.classList.remove("open"));
    if (!isOpen) menu.classList.add("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) menu.classList.remove("open");
  });

  menuProfile.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) window.location.href = "auth.html";
    else window.location.href = "profile.html";
  });

  menuAdmin.addEventListener("click", () => {
    const user = getCurrentUser();
    if (user && user.role === "admin") window.location.href = "admin.html";
  });

  menuLogout.addEventListener("click", async () => {
    await signOut(auth);
    showToast("Вы вышли из аккаунта", "success");
    window.location.href = "index.html";
  });
}

// =========================
//      PHONE MASK
// =========================

function setupPhoneMask(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    let value = input.value.replace(/\D/g, "");

    if (value.startsWith("8")) value = "7" + value.slice(1);
    if (!value.startsWith("7")) value = "7" + value;

    let formatted = "+7";
    if (value.length > 1) formatted += " (" + value.slice(1, 4);
    if (value.length >= 5) formatted += ") " + value.slice(4, 7);
    if (value.length >= 8) formatted += "-" + value.slice(7, 9);
    if (value.length >= 10) formatted += "-" + value.slice(9, 11);

    input.value = formatted;
  });
}

// =========================
//      AUTH PAGE
// =========================

function setupAuthPage() {
  const registerBlock = document.getElementById("registerBlock");
  const loginBlock = document.getElementById("loginBlock");
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const switchToLogin = document.getElementById("switchToLogin");
  const switchToRegister = document.getElementById("switchToRegister");
  const registerAlert = document.getElementById("registerAlert");
  const loginAlert = document.getElementById("loginAlert");

  if (!registerForm || !loginForm) return;

  function showAlert(el, type, text) {
    el.className = "alert " + (type === "error" ? "alert-error" : "alert-success");
    el.textContent = text;
    el.style.display = "block";
  }

  function clearAlert(el) {
    if (el) el.style.display = "none";
  }

  const defaultMode = document.body.dataset.default;
  if (defaultMode === "login") {
    if (registerBlock) registerBlock.style.display = "none";
    if (loginBlock) loginBlock.style.display = "block";
  }

  switchToLogin?.addEventListener("click", () => {
    if (registerBlock) registerBlock.style.display = "none";
    if (loginBlock) loginBlock.style.display = "block";
    clearAlert(registerAlert);
    clearAlert(loginAlert);
  });

  switchToRegister?.addEventListener("click", () => {
    if (loginBlock) loginBlock.style.display = "none";
    if (registerBlock) registerBlock.style.display = "block";
    clearAlert(registerAlert);
    clearAlert(loginAlert);
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(registerAlert);

    const name = registerForm.elements["name"].value.trim();
    const email = registerForm.elements["email"].value.trim().toLowerCase();
    const password = registerForm.elements["password"].value;
    const level = registerForm.elements["level"].value;

    if (!name || !email || !password) {
      showAlert(registerAlert, "error", "Заполните все обязательные поля.");
      return;
    }

    if (password.length < 6) {
      showAlert(registerAlert, "error", "Пароль должен быть не короче 6 символов.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      const profile = await createUserProfile(cred.user.uid, {
        name,
        email,
        level,
        role: "user"
      });

      setCurrentUserProfile(profile);
      updateHeaderAuth();

      showAlert(registerAlert, "success", "Регистрация успешна! Перенаправляем...");
      showToast("Регистрация успешна", "success");

      setTimeout(() => {
        window.location.href = "profile.html";
      }, 900);

    } catch (err) {
      console.error(err);
      showAlert(registerAlert, "error", "Ошибка регистрации");
      showToast("Ошибка регистрации", "error");
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert(loginAlert);

    const email = loginForm.elements["email"].value.trim().toLowerCase();
    const password = loginForm.elements["password"].value;

    if (!email || !password) {
      showAlert(loginAlert, "error", "Введите email и пароль.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await loadUserProfile(cred.user.uid);

      if (!profile) {
        showAlert(loginAlert, "error", "Профиль не найден.");
        return;
      }

      setCurrentUserProfile(profile);
      updateHeaderAuth();

      showAlert(loginAlert, "success", "Вход выполнен! Перенаправляем...");
      showToast("Добро пожаловать!", "success");

      setTimeout(() => {
        if (profile.role === "admin") window.location.href = "admin.html";
        else window.location.href = "profile.html";
      }, 700);

    } catch (err) {
      console.error(err);
      showAlert(loginAlert, "error", "Неверный email или пароль.");
      showToast("Ошибка входа", "error");
    }
  });
}

// =========================
//      PROFILE PAGE
// =========================

async function setupProfilePage() {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm) return;

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      window.location.href = "auth.html";
      return;
    }

    const user = await loadUserProfile(firebaseUser.uid);
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    setCurrentUserProfile(user);
    updateHeaderAuth();

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileLevel = document.getElementById("profileLevel");
    const profileAvatar = document.getElementById("profileAvatar");
    const profileTrials = document.getElementById("profileTrials");

    profileName.textContent = user.name || user.email;
    profileEmail.textContent = user.email;
    profileLevel.textContent = user.level ? `Уровень: ${user.level}` : "Уровень не указан";

    if (profileAvatar) {
      profileAvatar.textContent = (user.name || user.email)[0].toUpperCase();
    }

    profileForm.elements["name"].value = user.name || "";
    profileForm.elements["email"].value = user.email || "";
    profileForm.elements["level"].value = user.level || "";

    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = profileForm.elements["name"].value.trim();
      const email = profileForm.elements["email"].value.trim().toLowerCase();
      const level = profileForm.elements["level"].value;

      if (!email) {
        showToast("Email не может быть пустым", "error");
        return;
      }

      try {
        const ref = doc(db, USERS_COLLECTION, user.uid);
        await updateDoc(ref, { name, email, level });

        if (name) {
          await updateProfile(auth.currentUser, { displayName: name });
        }

        const updated = { ...user, name, email, level };
        setCurrentUserProfile(updated);

        profileName.textContent = updated.name || updated.email;
        profileEmail.textContent = updated.email;
        profileLevel.textContent = updated.level ? `Уровень: ${updated.level}` : "Уровень не указан";

        if (profileAvatar) {
          profileAvatar.textContent = (updated.name || updated.email)[0].toUpperCase();
        }

        updateHeaderAuth();
        showToast("Профиль обновлён", "success");

      } catch (err) {
        console.error(err);
        showToast("Ошибка обновления профиля", "error");
      }
    });

    try {
      const q = query(
        collection(db, TRIALS_COLLECTION),
        where("userId", "==", firebaseUser.uid),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        profileTrials.textContent = "У вас пока нет записей на пробный урок.";
      } else {
        const list = document.createElement("ul");
        list.className = "profile-list";

        snap.forEach(docSnap => {
          const t = docSnap.data();
          const statusText =
            t.status === "done"
              ? " (обработана)"
              : t.status === "confirmed"
              ? " (подтверждена)"
              : t.status === "cancelled"
              ? " (отменена)"
              : "";

          const li = document.createElement("li");
          li.textContent = `${t.direction} — ${t.date} в ${t.time}${statusText} • отправлена ${formatDateTime(t.createdAt)}`;
          list.appendChild(li);
        });

        profileTrials.innerHTML = "";
        profileTrials.appendChild(list);
      }
    } catch (err) {
      console.error(err);
      profileTrials.textContent = "Ошибка загрузки заявок.";
    }
  });
}

// =========================
//      TRIAL PAGE
// =========================

async function setupTrialPage() {
  const form = document.getElementById("trialForm");
  const alertBox = document.getElementById("trialAlert");
  if (!form) return;

  const phoneInput = form.elements["phone"];
  setupPhoneMask(phoneInput);

  const dateInput = form.elements["date"];
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
  }

  const params = new URLSearchParams(window.location.search);
  const dirFromUrl = params.get("direction");
  if (dirFromUrl && form.elements["direction"]) {
    const select = form.elements["direction"];
    const options = Array.from(select.options);
    const found = options.find(o => o.value === dirFromUrl || o.textContent === dirFromUrl);
    if (found) select.value = found.value;
  }

  let currentUser = null;
  onAuthStateChanged(auth, (firebaseUser) => {
    currentUser = firebaseUser;
  });

  const draftRaw = localStorage.getItem(TRIAL_DRAFT_KEY);
  if (draftRaw) {
    try {
      const draft = JSON.parse(draftRaw);
      Object.keys(draft).forEach((key) => {
        if (form.elements[key]) {
          form.elements[key].value = draft[key];
        }
      });
    } catch {}
  }

  form.addEventListener("input", () => {
    const draft = {
      name: form.elements["name"].value,
      phone: form.elements["phone"].value,
      email: form.elements["email"].value,
      direction: form.elements["direction"].value,
      date: form.elements["date"].value,
      time: form.elements["time"].value,
      comment: form.elements["comment"].value
    };
    localStorage.setItem(TRIAL_DRAFT_KEY, JSON.stringify(draft));
  });

  function showAlert(type, text) {
    alertBox.className = "alert " + (type === "error" ? "alert-error" : "alert-success");
    alertBox.textContent = text;
    alertBox.style.display = "block";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.style.display = "none";

    const name = form.elements["name"].value.trim();
    const phone = form.elements["phone"].value.trim();
    const email = form.elements["email"].value.trim();
    const direction = form.elements["direction"].value;
    const date = form.elements["date"].value;
    const time = form.elements["time"].value;
    const comment = form.elements["comment"].value.trim();

    ["name", "phone", "direction", "date", "time"].forEach((field) => {
      form.elements[field].classList.remove("error");
    });

    if (!name || !phone || !direction || !date || !time) {
      showAlert("error", "Пожалуйста, заполните обязательные поля.");
      ["name", "phone", "direction", "date", "time"].forEach((field) => {
        if (!form.elements[field].value) {
          form.elements[field].classList.add("error");
        }
      });
      showToast("Заполните обязательные поля", "error");
      return;
    }

    try {
      await addDoc(collection(db, TRIALS_COLLECTION), {
        name,
        phone,
        email,
        direction,
        date,
        time,
        comment,
        userId: currentUser ? currentUser.uid : null,
        status: "new",
        createdAt: new Date().toISOString()
      });

      localStorage.removeItem(TRIAL_DRAFT_KEY);
      form.reset();

      showAlert("success", "Заявка на пробный урок отправлена!");
      showToast("Заявка отправлена", "success");

    } catch (err) {
      console.error(err);
      showAlert("error", "Ошибка отправки заявки.");
      showToast("Ошибка отправки", "error");
    }
  });
}

// =========================
//      ADMIN HELPERS
// =========================

function statusLabel(status) {
  switch (status) {
    case "new": return "Новая";
    case "callback": return "Перезвонить";
    case "noanswer": return "Не дозвонились";
    case "confirmed": return "Подтверждено";
    case "cancelled": return "Отменено";
    case "done": return "Обработана";
    default: return status;
  }
}

async function setStatus(id, status) {
  try {
    const ref = doc(db, TRIALS_COLLECTION, id);
    await updateDoc(ref, { status });
    showToast("Статус обновлён", "success");
    renderAdminTrials();
  } catch (err) {
    console.error(err);
    showToast("Ошибка обновления статуса", "error");
  }
}

async function deleteTrial(id) {
  try {
    await deleteDoc(doc(db, TRIALS_COLLECTION, id));
    showToast("Заявка удалена", "success");
    renderAdminTrials();
  } catch (err) {
    console.error(err);
    showToast("Ошибка удаления", "error");
  }
}

async function markDone(id) {
  try {
    const ref = doc(db, TRIALS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const current = snap.data().status;
    const next = current === "done" ? "new" : "done";

    await updateDoc(ref, { status: next });
    showToast("Статус обновлён", "success");
    renderAdminTrials();
  } catch (err) {
    console.error(err);
    showToast("Ошибка обновления", "error");
  }
}

window.deleteTrial = deleteTrial;
window.markDone = markDone;
window.setStatus = setStatus;

+ // =========================
+ //      ADMIN PAGE
+ // =========================
+
+ async function renderAdminTrials() {
+   const adminContent = document.getElementById("adminContent");
+   if (!adminContent) return;
+
+   const q = query(
+     collection(db, TRIALS_COLLECTION),
+     orderBy("createdAt", "desc")
+   );
+
+   const snap = await getDocs(q);
+   const trials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
+
+   const totalEl = document.getElementById("adminTotal");
+   const newEl = document.getElementById("adminNew");
+   const doneEl = document.getElementById("adminDone");
+   const bell = document.getElementById("adminBell");
+
+   if (totalEl) totalEl.textContent = trials.length;
+   if (newEl) newEl.textContent = trials.filter(t => t.status === "new").length;
+   if (doneEl) doneEl.textContent = trials.filter(t => t.status === "done").length;
+
+   if (bell) {
+     const newCount = trials.filter(t => t.status === "new").length;
+     bell.style.display = newCount > 0 ? "inline-flex" : "none";
+     if (newCount > 0) bell.textContent = `🔔 Новые заявки: ${newCount}`;
+   }
+
+   let filtered = trials;
+
+   const searchInput = document.getElementById("adminSearch");
+   const statusFilter = document.getElementById("adminStatusFilter");
+   const directionFilter = document.getElementById("adminDirectionFilter");
+
+   const search = (searchInput?.value || "").trim().toLowerCase();
+   if (search) {
+     filtered = filtered.filter(t =>
+       (t.name || "").toLowerCase().includes(search) ||
+       (t.email || "").toLowerCase().includes(search) ||
+       (t.phone || "").toLowerCase().includes(search)
+     );
+   }
+
+   if (statusFilter && statusFilter.value !== "all") {
+     filtered = filtered.filter(t => t.status === statusFilter.value);
+   }
+
+   if (directionFilter && directionFilter.value !== "all") {
+     filtered = filtered.filter(t => t.direction === directionFilter.value);
+   }
+
+   if (!filtered.length) {
+     adminContent.innerHTML = "<p>Заявок по выбранным фильтрам нет.</p>";
+     return;
+   }
+
+   adminContent.innerHTML = filtered.map(t => `
+     <div class="card">
+       <h2 class="card-title">${t.name}</h2>
+       <div class="card-level">${t.direction}</div>
+       <p class="card-desc">
+         Дата: ${t.date} в ${t.time}<br>
+         Телефон: ${t.phone}<br>
+         Email: ${t.email || "—"}<br>
+         Комментарий: ${t.comment || "—"}<br>
+         Создана: ${formatDateTime(t.createdAt)}
+       </p>
+       <div class="card-meta">
+         <span>${statusLabel(t.status)}</span>
+         <span>userId: ${t.userId || "гость"}</span>
+       </div>
+       <div class="card-footer">
+         <button class="admin-btn" data-action="delete" data-id="${t.id}">Удалить</button>
+         <button class="admin-btn" data-action="callback" data-id="${t.id}">Перезвонить</button>
+         <button class="admin-btn" data-action="noanswer" data-id="${t.id}">Не дозвонились</button>
+         <button class="admin-btn" data-action="confirmed" data-id="${t.id}">Подтверждено</button>
+         <button class="admin-btn" data-action="cancelled" data-id="${t.id}">Отменено</button>
+         <button class="admin-btn" data-action="done" data-id="${t.id}">
+           ${t.status === "done" ? "Сделать новой" : "Отметить обработанной"}
+         </button>
+       </div>
+     </div>
+   `).join("");
+ }
+
+ async function setupAdminPage() {
+   const adminContent = document.getElementById("adminContent");
+   if (!adminContent) return;
+
+   onAuthStateChanged(auth, async (firebaseUser) => {
+     if (!firebaseUser) {
+       window.location.href = "auth.html";
+       return;
+     }
+
+     const profile = await loadUserProfile(firebaseUser.uid);
+     if (!profile || profile.role !== "admin") {
+       window.location.href = "index.html";
+       return;
+     }
+
+     setCurrentUserProfile(profile);
+     updateHeaderAuth();
+
+     initAdminControls();
+     renderAdminTrials();
+   });
+ }
+
+ function initAdminControls() {
+   const searchInput = document.getElementById("adminSearch");
+   const statusFilter = document.getElementById("adminStatusFilter");
+   const directionFilter = document.getElementById("adminDirectionFilter");
+   const clearFiltersBtn = document.getElementById("adminClearFilters");
+   const clearAllBtn = document.getElementById("adminClearAll");
+   const adminContent = document.getElementById("adminContent");
+
+   if (searchInput) searchInput.addEventListener("input", renderAdminTrials);
+   if (statusFilter) statusFilter.addEventListener("change", renderAdminTrials);
+   if (directionFilter) directionFilter.addEventListener("change", renderAdminTrials);
+
+   if (clearFiltersBtn) {
+     clearFiltersBtn.addEventListener("click", () => {
+       searchInput.value = "";
+       statusFilter.value = "all";
+       directionFilter.value = "all";
+       renderAdminTrials();
+     });
+   }
+
+   if (clearAllBtn) {
+     clearAllBtn.addEventListener("click", async () => {
+       if (!confirm("Удалить все заявки?")) return;
+
+       const snap = await getDocs(collection(db, TRIALS_COLLECTION));
+       await Promise.all(snap.docs.map(d => deleteDoc(doc(db, TRIALS_COLLECTION, d.id))));
+
+       showToast("Все заявки удалены", "success");
+       renderAdminTrials();
+     });
+   }
+
+   adminContent.addEventListener("click", (e) => {
+     const btn = e.target.closest(".admin-btn");
+     if (!btn) return;
+
+     const id = btn.dataset.id;
+     const action = btn.dataset.action;
+
+     if (action === "delete") deleteTrial(id);
+     else if (action === "done") markDone(id);
+     else setStatus(id, action);
+   });
+ }

// =========================
//      INIT
// =========================

document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  setupProfileMenu();
  updateHeaderAuth();

  if (document.getElementById("registerForm") && document.getElementById("loginForm")) {
    setupAuthPage();
  }
  if (document.getElementById("trialForm")) {
    setupTrialPage();
  }
  if (document.getElementById("profileForm")) {
    setupProfilePage();
  }
  if (document.getElementById("adminContent")) {
    setupAdminPage();
  }
});


// =========================
//      MOBILE MENU
// =========================

const mobileBtn = document.querySelector("[data-mobile-menu-btn]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

if (mobileBtn && mobileMenu) {
  mobileBtn.addEventListener("click", () => {
    mobileMenu.style.display =
      mobileMenu.style.display === "flex" ? "none" : "flex";
  });
}
