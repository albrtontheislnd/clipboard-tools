// Tells TypeScript this file uses Web Worker types, not DOM types
/// <reference lib="webworker" />

// Give 'self' the correct type

self.onmessage = (e: MessageEvent<number>) => {
  // TypeScript knows 'e.data' is a number based on the type above
  const result = e.data * 2;
  
  self.postMessage(result);
};