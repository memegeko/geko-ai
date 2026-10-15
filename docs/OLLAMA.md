# Connect Ollama

The application is ready to call a separately hosted Ollama server. No Ollama
installation, model download, or home-network change was performed as part of
this source release.

## Connection contract

geko.ai expects an HTTPS gateway exposing the native Ollama routes:

| Route | Use |
| --- | --- |
| `GET /api/tags` | Discover installed model tags and test access. |
| `POST /api/chat` | Stream chat replies as newline-delimited JSON. |

Run Ollama on your machine and install a model that fits its available memory.
For example, after choosing a model appropriate to your hardware:

```bash
ollama pull MODEL_TAG
```

Forward your chosen HTTPS hostname to Ollama, commonly port 11434, through a
reverse proxy or tunnel. If your gateway uses a bearer token, enter that token
in the app's connection settings. Preserve streaming at the proxy: avoid
collecting the whole upstream body, caching chat responses, or buffering the
response until generation finishes.

## Configure the app

1. Sign in as the space owner and open **Settings**.
2. Enter the HTTPS gateway's base URL, without `/api/chat`, a query string,
   embedded credentials, or a fragment.
3. Enter the optional bearer token. It is stored only on the server.
4. Choose **Test connection** to load your installed model tags.
5. Select a model, review creativity and context size, and save.
6. Open a conversation and send a message. For an already saved personal
   message, choose **Reply**. In a shared group, select an AI and choose **Reply**.

Leaving the token field blank preserves an existing saved token. Use **Remove
saved gateway token** to clear it deliberately. The creativity value 0 is
supported and is saved as 0.

The current public source contains no gateway URL, token, user database, or
real home-model configuration.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| URL rejected | Use HTTPS. LAN, loopback, embedded credentials, query strings, and fragments are rejected. |
| Gateway cannot be reached | A hosted Worker needs a reachable HTTPS endpoint. A private LAN or Tailscale-only address is insufficient. |
| HTTP 401 or 403 | Verify the gateway's authentication policy and bearer token. |
| HTTP 404 | Check that the base URL forwards `/api/tags` and `/api/chat`. |
| No models listed | Confirm the model is installed in the Ollama instance behind this gateway. |
| Entire reply arrives at once | Check reverse-proxy buffering. The client also smooths received chunks with a progressive reveal queue. |
| Empty reply or repeated phrases | Check the model, character definition, and available context. The interface cannot substitute for model quality. |
| Long first-response delay | The model may be loading. The app shows a waiting indicator and supports cancellation. |

Requests originate on the app server, so browser CORS exceptions are not needed.
The gateway token is never included in client-side JavaScript or returned by
the app's configuration API.
