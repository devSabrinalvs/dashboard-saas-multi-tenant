/**
 * Custom jest environment that extends jest-environment-jsdom
 * and injects Node.js 22 built-in Web APIs into the jsdom context.
 *
 * Necessário porque jsdom 26 não inclui a Fetch API nem a Web Streams API,
 * e MSW v2 depende de Response/Request/ReadableStream estarem no scope global.
 */
const { TestEnvironment } = require("jest-environment-jsdom");

class FetchJsdomEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();

    // Fetch API (Node.js 22 built-ins — jsdom 26 não inclui)
    if (!this.global.fetch) this.global.fetch = fetch;
    if (!this.global.Response) this.global.Response = Response;
    if (!this.global.Request) this.global.Request = Request;
    if (!this.global.Headers) this.global.Headers = Headers;

    // TextEncoder/TextDecoder (usado por @mswjs/interceptors)
    const { TextEncoder, TextDecoder } = require("util");
    if (!this.global.TextEncoder) this.global.TextEncoder = TextEncoder;
    if (!this.global.TextDecoder) this.global.TextDecoder = TextDecoder;

    // Web Streams API (usado por MSW v2 — stream/web é built-in do Node.js 16+)
    const streams = require("stream/web");
    if (!this.global.ReadableStream) this.global.ReadableStream = streams.ReadableStream;
    if (!this.global.WritableStream) this.global.WritableStream = streams.WritableStream;
    if (!this.global.TransformStream) this.global.TransformStream = streams.TransformStream;

    // BroadcastChannel (worker_threads built-in)
    if (!this.global.BroadcastChannel) {
      const { BroadcastChannel } = require("worker_threads");
      this.global.BroadcastChannel = BroadcastChannel;
    }
  }
}

module.exports = FetchJsdomEnvironment;
