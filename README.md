# Invitación de boda — Lizbeth & Salvador

Sitio estático para GitHub Pages + RSVP conectado a Google Sheets mediante Google Apps Script.

## Arquitectura

- `index.html` / `styles.css`: invitación.
- `config.js`: URL pública del backend de Apps Script.
- `app.js`: cuenta regresiva, lectura del `?id=` único y envío del RSVP.
- `assets/img/`: fotos y logo.
- `apps-script/Code.gs`: backend que:
  - genera IDs opacos y enlaces únicos;
  - lee el nombre de la familia y máximo de lugares;
  - guarda ESTADO, ASISTENTES, FECHA CONFIRMACIÓN y MENSAJE.

La hoja usada actualmente es:

`RSVP Boda - Invitados`
Spreadsheet ID:
`1uEQgFdA4Lfi30NH59LXH-DKpsgdIXCc2r0vfft4AtN8`

Columnas:
A ID
B INVITACIÓN / FAMILIA
C LUGARES
D ESTADO
E ASISTENTES
F FECHA CONFIRMACIÓN
G MENSAJE
H ENLACE

## 1. Probar el diseño localmente

Abre:

`index.html?id=demo`

Mientras `API_URL` esté vacío, verás la invitación de ejemplo "Carlos & Fernanda" con 2 lugares.

## 2. Subir a GitHub

Crea un repositorio, por ejemplo:

`invitacion-boda`

Sube todo el contenido de esta carpeta a la raíz del repositorio.

En GitHub:
Settings → Pages → Deploy from a branch → `main` / root.

La URL quedará parecida a:

`https://TU-USUARIO.github.io/invitacion-boda/`

## 3. Configurar Google Apps Script

En la Google Sheet:
Extensiones → Apps Script.

Copia `apps-script/Code.gs`.

En `CONFIG.GITHUB_PAGES_URL`, reemplaza el ejemplo por tu URL real de GitHub Pages.

Después:
Implementar → Nueva implementación → Aplicación web.

Ejecutar como:
**Yo**

Quién tiene acceso:
**Cualquier persona**

Copia la URL `/exec`.

## 4. Conectar frontend y backend

Abre `config.js` y pega la URL `/exec`:

```js
API_URL: "https://script.google.com/macros/s/XXXXX/exec",
```

Haz commit/push a GitHub.

## 5. Generar IDs y enlaces

En Apps Script selecciona:

`generateInvitationLinks`

y pulsa **Ejecutar**.

El sistema:
- deja intactos los IDs ya existentes;
- genera ID solo donde falta;
- coloca `PENDIENTE` si ESTADO está vacío;
- genera ENLACE como:
  `https://TU-USUARIO.github.io/invitacion-boda/?id=ID_UNICO`

Para cada familia tú solo llenas:
- INVITACIÓN / FAMILIA
- LUGARES

## 6. RSVP

Cuando el invitado abre su URL:
- ve el nombre de su invitación;
- ve el máximo de lugares;
- solo puede elegir de 1 hasta ese máximo;
- al responder se actualiza la misma fila.

Si responde NO:
- ESTADO → `NO ASISTE`
- ASISTENTES → `0`

Si responde SÍ:
- ESTADO → `CONFIRMADO`
- ASISTENTES → cantidad elegida

También se guardan la fecha/hora y el mensaje.

## Nota de seguridad

El `id` funciona como una llave privada de la invitación. Por eso se usa un UUID aleatorio, no 001/002/003 ni datos derivados del nombre. No publiques la hoja de cálculo.
