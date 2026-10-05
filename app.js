(() => {
  // Refuerzo para recargas y restauración desde la caché de navegación.
  window.scrollTo(0, 0);
  window.addEventListener("pageshow", () => window.scrollTo(0, 0));

  // Revela los bloques cuando entran al viewport. La animación se ejecuta una sola vez.
  function initScrollReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach(element => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries, revealObserver) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px"
    });

    elements.forEach(element => observer.observe(element));
  }

  // Galería ampliada: abre las fotos a pantalla grande y permite navegar/deslizar.
  function initGalleryLightbox() {
    const galleryImages = Array.from(document.querySelectorAll(".gallery-grid .g img"));
    if (!galleryImages.length) return;

    const lightbox = document.createElement("div");
    lightbox.className = "gallery-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Galería de fotos ampliada");
    lightbox.innerHTML = `
      <button class="gallery-lightbox__close" type="button" aria-label="Cerrar galería">&times;</button>
      <button class="gallery-lightbox__nav gallery-lightbox__prev" type="button" aria-label="Foto anterior">&#8249;</button>
      <div class="gallery-lightbox__stage">
        <img class="gallery-lightbox__image" alt="">
      </div>
      <button class="gallery-lightbox__nav gallery-lightbox__next" type="button" aria-label="Foto siguiente">&#8250;</button>
      <p class="gallery-lightbox__counter" aria-live="polite"></p>
    `;
    document.body.appendChild(lightbox);

    const stage = lightbox.querySelector(".gallery-lightbox__stage");
    const image = lightbox.querySelector(".gallery-lightbox__image");
    const closeButton = lightbox.querySelector(".gallery-lightbox__close");
    const prevButton = lightbox.querySelector(".gallery-lightbox__prev");
    const nextButton = lightbox.querySelector(".gallery-lightbox__next");
    const counter = lightbox.querySelector(".gallery-lightbox__counter");
    let currentIndex = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let previousFocus = null;

    function updatePhoto(index, direction = 0) {
      currentIndex = (index + galleryImages.length) % galleryImages.length;
      const source = galleryImages[currentIndex];

      if (direction) {
        image.classList.add(direction > 0 ? "is-changing-left" : "is-changing-right");
      }

      const swap = () => {
        image.src = source.currentSrc || source.src;
        image.alt = source.alt || `Foto ${currentIndex + 1}`;
        counter.textContent = `${currentIndex + 1} / ${galleryImages.length}`;
        image.classList.remove("is-changing-left", "is-changing-right");
      };

      direction ? setTimeout(swap, 110) : swap();
    }

    function openLightbox(index) {
      previousFocus = document.activeElement;
      updatePhoto(index);
      lightbox.classList.add("is-open");
      document.body.classList.add("lightbox-open");
      closeButton.focus({ preventScroll: true });
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.body.classList.remove("lightbox-open");
      previousFocus?.focus?.({ preventScroll: true });
    }

    function previousPhoto() { updatePhoto(currentIndex - 1, -1); }
    function nextPhoto() { updatePhoto(currentIndex + 1, 1); }

    galleryImages.forEach((galleryImage, index) => {
      galleryImage.tabIndex = 0;
      galleryImage.setAttribute("role", "button");
      galleryImage.setAttribute("aria-label", `${galleryImage.alt || "Foto"}. Abrir imagen completa`);
      galleryImage.addEventListener("click", () => openLightbox(index));
      galleryImage.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(index);
        }
      });
    });

    closeButton.addEventListener("click", closeLightbox);
    prevButton.addEventListener("click", previousPhoto);
    nextButton.addEventListener("click", nextPhoto);

    lightbox.addEventListener("click", event => {
      if (event.target === lightbox || event.target === stage) closeLightbox();
    });

    document.addEventListener("keydown", event => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") previousPhoto();
      if (event.key === "ArrowRight") nextPhoto();
    });

    stage.addEventListener("touchstart", event => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    stage.addEventListener("touchend", event => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      deltaX < 0 ? nextPhoto() : previousPhoto();
    }, { passive: true });
  }
  function initIntroEnvelope() {
    const intro = document.getElementById("introEnvelope");
    const seal = document.getElementById("introSeal");
    if (!intro || !seal) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      intro.remove();
      return;
    }

    const introImages = Array.from(intro.querySelectorAll("img"));
    let cycle = 0;
    let revealTimer = 0;
    let fadeTimer = 0;
    let doneTimer = 0;
    let hasOpened = false;

    const clearTimers = () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };

    const waitForImages = () => Promise.all(introImages.map(image => {
      if (image.complete && image.naturalWidth) {
        return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
      }
      return new Promise(resolve => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      }).then(() => image.decode ? image.decode().catch(() => {}) : undefined);
    }));

    const openEnvelope = () => {
      if (hasOpened || !intro.classList.contains("is-ready")) return;
      hasOpened = true;

      // Este play() ocurre dentro del gesto del usuario, por lo que funciona en iPhone/Safari.
      window.startWeddingMusic?.();

      seal.classList.add("is-activated");
      intro.classList.add("is-opening");

      revealTimer = window.setTimeout(() => {
        intro.classList.add("is-revealing");
      }, 2110);

      fadeTimer = window.setTimeout(() => {
        intro.classList.add("is-fading");
        document.body.classList.remove("intro-lock");
      }, 2550);

      doneTimer = window.setTimeout(() => {
        intro.classList.add("is-done");
        document.body.classList.remove("intro-active");
      }, 3200);
    };

    const prepareIntro = async () => {
      const thisCycle = ++cycle;
      clearTimers();
      hasOpened = false;
      document.body.classList.add("intro-lock", "intro-active");

      intro.classList.add("is-resetting");
      intro.classList.remove("is-ready", "is-opening", "is-revealing", "is-fading", "is-done");
      seal.classList.remove("is-activated");
      void intro.offsetWidth;

      await waitForImages();
      if (thisCycle !== cycle) return;

      intro.classList.remove("is-resetting");
      intro.classList.add("is-ready");
      seal.focus({ preventScroll: true });
    };

    seal.addEventListener("click", openEnvelope);
    seal.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEnvelope();
      }
    });

    prepareIntro();

    // Safari/iPhone puede restaurar la página completa desde BFCache.
    // Si vuelve al sitio, reconstruimos el sobre cerrado para que el gesto siga siendo consistente.
    window.addEventListener("pageshow", event => {
      if (event.persisted) prepareIntro();
    });
  }


  function initBackgroundMusic() {
    const audio = document.getElementById("backgroundMusic");
    if (!audio) return;

    audio.loop = true;
    audio.muted = false;

    window.startWeddingMusic = () => {
      if (!audio.paused) return Promise.resolve();
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === "function") {
        return attempt.catch(() => {});
      }
      return Promise.resolve();
    };
  }

  const cfg = window.WEDDING_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const inviteId = params.get("id") || "";
  const form = document.getElementById("rsvpForm");
  const guestCard = document.getElementById("guestCard");
  const guestHero = document.getElementById("guestHero");
  const attendeeSelect = document.getElementById("asistentes");
  const attendanceBlock = document.getElementById("attendanceBlock");
  const formMessage = document.getElementById("formMessage");
  document.getElementById("inviteId").value = inviteId;

  const menu = document.querySelector(".menu-btn");
  const links = document.querySelector(".nav-links");
  menu?.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  links?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));

  const wedding = new Date(cfg.WEDDING_DATE || "2027-04-24T14:30:00-06:00").getTime();
  function tick() {
    const diff = Math.max(0, wedding - Date.now());
    const s = Math.floor(diff / 1000);
    document.getElementById("days").textContent = Math.floor(s / 86400);
    document.getElementById("hours").textContent = Math.floor((s % 86400) / 3600);
    document.getElementById("minutes").textContent = Math.floor((s % 3600) / 60);
    document.getElementById("seconds").textContent = s % 60;
  }
  tick();
  setInterval(tick, 1000);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function fillPlaces(max) {
    attendeeSelect.innerHTML = '<option value="">Selecciona una opción</option>';
    for (let i = 1; i <= Number(max || 0); i++) {
      const op = document.createElement("option");
      op.value = String(i);
      op.textContent = i === 1 ? "1 persona" : `${i} personas`;
      attendeeSelect.appendChild(op);
    }
  }

  function renderInvitation(data) {
    // Compatibilidad con el backend anterior, que responde {ok:true, guest:{...}}.
    if (data?.guest) {
      data = {
        ok: data.ok !== false,
        id: data.guest.id,
        family: data.guest.name,
        places: data.guest.reservedSeats,
        status: data.guest.status === "NO_ASISTE" ? "NO ASISTE" : data.guest.status,
        attendees: data.guest.attendees
      };
    }

    if (!data || data.ok === false) {
      guestCard.innerHTML = `<p>No pudimos encontrar esta invitación. Revisa que hayas abierto el enlace completo.</p>`;
      form.querySelectorAll("input, select, textarea, button").forEach(el => el.disabled = true);
      return;
    }

    const family = data.family || data.invitacion || "Invitado";
    const places = Number(data.places || data.lugares || 1);
    const status = data.status || data.estado || "PENDIENTE";
    const attendees = data.attendees ?? data.asistentes ?? "";

    guestHero.hidden = false;
    guestHero.textContent = `Invitación para ${family}`;
    guestCard.innerHTML = `
      <p>Invitación para</p>
      <strong>${escapeHtml(family)}</strong>
      <p>Esta invitación es válida para <strong>${places} ${places === 1 ? "persona" : "personas"}</strong>.</p>
      ${status !== "PENDIENTE" ? `<p class="small">Respuesta actual: ${escapeHtml(status)}${attendees !== "" ? ` · ${attendees} asistente(s)` : ""}</p>` : ""}
    `;
    fillPlaces(places);
    if (cfg.API_URL) form.action = cfg.API_URL;
  }

  // JSONP permite consultar Apps Script desde GitHub Pages sin CORS.
  function loadByJsonp(id) {
    return new Promise((resolve, reject) => {
      const callbackName = "__weddingRSVP_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timer = setTimeout(() => cleanup(new Error("Tiempo agotado")), 12000);

      function cleanup(err, data) {
        clearTimeout(timer);
        script.remove();
        delete window[callbackName];
        err ? reject(err) : resolve(data);
      }

      window[callbackName] = data => cleanup(null, data);
      script.onerror = () => cleanup(new Error("No se pudo cargar la invitación"));
      script.src = `${cfg.API_URL}?action=invite&id=${encodeURIComponent(id)}&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      document.body.appendChild(script);
    });
  }

  async function initInvitation() {
    if (!inviteId) {
      guestCard.innerHTML = `<p>Esta sección se personaliza con el enlace único de cada invitación.</p>`;
      form.querySelectorAll("input, select, textarea, button").forEach(el => el.disabled = true);
      return;
    }

    if (inviteId === cfg.DEMO_ID && !cfg.API_URL) {
      renderInvitation({ok:true, ...cfg.DEMO_INVITATION});
      return;
    }

    if (!cfg.API_URL) {
      guestCard.innerHTML = `<p>El diseño está listo. Falta conectar la URL del Google Apps Script en <code>config.js</code>.</p>`;
      form.querySelectorAll("input, select, textarea, button").forEach(el => el.disabled = true);
      return;
    }

    try {
      renderInvitation(await loadByJsonp(inviteId));
    } catch (err) {
      renderInvitation({ok:false, error: err.message});
    }
  }

  document.querySelectorAll('input[name="asiste"]').forEach(radio => {
    radio.addEventListener("change", e => {
      const yes = e.target.value === "SI";
      attendanceBlock.style.display = yes ? "block" : "none";
      attendeeSelect.required = yes;
      if (!yes) attendeeSelect.value = "";
    });
  });

  form.addEventListener("submit", e => {
    if (!cfg.API_URL || !inviteId) {
      e.preventDefault();
      formMessage.textContent = "La invitación aún no está conectada al sistema RSVP.";
      return;
    }
    const response = new FormData(form).get("asiste");
    if (response === "SI" && !attendeeSelect.value) {
      e.preventDefault();
      formMessage.textContent = "Selecciona cuántas personas asistirán.";
      return;
    }

    // Campos compatibles con el backend anterior.
    document.getElementById("legacyStatus").value = response === "SI" ? "CONFIRMADO" : "NO_ASISTE";
    document.getElementById("legacyAttendees").value = response === "SI" ? attendeeSelect.value : "0";
    document.getElementById("legacyMessage").value = document.getElementById("mensaje").value.trim();

    formMessage.textContent = "Enviando confirmación…";
    setTimeout(() => {
      formMessage.textContent = "¡Gracias! Tu respuesta fue enviada.";
    }, 900);
  });

  initBackgroundMusic();
  initIntroEnvelope();
  initScrollReveal();
  initGalleryLightbox();
  initInvitation();
})();
