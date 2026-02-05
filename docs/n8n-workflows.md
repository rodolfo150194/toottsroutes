# Workflows n8n - Integracion Chatwoot

Guia para integrar Chatwoot (self-hosted) con n8n para respuestas automaticas de IA.

---

## Arquitectura

```
Usuario -> Widget Chatwoot -> Chatwoot Server -> Agent Bot Webhook -> n8n
                                                                      |
                                                              AI Agent (Sofia)
                                                              Ollama + Postgres
                                                                      |
                                                              Chatwoot API <-
                                                                      |
Usuario <- Widget Chatwoot <- Chatwoot Server <-----------------------
```

---

## Configuracion previa en Chatwoot

### 1. Crear Website Inbox
- Settings > Inboxes > Add Inbox > Website
- Website Name: `Rootts & Routes`
- Website URL: `https://tudominio.com`
- Widget Color: `#6FB63F` (verde-global)
- Welcome Title: `Hola! Bienvenido a Rootts & Routes`
- Welcome Tagline: `Nuestro equipo te atendera en minutos`
- Guardar y copiar el **Website Token**

### 2. Crear Agent Bot
Ejecutar via API de Chatwoot (no hay UI para bots en todas las versiones):

```bash
curl -X POST "https://chatwoot.tudominio.com/platform/api/v1/agent_bots" \
  -H "api_access_token: TU_PLATFORM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sofia - Asesora de Envios",
    "description": "Agente IA para atencion al cliente",
    "outgoing_url": "https://n8n.gvoltscorp.cloud/webhook/chatwoot-bot",
    "account_id": 1
  }'
```

Alternativamente, si tu version de Chatwoot tiene UI para bots:
- Settings > Account > Agent Bots
- Name: Sofia
- Outgoing URL: `https://n8n.gvoltscorp.cloud/webhook/chatwoot-bot`

### 3. Asignar Bot al Inbox
```bash
curl -X POST "https://chatwoot.tudominio.com/api/v1/accounts/{account_id}/agent_bots" \
  -H "api_access_token: TU_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_bot_id": BOT_ID,
    "inbox_id": INBOX_ID
  }'
```

### 4. Obtener API Access Token
- Settings > Account > Access Token
- O crear uno dedicado para n8n

### 5. Configurar agentes humanos
- Settings > Agents > agregar agentes reales para handoff
- Cuando el bot no pueda resolver, reasigna a un agente humano

---

## Workflow 1: Chatwoot Bot (Principal)

**Nombre:** `chatwoot-bot`
**Webhook path:** `/webhook/chatwoot-bot`
**Proposito:** Recibir mensajes de Chatwoot, procesar con IA, responder.

### Nodos

#### 1. Webhook
- Type: `n8n-nodes-base.webhook`
- Method: POST
- Path: `chatwoot-bot`
- Response Mode: "Immediately" (Chatwoot no espera respuesta del webhook)

#### 2. IF - Filtrar mensajes
Solo procesar mensajes entrantes del usuario (no los del bot ni eventos de sistema):

- Condicion 1: `{{ $json.body.event }}` equals `message_created`
- Condicion 2: `{{ $json.body.message_type }}` equals `incoming`
- Condicion 3: `{{ $json.body.content_type }}` equals `text` (opcional)

Si alguna condicion falla -> No hacer nada (evita loops infinitos).

IMPORTANTE: Sin este filtro, el bot responderia a sus propios mensajes
creando un loop infinito.

#### 3. AI Agent
- Type: `@n8n/n8n-nodes-langchain.agent`
- Prompt: `{{ $json.body.content }}`
- System Message: (copiar del workflow actual `chat-roots-routes`)

El system prompt de Sofia ya incluye:
- Personalidad y tono en espanol
- Instrucciones para consultar la BD
- Tablas disponibles (customers, shipments, quotes, etc.)
- Reglas de seguridad SQL (solo SELECT)
- Manejo de situaciones

Sub-nodos conectados al AI Agent:
- **Ollama Chat Model** (deepseek-v3.1:671b)
- **Postgres Tool** (Execute SQL query)
- **Postgres Chat Memory** (usando conversation_id de Chatwoot como session key)
  - Session Key: `={{ $json.body.conversation.id }}`

