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
