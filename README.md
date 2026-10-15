# Forecast League

**Pronosticá el futuro. Competí con amigos. Aprendé a pensar en probabilidades.**

Forecast League es un prototipo de plataforma social de pronósticos: respondés preguntas sobre eventos futuros con una probabilidad, revisás tus predicciones antes del cierre y comparás tu precisión cuando se conoce el resultado. Combina competencia amistosa, estadísticas personales y consenso colectivo, sin apuestas, dinero, contratos negociables ni monedas virtuales.

Este repositorio comparte el código y el proceso de desarrollo asistido por **Codex CLI**, desde el brief inicial hasta las iteraciones de producto, diseño y contenido.

## Qué se puede hacer

- Explorar una landing pública, registrarse e iniciar sesión.
- Pronosticar preguntas diarias, semanales, mensuales y de largo plazo con probabilidades del 1 % al 99 %.
- Agregar un razonamiento y revisar la probabilidad antes del cierre, conservando cada versión.
- Desbloquear el consenso de una pregunta después de responder: promedio, distribución e historial.
- Consultar precisión, calibración, historial y clasificaciones globales o por país.
- Crear ligas privadas, invitar amigos mediante código o enlace y comparar preguntas compartidas.
- Proponer preguntas con un cupo diario por plan y seguir su revisión manual.
- Crear comunidades, invitar miembros y consultar estadísticas agregadas según el plan.
- En Enterprise, organizar encuestas voluntarias y designar curadores, sin acceso automático a datos personales.
- Administrar preguntas: revisar propuestas, crear borradores, publicar, cerrar, resolver o anular; asignar planes a cuentas registradas.

La demo incluye nueve escenarios sobre clima en Córdoba, CABA, Mendoza y Rosario, dólar oficial, inflación, exportaciones, energías renovables y un amistoso ficticio de la Selección. **Son simulaciones, no noticias, cotizaciones ni pronósticos actuales.** Los enlaces a organismos sirven como referencias temáticas. Los perfiles y pronósticos precargados también están identificados como ficticios.

## Probarlo localmente

Requisitos: **Node.js 20.9 o superior** y **pnpm**. La demo funciona sin cuentas de servicios externos ni claves.

```sh
git clone https://github.com/Agusgal/Forecast-League.git
cd Forecast-League
pnpm install --frozen-lockfile
pnpm dev
```

