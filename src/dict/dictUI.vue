<template>
  <div class="dict-container">
    <!-- Header -->
    <div class="dict-header">
      <h2 class="dict-title">Alapaki Dictionary</h2>
    </div>

    <!-- Language Selection -->
    <div class="dict-language-section">
      <div class="dict-language-wrapper">
        <select v-model="wordLanguage" class="dict-language-select">
          <option v-for="lang in LANGUAGES" :key="lang" :value="lang">{{ lang }}</option>
        </select>
        
        <button @click="swapLanguages" class="dict-swap-button">
          <svg xmlns="http://www.w3.org/2000/svg" class="dict-swap-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
        
        <select v-model="outputLanguage" class="dict-language-select">
          <option v-for="lang in LANGUAGES" :key="lang" :value="lang">{{ lang }}</option>
        </select>
      </div>
    </div>

    <!-- Search Input -->
    <div class="dict-search-section">
      <div class="dict-search-wrapper flex items-center">
        <input
          v-model="searchTerm"
          @keyup.enter.prevent="searchWord"
          type="text"
          placeholder="Search for a word..."
          class="dict-search-input flex-grow"
        />
        <button
          @click="searchWord"
          class="dict-search-button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="dict-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Results Area -->
    <div class="dict-results-area">
      <!-- Loading State -->
      <div v-if="loading" class="dict-loading-state">
        <div class="dict-spinner"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="dict-error-state">
        <p class="dict-error-message">{{ error }}</p>
      </div>

      <!-- Results -->
      <div v-else-if="definition" class="dict-results-content">
        <p v-html="definition" class="dict-definition"></p>
      </div>

      <!-- Empty State -->
      <div v-else class="dict-empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" class="dict-empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p class="dict-empty-text">Search for a word to get started</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import axios from 'axios';
import { ref } from 'vue';

const props = defineProps<{
  apiServer?: string;
}>();

const marked = new Marked({
  async: true,
  gfm: true,
  breaks: true,
  silent: true,
});

const LANGUAGES = ['Chinese', 'English', 'Vietnamese'] as const;
type Language = (typeof LANGUAGES)[number];

const searchTerm = ref('');
const definition = ref<string>('');
const loading = ref(false);
const error = ref('');
const wordLanguage = ref<Language>('Chinese');
const outputLanguage = ref<Language>('Vietnamese');

function swapLanguages() {
  const temp = wordLanguage.value;
  wordLanguage.value = outputLanguage.value;
  outputLanguage.value = temp;
}

	async function searchWord() {
    if (!searchTerm.value.trim()) return;

    loading.value = true;
    error.value = '';
    definition.value = '';

		try {
			const endpointUrl = `${props.apiServer}/text/dict`;

			const requestBody = {
				word: searchTerm.value,
				wordLanguage: wordLanguage.value,
				outputLanguage: outputLanguage.value
			};

			const response = await axios.post(endpointUrl, requestBody, {
				headers: {
					'Content-Type': 'application/json',
				},
				responseType: 'json',
			});

			const responseData = response.data as {
				success: boolean;
				errors?: string;
				messages?: string;
				result?: { text: string };
			};

			let resultText = '';
			if (responseData.success === true && responseData.result?.text) {
				resultText = responseData.result.text;
			} else if (responseData.errors) {
				resultText = `Text generation error: ${responseData.errors}`;
			} else {
				resultText = 'Text generation error: Unknown error occurred';
			}

      resultText = await marked.parseInline(resultText);
      resultText = DOMPurify.sanitize(resultText);

      definition.value = resultText;

		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : 'Unknown error';
			console.error('Error in text generation:', e);
			const errorText = `Error generating summary: ${errorMessage}`;
			
      error.value = errorText;
		}  finally {
      loading.value = false;
    }

	}
</script>

<style scoped>
.dict-container {
  @apply h-full flex flex-col;
}

.dict-header {
  @apply p-4;
}

.dict-title {
  @apply text-lg font-semibold;
}

.dict-language-section {
  @apply px-4 pb-2;
}

.dict-language-wrapper {
  @apply flex items-center gap-2;
}

.dict-language-select {
  @apply flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white;
}

.dict-swap-button {
  @apply bg-gray-200 text-gray-700 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 px-3 py-2 min-w-[42px] flex items-center justify-center;
}

.dict-swap-icon {
  @apply h-5 w-5;
}

.dict-search-section {
  @apply px-4 py-2;
}

.dict-search-wrapper {
  @apply flex items-center;
}

.dict-search-input {
  @apply flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.dict-search-button {
  @apply bg-blue-500 text-white border border-blue-500 rounded-r-md cursor-pointer hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 px-4 py-2 min-w-[42px] h-full;
}

.dict-search-icon {
  @apply h-5 w-5;
}

.dict-results-area {
  @apply flex-1 overflow-y-auto p-4;
}

.dict-loading-state {
  @apply flex items-center justify-center h-full;
}

.dict-spinner {
  @apply rounded-full h-12 w-12 border-b-2 border-blue-500 animate-spin;
}

.dict-error-state {
  @apply p-4 text-red-500;
}

.dict-error-message {
  @apply text-sm;
}

.dict-results-content {
  @apply space-y-4;
}

.dict-definition {
  @apply text-base leading-relaxed;
}

.dict-empty-state {
  @apply flex flex-col items-center justify-center h-full text-center text-gray-500;
}

.dict-empty-icon {
  @apply h-16 w-16 mb-4 text-gray-300;
}

.dict-empty-text {
  @apply text-base;
}
</style>
