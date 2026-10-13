# Forecast League

**Pronosticá el futuro. Competí con amigos. Aprendé a pensar en probabilidades.**

Forecast League es un prototipo de plataforma social de pronósticos: respondés preguntas sobre eventos futuros con una probabilidad, revisás tus predicciones antes del cierre y comparás tu precisión cuando se conoce el resultado. Combina competencia amistosa, estadísticas personales y consenso colectivo, sin apuestas, dinero, contratos negociables ni monedas virtuales.

La aplicación está en español de Argentina, con diseño adaptable a celulares, tipografía amplia y acento ocre **`#CC7722`**. Este repositorio comparte el código y el proceso de desarrollo asistido por **Codex**, desde el brief inicial hasta las iteraciones de producto, diseño y contenido.

## Qué se puede hacer

- Explorar una landing pública, registrarse e iniciar sesión.
- Pronosticar preguntas diarias, semanales, mensuales y de largo plazo con probabilidades del 1 % al 99 %.
- Agregar un razonamiento y revisar la probabilidad antes del cierre, conservando cada versión.
- Desbloquear el consenso de una pregunta después de responder: promedio, distribución e historial.
- Consultar precisión, calibración, historial y clasificaciones globales o por país.
- Crear ligas privadas, invitar amigos mediante código o enlace y comparar preguntas compartidas.
- Administrar preguntas: crear borradores, publicar, cerrar, resolver o anular.

La demo incluye nueve escenarios argentinos sobre clima en Córdoba, CABA, Mendoza y Rosario, dólar oficial, inflación, exportaciones, energías renovables y un amistoso ficticio de la Selección. **Son simulaciones, no noticias, cotizaciones ni pronósticos actuales.** Los enlaces a organismos sirven como referencias temáticas. Los perfiles y pronósticos precargados también están identificados como ficticios.

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
| `/admin` | Administración de preguntas |

Probá el recorrido completo: abrí una pregunta, leé sus criterios, enviá una probabilidad, observá el consenso y recargá. Tu pronóstico persiste. Podés revisarlo mientras la pregunta siga abierta. En la demo, el código **FUTURE** permite entrar a una liga de ejemplo.

El servidor de desarrollo escucha en `0.0.0.0`. Para probarlo desde un celular conectado a la misma red, usá `http://IP_LOCAL_DE_TU_COMPUTADORA:3000`.

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

**Este modo es para desarrollo en una red de confianza:** todos los perfiles locales tienen acceso a la administración para explorar el ciclo completo. La persistencia en archivo está pensada para un único proceso, no para un despliegue público o varias instancias.

Los plazos de los ejemplos se fijan al generarlos y no se renuevan al recargar. Para empezar otra demo cuando expiren, detené el servidor y mové el archivo de datos a una copia de respaldo antes de reiniciar. También podés elegir otro archivo mediante `FORECAST_DATA_PATH`.

### Supabase

El repositorio incluye un adaptador de Supabase Auth, migraciones PostgreSQL, políticas RLS y funciones transaccionales. Configuración:

```sh
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon-o-publishable
```

Seguí la [guía de Supabase](supabase/README.md) para aplicar la migración, cargar preguntas de ejemplo, configurar la confirmación por correo y asignar un administrador. Usá únicamente una clave pública; nunca una clave secreta o `service_role`. Reiniciá el servidor después de cambiar la configuración.

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

Durante el desarrollo se completaron **28 pruebas unitarias y de integración**, el chequeo estricto de TypeScript, una compilación de producción con Webpack y **11 comprobaciones de PostgreSQL**. El harness opcional de base de datos y sus límites se explican en [supabase/README.md](supabase/README.md#authorization-and-verification).

Las pruebas cubren, entre otros casos, Brier, revisiones y cierre, persistencia, propiedad de sesiones, autenticación, ligas, ciclo de preguntas, localización y permisos SQL. La compilación predeterminada también está disponible con `pnpm build`; para ejecutar una compilación terminada, usá `pnpm start`.

## Alcance actual

Es un prototipo funcional, no un servicio operado en producción. Las competencias oficiales tienen una base de esquema, pero todavía no cuentan con inscripción, participantes congelados ni tablas finales. También quedan fuera de esta versión las aplicaciones nativas, pagos, OAuth, recuperación de contraseña, resolución automática de preguntas y un rating de habilidad validado.

El repositorio excluye `.env`, datos locales, sesiones, dependencias instaladas y archivos generados. Publicar el código en GitHub no despliega automáticamente la aplicación.
