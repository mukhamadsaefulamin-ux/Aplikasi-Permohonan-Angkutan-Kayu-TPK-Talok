/**
 * Robust PDF Export utility that seamlessly handles Tailwind CSS v4's oklch colors
 * and ensures 100% compatibility with html2pdf.js / html2canvas.
 */

// Off-screen canvas context for native CSS color resolution
let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

function getColorContext(): CanvasRenderingContext2D | null {
  if (!colorCanvas) {
    colorCanvas = document.createElement('canvas');
    colorCanvas.width = 1;
    colorCanvas.height = 1;
    colorCtx = colorCanvas.getContext('2d');
  }
  return colorCtx;
}

/**
 * Converts any oklch(...) or oklab(...) color into standard hex or rgb(...)
 */
export function convertModernColorToRgb(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }
  const lower = str.toLowerCase();
  if (!lower.includes('oklch') && !lower.includes('oklab')) {
    return str;
  }

  const ctx = getColorContext();

  return str.replace(/okl(?:ch|ab)\([^)]+\)/gi, (match) => {
    if (ctx) {
      try {
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = match;
        const resolved = ctx.fillStyle;
        if (
          resolved &&
          !resolved.toLowerCase().includes('oklch') &&
          !resolved.toLowerCase().includes('oklab')
        ) {
          return resolved;
        }
      } catch {
        // Fallback
      }
    }
    // Safe standard dark slate/black fallback
    return '#1e293b';
  });
}

// Backwards compatibility alias
export const convertOklchToRgb = convertModernColorToRgb;

function containsModernColor(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const lower = val.toLowerCase();
  return lower.includes('oklch') || lower.includes('oklab');
}

/**
 * Creates a safe Proxy around getComputedStyle that prevents oklch / oklab leakage to html2canvas
 * without triggering 'Illegal invocation' errors on native CSSStyleDeclaration getters.
 */
function createSafeComputedStyleProxy(win: Window): () => void {
  const originalGetComputedStyle = win.getComputedStyle;

  win.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const originalStyle = originalGetComputedStyle.call(win, elt, pseudoElt);

    return new Proxy(originalStyle, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function (propertyName: string): string {
            try {
              const rawVal = target.getPropertyValue(propertyName);
              if (typeof rawVal === 'string' && containsModernColor(rawVal)) {
                return convertModernColorToRgb(rawVal);
              }
              return rawVal;
            } catch {
              return '';
            }
          };
        }

        try {
          // Access directly on target (not receiver) so native DOM getters have this === target
          const val = (target as any)[prop];

          if (typeof val === 'function') {
            return val.bind(target);
          }

          if (typeof val === 'string' && containsModernColor(val)) {
            return convertModernColorToRgb(val);
          }

          return val;
        } catch {
          return '';
        }
      },
    });
  };

  return () => {
    win.getComputedStyle = originalGetComputedStyle;
  };
}

/**
 * Sanitizes a cloned document by removing non-printable elements and rewriting oklch / oklab styles
 */
export function sanitizeClonedDocument(clonedDoc: Document) {
  // 1. Remove all .no-print elements
  clonedDoc.querySelectorAll('.no-print').forEach((el) => el.remove());

  // 2. Install Proxy on iframe window's getComputedStyle
  const iframeWin = clonedDoc.defaultView;
  if (iframeWin) {
    createSafeComputedStyleProxy(iframeWin);
  }

  // 3. Clean all <style> elements in the cloned document
  clonedDoc.querySelectorAll('style').forEach((styleTag) => {
    if (styleTag.textContent && containsModernColor(styleTag.textContent)) {
      styleTag.textContent = convertModernColorToRgb(styleTag.textContent);
    }
  });

  // 4. Clean any inline styles containing oklch / oklab
  clonedDoc.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (el.getAttribute) {
      const styleAttr = el.getAttribute('style');
      if (styleAttr && containsModernColor(styleAttr)) {
        el.setAttribute('style', convertModernColorToRgb(styleAttr));
      }
    }
  });

  // 5. Force solid white background and black text on root containers
  if (clonedDoc.body) {
    clonedDoc.body.style.backgroundColor = '#ffffff';
    clonedDoc.body.style.color = '#000000';
  }
  if (clonedDoc.documentElement) {
    clonedDoc.documentElement.style.backgroundColor = '#ffffff';
    clonedDoc.documentElement.style.color = '#000000';
  }

  // 6. Replace any input/textarea element values into plain text or attributes
  clonedDoc.querySelectorAll('input, textarea').forEach((node) => {
    const input = node as HTMLInputElement | HTMLTextAreaElement;
    if (input.tagName === 'TEXTAREA') {
      input.innerHTML = input.value || '';
    } else {
      input.setAttribute('value', input.value || '');
    }
  });
}

export interface PdfExportOptions {
  fileName: string;
  isLandscape?: boolean;
}

/**
 * Exports an HTML element directly to a downloadable PDF file
 */
export async function generatePdfFile(
  element: HTMLElement,
  options: PdfExportOptions
): Promise<void> {
  if (!window.html2pdf) {
    throw new Error('Library html2pdf.js belum dimuat di browser');
  }

  // Ensure current input values are captured in DOM attributes
  element.querySelectorAll('input, textarea').forEach((input: any) => {
    if (input.tagName === 'TEXTAREA') input.innerHTML = input.value;
    else input.setAttribute('value', input.value);
  });

  document.body.classList.add('pdf-mode');
  const restoreMainProxy = createSafeComputedStyleProxy(window);

  try {
    // Give browser brief tick to apply pdf-mode layout
    await new Promise((resolve) => setTimeout(resolve, 200));

    const opt = {
      margin: 0,
      filename: options.fileName,
      image: { type: 'jpeg', quality: 0.98 },
      pagebreak: { mode: ['css', 'legacy'] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc: Document) => {
          sanitizeClonedDocument(clonedDoc);
        },
      },
      jsPDF: {
        unit: 'mm',
        format: options.isLandscape ? [355.6, 215.9] : [215.9, 355.6],
        orientation: options.isLandscape ? 'landscape' : 'portrait',
      },
    };

    await window.html2pdf().set(opt).from(element).save();
  } finally {
    restoreMainProxy();
    document.body.classList.remove('pdf-mode');
  }
}

/**
 * Generates a PDF Blob from an HTML element for Google Drive cloud upload
 */
export async function generatePdfBlob(
  element: HTMLElement,
  options: PdfExportOptions
): Promise<Blob> {
  if (!window.html2pdf) {
    throw new Error('Library html2pdf.js belum dimuat di browser');
  }

  element.querySelectorAll('input, textarea').forEach((input: any) => {
    if (input.tagName === 'TEXTAREA') input.innerHTML = input.value;
    else input.setAttribute('value', input.value);
  });

  document.body.classList.add('pdf-mode');
  const restoreMainProxy = createSafeComputedStyleProxy(window);

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const opt = {
      margin: 0,
      filename: options.fileName,
      image: { type: 'jpeg', quality: 0.98 },
      pagebreak: { mode: ['css', 'legacy'] },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc: Document) => {
          sanitizeClonedDocument(clonedDoc);
        },
      },
      jsPDF: {
        unit: 'mm',
        format: options.isLandscape ? [355.6, 215.9] : [215.9, 355.6],
        orientation: options.isLandscape ? 'landscape' : 'portrait',
      },
    };

    const pdfBlob: Blob = await window.html2pdf().set(opt).from(element).outputPdf('blob');
    return pdfBlob;
  } finally {
    restoreMainProxy();
    document.body.classList.remove('pdf-mode');
  }
}