Abrí [localhost:3000](http://localhost:3000). Podés explorar la demo o crear tu propia cuenta. No se distribuyen cuentas personales ni contraseñas de desarrollo.

| Ruta | Pantalla |
| --- | --- |
| `/` | Presentación del producto |
| `/signup` y `/login` | Registro e inicio de sesión |
| `/forecasts` | Preguntas y pronósticos |
| `/questions/:id` | Detalle, criterios y probabilidad |
| `/leagues` | Ligas privadas |
| `/leaderboard` | Clasificaciones |
| `/world` | Consenso colectivo |
| `/profile` | Perfil e historial |
| `/proposals` | Crear preguntas y seguir sus revisiones |
| `/communities` | Comunidades, invitaciones y encuestas |
| `/plans` | Planes, cupos y capacidades |
| `/enterprise` | Estadísticas agregadas y herramientas Enterprise |
| `/moderation` | Revisión de propuestas y asignación de planes (administración) |
| `/admin` | Administración del ciclo de preguntas |

Probá el recorrido completo: abrí una pregunta, leé sus criterios, enviá una probabilidad, observá el consenso y recargá. Tu pronóstico persiste. Podés revisarlo mientras la pregunta siga abierta. En la demo, el código **FUTURE** permite entrar a una liga de ejemplo.

El servidor de desarrollo escucha en `0.0.0.0`. Para probarlo desde un celular conectado a la misma red, usá `http://IP_LOCAL_DE_TU_COMPUTADORA:3000`.

## Registro completo y preguntas vigentes

El registro en `/signup` solicita usuario, correo, contraseña y confirmación, país de nacimiento, país de residencia, edad (años cumplidos) y sexo. Se puede elegir «Prefiero no decirlo» en sexo. Son opcionales el nivel educativo, ocupación, ciudad, barrio e ingreso anual estimado con su moneda. La edad se guarda al momento del registro, no se recalcula como una fecha de nacimiento.

Los datos personales se validan también en el servidor. En demo se guardan dentro de la cuenta privada, separados del perfil público. En Supabase, la migración `202610130001_registration_details.sql` crea una tabla con RLS para que cada usuario solo pueda consultar sus propios datos. El alta transmite los datos mediante los metadatos privados de Supabase Auth y el trigger los copia transaccionalmente a esa tabla; no se incorporan al bootstrap ni a rankings. El país público del perfil sigue siendo un dato independiente. Las cuentas existentes pueden seguir entrando sin completar retroactivamente el formulario.

Aplicá las tres migraciones en orden antes de usar todas las funciones del modo conectado. La API comprueba que la nueva migración esté disponible antes de crear una cuenta, para no perder los datos silenciosamente. El modo alojado sigue pendiente de validación con credenciales reales.

En demo se crean nuevas rondas argentinas al vencer las anteriores, sin modificar fechas publicadas, pronósticos ni resultados. La renovación ocurre al acceder al almacenamiento local; no es una tarea programada ni una resolución automática. El listado muestra preguntas abiertas por defecto y permite incluir las cerradas y su historial. Las rondas siguen siendo simulaciones y no datos de actualidad. Esta renovación automática solo corresponde al adaptador local; las preguntas de Supabase se gestionan por administración.

## Preguntas, planes y comunidades

Todas las cuentas empiezan en **Free**. Los planes se asignan manualmente por un administrador en `/moderation`; no hay cobros, suscripciones ni cambios de plan desde el cliente.

| Plan | Propuestas por día | Revisión | Capacidades adicionales |
| --- | ---: | --- | --- |
| Free | 1 | Normal | Pronosticar y unirse a comunidades por invitación |
| Pro | 10 | Prioritaria | Mayor cupo de propuestas |
| Community | 10 | Prioritaria | Crear comunidades y ver estadísticas agregadas de las propias |
| Enterprise | 10 | Prioritaria | Lo anterior, estadísticas globales agregadas, encuestas y curadores |

El cupo se renueva a **medianoche de Argentina (UTC−3)**. Cada envío válido consume una unidad, aunque después se rechace; cambiar de plan no reinicia el uso del día. La prioridad queda fijada al enviar. La cola muestra primero las propuestas prioritarias y, dentro de cada grupo, las más antiguas. La aprobación es manual y **no se promete un tiempo de respuesta**.

En `/proposals`, cada pregunta debe incluir fechas, fuente y criterios de resolución Sí/No. No aparece en el feed hasta que administración la aprueba. El administrador deja una nota al aprobar o rechazar; no puede aprobar una pregunta cuyo cierre ya pasó. La aprobación publica una única pregunta y conserva la propuesta y su revisión como historial. Las preguntas aprobadas son públicas, incluso cuando están asociadas a una comunidad.

Las comunidades son espacios nuevos, separados de las ligas privadas existentes. Sus códigos y listas de miembros solo se muestran a sus integrantes. Un propietario Community o Enterprise ve actividad y precisión agregadas de sus miembros en las preguntas aprobadas de esa comunidad. Los promedios de Brier requieren al menos **cinco usuarios registrados con pronósticos resueltos**; cada categoría aplica también ese mínimo. Enterprise agrega una vista global con las mismas restricciones, sin exportar datos personales ni pronósticos individuales.

El propietario Enterprise puede nombrar curadores entre los miembros. Pueden proponer preguntas para esa comunidad usando su propio cupo y aportar pronósticos mediante el flujo habitual. No obtienen aprobación automática ni permisos para operar con dinero. Si el propietario pierde Enterprise, se desactivan esas atribuciones de curación y las herramientas de encuestas.

Las encuestas tienen propósito explícito, entre dos y seis opciones y fecha de cierre. Cada miembro elige voluntariamente si responde y confirma su consentimiento con una casilla inicialmente desmarcada. Solo el propietario Enterprise recibe los resultados agregados; la distribución se oculta hasta reunir **cinco respuestas activas**. Cada participante puede retirar su respuesta incluso después del cierre o de un cambio de plan. Se elimina su elección y se conserva un registro mínimo que impide volver a responder. El propietario no recibe respuestas identificadas ni datos del registro personal.

## Cómo se construyó con prompts

El proyecto se desarrolló mediante una conversación iterativa. El primer prompt definió una visión amplia y restricciones concretas; los siguientes ajustaron el producto a partir de lo que se podía probar en el navegador. **No surgió de un único prompt ni todos los objetivos iniciales están implementados.**

### 1. Un brief con contexto, reglas y un primer recorrido verificable

El pedido inicial asignó al asistente el rol de socio técnico, desarrollador full stack, diseñador y arquitecto. Después especificó:

- **Producto y referencias:** accesibilidad de juegos casuales, pronósticos probabilísticos de Metaculus, progresión y comunidad de Chess.com, y hábitos diarios como Wordle.
- **Límites:** ninguna apuesta; no presentar datos inventados como reales; no simular conexiones a servicios; no implementar pagos ni aplicaciones nativas en el MVP.
- **Stack y estructura:** Next.js, TypeScript estricto, Tailwind, componentes accesibles, Supabase, Zod y separación entre interfaz, dominio y persistencia.
- **Reglas comprobables:** Brier score, última revisión válida antes del cierre, historial inmutable, criterios de resolución explícitos y consenso oculto hasta responder.
- **Forma de trabajar:** inspeccionar el repositorio, proponer una arquitectura breve y comenzar a implementar inmediatamente.

Una instrucción literal que organizó el trabajo fue:

> Home Feed → Question Detail → Probability Selection → Forecast Submission → Database Persistence → Confirmation.

Se pidió completar ese recorrido primero y después sumar puntajes, consenso y ligas. Esto convirtió una visión grande en una primera funcionalidad que se podía probar de punta a punta.

### 2. Iteraciones cortas sobre el producto visible

| Etapa | Pedido del usuario | Efecto en el estado actual |
| --- | --- | --- |
| Comprender las reglas | Preguntas sobre qué significa pronosticar 50 %, cómo se puntúa un resultado Sí/No y qué hacen otras plataformas | Explicitación del Brier score y de la diferencia entre precisión y puntos |
| Cambiar el aspecto | “Something more polymarkety, modern simple. Font should be bigger.” | Interfaz más lúdica, simple y con texto grande; la referencia se usó para el aspecto visual |
| Completar el ingreso | Comprobar que funcionaran la landing y la creación de usuarios | Landing pública, registro e inicio de sesión |
| Definir la identidad | “Now lets change the polymarket blue to an ochre yellow: #CC7722” | Color ocre como acento visual |
| Adaptar idioma y contenido | “Quiero que traduzcas al español todo, y agrega predicciones ejemplo relevantes para argentina.” | Interfaz en español argentino, formato local y escenarios argentinos simulados |
| Incorporar participación por planes | Crear preguntas con cupos Free/Pro, comunidades y funciones Enterprise; después aclarar privacidad, revisión y curadores | Propuestas moderadas, planes asignados por administración, comunidades, agregados y encuestas con consentimiento |
| Compartir el trabajo | Publicar el repositorio y explicar cómo se armaron los prompts | Este README y la documentación del proceso |

Los fragmentos entre comillas son extractos del usuario; el resto de la tabla resume los pedidos y sus resultados. Se omiten credenciales y datos personales. Las instrucciones de continuación permitieron completar el trabajo en curso, sin reemplazar el objetivo inicial.

### 3. Prompts acompañados de implementación y verificación

La dirección del producto y las correcciones visuales provinieron del usuario. Codex trabajó sobre los archivos, implementó los flujos y ejecutó comprobaciones. El proceso incluyó revisar el comportamiento en el navegador, contrastar las reglas con pruebas y documentar qué integraciones estaban disponibles.

La estructura reutilizable fue: **contexto → objetivo → restricciones → recorrido mínimo → criterios de aceptación → feedback sobre el resultado**. Los prompts posteriores señalaban cambios concretos, como aumentar la tipografía o verificar el registro, en lugar de volver a describir toda la aplicación.

En [docs/PROMPTS.md](docs/PROMPTS.md) hay una reconstrucción resumida del brief y plantillas para continuar. Están identificadas como reconstrucciones: no son una transcripción completa ni garantizan reproducir exactamente el mismo código.

## Cómo se calculan los puntos

Para una pregunta binaria:

```text
Brier = (probabilidad − resultado)²
resultado: Sí = 1, No = 0
puntos = redondear(1000 × (1 − promedio de Brier))
```

Un Brier menor indica mayor precisión. Si pronosticás **50 %**, el Brier es **0,25** tanto si ocurre como si no: equivale a **750 puntos si esa es tu única pregunta resuelta**. Si pronosticás 90 %, obtenés 990 puntos si ocurre y 190 si no ocurre, bajo esa misma condición. Los puntos del perfil se calculan sobre el promedio; no se suman como premios por pregunta.

Se utiliza la última revisión válida **estrictamente anterior** al cierre. Las preguntas abiertas, anuladas o canceladas no mejoran la precisión final. Los puntos son una medida provisional, sin valor monetario, y no aumentan simplemente por responder más.

Las clasificaciones globales son exploratorias porque cada persona puede responder preguntas distintas. Las ligas comparan la intersección de preguntas resueltas que respondieron **todos sus integrantes actuales**, dentro de la semana o mes UTC correspondiente. Un nuevo integrante puede cambiar esa muestra.

## Persistencia y autenticación

### Demo local

Sin variables de Supabase, los datos se guardan en `.data/forecast-league.json`. Las cuentas usan hashes de contraseña con salt y scrypt; las sesiones usan cookies HttpOnly y SameSite. El registro convierte el perfil invitado en una cuenta, preservando sus pronósticos y ligas. Los correos locales no se verifican ni reciben mensajes.

**Este modo es para desarrollo en una red de confianza.** Las cuentas nuevas y los invitados no son administradores. Se conservan los administradores registrados existentes; los antiguos invitados con esa marca dejan de tener permisos efectivos. Para inicializar un administrador en una demo vacía, el operador debe detener el servidor, respaldar el archivo y establecer `isAdmin: true` únicamente en el perfil cuyo `id` corresponda a una cuenta registrada en `accounts`. No existe una API pública para autoconcederse ese rol. La persistencia en archivo está pensada para un único proceso, no para un despliegue público o varias instancias.

Los plazos de cada ronda se fijan al generarla y no cambian al recargar. Las rondas vencidas se conservan; se agregan otras nuevas. Para empezar otra demo cuando expiren, detené el servidor y mové el archivo de datos a una copia de respaldo antes de reiniciar. También podés elegir otro archivo mediante `FORECAST_DATA_PATH`.

### Supabase

El repositorio incluye un adaptador de Supabase Auth, migraciones PostgreSQL, políticas RLS y funciones transaccionales. Configuración:

```sh
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon-o-publishable
```

Seguí la [guía de Supabase](supabase/README.md) para aplicar las migraciones, cargar preguntas de ejemplo, configurar la confirmación por correo y asignar un administrador. Usá únicamente una clave pública; nunca una clave secreta o `service_role`. Reiniciá el servidor después de cambiar la configuración.

El modo conectado no importa automáticamente las cuentas locales ni fabrica participantes. **No se validó contra un proyecto Supabase alojado**: sus pruebas de transporte usan mocks y las de PostgreSQL usan PGlite. La autenticación real, el correo y la configuración del despliegue requieren verificación en el proyecto de destino.

## Arquitectura

| Carpeta | Responsabilidad |
| --- | --- |
| `src/app` | Rutas de Next.js y endpoints HTTP |
| `src/components` | Pantallas, componentes y gráficos |
| `src/domain` | Modelos, validación, puntajes y ejemplos |
| `src/lib` | Utilidades y formatos locales |
| `src/server` | Sesiones, permisos y adaptadores de datos |
| `supabase` | Migración, RLS, funciones SQL y preguntas de ejemplo |
| `tests` | Pruebas de dominio, API, persistencia y autenticación |

El dominio no depende de React ni Next.js, para facilitar su reutilización en un futuro cliente móvil. La interfaz envía solicitudes al servidor; los permisos, plazos, propietarios y puntajes se validan fuera del cliente. Los detalles de API y persistencia están en [la referencia técnica](docs/DEVELOPMENT.md) (en inglés).

Stack: **Next.js + React + TypeScript + Tailwind CSS + Radix UI + Lucide + Recharts + Zod + Supabase**. Las versiones exactas están en `package.json` y `pnpm-lock.yaml`.

## Verificación

```sh
pnpm typecheck
pnpm test
pnpm exec next build --webpack
```

La verificación incluye pruebas unitarias y de integración, chequeo estricto de TypeScript, compilación de producción con Webpack y comprobaciones de PostgreSQL. El harness opcional de base de datos y sus límites se explican en [supabase/README.md](supabase/README.md#authorization-and-verification).

Las pruebas cubren, entre otros casos, Brier, revisiones y cierre, persistencia, propiedad de sesiones, autenticación, ligas, ciclo de preguntas, localización, cupos concurrentes, revisión y publicación, cambios de plan, comunidades, consentimiento y retiro de encuestas, supresión de muestras pequeñas y permisos SQL. La compilación predeterminada también está disponible con `pnpm build`; para ejecutar una compilación terminada, usá `pnpm start`.

## Alcance actual

Es un prototipo funcional, no un servicio operado en producción. Las competencias oficiales tienen una base de esquema, pero todavía no cuentan con inscripción, participantes congelados ni tablas finales. También quedan fuera de esta versión las aplicaciones nativas, pagos, OAuth, recuperación de contraseña, resolución automática de preguntas y un rating de habilidad validado.

El repositorio excluye `.env`, datos locales, sesiones, dependencias instaladas y archivos generados. Publicar el código en GitHub no despliega automáticamente la aplicación.
