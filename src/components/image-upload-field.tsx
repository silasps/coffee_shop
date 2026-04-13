"use client";

import { useEffect, useId, useState } from "react";

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
  zoom: number;
  positionX: number;
  positionY: number;
  revokeOnClose: boolean;
};

const TARGET_IMAGE_BYTES = 480_000;
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
    return {
      width: 1000,
      height: Math.max(1, Math.round(1000 / aspectRatio)),
    };
  }

  return {
    width: Math.max(1, Math.round(1000 * aspectRatio)),
    height: 1000,
  };
}

function getOutputSize(aspectRatio: number, longestSide: number) {
  if (aspectRatio >= 1) {
    return {
      width: longestSide,
      height: Math.max(1, Math.round(longestSide / aspectRatio)),
    };
  }

  return {
    width: Math.max(1, Math.round(longestSide * aspectRatio)),
    height: longestSide,
  };
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

  if (!sourceWidth || !sourceHeight) {
    throw new Error("image-dimension-error");
  }

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

  if (!context) {
    throw new Error("canvas-context-error");
  }

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
    context.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      output.width,
      output.height,
    );

    for (let quality = INITIAL_QUALITY; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
      const blob = await canvasToBlob(canvas, Number(quality.toFixed(2)));
      fallbackBlob = blob;

      if (blob.size <= TARGET_IMAGE_BYTES) {
        return blobToDataUrl(blob);
      }
    }

    longestSide = Math.round(longestSide * DIMENSION_STEP);
  }

  if (fallbackBlob) {
    return blobToDataUrl(fallbackBlob);
  }

  throw new Error("image-optimize-error");
}

