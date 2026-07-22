/**
 * items.js
 * Fetches items.json and renders one card per item (image + name + price).
 * Clicking the image opens a details modal with the full name, price and
 * description. No frameworks or libraries — plain DOM APIs only.
 */

(function () {
  "use strict";

  const ITEMS_URL = "items.json";
  const PLACEHOLDER_IMAGE = "placeholder.jpg";

  const gridEl = document.getElementById("items-grid");
  const statusEl = document.getElementById("items-status");

  /* =========================================================
     GRID: build cards from items.json
     ========================================================= */

  /**
   * Builds a single item card:
   * <article class="item-card">
   *   <button class="offer-card item-card__media"> image, reused hover/zoom/error handling </button>
   *   <div class="item-card__info"> name, price </div>
   * </article>
   */
  function createItemCard(item, index) {
    const card = document.createElement("article");
    card.className = "item-card";
    card.style.animationDelay = Math.min(index * 60, 480) + "ms";

    // The image itself reuses the same clickable/zoom/lazy-load/fallback
    // behavior as the offer cards on the main page.
    const mediaBtn = document.createElement("button");
    mediaBtn.type = "button";
    mediaBtn.className = "offer-card item-card__media";
    mediaBtn.setAttribute("aria-label", "عرض تفاصيل: " + item.name);

    const frame = document.createElement("div");
    frame.className = "offer-card__frame is-loading";

    const img = document.createElement("img");
    img.className = "offer-card__image";
    img.src = item.image;
    img.alt = item.name;
    img.loading = "lazy";
    img.decoding = "async";

    img.addEventListener("load", function () {
      frame.classList.remove("is-loading");
    });

    img.addEventListener("error", function () {
      frame.classList.remove("is-loading");
      frame.classList.add("is-broken");
      img.src = PLACEHOLDER_IMAGE;
      img.alt = "الصورة غير متاحة";
    });

    const accent = document.createElement("span");
    accent.className = "offer-card__accent";
    accent.setAttribute("aria-hidden", "true");

    frame.appendChild(img);
    frame.appendChild(accent);
    mediaBtn.appendChild(frame);

    mediaBtn.addEventListener("click", function () {
      ItemModal.open(item);
    });

    // Name + price, always visible on the card itself
    const info = document.createElement("div");
    info.className = "item-card__info";

    const name = document.createElement("h3");
    name.className = "item-card__name";
    name.textContent = item.name;

    const price = document.createElement("span");
    price.className = "item-card__price";
    price.textContent = item.price;

    info.appendChild(name);
    info.appendChild(price);

    card.appendChild(mediaBtn);
    card.appendChild(info);

    return card;
  }

  function renderItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      statusEl.textContent = "لا توجد أصناف جديدة حاليًا — تابعونا قريبًا!";
      return;
    }

    statusEl.textContent = "";
    const fragment = document.createDocumentFragment();

    items.forEach(function (item, index) {
      if (item && item.image && item.name) {
        fragment.appendChild(createItemCard(item, index));
      }
    });

    gridEl.appendChild(fragment);
  }

  function showError() {
    statusEl.textContent = "تعذّر تحميل الأصناف. يرجى تحديث الصفحة والمحاولة مرة أخرى.";
  }

  function loadItems() {
    statusEl.textContent = "جارٍ تحميل الأصناف الجديدة…";

    fetch(ITEMS_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Network response was not ok (" + response.status + ")");
        }
        return response.json();
      })
      .then(renderItems)
      .catch(function (err) {
        console.error("Failed to load items.json:", err);
        showError();
      });
  }

  /* =========================================================
     ITEM DETAILS MODAL
     A simple, focused overlay: image, name, price, description.
     Closes via the × button, backdrop click, or Esc.
     ========================================================= */

  const ItemModal = (function () {
    let isOpen = false;
    let els = {};

    function cacheElements() {
      els.modal = document.getElementById("item-modal");
      els.panel = els.modal.querySelector(".item-modal__panel");
      els.image = document.getElementById("item-modal-image");
      els.name = document.getElementById("item-modal-name");
      els.price = document.getElementById("item-modal-price");
      els.description = document.getElementById("item-modal-description");
      els.closeTriggers = els.modal.querySelectorAll("[data-item-modal-close]");
    }

    function open(item) {
      isOpen = true;

      // Populate details before showing, and reset any previous image
      // error state so the placeholder from another item never leaks in.
      els.image.src = item.image;
      els.image.alt = item.name;
      els.name.textContent = item.name;
      els.price.textContent = item.price;
      els.description.textContent = item.description || "";

      els.image.onerror = function () {
        els.image.onerror = null;
        els.image.src = PLACEHOLDER_IMAGE;
        els.image.alt = "الصورة غير متاحة";
      };

      els.modal.classList.add("is-open");
      els.modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open"); // locks page scroll
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;

      els.modal.classList.remove("is-open");
      els.modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
    }

    function handleKeydown(e) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        close();
      }
    }

    function bindEvents() {
      els.closeTriggers.forEach(function (el) {
        el.addEventListener("click", close);
      });

      // Prevent clicks inside the panel from bubbling to the backdrop
      els.panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      document.addEventListener("keydown", handleKeydown);
    }

    function init() {
      cacheElements();
      bindEvents();
    }

    return { init: init, open: open };
  })();

  document.addEventListener("DOMContentLoaded", function () {
    ItemModal.init();
    loadItems();
  });
})();
