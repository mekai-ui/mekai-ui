"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type GrainientProps = {
  /** Two to four hex colors that blend into each other. */
  colors?: string[];
  /** Morph speed multiplier. */
  speed?: number;
  /** Film grain amount, from 0 to 1. */
  grain?: number;
  /** How much the color fields bend and swirl, from 0 to 1. */
  warp?: number;
  /** Any number. Each seed gives a different, stable composition. */
  seed?: number;
  /** Let the colors lean toward the pointer. */
  mouseReact?: boolean;
  /** Render resolution, from 0.25 to 1. Lower is cheaper. */
  quality?: number;
  className?: string;
};

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uClock;
uniform vec2 uPointer;
uniform float uHover;
uniform vec3 uColors[4];
uniform vec4 uPoints[4];
uniform float uCount;
uniform float uGrain;
uniform float uWarp;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.15;

  // Bend space before blending, so the color fields swirl instead of sitting as round blobs.
  vec2 w = p;
  // Space bulges toward the pointer, so the nearest colors lean in to follow it.
  vec2 m = vec2(uPointer.x * aspect, uPointer.y);
  vec2 toPointer = w - m;
  w -= toPointer * 0.35 * exp(-dot(toPointer, toPointer) * 9.0) * uHover;
  w += uWarp * 0.28 * vec2(sin(p.y * 3.0 + t * 2.0), cos(p.x * 2.6 - t * 1.6));
  w += uWarp * 0.12 * vec2(sin(w.y * 6.0 - t * 2.4), cos(w.x * 5.2 + t * 2.0));

  vec3 col = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uCount) break;
    vec4 pt = uPoints[i];
    vec2 center = vec2(pt.x * aspect, pt.y);
    center += vec2(cos(t * pt.z + pt.w) * 0.22 * aspect, sin(t * (pt.z * 0.8 + 0.3) + pt.w * 1.7) * 0.2);
    vec2 d = w - center;
    float weight = 1.0 / (pow(dot(d, d), 1.25) + 0.003);
    col += uColors[i] * weight;
    total += weight;
  }
  col /= total;

  col *= 0.86 + 0.14 * (1.0 - smoothstep(0.2, 0.95, length(uv - 0.5)));
  // Grain refreshes at film rate (24 fps), not every frame.
  float g = hash(gl_FragCoord.xy + floor(uClock * 24.0) * 17.31) - 0.5;
  col += g * uGrain * 0.2;
  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToVec3(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Small seeded random generator, so the same seed always gives the same layout. */
function seededRandom(seed: number) {
  let a = Math.floor(seed * 9973) ^ 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createProgram(gl: WebGLRenderingContext, fragment: string) {
  const program = gl.createProgram();
  const shaders: WebGLShader[] = [];
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader || !program) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      return null;
    }
    gl.attachShader(program, shader);
    shaders.push(shader);
  }
  if (!program) return null;
  gl.linkProgram(program);
  for (const shader of shaders) gl.deleteShader(shader);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/** Releases the GPU context once the canvas has really left the page (not on a Strict Mode re-run). */
function releaseLater(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
  window.setTimeout(() => {
    if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }, 0);
}

const DEFAULT_COLORS = ["#ff784f", "#ffc24a", "#e2552b", "#2d2824"];

/** A grainy gradient mesh of up to four colors that slowly morph into each other. */
export function Grainient({
  colors = DEFAULT_COLORS,
  speed = 1,
  grain = 0.35,
  warp = 0.5,
  seed = 1,
  mouseReact = true,
  quality = 1,
  className = "",
}: GrainientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  // A string key keeps the effect stable when the parent passes a new array with the same colors.
  const palette = (colors.length >= 2 ? colors : DEFAULT_COLORS).slice(0, 4).join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const list = palette.split(",");
    const fallback = `linear-gradient(135deg, ${list.join(", ")})`;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    const program = gl ? createProgram(gl, FRAGMENT) : null;
    if (!gl || !program) {
      canvas.style.background = fallback;
      return;
    }
    canvas.style.background = "";

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform("uRes");
    const uTime = uniform("uTime");
    const uClock = uniform("uClock");
    const uPointer = uniform("uPointer");
    const uHover = uniform("uHover");
    const rgb = new Float32Array(12);
    list.forEach((hex, i) => rgb.set(hexToVec3(hex), i * 3));
    gl.uniform3fv(uniform("uColors"), rgb);
    // Each color point: resting x and y, drift speed and phase, all from the seed.
    const random = seededRandom(seed);
    const points = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      points.set([0.12 + random() * 0.76, 0.12 + random() * 0.76, 0.6 + random() * 0.9, random() * Math.PI * 2], i * 4);
    }
    gl.uniform4fv(uniform("uPoints"), points);
    gl.uniform1f(uniform("uCount"), list.length);
    gl.uniform1f(uniform("uGrain"), Math.min(1, Math.max(0, grain)));
    gl.uniform1f(uniform("uWarp"), Math.min(1, Math.max(0, warp)));

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, hover: 0, target: 0 };
    let time = 10;
    let clock = 0;
    let last = 0;
    let frame = 0;
    let visible = true;
    let lost = false;

    const render = (t: number) => {
      if (lost) return;
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      if (!reduce) {
        time += (dt / 1000) * speed;
        clock += dt / 1000;
        const k = Math.min(1, dt * 0.004);
        pointer.x += (pointer.tx - pointer.x) * k;
        pointer.y += (pointer.ty - pointer.y) * k;
        pointer.hover += (pointer.target - pointer.hover) * Math.min(1, dt * 0.002);
      }
      gl.uniform1f(uTime, time % 3600);
      gl.uniform1f(uClock, clock % 3600);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform1f(uHover, pointer.hover);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce && visible) frame = requestAnimationFrame(render);
      else frame = 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.min(1, Math.max(0.25, quality));
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      if (reduce) render(0);
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      if (inside) {
        pointer.tx = x;
        pointer.ty = y;
        if (pointer.hover < 0.05) {
          pointer.x = x;
          pointer.y = y;
        }
      }
      pointer.target = inside ? 1 : 0;
    };
    const onLost = () => {
      lost = true;
      cancelAnimationFrame(frame);
      canvas.style.background = fallback;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce && !frame && !lost) {
        last = 0;
        frame = requestAnimationFrame(render);
      }
    });
    io.observe(canvas);
    canvas.addEventListener("webglcontextlost", onLost);
    if (!reduce) {
      if (mouseReact) window.addEventListener("pointermove", onMove, { passive: true });
      frame = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      releaseLater(gl, canvas);
    };
  }, [palette, speed, grain, warp, seed, mouseReact, quality, reduce]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 block size-full ${className}`}
      aria-hidden="true"
    />
  );
}
