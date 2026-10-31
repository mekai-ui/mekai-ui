"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type PlasmaProps = {
  /** Three hex colors the field cycles through. */
  colors?: [string, string, string];
  /** Flow speed multiplier. */
  speed?: number;
  /** Size of the plasma cells. Larger values make broader shapes. */
  scale?: number;
  /** Overall opacity, from 0 to 1. */
  opacity?: number;
  /** Strength of the lens that follows the pointer, from 0 to 1. */
  lens?: number;
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
uniform vec2 uPointer;
uniform float uHover;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform float uScale;
uniform float uLens;

// Loops through the three colors, so the field never shows a seam.
vec3 palette(float x) {
  x = fract(x) * 3.0;
  if (x < 1.0) return mix(uC0, uC1, smoothstep(0.0, 1.0, x));
  if (x < 2.0) return mix(uC1, uC2, smoothstep(0.0, 1.0, x - 1.0));
  return mix(uC2, uC0, smoothstep(0.0, 1.0, x - 2.0));
}

void main() {
  float unit = min(uRes.x, uRes.y);
  vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / unit;
  vec2 m = (uPointer * uRes - 0.5 * uRes) / unit;

  // Lens: sample closer to the pointer, which magnifies the field under it.
  vec2 d = q - m;
  float r2 = dot(d, d);
  float lens = uLens * uHover * exp(-r2 / 0.07);
  q = m + d * (1.0 - 0.55 * lens);

  vec2 p = q * (6.0 / uScale);
  float t = uTime;
  float v = sin(p.x + t);
  v += sin((p.y + t) * 0.8);
  v += sin((p.x + p.y + t * 0.7) * 0.7);
  vec2 c = p + vec2(sin(t * 0.33) * 2.2, cos(t * 0.5) * 2.2);
  v += sin(sqrt(dot(c, c) + 1.0) * 1.3 + t);
  v *= 0.25;

  vec3 col = palette(v * 0.9 + t * 0.03);
  // Darker troughs give the field depth instead of a flat gradient.
  col *= 0.2 + 0.8 * smoothstep(-0.7, 0.9, sin(v * 6.0 + t * 0.6));
  // A faint bright rim around the lens.
  float ring = (sqrt(r2) - 0.26) * 22.0;
  col += uLens * uHover * 0.18 * exp(-ring * ring) * mix(uC1, vec3(1.0), 0.5);

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToVec3(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
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

/** A flowing plasma color field. The pointer warps it like a lens. */
export function Plasma({
  colors = ["#ff784f", "#ffc24a", "#e2552b"],
  speed = 1,
  scale = 1,
  opacity = 1,
  lens = 0.7,
  quality = 1,
  className = "",
}: PlasmaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [c0 = "#ff784f", c1 = "#ffc24a", c2 = "#e2552b"] = colors;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fallback = `linear-gradient(120deg, ${c0}, ${c1} 50%, ${c2})`;
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
    const uPointer = uniform("uPointer");
    const uHover = uniform("uHover");
    gl.uniform3f(uniform("uC0"), ...hexToVec3(c0));
    gl.uniform3f(uniform("uC1"), ...hexToVec3(c1));
    gl.uniform3f(uniform("uC2"), ...hexToVec3(c2));
    gl.uniform1f(uniform("uScale"), Math.max(0.1, scale));
    gl.uniform1f(uniform("uLens"), Math.min(1, Math.max(0, lens)));

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, hover: 0, target: 0 };
    let time = 10;
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
        const k = Math.min(1, dt * 0.008);
        pointer.x += (pointer.tx - pointer.x) * k;
        pointer.y += (pointer.ty - pointer.y) * k;
        pointer.hover += (pointer.target - pointer.hover) * Math.min(1, dt * 0.004);
      }
      gl.uniform1f(uTime, time % 3600);
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
        // Jump the lens in place when entering, instead of sliding in from the last spot.
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
      window.addEventListener("pointermove", onMove, { passive: true });
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
  }, [c0, c1, c2, speed, scale, lens, quality, reduce]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 block size-full ${className}`}
      style={{ opacity: Math.min(1, Math.max(0, opacity)) }}
      aria-hidden="true"
    />
  );
}
