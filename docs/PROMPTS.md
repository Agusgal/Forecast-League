# Cómo se armaron los prompts

Este documento acompaña el [README](../README.md). Describe el método seguido y ofrece material reutilizable. No publica la conversación completa ni credenciales. El desarrollo fue iterativo: el usuario fijó la dirección y evaluó resultados; Codex implementó y verificó cambios sobre el repositorio.

## Anatomía del pedido inicial

El brief original estaba organizado en visión, plataformas, stack, pantallas, puntajes, ciclo de preguntas, base de datos, monetización futura, diseño, alcance del MVP, proceso de trabajo, estándares de ingeniería y primer paso. Esa organización ayudó a separar aspiraciones futuras de requisitos de la primera versión.

Tres decisiones del prompt fueron especialmente concretas:

1. **Reglas observables:** ocultar el consenso hasta responder; conservar cada revisión; puntuar la última válida antes del cierre; no permitir cambiar criterios publicados.
2. **Un primer recorrido completo:** abrir una pregunta, elegir probabilidad, enviar, persistir y confirmar. Después agregar puntajes, consenso y ligas.
3. **Honestidad sobre el entorno:** si faltaban credenciales, usar una demo identificada y explicar la configuración pendiente, sin afirmar que el servicio estaba conectado.

Las referencias a otros productos aportaron distintas dimensiones: juegos casuales para accesibilidad, Metaculus para probabilidades, Chess.com para progresión y Wordle para hábitos. La referencia posterior a Polymarket orientó la apariencia. El producto conservó la restricción inicial de no incluir apuestas ni transacciones financieras.

## Brief reutilizable

**Reconstrucción resumida en español**, preparada para este repositorio. No es una cita literal ni el prompt original completo:

```text
Actuá como socio técnico, desarrollador full stack, diseñador y arquitecto.

Construimos Forecast League: una plataforma social para pronosticar eventos
con probabilidades, aprender de los resultados y competir con amigos.
El primer producto será una web responsive, pensada primero para celulares.

No incluyas apuestas, dinero, contratos negociables ni monedas virtuales.
No presentes usuarios o estadísticas ficticias como actividad real.
No implementes pagos ni aplicaciones nativas en este MVP.

Usá Next.js App Router, TypeScript estricto, Tailwind, componentes accesibles,
Lucide, Recharts, Zod y Supabase con PostgreSQL, Auth y RLS.
Separá interfaz, dominio, contratos HTTP y acceso a datos. Evitá microservicios
innecesarios. El dominio debe poder reutilizarse en un futuro cliente móvil.

Las preguntas deben tener criterios y fuente de resolución, apertura,
cierre y resolución esperada. Usá probabilidades entre 1 % y 99 %.
Permití revisar antes del cierre y conservá el historial inmutable.
Ocultá el consenso hasta la primera respuesta del usuario.

Calculá precisión mediante Brier = (p - resultado)^2.
Puntuá la última revisión válida antes del cierre. Solo las preguntas resueltas
contribuyen a la precisión final. Diferenciá precisión, puntos y rating provisional.
Validá permisos, plazos y propiedad de datos del lado servidor.

Inspeccioná el repositorio. Proponé una arquitectura y plan breves.
Comenzá a implementar: no te detengas en el plan.
Completá primero feed → detalle → probabilidad → envío → persistencia
→ confirmación. Después incorporá consenso, puntajes, perfiles y ligas.

Si faltan credenciales, ofrecé un modo demo claramente identificado
y documentación para configurar los servicios reales.
Verificá los flujos, ejecutá pruebas relevantes y explicá límites pendientes.
```

## Cómo se dieron las correcciones

La conversación pasó de pedidos amplios a feedback localizado. Primero se discutió el significado de probabilidades y puntajes. Luego se modificó la apariencia, se comprobó el ingreso al producto y se adaptó idioma y contenido.

Extractos literales de esos pedidos:

> Something more polymarkety, modern simple. Font should be bigger.

> Now lets change the polymarket blue to an ochre yellow: #CC7722

> Quiero que traduzcas al español todo, y agrega predicciones ejemplo relevantes para argentina.

El pedido sobre landing y registro preguntó si realmente funcionaban y requirió implementarlos si faltaban. Esto llevó la revisión más allá del aspecto visual. Las comprobaciones de cuentas se documentan por su propósito; no se reproducen datos de acceso.

