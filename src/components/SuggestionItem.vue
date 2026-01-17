<!-- SuggestionItem.vue -->
<template>
  <div class="latex-suggestion-item" :class="{ 'is-selected': isSelected }">
    <!-- <div class="latex-bullet"></div> -->
    <span class="latex-symbol-preview">{{ suggestion.symbol }}</span>
    <span class="latex-command-text">{{ suggestion.command }}</span>
    <span v-if="suggestion.category" class="latex-category">{{ suggestion.category }}</span>
  </div>
</template>

<script setup lang="ts">
import { latexSuggestion } from '@/latex_symbols/interfaces';


defineProps<{
  suggestion: latexSuggestion;
  isSelected: boolean;
}>();
</script>

<style scoped>
.latex-suggestion-item {
  @apply flex items-center px-4 py-3 gap-3 cursor-pointer transition-colors duration-100 ease-linear;
  @apply sm:px-2 sm:py-2 sm:gap-2;
}

.latex-suggestion-item:hover,
.latex-suggestion-item.is-selected {
  @apply bg-[var(--background-modifier-hover)];
}

.latex-bullet {
  @apply w-2 h-2 rounded-full bg-green-400 flex-shrink-0;
}

.latex-command-text {
  @apply font-mono text-sm text-[var(--text-normal)] flex-grow;
  @apply sm:text-xs;
}

.latex-symbol-preview {
  @apply text-2xl text-[var(--text-muted)] ml-auto font-light leading-none;
  @apply sm:text-xl;
}

.latex-category {
  @apply text-xs text-[var(--text-faint)] uppercase px-1.5 py-0.5 bg-[var(--background-modifier-border)] rounded;
  @apply sm:text-[10px] sm:px-1 sm:py-0.5;
}

.is-selected .latex-symbol-preview {
  @apply text-[var(--text-normal)];
}
</style>
