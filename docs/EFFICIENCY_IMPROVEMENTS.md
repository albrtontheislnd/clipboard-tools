# Efficiency Improvements and Performance Analysis

## Overview
This document outlines efficiency improvements made to the Alapaki Tools plugin, covering both specific component optimizations (like the LaTeX modal) and broader performance analysis covering image processing, OCR operations, text tools, and architectural considerations.

---

# LaTeX Modal Efficiency Improvements

## Files Modified

### 1. `src/modals/latex_modal.ts`


#### Improvements Implemented:

**Memory Leak Prevention:**
```typescript
private cleanup(): void {
    if (this.vueApp) {
        this.vueApp.unmount();
        this.vueApp = null;
    }
    if (this.closeHandler) {
        this.closeHandler = null;
    }
    this.contentEl.empty();
}
```

**Debounced Modal Opens:**
```typescript
private static lastOpenTime = 0;
private static readonly DEBOUNCE_MS = 100;

openWithPromise(): Promise<callbackValue> {
    const now = Date.now();
    if (now - InsertLatexModal.lastOpenTime < InsertLatexModal.DEBOUNCE_MS) {
        return Promise.resolve(null);
    }
    InsertLatexModal.lastOpenTime = now;
    // ... rest of implementation
}
```

**Error Handling:**
```typescript
try {
    this.vueApp = createApp(LatexModal, {
        close: this.close.bind(this),
        insertData: (data: callbackValue) => {
            this.returnValue = data;
            this.close();
        },
        values: this.inputValue,
    });
    this.vueApp.mount(this.containerEl.children[1]);
} catch (error) {
    console.error('Failed to mount Vue app:', error);
    this.cleanup();
    this.close();
    return;
}
```

### 2. `src/components/LatexModal.vue`

#### Improvements Implemented:

**Optimized Reactivity (Static Data):**
```typescript
// Use plain constants for static data (no reactivity needed)
const sidebarCategories: SidebarCategory[] = (() => {
    const categories: SidebarCategory[] = [];
    
    for (const [category, icons] of Object.entries(latexSidebarCategoryIcons)) {
        categories.push({ label: String(icons), category: category });
    }

    categories.unshift({ label: 'All', category: 'All' });
    
    return categories;
})();

const allSymbols: (latexSymbol & { category: string })[] = (() => {
    const symbols: (latexSymbol & { category: string })[] = [];
    
    for (const [category, sourceSymbols] of Object.entries(latexCategories)) {
        for (const symbolItem of sourceSymbols) {
            symbols.push({ ...symbolItem, category });
        }
    }
    
    return symbols;
})();
```

**Pre-Grouped Symbols for Faster Filtering:**
```typescript
const symbolsByCategory: Record<string, (latexSymbol & { category: string })[]> = (() => {
    const grouped: Record<string, (latexSymbol & { category: string })[]> = {};
    
    for (const symbol of allSymbols) {
        if (!grouped[symbol.category]) {
            grouped[symbol.category] = [];
        }
        grouped[symbol.category].push(symbol);
    }
    
    return grouped;
})();
```

**Debounced Search:**
```typescript
const debouncedSearchQuery = ref('');
let searchTimeout: NodeJS.Timeout | null = null;

watch(searchQuery, (newQuery) => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(() => {
        debouncedSearchQuery.value = newQuery;
    }, 150); // 150ms debounce
});
```

**Memoized Filtered Symbols:**
```typescript
const filteredSymbols = computed(() => {
    const category = selectedCategory.value;
    const query = debouncedSearchQuery.value.trim().toLowerCase();

    // Get symbols for the selected category (or all symbols)
    let filtered = category === 'All' 
        ? allSymbols 
        : symbolsByCategory[category] || [];

    // Apply search filter if query exists
    if (query) {
        filtered = filtered.filter(s => 
            s.latex.toLowerCase().includes(query)
        );
    }

    return filtered;
});
```

**Cleanup on Unmount:**
```typescript
onUnmounted(() => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
});
```

**Empty Text Validation:**
```typescript
const insertAccumulatedText = (insertType: 'inline' | 'block' | 'plain' = 'inline') => {
    const text = accumulatedText.value.trim();
    if (!text) return; // Don't insert empty text
    
    // ... rest of implementation
};
```

# Comprehensive Performance Analysis

### Critical Issues Identified:
- **`normalizeMathDelimiters` function**: Uses 5-6 separate regex passes on text, inefficient for large OCR outputs


## Specific Recommendations

### A. Immediate Wins (High Impact, Low Effort)

#### 1. Optimize `normalizeMathDelimiters` (src/libs/utils.ts)
Replace with single-pass regex:
```typescript
// Single pass with callback
return markdown.replace(/(?:\\[\\]\\|\\)|\\([^\\]*)\\)/g, (match, p1) => {
    if (match.startsWith('\\[') && match.endsWith('\\]')) {
        return `$$${p1.trim()}$$`;
    }
    if (match.startsWith('\\(') && match.endsWith('\\)')) {
        return `$${p1.trim()}$`;
    }
    return match; // Shouldn't happen with this regex
});
```



### B. Short-Term Improvements (Medium Effort, High Impact)

#### 1. Web Worker Offloading for Image Operations
Create `src/workers/imageWorker.js`:
```javascript
self.onmessage = async (e) => {
    const { operation, data } = e.data;
    let result;
    
    switch (operation) {
        case 'convertImage':
            result = await convertImageLocally(
                new Blob([data.blob], { type: data.type }), 
                data.format, 
                data.quality
            );
            break;
        case 'optimizeImage':
            result = await optimizeImageToWebP(
                new Blob([data.blob], { type: data.type }),
                data.maxWidth,
                data.maxHeight
            );
            break;
    }
    
    self.postMessage({ 
        id: data.id, 
        result: await result.arrayBuffer() 
    });
};
```

Use in main.ts:
```typescript
// Convert to use worker
const convertImageWithWorker = (blob, format, quality) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./workers/imageWorker.js', import.meta.url));
        const id = Math.random().toString(36).substr(2, 9);
        
        worker.onmessage = (e) => {
            if (e.data.id === id) {
                worker.terminate();
                resolve(new Blob([e.data.result], { type: `image/${format}` }));
            }
        };
        
        worker.onerror = (e) => {
            worker.terminate();
            reject(e.error);
        };
        
        worker.postMessage({
            operation: 'convertImage',
            id: id,
            blob: [...new Uint8Array(await blob.arrayBuffer())],
            type: blob.type,
            format,
            quality
        });
    });
};
```

#### 2. Implement Granular Locking System
Replace global lock in main.ts:
```typescript
private locks = new Map<string, boolean>();

async withLock<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    if (this.locks.get(operation)) {
        throw new Error(`${operation} already in progress`);
    }
    this.locks.set(operation, true);
    try {
        return await fn();
    } finally {
        this.locks.set(operation, false);
    }
}

// Usage examples:
await this.withLock('handleClipboardImage', () => this.processImage(blob));
await this.withLock('handleOCR', () => this.runOCR(blob));
await this.withLock('handleSummarize', () => this.summarizeText(text));
```


## Priority Recommendations

### Tier 1: Implement Immediately (1-2 days effort)
1. [ ] Optimize `normalizeMathDelimiters` to single-pass regex
