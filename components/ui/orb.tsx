"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type OrbProps = {
  /** Orb color as a hex value. */
  color?: string;
  /** Diameter as a share of the shorter side, from 0.2 to 1. */
  size?: number;
  /** How much the orb distorts and brightens under the pointer, from 0 to 1. */
  hoverIntensity?: number;
  /** Spin the swirling surface faster while hovered. */
  rotateOnHover?: boolean;
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
uniform vec3 uColor;
uniform float uSize;
uniform float uHover;
uniform float uSpin;

void main() {
  float unit = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / unit;
  float t = uTime;
  float hover = uHover;

  // Breathing radius, and a liquid wobble while hovered.
  float radius = 0.5 * uSize * (1.0 + 0.025 * sin(t * 1.4) + 0.03 * hover);
  p += hover * 0.016 * vec2(sin(p.y * 22.0 + t * 5.0), cos(p.x * 22.0 + t * 4.3));
  float r = length(p) / radius;
  float a = atan(p.y, p.x + 1e-5) + uSpin;

  // Swirling bands: the angle is twisted more toward the rim.
  float swirl = a + r * 2.6 - t * 0.4;
  float bands = 0.5 + 0.25 * sin(swirl * 3.0 + sin(r * 7.0 - t * 1.3) * 1.4) + 0.15 * sin(swirl * 5.0 - t * 0.9 + r * 4.0);

  vec3 deep = uColor * 0.3;
  vec3 hot = mix(uColor, vec3(1.0, 0.93, 0.86), 0.55);
  float rim = pow(clamp(r, 0.0, 1.0), 4.0);
  vec3 inner = mix(deep, uColor, bands);
  inner += hot * (rim * 0.85 + pow(bands, 4.0) * 0.45);
  inner += hot * (1.0 - smoothstep(0.0, 0.6, r)) * 0.3;
  inner *= 1.0 + 0.45 * hover;

  float body = 1.0 - smoothstep(0.97, 1.0, r);
  float glow = exp(-max(r - 1.0, 0.0) * 4.5) * (0.5 + 0.35 * hover + 0.07 * sin(t * 1.4));
  float alpha = clamp(body + glow * (1.0 - body), 0.0, 1.0);
  vec3 col = inner * body + uColor * glow * (1.0 - body);
  // Premultiplied output: color can never exceed its alpha.
  gl_FragColor = vec4(min(col, vec3(alpha)), alpha);
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

/** A glowing, breathing energy orb with a swirling surface that brightens and wobbles under the pointer. */
export function Orb({
  color = "#ff784f",
  size = 0.6,
  hoverIntensity = 0.6,
  rotateOnHover = true,
  quality = 1,
  className = "",
}: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const [r, g, b] = hexToVec3(color);
    const tone = (a: number) => `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
    const diameter = Math.min(1, Math.max(0.2, size));
    const fallback = `radial-gradient(circle closest-side, ${tone(1)} 0%, ${tone(0.9)} ${diameter * 80}%, ${tone(0.25)} ${diameter * 100}%, transparent ${Math.min(100, diameter * 130)}%)`;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: "low-power" });
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
    const uHover = uniform("uHover");
    const uSpin = uniform("uSpin");
    gl.uniform3f(uniform("uColor"), r, g, b);
    gl.uniform1f(uniform("uSize"), diameter);

    const strength = Math.min(1, Math.max(0, hoverIntensity));
    let hover = 0;
    let hoverTarget = 0;
    let spin = 0;
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
        time += dt / 1000;
        hover += (hoverTarget - hover) * Math.min(1, dt * 0.005);
        spin += (dt / 1000) * (0.15 + (rotateOnHover ? hover * 1.6 : 0));
      }
      gl.uniform1f(uTime, time % 3600);
      gl.uniform1f(uHover, hover * strength);
      gl.uniform1f(uSpin, spin % (Math.PI * 2));
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

    // Hovered means the pointer is over the orb itself, not just anywhere on the canvas.
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const orbRadius = (Math.min(rect.width, rect.height) * diameter) / 2;
      hoverTarget = Math.hypot(dx, dy) < orbRadius * 1.1 ? 1 : 0;
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
  }, [color, size, hoverIntensity, rotateOnHover, quality, reduce]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 block size-full ${className}`}
      aria-hidden="true"
    />
  );
}
