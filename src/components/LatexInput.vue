<script setup lang="ts">
import { ref, computed, watch, PropType } from 'vue';
import katex from 'katex';

import { callbackValue, LatexInputArgs } from '@/modals/latex_modal';
import { accentsDelimitersSymbols } from '../latex_symbols/accentsDelimitersSymbols';
import { greekHebrewSymbols } from '../latex_symbols/greekHebrewSymbols';
import { miscellaneousSymbols } from '../latex_symbols/miscellaneousSymbols';
import { SymbolTab } from '../latex_symbols/interfaces';
import { mathModeAccents } from '@/latex_symbols/mathModeAccents';
import { arrowSymbols } from '@/latex_symbols/arrowSymbols';
import { miscellaneousSymbolsTwo } from '@/latex_symbols/miscellaneousSymbolsTwo';
import { relationsSymbols } from '@/latex_symbols/relationsSymbols';
import { negatedRelations } from '@/latex_symbols/negatedRelations';

// Combine all SymbolTab arrays into a single flat array
const allSymbolTabs: SymbolTab[] = [
  ...accentsDelimitersSymbols,
  ...greekHebrewSymbols,
  ...miscellaneousSymbols,
  ...mathModeAccents,
  ...arrowSymbols,
  ...miscellaneousSymbolsTwo,
  ...relationsSymbols,
  ...negatedRelations,
];

const props = defineProps({
  close: { type: Function, required: true },
  insertData: { type: Function, required: true },
  values: { type: Object as PropType<LatexInputArgs>, required: true },
});
const selectedText = ref(props.values.selectedText);

// Helper function to strip Markdown LaTeX delimiters
const stripLatexDelimiters = (text: string): string => {
  let stripped = text.trim();
  
  // Strip $$..$$ delimiters (block math)
  if (stripped.startsWith('$$') && stripped.endsWith('$$')) {
    stripped = stripped.substring(2, stripped.length - 2).trim();
  }
  // Strip $..$ delimiters (inline math)
  else if (stripped.startsWith('$') && stripped.endsWith('$')) {
    stripped = stripped.substring(1, stripped.length - 1).trim();
  }
  
  return stripped;
};

const latexInput = ref(selectedText.value && selectedText.value.trim() ? stripLatexDelimiters(selectedText.value) : '');
const renderedLatex = ref('');
const renderError = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const previewRef = ref<HTMLDivElement | null>(null);
const cursorPosition = ref(0);

// Initialize preview if selectedText is not empty
if (selectedText.value && selectedText.value.trim()) {
  try {
    renderedLatex.value = katex.renderToString(latexInput.value, {
      throwOnError: true,
      displayMode: true,
    });
    renderError.value = '';
  } catch (error) {
    renderError.value = error instanceof Error ? error.message : 'Invalid LaTeX syntax';
    renderedLatex.value = '';
  }
}

const symbolTabs = ref<SymbolTab[]>(allSymbolTabs);

const activeTab = ref(symbolTabs.value[0]?.id || '');


const currentSymbols = computed(() => {
  const tab = symbolTabs.value.find((t) => t.id === activeTab.value);
  return tab ? tab.symbols : [];
});

watch(latexInput, (newValue) => {
  try {
    renderedLatex.value = katex.renderToString(newValue || '', {
      throwOnError: true,
      displayMode: true,
    });
    renderError.value = '';
  } catch (error) {
    renderError.value = error instanceof Error ? error.message : 'Invalid LaTeX syntax';
    renderedLatex.value = '';
  }
});

const updateCursorPosition = () => {
  if (textareaRef.value) {
    cursorPosition.value = textareaRef.value.selectionStart;
  }
};

