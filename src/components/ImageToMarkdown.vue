<script lang="ts" setup>
import type { ImageTextModalInputArgs, callbackValue } from '@/aiprompt_modal';
import { PropType, ref } from 'vue';

const props = defineProps({
  close: { type: Function, required: true },
  insertData: { type: Function, required: true },
  values: { type: Object as PropType<ImageTextModalInputArgs>, required: true },
});

const imageUrl = ref('');
const textContent = ref(props.values.resultText);
const insertImage = ref(false);

imageUrl.value = URL.createObjectURL(props.values.imageSrc);

const handleImageLoad = () => {
  URL.revokeObjectURL(imageUrl.value);
  //console.log(`Image memory was released.`);
};

const handleCancel = () => {
  props.close();
};

const handleInsert = () => {
  const v: callbackValue = {
    includeImage: insertImage.value,
    textContent: textContent.value,
  };

  props.insertData(v);
};
</script>

<template>
<div><img :src="imageUrl" @load="handleImageLoad" class="sample-img" alt="Image description"></div>
<div><textarea v-model="textContent" class="tbx" placeholder="Type here..."></textarea></div>
<div class="fitsizer">
  <input type="checkbox" id="insertImage" v-model="insertImage" class="checkbox">
    <label for="insertImage" class="checkboxlbl">Insert image into editor?</label>
</div>
<div class="fitsizer">
  <button @click="handleCancel" class="cancelbtn">Cancel</button>
  <button @click="handleInsert" class="insertbtn">Insert</button>
</div>
</template>



<style scoped>
.sample-img {
  @apply w-full h-auto;
}

.tbx {
  @apply w-full h-[250px] font-mono bg-gray-100 border border-gray-300 rounded-lg p-2 resize-none;
}

.fitsizer {
  @apply w-full h-auto flex items-center space-x-2 py-2;
}

.checkbox {
  @apply w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500;
}

.checkboxlbl {
  @apply text-gray-700 font-medium;
}

.cancelbtn {
  @apply px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500;
}

.insertbtn {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

</style>
