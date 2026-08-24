function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function pickMimeType() {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type
  }
  return "video/webm"
}

/**
 * Renders a short crossfade transition between two images onto a canvas,
 * records it with MediaRecorder, and resolves with the resulting video blob
 * and its object URL.
 */
export async function generateCrossfadeVideo(
  beforeSrc: string,
  afterSrc: string,
  afterFilter: string,
  durationMs = 3000,
): Promise<{ blob: Blob; url: string }> {
  const [before, after] = await Promise.all([loadImage(beforeSrc), loadImage(afterSrc)])

  const width = 640
  const height = Math.round((width * before.height) / before.width)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const maybeCtx = canvas.getContext("2d")
  if (!maybeCtx) throw new Error("No se pudo crear el contexto de canvas.")
  const ctx: CanvasRenderingContext2D = maybeCtx

  const stream = canvas.captureStream(30)
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const holdMs = 500
  const totalMs = durationMs + holdMs * 2

  const finished = new Promise<{ blob: Blob; url: string }>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve({ blob, url: URL.createObjectURL(blob) })
    }
  })

  recorder.start()
  const start = performance.now()

  function drawFrame(t: number) {
    const elapsed = t - start
    let progress: number

    if (elapsed < holdMs) {
      progress = 0
    } else if (elapsed < holdMs + durationMs) {
      progress = (elapsed - holdMs) / durationMs
    } else {
      progress = 1
    }
    // ease in-out
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2

    ctx.clearRect(0, 0, width, height)
    ctx.filter = "none"
    ctx.globalAlpha = 1
    ctx.drawImage(before, 0, 0, width, height)

    ctx.globalAlpha = eased
    ctx.filter = afterFilter
    ctx.drawImage(after, 0, 0, width, height)
    ctx.globalAlpha = 1
    ctx.filter = "none"

    if (elapsed < totalMs) {
      requestAnimationFrame(drawFrame)
    } else {
      recorder.stop()
    }
  }

  requestAnimationFrame(drawFrame)

  return finished
}
