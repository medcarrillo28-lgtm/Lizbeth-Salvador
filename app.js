(() => {
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
      script.src = `${cfg.API_URL}?action=info&id=${encodeURIComponent(id)}&callback=${encodeURIComponent(callbackName)}`;
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
    formMessage.textContent = "Enviando confirmación…";
    setTimeout(() => {
      formMessage.textContent = "¡Gracias! Tu respuesta fue enviada.";
    }, 900);
  });

  initInvitation();
})();
