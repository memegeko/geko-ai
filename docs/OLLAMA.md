# Connecting Ollama

geko.ai's server calls Ollama's `/api/tags` and `/api/chat` endpoints. The browser
does not contact Ollama directly, so browser CORS changes are unnecessary.
Only the configured application administrator can change this connection.

## Standalone server

Install Ollama on a machine with enough resources, pull a model, and keep the
service running. Model names must match the installed tag exactly.

```bash
ollama pull qwen3:8b
```

In **Settings**, enter an endpoint reachable from the application server:

| Location | Example URL |
| --- | --- |
| Native app and Ollama on the same host | `http://127.0.0.1:11434` |
| App in Docker, Ollama on its Linux host | `http://host.docker.internal:11434` |
| Ollama on another LAN host | `http://192.168.1.20:11434` |
| Authenticated remote gateway | `https://ollama.example.com` |

Compose includes the Linux `host.docker.internal` mapping. Ollama must listen
on an interface reachable from the container; binding Ollama only to host
loopback generally prevents that connection. Expose it only to the needed
private interface/network and firewall it. Do not expose unauthenticated
Ollama to the internet. For Docker-to-Docker use a private Docker network and
the Ollama service name.

Enter an optional gateway bearer token, choose **Test connection**, select a
model, and save. Leaving the token blank preserves the saved token; use
**Remove saved gateway token** to clear it.

Private HTTP endpoints are permitted by default in standalone mode. Set
`ALLOW_PRIVATE_OLLAMA=false` to require the hosted-style public HTTPS policy.
URLs with embedded credentials, query strings, fragments, or non-HTTP schemes
are rejected. Use the bearer token field rather than embedding a password.

## Hosted Sites adapter

The platform-hosted adapter still needs a reachable public HTTPS gateway.
Its server cannot reach a private LAN or Tailscale-only endpoint automatically.
Forward `/api/tags` and `/api/chat` through an authenticated proxy or tunnel.

## Streaming and generation

Ollama must support streaming NDJSON responses. Disable proxy buffering and
caching; preserve streaming content and allow model warm-up. Upstream chat
requests time out after 120 seconds; model-list checks after 15 seconds.

Creativity controls model temperature (including 0), and the context selector
sets `num_ctx` between supported limits. The app sends a repeat penalty and
character/context instructions. It does not fine-tune the model.

| Problem | Investigation |
| --- | --- |
| Connection refused | Ollama listener, host/container address, firewall, service state. |
| HTTP 401/403 | Proxy token and permitted routes. |
| No model | Pull a model and check the exact tag. |
| Slow first reply | Model loading, available VRAM/RAM, GPU support, timeout. |
| One large reply packet | Proxy buffering; app still reveals text progressively. |
| Repetitive replies | Model suitability, definition examples, persona, context size, creativity. |

Test with a real conversation after setup. Automated tests mock upstream model
responses and cannot certify the quality or reachability of a specific server.