export function ImageUploadField({
  name,
  label,
  defaultValue = "",
  description = "A imagem e otimizada automaticamente antes de salvar.",
  previewClassName = "aspect-[4/3] rounded-[18px]",
  cropAspectRatio = 4 / 3,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [feedback, setFeedback] = useState(
    value ? "Imagem pronta para salvar." : "Selecione uma imagem para enviar.",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editor]);

  function closeEditor() {
    setEditor((current) => {
      if (current?.revokeOnClose) {
        URL.revokeObjectURL(current.source);
      }

      return null;
    });
  }

  async function openEditor(source: string, revokeOnClose: boolean) {
    await loadImageFromSrc(source);

    setEditor({
      source,
      zoom: 1,
      positionX: 50,
      positionY: 50,
      revokeOnClose,
    });
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--espresso)]">{label}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[168px_minmax(0,1fr)]">
          <div
            className={`overflow-hidden border border-[var(--line)] bg-[rgba(255,252,247,0.92)] ${previewClassName}`}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt={label} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-xs leading-5 text-[var(--muted)]">
                Nenhuma imagem selecionada
              </div>
            )}
          </div>

          <div className="space-y-3">
            <input type="hidden" name={name} value={value} />

            <div className="flex flex-wrap gap-3">
              <label
                htmlFor={inputId}
                className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold ${
                  isProcessing
                    ? "cursor-wait border-[var(--line)] bg-[rgba(255,252,247,0.78)] text-[var(--muted)]"
                    : "cursor-pointer border-[var(--line)] bg-white/82 text-[var(--espresso)]"
                }`}
              >
                {isProcessing ? "Preparando..." : value ? "Trocar imagem" : "Fazer upload"}
              </label>

              <button
                type="button"
                onClick={async () => {
                  if (!value) {
                    return;
                  }

                  setIsProcessing(true);
                  setFeedback("Abrindo o ajuste de enquadramento.");

                  try {
                    await openEditor(value, false);
                    setFeedback("Ajuste o enquadramento e salve.");
                  } catch {
                    setFeedback("Nao foi possivel abrir essa imagem para ajuste.");
                    window.alert("Nao foi possivel abrir essa imagem para ajuste.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing || !value}
                className="inline-flex items-center justify-center rounded-full border border-[rgba(61,34,23,0.12)] px-4 py-2 text-sm font-semibold text-[var(--espresso)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Ajustar enquadramento
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setFeedback("Imagem removida.");
                }}
                disabled={isProcessing || !value}
                className="inline-flex items-center justify-center rounded-full border border-[rgba(149,89,92,0.18)] px-4 py-2 text-sm font-semibold text-[var(--tone-berry)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Remover imagem
              </button>
            </div>

            <p className="text-xs leading-5 text-[var(--muted)]">{feedback}</p>

            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isProcessing}
              onChange={async (event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                const objectUrl = URL.createObjectURL(file);
                setIsProcessing(true);
                setFeedback("Abrindo a tela de ajuste da imagem.");

                try {
                  await openEditor(objectUrl, true);
                } catch {
                  URL.revokeObjectURL(objectUrl);
                  setFeedback("Nao foi possivel processar essa imagem.");
                  window.alert("Nao foi possivel processar essa imagem. Tente outra foto.");
                } finally {
                  setIsProcessing(false);
                  event.target.value = "";
                }
              }}
            />
          </div>
        </div>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(40,21,14,0.55)] backdrop-blur-[4px]"
            aria-label="Fechar ajuste de imagem"
            onClick={closeEditor}
          />

          <div className="absolute inset-x-0 bottom-0 top-0 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto w-full max-w-5xl card-panel p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]">
                    Ajuste de enquadramento
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--espresso)]">{label}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    Use a grade da regra dos tercos para posicionar melhor o foco da imagem no
                    formato em que ela sera exibida publicamente.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white/82 text-xl text-[var(--espresso)]"
                  aria-label="Fechar editor"
                  onClick={closeEditor}
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[28px] border border-[var(--line)] bg-[#20130f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div
                    className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[22px] border border-white/12 bg-black/35"
                    style={{ aspectRatio: `${cropAspectRatio}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editor.source}
                      alt={label}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        objectPosition: `${editor.positionX}% ${editor.positionY}%`,
                        transform: `scale(${editor.zoom})`,
                        transformOrigin: "center",
                      }}
                    />

                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute inset-0 border border-white/32" />
                      <div className="absolute bottom-0 left-1/3 top-0 w-px bg-white/28" />
                      <div className="absolute bottom-0 left-2/3 top-0 w-px bg-white/28" />
                      <div className="absolute left-0 right-0 top-1/3 h-px bg-white/28" />
                      <div className="absolute left-0 right-0 top-2/3 h-px bg-white/28" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-[26px] border border-[var(--line)] bg-white/82 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--espresso)]">Zoom</span>
                      <span className="text-xs text-[var(--muted)]">
                        {editor.zoom.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.8"
                      step="0.01"
                      value={editor.zoom}
                      onChange={(event) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                zoom: Number(event.target.value),
                              }
                            : current,
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--espresso)]">
                        Horizontal
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {Math.round(editor.positionX)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editor.positionX}
                      onChange={(event) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                positionX: Number(event.target.value),
                              }
                            : current,
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--espresso)]">Vertical</span>
                      <span className="text-xs text-[var(--muted)]">
                        {Math.round(editor.positionY)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editor.positionY}
                      onChange={(event) =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                positionY: Number(event.target.value),
                              }
                            : current,
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        setEditor((current) =>
                          current
                            ? {
                                ...current,
                                zoom: 1,
                                positionX: 50,
                                positionY: 50,
                              }
                            : current,
                        )
                      }
                    >
                      Centralizar
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={async () => {
                        if (!editor) {
                          return;
                        }

                        setIsProcessing(true);
                        setFeedback("Aplicando o enquadramento da imagem.");

                        try {
                          const adjustedImage = await renderAdjustedImage(
                            editor.source,
                            cropAspectRatio,
                            editor.zoom,
                            editor.positionX,
                            editor.positionY,
                          );

                          setValue(adjustedImage);
                          setFeedback("Imagem ajustada e pronta para salvar.");
                          closeEditor();
                        } catch {
                          setFeedback("Nao foi possivel aplicar o enquadramento.");
                          window.alert("Nao foi possivel aplicar o enquadramento dessa imagem.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                    >
                      Aplicar enquadramento
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
