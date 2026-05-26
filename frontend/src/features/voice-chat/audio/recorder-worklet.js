// AudioWorkletProcessor: capta audio del microfono, lo remuestrea a 16 kHz
// mono y emite chunks PCM16 mediante postMessage.

const TARGET_SAMPLE_RATE = 16000;
const FRAME_SAMPLES = 1024;

class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.resampleRatio = sampleRate / TARGET_SAMPLE_RATE;
    this.resamplePos = 0;
    this.lastSample = 0;
    this.muted = false;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "mute") {
        this.muted = Boolean(event.data.muted);
      }
    };
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;
    if (this.muted) return true;

    let pos = this.resamplePos;
    const ratio = this.resampleRatio;
    let last = this.lastSample;

    while (pos < channel.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const a = i === 0 ? last : channel[i - 1] || 0;
      const b = channel[i] !== undefined ? channel[i] : a;
      const sample = a + (b - a) * frac;
      this.buffer.push(sample);
      pos += ratio;
    }

    this.resamplePos = pos - channel.length;
    this.lastSample = channel[channel.length - 1] !== undefined
      ? channel[channel.length - 1]
      : last;

    while (this.buffer.length >= FRAME_SAMPLES) {
      const frame = this.buffer.splice(0, FRAME_SAMPLES);
      const pcm = new Int16Array(frame.length);
      for (let i = 0; i < frame.length; i += 1) {
        const clamped = Math.max(-1, Math.min(1, frame[i]));
        pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }

    return true;
  }
}

registerProcessor("voice-recorder", RecorderProcessor);
