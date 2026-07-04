<template>
  <div class="container">
    <!-- Main content area -->
    <div class="main-content">
      <!-- Text area for accumulated symbols -->
      <textarea
        v-model="accumulatedText"
        placeholder="Selected symbols will appear here..."
        class="accumulated-text"
        rows="3"
      ></textarea>
      
      <!-- Search input -->
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search symbols..."
        class="search-input"
      />

      <!-- Symbol list -->
      <div class="symbol-list">
        <div
          v-for="(symbol, index) in filteredSymbols"
          :key="`${symbol.category}-${index}`"
          @click="selectSymbol(symbol)"
          :class="[
            'symbol-item',
            { 'symbol-item-selected': selectedSymbol?.latex === symbol.latex }
          ]"
        >
          <span class="symbol-latex">{{ symbol.latex }}</span>
          <span class="symbol-char">{{ symbol.display }}</span>
        </div>
      </div>
    </div>

    <!-- Right sidebar -->
    <div class="sidebar">
      <button
        v-for="action in sidebarCategories"
        :key="action.category"
        v-once
        @click="handleAction(action.category)"
        :class="[
          'sidebar-button',
          { 'sidebar-button-highlight': selectedCategory === action.category }
        ]"
      >
        {{ action.label }}
      </button>
      <button
        @click="insertAccumulatedText('inline')"
        class="sidebar-button sidebar-button-insert"
        title="Insert accumulated text"
      >
        $..$
      </button>
      <button
        @click="insertAccumulatedText('block')"
        class="sidebar-button sidebar-button-insert"
        title="Insert accumulated text"
      >
        $$..$$
      </button>
      <button
        @click="insertAccumulatedText('plain')"
        class="sidebar-button sidebar-button-insert"
        title="Insert accumulated text"
      >
        🇵
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, PropType } from 'vue';
import { latexSidebarCategoryIcons, latexCategories } from '../latex_symbols/latexAll';
import { latexSymbol } from '@/latex_symbols/interfaces';
import { LatexModalInputArgs } from '@/modals/latex_modal';

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

// Group symbols by category for faster filtering
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

interface SidebarCategory {
  label: string;
  category: string;
  highlight?: boolean;
}

const props = defineProps({
  close: { type: Function, required: true },
  insertData: { type: Function, required: true },
  values: { type: Object as PropType<LatexModalInputArgs>, required: true },
});

// State
const searchQuery = ref('');
const selectedCategory = ref<string>('All');
const selectedSymbol = ref<latexSymbol | null>(null);
const accumulatedText = ref<string>('');

// Debounced search query
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

// Memoized filtered symbols
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

// Methods
const selectSymbol = (symbol: latexSymbol) => {
  selectedSymbol.value = symbol;
  accumulatedText.value += symbol.latex;
};

const handleAction = (category: string) => {
  selectedCategory.value = category;
};

const insertAccumulatedText = (insertType: 'inline' | 'block' | 'plain' = 'inline') => {
  const text = accumulatedText.value.trim();
  if (!text) return; // Don't insert empty text
  
  const textToInsert = 
    insertType === 'inline' ? `$${text}$` :
    insertType === 'block' ? `$$${text}$$` :
    text;

  props.insertData({
    textContent: textToInsert,
  });
};

// Cleanup on unmount
onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
});

</script>

<style scoped>
.container {
  @apply flex gap-2 w-full max-w-3xl bg-white border border-gray-300 rounded-lg p-3 overflow-hidden;
}

.main-content {
  @apply flex-1 flex flex-col;
}

.accumulated-text {
  @apply w-full px-2 py-1.5 border border-gray-300 rounded mb-2 text-sm resize-none;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500;
  @apply font-mono;
}

.search-input {
  @apply w-full px-2 py-1.5 border border-gray-300 rounded mb-2 text-sm;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.symbol-list {
  @apply flex-1 overflow-y-auto border border-gray-200 rounded min-h-[250px];
}

.symbol-item {
  @apply flex justify-between items-center px-3 py-1.5 cursor-pointer text-sm;
  @apply hover:bg-gray-100;
}

.symbol-item-selected {
  @apply bg-green-200 hover:bg-green-200;
}

.symbol-latex {
  @apply font-mono text-xs;
}

.symbol-char {
  @apply text-xl;
}

.category-tabs {
  @apply flex gap-4 mt-3 pt-3 border-t border-gray-200;
}

.category-tab {
  @apply px-3 py-1 text-sm font-medium transition-colors;
  @apply text-gray-600 hover:text-gray-900;
}

.category-tab-active {
  @apply text-blue-600 border-b-2 border-blue-600;
}

.description {
  @apply text-sm text-gray-500 italic mt-2;
}

.sidebar {
  @apply flex flex-col gap-1 w-12;
}

.sidebar-button {
  @apply h-10 border border-gray-300 rounded;
  @apply flex items-center justify-center text-xs font-medium;
  @apply bg-white hover:bg-gray-100 transition-colors;
}

.sidebar-button-highlight {
  @apply bg-green-200 hover:bg-green-300;
}

.sidebar-button-insert {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}
</style>
