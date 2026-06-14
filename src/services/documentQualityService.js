const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be inspected.'));
    };
    image.src = url;
  });
}

function getImageDimensions(image) {
  return {
    width: image.width || image.naturalWidth,
    height: image.height || image.naturalHeight,
  };
}

function calculateImageMetrics(image) {
  const dimensions = getImageDimensions(image);
  const scale = Math.min(1, 900 / Math.max(dimensions.width, dimensions.height));
  const width = Math.max(1, Math.round(dimensions.width * scale));
  const height = Math.max(1, Math.round(dimensions.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image quality inspection is not supported in this browser.');

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const grayscale = new Float32Array(width * height);
  let sum = 0;
  let sumSquares = 0;

  for (let pixel = 0, index = 0; pixel < pixels.length; pixel += 4, index += 1) {
    const value = pixels[pixel] * 0.299 + pixels[pixel + 1] * 0.587 + pixels[pixel + 2] * 0.114;
    grayscale[index] = value;
    sum += value;
    sumSquares += value * value;
  }

  const count = grayscale.length;
  const brightness = sum / count;
  const contrast = Math.sqrt(Math.max(0, sumSquares / count - brightness ** 2));
  let laplacian = 0;
  let samples = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const center = grayscale[y * width + x];
      laplacian += Math.abs(
        grayscale[(y - 1) * width + x]
        + grayscale[(y + 1) * width + x]
        + grayscale[y * width + x - 1]
        + grayscale[y * width + x + 1]
        - 4 * center,
      );
      samples += 1;
    }
  }

  return {
    width: dimensions.width,
    height: dimensions.height,
    megapixels: round((dimensions.width * dimensions.height) / 1_000_000, 2),
    brightness: round(brightness),
    contrast: round(contrast),
    sharpness: round(samples ? laplacian / samples : 0),
  };
}

function assessMetrics(metrics) {
  let score = 100;
  const issues = [];
  const recommendations = [];
  const shortestSide = Math.min(metrics.width, metrics.height);

  if (shortestSide < 650 || metrics.megapixels < 0.55) {
    score -= 35;
    issues.push('low_resolution');
    recommendations.push('Retake the photo closer to the document and keep all four edges visible.');
  } else if (shortestSide < 900 || metrics.megapixels < 1) {
    score -= 16;
    issues.push('resolution_needs_review');
    recommendations.push('A higher-resolution image may improve small text and grade recognition.');
  }

  if (metrics.brightness < 45) {
    score -= 30;
    issues.push('too_dark');
    recommendations.push('Use even lighting and avoid shadows over the document.');
  } else if (metrics.brightness > 220) {
    score -= 30;
    issues.push('overexposed');
    recommendations.push('Reduce direct light and glare before taking another photo.');
  } else if (metrics.brightness < 65 || metrics.brightness > 205) {
    score -= 10;
    issues.push('lighting_needs_review');
  }

  if (metrics.contrast < 22) {
    score -= 24;
    issues.push('low_contrast');
    recommendations.push('Place the document on a plain contrasting surface.');
  } else if (metrics.contrast < 34) {
    score -= 10;
    issues.push('contrast_needs_review');
  }

  if (metrics.sharpness < 7) {
    score -= 34;
    issues.push('blurry');
    recommendations.push('Hold the camera steady, tap to focus, and retake the photo.');
  } else if (metrics.sharpness < 12) {
    score -= 14;
    issues.push('sharpness_needs_review');
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: boundedScore,
    status: boundedScore >= 78 ? 'good' : boundedScore >= 52 ? 'review' : 'poor',
    issues,
    recommendations: [...new Set(recommendations)].slice(0, 3),
  };
}

export async function inspectDocumentQuality(file) {
  if (file.type === 'application/pdf') {
    return {
      version: 1,
      source: 'browser_preflight',
      status: 'server_review',
      score: 75,
      issues: [],
      recommendations: ['Each PDF page will be checked during secure OCR processing.'],
      metrics: null,
      inspected_at: new Date().toISOString(),
    };
  }

  if (!IMAGE_TYPES.has(file.type)) {
    return {
      version: 1,
      source: 'browser_preflight',
      status: 'review',
      score: 50,
      issues: ['unsupported_preview'],
      recommendations: ['Use a PDF, JPG, or PNG file.'],
      metrics: null,
      inspected_at: new Date().toISOString(),
    };
  }

  const image = await loadImage(file);
  try {
    const metrics = calculateImageMetrics(image);
    return {
      version: 1,
      source: 'browser_preflight',
      ...assessMetrics(metrics),
      metrics,
      inspected_at: new Date().toISOString(),
    };
  } finally {
    image.close?.();
  }
}

// TODO(real image preprocessing): add a reviewed OpenCV/WASM worker for
// perspective correction and deskewing while preserving the untouched source.
