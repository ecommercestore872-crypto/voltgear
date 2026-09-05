/** Shop content width — four cards stay ~250px instead of shrinking to five. */
export const STOREFRONT_CONTENT_MAX = 1152;

const COMFORTABLE_CARD_MIN = 140;
const COMFORTABLE_CARD_MAX = 300;

export function productGridColumns(viewportWidth: number): 2 | 3 | 4 {
  if (viewportWidth < 768) return 2;
  if (viewportWidth < 1024) return 3;
  return 4;
}

export function desktopNavAtWidth(viewportWidth: number): boolean {
  return viewportWidth >= 1024;
}

function horizontalPadding(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 64;
  if (viewportWidth >= 640) return 32;
  return 24;
}

function gridGap(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 22;
  if (viewportWidth >= 768) return 20;
  if (viewportWidth >= 640) return 18;
  return 12;
}

export function estimatedGridCardWidth(viewportWidth: number): number {
  const cols = productGridColumns(viewportWidth);
  const pad = horizontalPadding(viewportWidth);
  const gap = gridGap(viewportWidth);
  const content = Math.min(Math.max(viewportWidth, 0), STOREFRONT_CONTENT_MAX);
  const inner = Math.max(content - pad, cols);
  return Math.floor((inner - gap * (cols - 1)) / cols);
}

export function cardWidthIsComfortable(width: number): boolean {
  return width >= COMFORTABLE_CARD_MIN && width <= COMFORTABLE_CARD_MAX;
}

/** Horizontal rail cards: peek the next item on phones, sit near grid size on desktop. */
export function railCardWidth(viewportWidth: number): number {
  if (viewportWidth < 640) {
    return Math.min(236, Math.max(212, Math.round(viewportWidth * 0.58)));
  }
  if (viewportWidth < 1024) return 248;
  return 260;
}
