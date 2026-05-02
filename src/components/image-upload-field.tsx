"use client";

import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  defaultValue?: string | null;
  description?: string;
  previewClassName?: string;
  cropAspectRatio?: number;
};

type EditorState = {
  source: string;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  positionX: number;
  positionY: number;
  revokeOnClose: boolean;
};

const TARGET_IMAGE_BYTES = 200_000;
const START_MAX_DIMENSION = 1400;
const MIN_MAX_DIMENSION = 420;
const INITIAL_QUALITY = 0.86;
const MIN_QUALITY = 0.46;
const QUALITY_STEP = 0.08;
const DIMENSION_STEP = 0.84;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadImageFromSrc(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-load-error"));
    if (!src.startsWith("data:") && !src.startsWith("/")) {
      image.crossOrigin = "anonymous";
    }
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("image-encode-error"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("image-read-error"));
    };
    reader.onerror = () => reject(new Error("image-read-error"));
    reader.readAsDataURL(blob);
  });
}

function getFrameSize(aspectRatio: number) {
  if (aspectRatio >= 1) {
    return { width: 1000, height: Math.max(1, Math.round(1000 / aspectRatio)) };
  }
  return { width: Math.max(1, Math.round(1000 * aspectRatio)), height: 1000 };
}

function getOutputSize(aspectRatio: number, longestSide: number) {
  if (aspectRatio >= 1) {
    return { width: longestSide, height: Math.max(1, Math.round(longestSide / aspectRatio)) };
  }
  return { width: Math.max(1, Math.round(longestSide * aspectRatio)), height: longestSide };
}

async function renderAdjustedImage(
  source: string,
  aspectRatio: number,
  zoom: number,
  positionX: number,
  positionY: number,
) {
  const image = await loadImageFromSrc(source);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) throw new Error("image-dimension-error");

  const frame = getFrameSize(aspectRatio);
  const coverScale = Math.max(frame.width / sourceWidth, frame.height / sourceHeight);
  const renderedWidth = sourceWidth * coverScale * zoom;
  const renderedHeight = sourceHeight * coverScale * zoom;
  const overflowX = Math.max(0, renderedWidth - frame.width);
  const overflowY = Math.max(0, renderedHeight - frame.height);
  const safePositionX = clamp(positionX, 0, 100);
  const safePositionY = clamp(positionY, 0, 100);
  const left = -(safePositionX / 100) * overflowX;
  const top = -(safePositionY / 100) * overflowY;
  const cropWidth = frame.width * (sourceWidth / renderedWidth);
  const cropHeight = frame.height * (sourceHeight / renderedHeight);
  const cropX = clamp(-left * (sourceWidth / renderedWidth), 0, Math.max(0, sourceWidth - cropWidth));
  const cropY = clamp(-top * (sourceHeight / renderedHeight), 0, Math.max(0, sourceHeight - cropHeight));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) throw new Error("canvas-context-error");

  let longestSide = START_MAX_DIMENSION;
  let fallbackBlob: Blob | null = null;

  while (longestSide >= MIN_MAX_DIMENSION) {
    let output = getOutputSize(aspectRatio, longestSide);
    const upscaleRatio = Math.min(cropWidth / output.width, cropHeight / output.height);

    if (upscaleRatio < 1) {
      output = {
        width: Math.max(1, Math.floor(output.width * upscaleRatio)),
        height: Math.max(1, Math.floor(output.height * upscaleRatio)),
      };
    }

    canvas.width = output.width;
    canvas.height = output.height;
    context.clearRect(0, 0, output.width, output.height);
    context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, output.width, output.height);

    for (let quality = INITIAL_QUALITY; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
      const blob = await canvasToBlob(canvas, Number(quality.toFixed(2)));
      fallbackBlob = blob;
      if (blob.size <= TARGET_IMAGE_BYTES) return blobToDataUrl(blob);
    }

    longestSide = Math.round(longestSide * DIMENSION_STEP);
  }

  if (fallbackBlob) return blobToDataUrl(fallbackBlob);
  throw new Error("image-optimize-error");
}

