import '@testing-library/jest-dom/vitest';

// Radix ScrollArea (and similar) rely on ResizeObserver; jsdom does not provide it.
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverMock;