## Iteración: preguntas propuestas por usuarios y planes

El siguiente pedido agregó una necesidad concreta: que los participantes pudieran crear preguntas. También introdujo cuatro planes —Free, Pro, Community y Enterprise— con diferencias de cupo, revisión, comunidades y estadísticas. Antes de implementar, se precisaron tres decisiones que el usuario confirmó:

1. **Enterprise:** estadísticas agregadas y encuestas con consentimiento, sin acceso automático a datos personales. La expresión inicial «full access a datos de usuarios» se acotó para respetar la privacidad prometida durante el registro.
2. **Cupos y revisión:** Free permite un envío por día con revisión normal; Pro, Community y Enterprise permiten diez, con revisión prioritaria. La aprobación es manual y no promete un plazo fijo.
3. **Market makers:** son curadores que proponen preguntas y aportan pronósticos iniciales. No operan con dinero, apuestas ni contratos negociables.

Estas respuestas se convirtieron en reglas verificables, en lugar de dejar términos comerciales ambiguos en la implementación:

| Área | Regla de esta versión |
| --- | --- |
| Asignación de planes | La realiza un administrador registrado. El usuario no puede cambiar su plan mediante el perfil, el registro ni un pedido a la API. No hay cobros ni integración de pagos. |
| Cupo diario | Se calcula por persona y por día de Argentina. Cuenta todos los envíos, incluso los rechazados. Cambiar de plan no borra el consumo del día. Los envíos concurrentes no deben exceder el límite. |
| Moderación | Cada propuesta queda pendiente. La cola prioriza los planes correspondientes y conserva el orden de llegada dentro de cada prioridad. La prioridad se fija al enviar; no equivale a aprobación automática ni a un SLA. |
| Publicación | Un administrador aprueba o rechaza una sola vez, con una nota. Aprobar genera una pregunta publicada, con criterios y fuente de resolución y cierre todavía vigente. |
| Comunidades | Community y Enterprise pueden crearlas; cualquier cuenta registrada puede unirse por código. Son independientes de las ligas existentes. Solo sus miembros ven su espacio, miembros y encuestas. |
| Curadores | Un propietario Enterprise puede designar miembros como curadores. Sus propuestas consumen el cupo individual del curador y siguen pasando por moderación. El propietario debe conservar Enterprise para que esa facultad siga activa. |
| Estadísticas | El propietario Community o Enterprise ve agregados de pronósticos sobre preguntas aprobadas vinculadas a su comunidad. Enterprise también obtiene agregados globales. No se entregan datos personales ni respuestas individuales de terceros. |
| Privacidad estadística | La precisión Brier requiere al menos cinco usuarios registrados distintos con pronósticos resueltos. Cada categoría debe cumplir su propio umbral de cinco; tener cinco miembros o cinco pronósticos de una sola persona no alcanza. Los contadores de actividad se distinguen de las métricas de precisión. |
| Encuestas | El propietario Enterprise puede crear encuestas de una opción, con entre dos y seis alternativas, propósito explícito y fecha de cierre. Solo los miembros pueden responder, con consentimiento afirmativo, una vez por persona. |
| Resultados y retiro | Solo el propietario Enterprise accede a los resultados agregados. La distribución se oculta hasta reunir cinco respuestas activas. Retirar el consentimiento elimina la opción elegida y su fecha de consentimiento, incluso después del cierre o la pérdida de membresía; queda una marca mínima que impide responder de nuevo. |
| Cambio de plan | Revocar un plan corta sus funciones premium. No elimina las comunidades ni el acceso de sus miembros a la información que les corresponde. |

### Prompts reutilizables para esta funcionalidad

Los siguientes textos son **reconstrucciones operativas**, no transcripciones literales. Separan decisiones de producto, implementación y verificación para poder continuar el trabajo sin reabrir ambigüedades ya resueltas.

