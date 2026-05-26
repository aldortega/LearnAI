// AudioWorkletProcessor: reproduce PCM16 mono (24 kHz) en orden FIFO.
// Acepta { type: 'push', buffer: ArrayBuffer } y { type: 'flush' }.

class PlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.current = null;
    this.offset = 0;
    this.port.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === "push" && data.buffer instanceof ArrayBuffer) {
        const view = new Int16Array(data.buffer);
        const float = new Float32Array(view.length);
        for (let i = 0; i < view.length; i += 1) {
          const sample = view[i];
          float[i] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
        }
        this.queue.push(float);
      } else if (data && data.type === "flush") {
        this.queue = [];
        this.current = null;
        this.offset = 0;
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0] && outputs[0][0];
    if (!output) return true;

    let outIdx = 0;
    while (outIdx < output.length) {
      if (!this.current) {
        this.current = this.queue.shift() || null;
        this.offset = 0;
      }
      if (!this.current) {
        output[outIdx++] = 0;
        continue;
      }
      const remaining = this.current.length - this.offset;
      const writable = Math.min(remaining, output.length - outIdx);
      output.set(
        this.current.subarray(this.offset, this.offset + writable),
        outIdx,
      );
      this.offset += writable;
      outIdx += writable;
      if (this.offset >= this.current.length) {
        this.current = null;
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("voice-player", PlayerProcessor);