#### 4. Code - Limpiar respuesta
- Type: `n8n-nodes-base.code`
```javascript
const respuesta = $json.output || $json.text || $json.response || '';

let limpia = respuesta
  .replace(/\*\*/g, '')
  .replace(/#{1,6}\s/g, '')
  .replace(/`{1,3}/g, '')
  .replace(/^\* /gm, '- ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

// Datos de la conversacion original
const body = $('Webhook').item.json.body;

return {
  response: limpia,
  account_id: body.account.id,
  conversation_id: body.conversation.id,
};
```

#### 5. HTTP Request - Enviar respuesta a Chatwoot
- Type: `n8n-nodes-base.httpRequest`
- Method: POST
- URL: `https://chatwoot.tudominio.com/api/v1/accounts/{{ $json.account_id }}/conversations/{{ $json.conversation_id }}/messages`
- Headers:
  - `api_access_token`: `TU_CHATWOOT_API_TOKEN` (usar credencial de n8n)
  - `Content-Type`: `application/json`
- Body (JSON):
```json
{
  "content": "{{ $json.response }}",
  "message_type": "outgoing",
  "private": false
}
```

#### 6. (Opcional) Error Handler - Handoff a humano
Si el AI Agent falla o la respuesta es vacia:
- **HTTP Request** - Cambiar asignacion de la conversacion
  - Method: POST
  - URL: `https://chatwoot.tudominio.com/api/v1/accounts/{{ $json.account_id }}/conversations/{{ $json.conversation_id }}/assignments`
  - Body: `{ "assignee_id": ID_AGENTE_HUMANO }`

### Conexiones
```
Webhook -> IF (filtrar incoming) -> AI Agent -> Code (limpiar)
                                                    |
                                            HTTP Request (responder a Chatwoot)
                                                    |
                                         (si error) -> HTTP Request (handoff)
```

---

## Workflow 2: Mejora de Cotizaciones (Existente)

**Workflow:** `chat-roots-routes` (ID: HSqIAldkZUaY9mgAb8YdD)
**Cambio:** Ya no se usa directamente desde el frontend. Se puede reutilizar
como base para el workflow de Chatwoot (copiar nodos AI Agent, Ollama, Postgres).

Alternativamente, agregar al AI Agent del workflow chatwoot-bot:
- Segundo Postgres Tool para INSERT en tabla `quotes`
- Instrucciones en el system prompt para generar cotizaciones

Agregar al system prompt:
```
## Creacion de Cotizaciones
Cuando el cliente solicite una cotizacion formal y tengas toda la informacion:
1. Busca las tarifas aplicables en shipping_rates
2. Calcula los surcharges obligatorios
3. Genera un numero de cotizacion: COT-YYYY-XXXXXX
4. Inserta la cotizacion en la tabla quotes
5. Comunica al cliente el numero de cotizacion y el precio total
```

---

## Variables de entorno

### En el proyecto Astro (.env):
```
N8N_WEBHOOK_URL=https://n8n.gvoltscorp.cloud/webhook/chatwoot-bot
PUBLIC_CHATWOOT_BASE_URL=https://chatwoot.tudominio.com
PUBLIC_CHATWOOT_WEBSITE_TOKEN=token-del-inbox
```

### En n8n (credenciales):
- **Chatwoot API Token**: Para enviar mensajes y gestionar conversaciones
- **Postgres**: Conexion a la BD de negocio (ya configurada)
- **Ollama**: URL del servidor Ollama (ya configurada)

---

## Prevencion de loops

El punto mas critico es evitar que el bot responda a sus propios mensajes.
Filtros obligatorios en el nodo IF:

1. `event === "message_created"` - Solo mensajes nuevos
2. `message_type === "incoming"` - Solo mensajes del usuario
3. Opcionalmente: `sender.type === "contact"` - Excluir mensajes de agentes

Si por alguna razon el filtro falla, Chatwoot tiene un rate limit interno,
pero es mejor prevenirlo en n8n.

---

## Diferencias vs. implementacion anterior

| Antes (custom) | Ahora (Chatwoot) |
|---|---|
| FloatingChat.astro en el frontend | Widget SDK de Chatwoot |
| /api/chat proxy a n8n | Chatwoot Agent Bot webhook a n8n |
| localStorage para historial | Chatwoot almacena todo |
| Admin panel custom | Dashboard de Chatwoot |
| Ratings custom | CSAT nativo de Chatwoot |
| Handoff por email | Reasignacion a agente en Chatwoot |
| Session ID generado en JS | Conversation ID de Chatwoot |
