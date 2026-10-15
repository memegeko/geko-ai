/** Decode Ollama's NDJSON immediately, even when JSON lines or UTF-8 cross packets. */
export async function readOllamaReply(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
  signal?: AbortSignal,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const cancel = () => { void reader.cancel().catch(() => {}); };
  const consume = (line: string) => {
    if (!line.trim()) return;
    const chunk = JSON.parse(line);
    if (chunk.error) throw new Error(String(chunk.error));
    if (typeof chunk.message?.content === 'string') onText(chunk.message.content);
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const {value, done} = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      buffer += decoder.decode(value, {stream: true});
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) consume(buffer);
  } finally {
    signal?.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

type RevealOptions = {
  signal?: AbortSignal;
  charactersPerSecond?: number;
  schedule?: (callback: () => void) => unknown;
  cancel?: (handle: unknown) => void;
  now?: () => number;
  hidden?: () => boolean;
};

/** The network and visual queue are independent: large packets never replace the whole reply. */
export function createReplyReveal(onText: (text: string) => void, options: RevealOptions = {}) {
  const schedule = options.schedule || ((callback: () => void) => setTimeout(callback, 12));
  const cancel = options.cancel || ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const now = options.now || (() => performance.now());
  const hidden = options.hidden || (() => typeof document !== 'undefined' && document.hidden);
  const speed = options.charactersPerSecond || 95;
  const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'});
  let received = '', visible = '', last = now(), credit = 0;
  let ended = false, stopped = false, timer: unknown = null;
  let resolve: (value: string) => void;
  const completed = new Promise<string>(done => { resolve = done; });
  const settle = () => {
    options.signal?.removeEventListener('abort', stop);
    resolve(visible);
  };
  function stop() {
    if (stopped) return visible;
    stopped = true;
    if (timer !== null) cancel(timer);
    timer = null;
    settle();
    return visible;
  }
  function tick() {
    timer = null;
    if (stopped) return;
    const current = now();
    // Bound catch-up per tick after a pause; never dump a buffered paragraph on screen.
    const elapsed = Math.min(40, Math.max(0, current - last));
    last = current;
    const backlog = received.length - visible.length;
    credit = Math.min(4, credit + elapsed * Math.min(180, speed + backlog / 8) / 1000);
    let count = Math.floor(credit);
    if (hidden()) count = Infinity;
    if (count > 0 && backlog > 0) {
      let end = visible.length;
      for (const part of segmenter.segment(received.slice(end))) {
        if (count-- <= 0) break;
        end += part.segment.length;
      }
      credit = Math.max(0, credit - Math.floor(credit));
      visible = received.slice(0, end);
      onText(visible);
    }
    if (ended && visible === received) { stopped = true; settle(); }
    else if (visible !== received) timer = schedule(tick);
    else credit = 0;
  }
  function wake() {
    if (timer === null && !stopped) { last = now(); credit = 0; timer = schedule(tick); }
  }
  options.signal?.addEventListener('abort', stop, {once: true});
  if (options.signal?.aborted) stop();
  return {
    append(text: string) { if (stopped || ended || !text) return; received += text; wake(); },
    finish() {
      ended = true;
      if (visible === received && !stopped) { stopped = true; settle(); }
      else wake();
      return completed;
    },
    stop,
    get text() { return visible; },
  };
}