function zoomAroundPoint(
  state: EditorState,
  scaleFactor: number,
  focalXContainer: number,
  focalYContainer: number,
  containerWidth: number,
  containerHeight: number,
  cropAspectRatio: number,
): EditorState {
  const newZoom = clamp(state.zoom * scaleFactor, 1, 2.8);
  if (newZoom === state.zoom) return state;

  const frame = getFrameSize(cropAspectRatio);
  const coverScale = Math.max(frame.width / state.imageWidth, frame.height / state.imageHeight);
  const overflowX = Math.max(0, state.imageWidth * coverScale * state.zoom - frame.width);
  const overflowY = Math.max(0, state.imageHeight * coverScale * state.zoom - frame.height);
  const newOverflowX = Math.max(0, state.imageWidth * coverScale * newZoom - frame.width);
  const newOverflowY = Math.max(0, state.imageHeight * coverScale * newZoom - frame.height);

  // Focal point in conceptual 1000px frame coordinates
  const fx = focalXContainer * (frame.width / containerWidth);
  const fy = focalYContainer * (frame.height / containerHeight);

  let newPositionX = state.positionX;
  let newPositionY = state.positionY;

  if (newOverflowX > 0) {
    const A = (state.positionX / 100) * overflowX + fx;
    newPositionX = clamp(((newZoom / state.zoom) * A - fx) / newOverflowX * 100, 0, 100);
  }

  if (newOverflowY > 0) {
    const B = (state.positionY / 100) * overflowY + fy;
    newPositionY = clamp(((newZoom / state.zoom) * B - fy) / newOverflowY * 100, 0, 100);
  }

  return { ...state, zoom: newZoom, positionX: newPositionX, positionY: newPositionY };
}

function getPreviewImageStyle(editor: EditorState, aspectRatio: number): CSSProperties {
  const frame = getFrameSize(aspectRatio);
  const coverScale = Math.max(frame.width / editor.imageWidth, frame.height / editor.imageHeight);
  const renderedWidth = editor.imageWidth * coverScale * editor.zoom;
  const renderedHeight = editor.imageHeight * coverScale * editor.zoom;
  const overflowX = Math.max(0, renderedWidth - frame.width);
  const overflowY = Math.max(0, renderedHeight - frame.height);
  const left = -(editor.positionX / 100) * overflowX;
  const top = -(editor.positionY / 100) * overflowY;

  return {
    height: `${(renderedHeight / frame.height) * 100}%`,
    left: `${(left / frame.width) * 100}%`,
    top: `${(top / frame.height) * 100}%`,
    width: `${(renderedWidth / frame.width) * 100}%`,
  };
}