```text
Agregá propuestas de preguntas a Forecast League usando los adaptadores local
y Supabase existentes, con un contrato compartido y validación en el servidor.
Conservá datos, preguntas, pronósticos y administradores registrados anteriores.

Solo cuentas registradas pueden proponer. Free: 1 envío diario y revisión normal.
Pro, Community y Enterprise: 10 envíos diarios y revisión prioritaria.
Usá el día de Argentina y contá todo envío aceptado, aunque luego se rechace.
No reinicies el consumo por cambios de plan. Hacé atómico el control del cupo.

Una propuesta requiere título, descripción, categoría, horizonte, fechas,
criterios y fuente de resolución. No publiques automáticamente. Un administrador
registrado debe aprobar o rechazar una sola vez, con nota. Solo aprobá si el
cierre sigue vigente. La cola prioriza según el plan al enviar y luego por llegada.
No prometas tiempos de aprobación ni implementes pagos.

Guardá el plan en datos protegidos; solo administración puede asignarlo.
Las cuentas e invitados nuevos no son administradores. No confíes en banderas
de rol o plan enviadas por el cliente ni en metadata editable de autenticación.
Mostrá cupo, reinicio, estado y nota de revisión a la persona que hizo la propuesta.
```

```text
Extendé los planes con comunidades independientes de las ligas.
Community y Enterprise crean comunidades; cualquier cuenta registrada se une
por código. Protegé las lecturas por membresía. Solo su propietario con un plan
habilitado puede acceder a las estadísticas adicionales de la comunidad.

El propietario Enterprise puede designar curadores entre sus miembros.
Un curador propone usando su propio cupo y prioridad; no saltea la moderación.
Interpretá market maker como curador sin dinero, apuestas ni trading.
Al revocar Enterprise, deshabilitá esas facultades y mantené los datos existentes.

Calculá estadísticas de comunidad sobre preguntas aprobadas vinculadas a ella;
la precisión solo usa resultados resueltos. Exigí cinco usuarios registrados
distintos con resultados resueltos antes de mostrar Brier, también por categoría.
Enterprise obtiene agregados globales bajo el mismo umbral. Nunca incluyas
correos, datos personales del registro, credenciales ni pronósticos privados crudos.

Permití al propietario Enterprise crear encuestas con propósito y cierre,
de selección única y entre dos y seis opciones distintas. Exigí consentimiento
explícito del miembro al responder. Una respuesta por persona; sin consentimiento
implícito al registrarse o ingresar a una comunidad.
Mostrá solo agregados al propietario Enterprise y ocultá la distribución con
menos de cinco respuestas activas. Permití retirar la respuesta aun después del
cierre o de perder acceso a la comunidad; borrá la elección y el consentimiento,
conservando únicamente una marca que impida volver a responder.
```

```text
Verificá el sistema por debajo de la interfaz: intentá exceder cupos con envíos
concurrentes, cambiar planes sin permiso y aprobar dos veces la misma propuesta.
Probá el reinicio a medianoche de Argentina, propuestas vencidas, cambios de plan
y que un rechazo no devuelva cupo. Comprobá que invitados antiguos con una marca
admin no obtengan privilegios ni puedan ver borradores.

Probá aislamiento entre comunidades, facultades de curadores tras revocar el
plan del propietario y estadísticas con cohortes menores y mayores a cinco.
En encuestas, comprobá consentimiento obligatorio, una respuesta por persona,
retiro después del cierre, resultados recalculados y prohibición de responder otra
vez. Verificá que las respuestas HTTP nunca expongan datos personales de terceros.

Repetí las comprobaciones de permisos y validación mediante SQL/RPC directo:
la seguridad no puede depender solamente de la UI ni de la ruta HTTP.
Documentá qué funciona localmente, qué migraciones requiere Supabase y cualquier
validación pendiente en un servicio alojado. No afirmes que hay pagos o SLA.
```

## Plantilla para futuras iteraciones

**Plantilla nueva**, no utilizada literalmente en la conversación original:

```text
Contexto: estamos trabajando sobre Forecast League y el flujo actual es [flujo].
Problema observado: [comportamiento concreto que vi al probarlo].
Resultado esperado: [qué debería poder hacer o entender una persona].
Restricciones: [reglas del producto o compatibilidad que deben mantenerse].
Criterios de aceptación: [pasos y resultado observable].

Revisá la implementación existente y hacé el cambio completo.
Verificá el recorrido afectado y las reglas relevantes.
Explicá qué cambió, cómo lo comprobaste y qué queda pendiente.
```

## Qué permite reproducir esta documentación

El código, las migraciones, el lockfile y las pruebas permiten instalar y estudiar este estado del proyecto. Los prompts explican las decisiones y sirven como punto de partida para continuar. Repetirlos en otro entorno o con otro modelo puede producir una implementación distinta; no se afirma una reproducción determinista ni se atribuye todo el resultado a un único mensaje.
