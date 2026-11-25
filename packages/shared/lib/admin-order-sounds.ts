/** New-order alert sounds, synthesised with Web Audio so there is no audio file to host or license. */
export type OrderSound = { id: string; label: string; play: (ctx: BaseAudioContext, at?: number) => void };

function bell(ctx: BaseAudioContext, out: AudioNode, at: number, freq: number, decay: number, level = 0.5) {
  // Inharmonic partials are what make it sound struck metal instead of a flute.
  [1, 2.76, 5.4].forEach((partial, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq * partial;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level / (i + 1), at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay / (i + 1));
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.1);
  });
}

/** Short filtered noise burst: the mechanical "ka" of a till drawer. */
function click(ctx: BaseAudioContext, out: AudioNode, at: number) {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (((i * 9301 + 49297) % 233280) / 233280 * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = 3200;
  gain.gain.value = 0.9;
  src.connect(filter).connect(gain).connect(out);
  src.start(at);
}

function output(ctx: BaseAudioContext, level = 0.7) {
  const out = ctx.createGain();
  out.gain.value = level;
  out.connect(ctx.destination);
  return out;
}

export const ORDER_SOUNDS: OrderSound[] = [
  {
    id: "cash",
    label: "Cash register (ka-ching)",
    play(ctx, at = ctx.currentTime) {
      const out = output(ctx, 0.65);
      click(ctx, out, at);
      bell(ctx, out, at + 0.04, 2093, 1.5);
      bell(ctx, out, at + 0.17, 3136, 1.7);
      [5200, 6100, 4800, 6600].forEach((f, i) => bell(ctx, out, at + 0.34 + i * 0.07, f, 0.25, 0.12));
    },
  },
  {
    id: "bell",
    label: "Bell",
    play(ctx, at = ctx.currentTime) {
      bell(ctx, output(ctx), at, 1318.5, 2.2);
    },
  },
  {
    id: "chime",
    label: "Rising chime",
    play(ctx, at = ctx.currentTime) {
      const out = output(ctx);
      [1046.5, 1318.5, 1568].forEach((f, i) => bell(ctx, out, at + i * 0.13, f, 1.2));
    },
  },
  {
    id: "dingdong",
    label: "Ding dong",
    play(ctx, at = ctx.currentTime) {
      const out = output(ctx);
      bell(ctx, out, at, 987.8, 1.4);
      bell(ctx, out, at + 0.5, 740, 1.8);
    },
  },
  {
    id: "alert",
    label: "Double beep (loud)",
    play(ctx, at = ctx.currentTime) {
      const out = output(ctx, 0.8);
      [0, 0.28].forEach((dt) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, at + dt);
        gain.gain.exponentialRampToValueAtTime(0.6, at + dt + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + dt + 0.2);
        osc.connect(gain).connect(out);
        osc.start(at + dt);
        osc.stop(at + dt + 0.25);
      });
    },
  },
];

export const DEFAULT_ORDER_SOUND = "cash";

export function orderSoundById(id: string | null | undefined): OrderSound {
  return ORDER_SOUNDS.find((s) => s.id === id) ?? ORDER_SOUNDS[0];
}
