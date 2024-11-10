<script lang="ts" setup>
import { AIModelSetting } from '@/interfaces';
import { PropType, Ref, ref } from 'vue';

const props = defineProps({
  close: { type: Function, required: true },
  updateSettings: { type: Function, required: true },
  values: { type: Object as PropType<AIModelSetting[]>, required: true },
});

const textboxes: Ref<AIModelSetting[]> = ref([]);
textboxes.value = props.values;

const updateTextbox = (index: number, value: string) => {
  textboxes.value[index].rawApiKey = value.trim();
  // console.log(`${textboxes.value[index].platform_id}/${textboxes.value[index].model_id}: changed (${textboxes.value[index].rawApiKey})`);
};

const handleCancel = () => {
  if (confirm("Do you want to continue?")) {
    props.close();
  } 
};

const handleInsert = () => {
  props.updateSettings(textboxes.value, 'save');
};
</script>

<template>
<div></div>
<!-- table -->
<div class="editor-table-wrapper">
    <table class="editor-table">
    <caption><b>API Keys Editor</b></caption>
      <tbody>
          <tr v-for="(value, index) in textboxes" :key="index">
              <td>
                <p><label :for="`textbox-${index}`" class="tbx-lbl">{{ value.platform_id }} - {{ value.model_id }}:</label></p>
                <p><input :id="`textbox-${index}`" type="text" class="tbx" :value="value.rawApiKey" @change="updateTextbox(index, ($event?.target as HTMLInputElement).value)" spellcheck="false" autocomplete="off"/></p>
              </td>
          </tr>
      </tbody>
    </table>
</div>

<!-- /table -->
<div class="fitsizer">
  <button @click="handleCancel" class="cancelbtn">Cancel</button>
  <button @click="handleInsert" class="insertbtn">Save...</button>
</div>
</template>



<style scoped>
.editor-table-wrapper {
  @apply relative;
}

.editor-table {
  @apply w-full;
}

.editor-table > caption {
  @apply text-blue-700 text-left;
}

.editor-table tr {
  @apply bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600;
}

.editor-table td {
  @apply px-1 py-1;
}

.tbx {
  @apply w-full font-mono bg-gray-100 border border-gray-300 rounded-lg p-2;
}

.tbx-lbl {
  @apply font-bold text-blue-700;
}

.fitsizer {
  @apply w-full h-auto flex items-center space-x-2 py-2;
}

.cancelbtn {
  @apply px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500;
}

.insertbtn {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

</style>
