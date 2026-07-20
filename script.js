/**
 * script.js
 * Fetches offers.json, renders one clickable card per offer, and powers
 * a built-in fullscreen Lightbox gallery. No frameworks or libraries —
 * plain DOM APIs only.
 */

(function () {
  "use strict";

  const OFFERS_URL = "offers.json";
  const PLACEHOLDER_IMAGE = "assets/placeholder.jpg";

  const gridEl = document.getElementById("offers-grid");
  const statusEl = document.getElementById("offers-status");

  /** All offer image URLs currently rendered, in display order. */
  let offerImages = [];

  /* =========================================================
     GRID: build cards from offers.json
     ========================================================= */

  /**
   * Builds a single offer card. The whole card is a <button> (not a link)
   * that opens the Lightbox at this offer's index.
   */
  function createOfferCard(offer, index) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "offer-card";
    card.setAttribute("aria-label", "Open image " + (index + 1) + " in gallery viewer");

    // Stagger the fade-in slightly so cards feel like they're cascading in
    card.style.animationDelay = Math.min(index * 60, 480) + "ms";

    const frame = document.createElement("div");
    frame.className = "offer-card__frame is-loading";

    const img = document.createElement("img");
    img.className = "offer-card__image";
    img.src = offer.image;
    img.alt = "Promotional offer";
    img.loading = "lazy";        // lazy-load offscreen images
    img.decoding = "async";

    // Remove the loading shimmer once the image is actually painted
    img.addEventListener("load", function () {
      frame.classList.remove("is-loading");
    });

    // Graceful fallback: swap in a placeholder if the image fails to load
    img.addEventListener("error", function () {
      frame.classList.remove("is-loading");
      frame.classList.add("is-broken");
      img.src = PLACEHOLDER_IMAGE;
      img.alt = "Image unavailable";
    });

    const accent = document.createElement("span");
    accent.className = "offer-card__accent";
    accent.setAttribute("aria-hidden", "true");

    frame.appendChild(img);
    frame.appendChild(accent);
    card.appendChild(frame);

    // Open the lightbox at this offer's position
    card.addEventListener("click", function () {
      Lightbox.open(index);
    });

    return card;
  }

  function renderOffers(offers) {
    if (!Array.isArray(offers) || offers.length === 0) {
      statusEl.textContent = "No offers available right now — check back soon!";
      return;
    }

    statusEl.textContent = "";
    const fragment = document.createDocumentFragment();
    const validOffers = [];

    offers.forEach(function (offer) {
      if (offer && offer.image) {
        validOffers.push(offer);
      }
    });

    validOffers.forEach(function (offer, index) {
      fragment.appendChild(createOfferCard(offer, index));
    });

    gridEl.appendChild(fragment);

    // Keep a flat list of image URLs so the Lightbox can browse independently of the DOM
    offerImages = validOffers.map(function (offer) {
      return offer.image;
    });

    Lightbox.setImages(offerImages);
  }

  function showError() {
    statusEl.textContent =
      "We couldn't load today's offers. Please refresh the page to try again.";
  }

  function loadOffers() {
    statusEl.textContent = "Loading today's offers…";

    fetch(OFFERS_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Network response was not ok (" + response.status + ")");
        }
        return response.json();
      })
      .then(renderOffers)
      .catch(function (err) {
        console.error("Failed to load offers.json:", err);
        showError();
      });
  }

  /* =========================================================
     LIGHTBOX: fullscreen gallery viewer
     ========================================================= */

  const Lightbox = (function () {
    // Zoom limits
    const MIN_SCALE = 1;
    const MAX_SCALE = 4;
    const ZOOM_STEP = 0.5;

    // Minimum horizontal drag (px) to count as a swipe navigation
    const SWIPE_THRESHOLD = 50;

    let images = [];
    let currentIndex = 0;
    let isOpen = false;

    // Current zoom/pan state for the image being viewed
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    // Single-touch swipe/pan tracking
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTranslateX = 0;
    let touchStartTranslateY = 0;
    let isSingleTouchPanning = false;

    // Two-finger pinch tracking
    let pinchStartDistance = 0;
    let pinchStartScale = 1;
    let isPinching = false;

    let els = {};

    function cacheElements() {
      els.lightbox = document.getElementById("lightbox");
      els.stage = document.getElementById("lightbox-stage");
      els.image = document.getElementById("lightbox-image");
      els.counter = document.getElementById("lightbox-counter");
      els.prevBtn = document.getElementById("lightbox-prev");
      els.nextBtn = document.getElementById("lightbox-next");
      els.zoomInBtn = document.getElementById("lightbox-zoom-in");
      els.zoomOutBtn = document.getElementById("lightbox-zoom-out");
      els.closeTriggers = els.lightbox.querySelectorAll("[data-lightbox-close]");
    }

    function setImages(list) {
      images = list;
    }

    /** Apply the current scale/translate to the image via CSS transform. */
    function applyTransform() {
      els.image.style.transform =
        "translate(" + translateX + "px, " + translateY + "px) scale(" + scale + ")";
    }

    function resetZoom() {
      scale = 1;
      translateX = 0;
      translateY = 0;
      els.image.classList.remove("is-zoomed");
      applyTransform();
    }

    function setScale(nextScale) {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      scale = clamped;

      // Snap back to center once fully zoomed out
      if (scale === MIN_SCALE) {
        translateX = 0;
        translateY = 0;
        els.image.classList.remove("is-zoomed");
      } else {
        els.image.classList.add("is-zoomed");
      }

      applyTransform();
    }

    function zoomIn() {
      setScale(scale + ZOOM_STEP);
    }

    function zoomOut() {
      setScale(scale - ZOOM_STEP);
    }

    function updateCounter() {
      els.counter.textContent = (currentIndex + 1) + " / " + images.length;
    }

    /**
     * Swaps the visible image with a short crossfade, then resets zoom.
     * direction is only used to pick a subtle slide direction for the fade.
     */
    function renderCurrentImage() {
      els.image.classList.add("is-switching");

      window.setTimeout(function () {
        resetZoom();
        els.image.src = images[currentIndex];
        updateCounter();
        els.image.classList.remove("is-switching");
      }, 180);
    }

    function goTo(index) {
      if (images.length === 0) return;
      // Wrap around so browsing feels continuous
      currentIndex = (index + images.length) % images.length;
      renderCurrentImage();
    }

    function next() {
      goTo(currentIndex + 1);
    }

    function prev() {
      goTo(currentIndex - 1);
    }

    function open(index) {
      if (images.length === 0) return;
      currentIndex = index;
      isOpen = true;

      // Always reset zoom/pan state and the CSS transform BEFORE showing
      // the image, so every image opens perfectly centered regardless of
      // how the previous image was left zoomed or panned.
      resetZoom();
      els.image.src = images[currentIndex];
      updateCounter();

      els.lightbox.classList.add("is-open");
      els.lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open"); // locks page scroll

      // Entrance zoom/fade animation on the image itself
      els.image.classList.remove("is-animating-in");
      void els.image.offsetWidth; // force reflow so the animation can replay
      els.image.classList.add("is-animating-in");
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;

      els.lightbox.classList.add("is-closing");
      els.lightbox.classList.remove("is-open");
      els.lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");

      window.setTimeout(function () {
        els.lightbox.classList.remove("is-closing");
        els.image.src = "";
        resetZoom();
      }, 260);
    }

    /* ----- Mouse wheel zoom ----- */
    function handleWheel(e) {
      if (!isOpen) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }

    /* ----- Keyboard support ----- */
    function handleKeydown(e) {
      if (!isOpen) return;
      switch (e.key) {
        case "Escape":
          close();
          break;
        case "ArrowLeft":
          prev();
          break;
        case "ArrowRight":
          next();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
        case "_":
          zoomOut();
          break;
        default:
          break;
      }
    }

    /* ----- Touch: swipe to navigate, drag to pan, pinch to zoom ----- */
    function distanceBetween(t1, t2) {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function handleTouchStart(e) {
      if (e.touches.length === 2) {
        // Start of a pinch gesture
        isPinching = true;
        isSingleTouchPanning = false;
        pinchStartDistance = distanceBetween(e.touches[0], e.touches[1]);
        pinchStartScale = scale;
      } else if (e.touches.length === 1) {
        isPinching = false;
        isSingleTouchPanning = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTranslateX = translateX;
        touchStartTranslateY = translateY;
      }
    }

    function handleTouchMove(e) {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = distanceBetween(e.touches[0], e.touches[1]);
        const ratio = currentDistance / (pinchStartDistance || 1);
        setScale(pinchStartScale * ratio);
        return;
      }

      if (isSingleTouchPanning && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        if (scale > MIN_SCALE) {
          // Zoomed in: single-finger drag pans the image
          e.preventDefault();
          translateX = touchStartTranslateX + dx;
          translateY = touchStartTranslateY + dy;
          applyTransform();
        }
        // When not zoomed, let the move continue so handleTouchEnd can
        // detect a horizontal swipe for navigation.
      }
    }

    function handleTouchEnd(e) {
      if (isPinching) {
        isPinching = false;
        // Snap fully-zoomed-out images back to center
        if (scale <= MIN_SCALE) resetZoom();
        return;
      }

      if (isSingleTouchPanning && scale === MIN_SCALE) {
        const endX = (e.changedTouches && e.changedTouches[0].clientX) || touchStartX;
        const endY = (e.changedTouches && e.changedTouches[0].clientY) || touchStartY;
        const dx = endX - touchStartX;
        const dy = endY - touchStartY;

        // Only treat as a swipe if the motion is mostly horizontal
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) {
            next();
          } else {
            prev();
          }
        }
      }

      isSingleTouchPanning = false;
    }

    function bindEvents() {
      els.closeTriggers.forEach(function (el) {
        el.addEventListener("click", close);
      });

      els.prevBtn.addEventListener("click", prev);
      els.nextBtn.addEventListener("click", next);
      els.zoomInBtn.addEventListener("click", zoomIn);
      els.zoomOutBtn.addEventListener("click", zoomOut);

      document.addEventListener("keydown", handleKeydown);

      els.stage.addEventListener("wheel", handleWheel, { passive: false });

      els.stage.addEventListener("touchstart", handleTouchStart, { passive: true });
      els.stage.addEventListener("touchmove", handleTouchMove, { passive: false });
      els.stage.addEventListener("touchend", handleTouchEnd, { passive: true });

      // Double-click / double-tap to toggle zoom
      els.image.addEventListener("dblclick", function () {
        if (scale > MIN_SCALE) {
          resetZoom();
        } else {
          setScale(2);
        }
      });
    }

    function init() {
      cacheElements();
      bindEvents();
    }

    return {
      init: init,
      setImages: setImages,
      open: open
    };
  })();

  document.addEventListener("DOMContentLoaded", function () {
    Lightbox.init();
    loadOffers();
  });
})();