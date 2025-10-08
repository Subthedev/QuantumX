// Batch DOM reads and writes to prevent forced reflows
export const batchDOMOperations = (callback: () => void) => {
  requestAnimationFrame(() => {
    callback();
  });
};

// Read DOM properties without causing reflow
export const readDOMProperty = <T>(element: HTMLElement, property: keyof HTMLElement): T => {
  return element[property] as T;
};

// Write DOM properties in batches
let writeQueue: Array<() => void> = [];
let isWriteScheduled = false;

export const writeDOMProperty = (callback: () => void) => {
  writeQueue.push(callback);
  
  if (!isWriteScheduled) {
    isWriteScheduled = true;
    requestAnimationFrame(() => {
      writeQueue.forEach(cb => cb());
      writeQueue = [];
      isWriteScheduled = false;
    });
  }
};
