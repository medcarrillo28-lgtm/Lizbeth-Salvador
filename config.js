window.WEDDING_CONFIG = {
  // Backend RSVP publicado en Google Apps Script.
  API_URL: "https://script.google.com/macros/s/AKfycbwrvA2abQhL5-RDRo2d0f2WIjM4Q-6TysmVu2zitnGulnI1kKG6xJYcfXOEV1Dq2fIL/exec",
  WEDDING_DATE: "2027-04-24T14:30:00-06:00",

  DEMO_ID: "demo",
  DEMO_INVITATION: {
    family: "Carlos & Fernanda",
    places: 2,
    status: "PENDIENTE",
    attendees: ""
  }
};

// Control de acceso: la invitación sólo se muestra cuando el ID existe en el backend.
(() => {
  const cfg = window.WEDDING_CONFIG || {};
  const params = new URLSearchParams(window.location.search);
  const inviteId = String(params.get("id") || "").trim();

  const style = document.createElement("style");
  style.textContent = `
    body.rsvp-access-locked > *:not(#rsvpAccessGate) {
      display: none !important;
    }

    #rsvpAccessGate {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: 28px;
      background: #f8f4eb;
      color: #34362f;
      font-family: Montserrat, Arial, sans-serif;
      text-align: center;
    }

    #rsvpAccessGate .rsvp-access-card {
      width: min(520px, 92vw);
      padding: 38px 28px;
      border: 1px solid rgba(111, 118, 95, .28);
      border-radius: 18px;
      background: rgba(255, 253, 248, .96);
      box-shadow: 0 20px 60px rgba(52, 54, 47, .12);
    }

    #rsvpAccessGate .rsvp-access-monogram {
      margin: 0 0 12px;
      color: #6f765f;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 2rem;
      letter-spacing: .08em;
    }

    #rsvpAccessGate h1 {
      margin: 0 0 12px;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: clamp(2rem, 7vw, 3rem);
      font-weight: 500;
    }

    #rsvpAccessGate p {
      margin: 0;
      line-height: 1.7;
      color: #66685f;
    }
  `;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.id = "rsvpAccessGate";
  gate.setAttribute("role", "status");
  gate.setAttribute("aria-live", "polite");
  gate.innerHTML = `
    <div class="rsvp-access-card">
      <p class="rsvp-access-monogram">L &amp; S</p>
      <h1>Validando invitación…</h1>
      <p>Estamos verificando tu enlace personalizado.</p>
    </div>
  `;

  document.body.prepend(gate);
  document.body.classList.add("rsvp-access-locked");

  function denyAccess() {
    document.body.classList.add("rsvp-access-locked");
    gate.innerHTML = `
      <div class="rsvp-access-card">
        <p class="rsvp-access-monogram">L &amp; S</p>
        <h1>Invitación no válida</h1>
        <p>Este enlace no corresponde a una invitación válida. Verifica que hayas abierto el enlace completo que te enviamos.</p>
      </div>
    `;
  }

  function allowAccess() {
    document.body.classList.remove("rsvp-access-locked");
    gate.remove();
    style.remove();
  }

  if (!inviteId || !/^[A-Za-z0-9]{8,40}$/.test(inviteId) || !cfg.API_URL) {
    denyAccess();
    return;
  }

  const callbackName = "__weddingAccess_" + Math.random().toString(36).slice(2);
  const script = document.createElement("script");
  let finished = false;

  const cleanup = () => {
    script.remove();
    try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
  };

  const timer = window.setTimeout(() => {
    if (finished) return;
    finished = true;
    cleanup();
    denyAccess();
  }, 12000);

  window[callbackName] = data => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    cleanup();

    if (data && data.ok !== false) {
      // Guardamos los datos para poder reconstruir la respuesta guardada en el formulario.
      window.WEDDING_INVITATION_DATA = data;
      allowAccess();
    } else {
      denyAccess();
    }
  };

  script.onerror = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    cleanup();
    denyAccess();
  };

  script.src = `${cfg.API_URL}?action=invite&id=${encodeURIComponent(inviteId)}&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
  document.body.appendChild(script);
})();

// Si ya existe una respuesta, reconstruye el formulario con esa información,
// pero lo deja completamente editable para que el invitado pueda actualizarla.
(() => {
  function normalizeInvitation(data) {
    if (!data) return null;

    if (data.guest) {
      return {
        family: data.guest.name || data.family || "Invitado",
        places: Number(data.guest.reservedSeats || data.places || 1),
        status: data.guest.status === "NO_ASISTE" ? "NO ASISTE" : (data.guest.status || data.status || "PENDIENTE"),
        attendees: Number(data.guest.attendees ?? data.attendees ?? 0),
        message: data.message || data.mensaje || data.guest.message || ""
      };
    }

    return {
      family: data.family || data.invitacion || "Invitado",
      places: Number(data.places || data.lugares || 1),
      status: String(data.status || data.estado || "PENDIENTE").replace(/_/g, " "),
      attendees: Number(data.attendees ?? data.asistentes ?? 0),
      message: data.message || data.mensaje || ""
    };
  }

  function applySavedResponse() {
    const data = normalizeInvitation(window.WEDDING_INVITATION_DATA);
    const form = document.getElementById("rsvpForm");
    const guestCard = document.getElementById("guestCard");
    if (!data || !form || !guestCard) return false;

    // Espera a que app.js termine de cargar la invitación para evitar que vuelva a limpiar el select.
    if (/Cargando invitación personalizada/i.test(guestCard.textContent || "")) return false;

    const yesRadio = form.querySelector('input[name="asiste"][value="SI"]');
    const noRadio = form.querySelector('input[name="asiste"][value="NO"]');
    const attendeeSelect = document.getElementById("asistentes");
    const attendanceBlock = document.getElementById("attendanceBlock");
    const messageBox = document.getElementById("mensaje");
    const formMessage = document.getElementById("formMessage");
    const submitButton = form.querySelector('button[type="submit"]');

    if (!yesRadio || !noRadio || !attendeeSelect || !attendanceBlock) return false;

    const status = String(data.status || "PENDIENTE").toUpperCase();

    if (status === "CONFIRMADO") {
      yesRadio.checked = true;
      noRadio.checked = false;
      attendanceBlock.style.display = "block";
      attendeeSelect.required = true;

      // Reconstruye las opciones por seguridad y conserva el valor guardado.
      attendeeSelect.innerHTML = '<option value="">Selecciona una opción</option>';
      for (let i = 1; i <= Math.max(1, data.places); i++) {
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = i === 1 ? "1 persona" : `${i} personas`;
        attendeeSelect.appendChild(option);
      }
      if (data.attendees >= 1 && data.attendees <= data.places) {
        attendeeSelect.value = String(data.attendees);
      }
    } else if (status === "NO ASISTE") {
      yesRadio.checked = false;
      noRadio.checked = true;
      attendanceBlock.style.display = "none";
      attendeeSelect.required = false;
      attendeeSelect.value = "";
    } else {
      return true;
    }

    if (messageBox && data.message) messageBox.value = data.message;

    if (formMessage) {
      formMessage.textContent = "Ya registramos tu respuesta. Puedes modificarla y volver a enviarla si lo necesitas.";
    }

    if (submitButton) {
      submitButton.textContent = "Actualizar confirmación";
    }

    return true;
  }

  function startRestore() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (applySavedResponse() || attempts >= 80) {
        window.clearInterval(timer);
      }
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startRestore, { once: true });
  } else {
    startRestore();
  }
})();