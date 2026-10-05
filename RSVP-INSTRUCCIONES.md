# Conectar RSVP con Google Sheets

La interfaz final ya está preparada. Sólo falta desplegar el backend una vez.

1. Abre el Google Sheet **RSVP Boda - Invitados**.
2. Ve a **Extensiones → Apps Script**.
3. Reemplaza el contenido de `Code.gs` por `apps-script/Code.gs` de este proyecto.
4. Ejecuta `setupProject()` una vez y autoriza los permisos.
5. Ve a **Implementar → Nueva implementación → Aplicación web**.
   - Ejecutar como: Yo
   - Acceso: Cualquier usuario
6. Copia la URL que termina en `/exec`.
7. Pégala en `config.js`, dentro de `API_URL`.
8. En el Google Sheet, recarga y usa el menú **💍 Boda RSVP**:
   - `Generar IDs y enlaces`
   - si cambia la URL de GitHub Pages, usa `Guardar URL pública`.

## Estructura del Sheet

`ID | INVITACIÓN / FAMILIA | LUGARES | ESTADO | ASISTENTES | FECHA CONFIRMACIÓN | MENSAJE | ENLACE`

El backend crea además una pestaña `Resumen` con:
- invitaciones
- personas invitadas
- personas confirmadas
- invitaciones pendientes
- invitaciones que no asistirán
- lugares pendientes de respuesta