export function ImageUploadField({
  name,
  label,
  defaultValue = "",
  cropAspectRatio = 4 / 3,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const prevPinchDist = useRef<number | null>(null);

  useEffect(() => {
    if (!editor) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editor]);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  function closeEditor() {
    setEditor((current) => {
      if (current?.revokeOnClose) URL.revokeObjectURL(current.source);
      return null;
    });
    activePointers.current.clear();
    prevPinchDist.current = null;
  }

  async function openEditor(source: string, revokeOnClose: boolean) {
    const image = await loadImageFromSrc(source);
    setEditor({
      source,
      imageWidth: image.naturalWidth || image.width,
      imageHeight: image.naturalHeight || image.height,
      zoom: 1,
      positionX: 50,
      positionY: 50,
      revokeOnClose,
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size >= 2) {
      const pts = Array.from(activePointers.current.values());
      prevPinchDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!activePointers.current.has(e.pointerId) || !editor) return;

    const prev = activePointers.current.get(e.pointerId)!;
    const delta = { x: e.clientX - prev.x, y: e.clientY - prev.y };
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const frame = getFrameSize(cropAspectRatio);
      const coverScale = Math.max(
        frame.width / editor.imageWidth,
        frame.height / editor.imageHeight,
      );
      const renderedWidth = editor.imageWidth * coverScale * editor.zoom;
      const renderedHeight = editor.imageHeight * coverScale * editor.zoom;
      const overflowX = renderedWidth - frame.width;
      const overflowY = renderedHeight - frame.height;

      setEditor((current) => {
        if (!current) return current;

        let newPosX = current.positionX;
        let newPosY = current.positionY;

        if (overflowX > 0) {
          const pixelOffsetX = (current.positionX / 100) * overflowX;
          const newPixelOffsetX = pixelOffsetX - delta.x * (frame.width / rect.width);
          newPosX = clamp((newPixelOffsetX / overflowX) * 100, 0, 100);
        }

        if (overflowY > 0) {
          const pixelOffsetY = (current.positionY / 100) * overflowY;
          const newPixelOffsetY = pixelOffsetY - delta.y * (frame.height / rect.height);
          newPosY = clamp((newPixelOffsetY / overflowY) * 100, 0, 100);
        }

        return { ...current, positionX: newPosX, positionY: newPosY };
      });
    } else if (activePointers.current.size >= 2 && prevPinchDist.current !== null) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const pts = Array.from(activePointers.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const scale = dist / prevPinchDist.current;
      prevPinchDist.current = dist;

      const focalX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const focalY = (pts[0].y + pts[1].y) / 2 - rect.top;

      setEditor((current) => {
        if (!current) return current;
        return zoomAroundPoint(current, scale, focalX, focalY, rect.width, rect.height, cropAspectRatio);
      });
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      prevPinchDist.current = null;
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const focalX = e.clientX - rect.left;
    const focalY = e.clientY - rect.top;

    setEditor((current) => {
      if (!current) return current;
      return zoomAroundPoint(current, factor, focalX, focalY, rect.width, rect.height, cropAspectRatio);
    });
  }

  async function handleSave() {
    if (!editor) return;
    setIsProcessing(true);
    try {
      const adjusted = await renderAdjustedImage(
        editor.source,
        cropAspectRatio,
        editor.zoom,
        editor.positionX,
        editor.positionY,
      );
      setValue(adjusted);
      closeEditor();
    } catch {
      window.alert("Nao foi possivel processar essa imagem.");
    } finally {
      setIsProcessing(false);
    }
  }

  const thumbAspect = cropAspectRatio >= 1 ? "aspect-[4/3]" : "aspect-square";

  return (
    <>
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center gap-3">
        <div
          className={`flex-shrink-0 w-16 ${thumbAspect} overflow-hidden rounded-xl border border-[var(--line)] bg-[rgba(255,252,247,0.92)]`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[var(--muted)]"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--espresso)]">{label}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <label
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                isProcessing
                  ? "cursor-wait border-[var(--line)] text-[var(--muted)]"
                  : "border-[var(--line)] bg-white/82 text-[var(--espresso)]"
              }`}
            >
              {isProcessing ? "Preparando..." : value ? "Trocar imagem" : "Fazer upload"}
            </label>

            {value && !isProcessing && (
              <button
                type="button"
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    await openEditor(value, false);
                  } catch {
                    window.alert("Nao foi possivel abrir essa imagem para ajuste.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="inline-flex items-center rounded-full border border-[var(--line)] bg-white/82 px-3 py-1 text-xs font-semibold text-[var(--espresso)]"
              >
                Ajustar
              </button>
            )}

            {value && !isProcessing && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="inline-flex items-center rounded-full border border-[rgba(149,89,92,0.18)] px-3 py-1 text-xs font-semibold text-[var(--tone-berry)]"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isProcessing}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          const objectUrl = URL.createObjectURL(file);
          setIsProcessing(true);

          try {
            await openEditor(objectUrl, true);
          } catch {
            URL.revokeObjectURL(objectUrl);
            window.alert("Nao foi possivel processar essa imagem. Tente outra foto.");
          } finally {
            setIsProcessing(false);
            event.target.value = "";
          }
        }}
      />

      {editor ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(40,21,14,0.65)] backdrop-blur-[4px]"
            aria-label="Fechar editor"
            onClick={closeEditor}
          />

          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                  Ajuste de enquadramento
                </p>
                <h3 className="mt-1 text-base font-semibold text-[var(--espresso)]">{label}</h3>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white/82 text-lg text-[var(--espresso)]"
              >
                ×
              </button>
            </div>

            <div className="bg-[#20130f] px-4 pt-4">
              <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                className="relative w-full cursor-grab overflow-hidden rounded-xl select-none active:cursor-grabbing touch-none"
                style={{ aspectRatio: `${cropAspectRatio}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editor.source}
                  alt={label}
                  className="pointer-events-none absolute max-w-none object-fill"
                  style={getPreviewImageStyle(editor, cropAspectRatio)}
                  draggable={false}
                />

                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 border border-white/32" />
                  <div className="absolute bottom-0 left-1/3 top-0 w-px bg-white/28" />
                  <div className="absolute bottom-0 left-2/3 top-0 w-px bg-white/28" />
                  <div className="absolute left-0 right-0 top-1/3 h-px bg-white/28" />
                  <div className="absolute left-0 right-0 top-2/3 h-px bg-white/28" />
                </div>

                <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white/90">
                  {editor.zoom.toFixed(1)}×
                </div>
              </div>

              <p className="py-2.5 text-center text-[11px] text-white/40">
                Arraste para mover · Scroll ou pinça para o zoom
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setEditor((current) =>
                    current ? { ...current, zoom: 1, positionX: 50, positionY: 50 } : current,
                  )
                }
                className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
              >
                Centralizar
              </button>

              <div className="flex gap-2">
                <button type="button" onClick={closeEditor} className="btn-secondary text-sm">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {isProcessing ? "Salvando..." : "Salvar imagem"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