const insertSymbol = (latex: string) => {
  const textarea = textareaRef.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = latexInput.value;

  latexInput.value = text.substring(0, start) + latex + text.substring(end);

  const newCursorPos = start + latex.length;

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    cursorPosition.value = newCursorPos;
  }, 0);

  // Scroll to top of preview panel after preview updates
  setTimeout(() => {
    if (previewRef.value) {
      previewRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

const clearInput = () => {
  latexInput.value = '';
  textareaRef.value?.focus();
};

const submitLatex = () => {
  console.log('Submitted LaTeX:', latexInput.value);
  const v: callbackValue = {
    textContent: `
$$
\\begin{array}{l}
${latexInput.value}
\\end{array}
$$
    `,
  };

  props.insertData(v);
};

const submitLatexInline = () => {
  console.log('Submitted LaTeX:', latexInput.value);
  const v: callbackValue = {
    textContent: `$${latexInput.value}$`,
  };

  props.insertData(v);
};

const submitLatexPlain = () => {
  console.log('Submitted LaTeX:', latexInput.value);
  const v: callbackValue = {
    textContent: `${latexInput.value}`,
  };

  props.insertData(v);
};

const closeModal = () => {
  props.close();
};

</script>

<template>
  <div class="latex-input-container">
    <div class="preview-section">
      <div class="preview-container" ref="previewRef">
        <h3 class="preview-title">Preview</h3>
        <div v-if="renderError" class="error-message">
          <strong>Error:</strong> {{ renderError }}
        </div>
        <div
          v-else-if="renderedLatex"
          class="preview-content"
          v-html="renderedLatex"
        ></div>
        <div v-else class="preview-placeholder">
          Type or click symbols to see preview...
        </div>
      </div>

      <div class="input-container">
        <div class="input-header">
          <h3 class="input-title">LaTeX Input</h3>
          <div class="input-actions">
            <button
              @click="clearInput"
              class="clear-button"
            >
              clear
            </button>
            <button
              @click="submitLatexPlain"
              class="submit-button"
            >
              plain
            </button>
            <button
              @click="submitLatexInline"
              class="submit-button"
            >
              $..$
            </button>
            <button
              @click="submitLatex"
              class="submit-button"
            >
              $$..$$
            </button>
            <button
              @click="closeModal"
              class="close-button"
            >
              close
            </button>
          </div>
        </div>
        <textarea
          ref="textareaRef"
          v-model="latexInput"
          @input="updateCursorPosition"
          @click="updateCursorPosition"
          @keyup="updateCursorPosition"
          class="latex-textarea"
          placeholder="Type LaTeX code here or use the symbol palette..."
        ></textarea>
      </div>
    </div>

    <div class="symbol-panel">
      <div class="tab-buttons">
        <button
          v-for="tab in symbolTabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'tab-button',
            activeTab === tab.id ? 'tab-button-active' : 'tab-button-inactive',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="symbols-grid">
        <div
          v-for="(row, rowIndex) in currentSymbols"
          :key="rowIndex"
          class="symbol-row"
          :style="{ gridTemplateColumns: 'repeat(10, 1fr)' }"
        >
          <button
            v-for="(symbol, colIndex) in row"
            :key="colIndex"
            @click="insertSymbol(typeof symbol === 'object' && 'latex' in symbol ? symbol.latex : '')"
            :title="typeof symbol === 'object' && 'tooltip' in symbol ? symbol.tooltip : ''"
            class="symbol-button"
            :class="{ 'empty-button': typeof symbol !== 'object' || !('latex' in symbol) }"
          >
            <span v-if="typeof symbol === 'object' && 'latex' in symbol" class="symbol-display" v-html="symbol.display"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.latex-input-container {
  @apply bg-gray-100 flex flex-col space-y-2 p-2;
}

.preview-section {
  @apply flex flex-col space-y-2;
}

.preview-container {
  @apply bg-white border-2 border-gray-300 rounded-lg p-3 overflow-auto min-h-[150px];
}

.preview-title {
  @apply text-sm font-semibold mb-2 text-gray-700;
}

.error-message {
  @apply text-red-600 bg-red-50 p-2 rounded-lg border border-red-200 text-sm;
}

.preview-content {
  @apply text-center text-xl;
}

.preview-placeholder {
  @apply text-gray-400 text-center italic text-sm;
}

.input-container {
  @apply bg-white border-2 border-gray-300 rounded-lg p-3 flex flex-col min-h-[150px];
}

.input-header {
  @apply flex justify-between items-center mb-2;
}

.input-title {
  @apply text-sm font-semibold text-gray-700;
}

.input-actions {
  @apply space-x-1;
}

.clear-button {
  @apply px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors;
}

.submit-button {
  @apply px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors;
}

.close-button {
  @apply px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors;
}

.latex-textarea {
  @apply flex-1 w-full p-2 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.symbol-panel {
  @apply bg-gray-200 p-2 overflow-y-auto border-2 border-gray-300 rounded min-h-[200px];
}

.tab-buttons {
  @apply flex space-x-1 mb-2 border-b-2 border-gray-400 pb-1;
}

.tab-button {
  @apply px-2 py-1 text-sm font-medium transition-colors;
}

.tab-button-active {
  @apply text-blue-600 border-b-2 border-blue-600;
}

.tab-button-inactive {
  @apply text-gray-600 hover:text-gray-900;
}

.symbols-grid {
  @apply space-y-0.5;
}

.symbol-row {
  @apply grid gap-0.5;
}

.symbol-button {
  @apply bg-white hover:bg-blue-50 border border-gray-300 rounded py-2 px-1 text-center transition-all hover:shadow-md active:scale-95 flex items-center justify-center min-h-[40px] max-h-[40px] aspect-square;
}

.symbol-button.empty-button {
  @apply invisible pointer-events-none;
}

.symbol-display {
  @apply text-sm;
}
</style>
