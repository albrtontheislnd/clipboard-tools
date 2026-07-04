<script lang="ts" setup>
import type { LocalFileInputArgs, callbackValue } from '@/modals/localfile_modal';
import { PropType, ref } from 'vue';
import { Notice } from 'obsidian';
import { tUtils } from '@/libs/utils';

const props = defineProps({
  close: { type: Function, required: true },
  insertData: { type: Function, required: true },
  values: { type: Object as PropType<LocalFileInputArgs>, required: true },
});

const textContent = ref('');
const keepExtension = ref(props.values.keepExtension);

const handleCancel = () => {
  props.close();
};

const handleInsert = () => {
  const lines = textContent.value.split('\n');
  const results: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue; // silently skip empty lines
    }

    const { filename, fileUri } = tUtils.processFilePath(trimmed);

    if (!filename || !fileUri) {
      new Notice(`Invalid file path: ${trimmed}`);
      continue;
    }

    const displayName = keepExtension.value ? fileUri.split('/').pop()?.split('\\').pop() || filename : filename;
    results.push(`[${displayName}](${fileUri})`);
  }

  if (results.length === 0) {
    new Notice('No valid file paths to insert.');
    return;
  }

  const v: callbackValue = {
    textContent: results.join('\n'),
  };

  props.insertData(v);
};
</script>

<template>
<div>
  <textarea
    v-model="textContent"
    class="tbx"
    placeholder="Enter absolute file paths, one per line...&#10;e.g.,&#10;/home/user/Documents/report.pdf&#10;C:\Users\Name\file.docx&#10;\\server\share\presentation.pptx"
  ></textarea>
</div>
<div class="option-row">
  <label class="checkbox-label">
    <input type="checkbox" v-model="keepExtension" />
    <span v-once>Keep file extension in link text</span>
  </label>
</div>
<div class="fitsizer">
  <div class="btnwrapper"><button @click="handleCancel" class="cancelbtn">Cancel</button></div>
  <div class="btnwrapper"><button @click="handleInsert" class="insertbtn">Insert</button></div>
</div>
</template>

<style scoped>
.tbx {
  @apply w-full h-[200px] font-mono bg-gray-100 border border-gray-300 rounded-lg p-2 resize-none;
}

.option-row {
  @apply w-full py-2;
}

.checkbox-label {
  @apply flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none;
}

.fitsizer {
  @apply w-full h-auto flex flex-wrap justify-between items-center;
}

.cancelbtn {
  @apply bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 px-4 py-1;
}

.insertbtn {
  @apply bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 px-4 py-1;
}

.btnwrapper {
  @apply p-1;
}
</style>