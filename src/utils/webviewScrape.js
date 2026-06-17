/**
 * WebView Scraping Injection Script
 *
 * This script is injected into the WebView to capture manga/manhwa images.
 * Based on the original OpenToon app's openComicImageCapture system.
 */

export const SCRAPE_INJECTION_SCRIPT = `
(function() {
  'use strict';

  // Prevent double installation
  if (window.__openComicImageCapture?.installed) {
    return;
  }

  const POST_SOURCE = 'opencomic-image-capture';
  const DEBOUNCE_MS = 300;

  // State management
  window.__openComicImageCapture = {
    installed: true,
    enabled: true,
    candidates: [],
    scanTimer: null,
    autoScrollTimer: null,

    getCandidateCount: function() {
      return this.candidates.length;
    },

    getVisiblePendingLazyImageCount: function() {
      return document.querySelectorAll('img[data-src], img[loading="lazy"]').length;
    },

    setCaptureVisibilityMode: function(mode) {
      this.visibilityMode = mode;
    },

    settlePendingCaptures: function(timeout, blobTimeout) {
      return new Promise((resolve) => {
        setTimeout(resolve, timeout || 2000);
      });
    },
  };

  // Post message to React Native
  function postMessage(type, payload) {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ source: POST_SOURCE, type: type, payload: payload })
    );
  }

  // Capture image from element
  function captureImage(element, source) {
    try {
      let imageUrl = null;
      let width = 0;
      let height = 0;

      if (element.tagName === 'IMG') {
        imageUrl = element.currentSrc || element.src;
        width = element.naturalWidth || element.width;
        height = element.naturalHeight || element.height;
      } else if (element.tagName === 'CANVAS') {
        imageUrl = element.toDataURL('image/jpeg', 0.9);
        width = element.width;
        height = element.height;
      } else if (element.tagName === 'SOURCE') {
        imageUrl = element.srcset || element.dataset?.srcset;
        // Try to get dimensions from parent
        const img = element.closest('picture')?.querySelector('img');
        if (img) {
          width = img.naturalWidth || img.width;
          height = img.naturalHeight || img.height;
        }
      }

      if (!imageUrl || width < 100 || height < 100) {
        return; // Skip small images (icons, ads)
      }

      // Check if already captured
      const exists = window.__openComicImageCapture.candidates.some(
        c => c.url === imageUrl
      );
      if (exists) return;

      const candidate = {
        url: imageUrl,
        width: width,
        height: height,
        source: source,
        timestamp: Date.now(),
      };

      window.__openComicImageCapture.candidates.push(candidate);
      postMessage('image-captured', candidate);
    } catch (e) {
      // Silently ignore capture errors
    }
  }

  // Scan DOM for images
  function scanImages() {
    if (!window.__openComicImageCapture.enabled) return;

    // Query all image-bearing elements
    const elements = document.querySelectorAll(
      'img, canvas, source[srcset], source[data-srcset]'
    );

    elements.forEach(function(el) {
      captureImage(el, 'dom-scan');
    });
  }

  // Debounced scan
  function debouncedScan() {
    window.clearTimeout(window.__openComicImageCapture.scanTimer);
    window.__openComicImageCapture.scanTimer = window.setTimeout(scanImages, DEBOUNCE_MS);
  }

  // Canvas API hooks
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function() {
    originalDrawImage.apply(this, arguments);
    if (this.canvas) {
      window.clearTimeout(this.canvas.__captureTimer);
      this.canvas.__captureTimer = window.setTimeout(function() {
        captureImage(this.canvas, 'canvas-draw');
      }.bind(this), DEBOUNCE_MS);
    }
  };

  const originalPutImageData = CanvasRenderingContext2D.prototype.putImageData;
  CanvasRenderingContext2D.prototype.putImageData = function() {
    originalPutImageData.apply(this, arguments);
    if (this.canvas) {
      window.clearTimeout(this.canvas.__captureTimer);
      this.canvas.__captureTimer = window.setTimeout(function() {
        captureImage(this.canvas, 'canvas-put-data');
      }.bind(this), DEBOUNCE_MS);
    }
  };

  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function() {
    captureImage(this, 'canvas-to-data-url');
    return originalToDataURL.apply(this, arguments);
  };

  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function() {
    captureImage(this, 'canvas-to-blob');
    return originalToBlob.apply(this, arguments);
  };

  // URL.createObjectURL hook
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = function(blob) {
    const url = originalCreateObjectURL.call(this, blob);
    if (blob instanceof Blob && blob.type && blob.type.startsWith('image/')) {
      window.clearTimeout(window.__openComicImageCapture.createObjectTimer);
      window.__openComicImageCapture.createObjectTimer = window.setTimeout(function() {
        postMessage('blob-captured', { url: url, type: blob.type, size: blob.size });
      }, DEBOUNCE_MS);
    }
    return url;
  };

  // MutationObserver for dynamic content
  const observer = new MutationObserver(function(mutations) {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      debouncedScan();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Ad blocker
  window.__openComicAdBlocker = {
    installed: true,
    blockedDomains: [
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'facebook.com/tr',
      'analytics.google.com',
    ],
    isBlockedUrl: function(url) {
      return this.blockedDomains.some(function(domain) {
        return url.includes(domain);
      });
    },
  };

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanImages);
  } else {
    scanImages();
  }

  // Notify React Native that injection is complete
  postMessage('injection-complete', {
    candidateCount: window.__openComicImageCapture.candidates.length,
  });

})();
`;

/**
 * Auto-scroll injection script
 * Scrolls the WebView to trigger lazy-loaded images
 */
export const AUTO_SCROLL_SCRIPT = `
(function() {
  'use strict';

  if (!window.__openComicImageCapture) return;

  window.__openComicImageCaptureAutoScrollInFlight = true;

  let scrollCount = 0;
  const maxScrolls = 50;
  const scrollInterval = 500;

  function scrollStep() {
    if (scrollCount >= maxScrolls) {
      window.__openComicImageCaptureAutoScrollInFlight = false;
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        source: 'opencomic-image-capture',
        type: 'auto-scroll-complete',
        payload: {
          candidateCount: window.__openComicImageCapture.getCandidateCount(),
        },
      }));
      return;
    }

    window.scrollBy(0, window.innerHeight * 0.8);
    scrollCount++;

    setTimeout(scrollStep, scrollInterval);
  }

  scrollStep();
})();
`;

/**
 * Horizontal scroll injection for webtoon-style readers
 */
export const HORIZONTAL_SCROLL_SCRIPT = `
(function() {
  'use strict';

  if (!window.__openComicImageCapture) return;

  window.__openComicImageCaptureHorizontalScanInFlight = true;

  let scrollCount = 0;
  const maxScrolls = 50;
  const scrollInterval = 500;

  function scrollStep() {
    if (scrollCount >= maxScrolls) {
      window.__openComicImageCaptureHorizontalScanInFlight = false;
      window.ReactNativeWebView?.postMessage(JSON.stringify({
        source: 'opencomic-image-capture',
        type: 'horizontal-scroll-complete',
        payload: {
          candidateCount: window.__openComicImageCapture.getCandidateCount(),
        },
      }));
      return;
    }

    window.scrollBy(window.innerWidth * 0.8, 0);
    scrollCount++;

    setTimeout(scrollStep, scrollInterval);
  }

  scrollStep();
})();
`;
