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
