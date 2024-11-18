<script lang="ts" setup>
import type { ChangeCaseInputArgs, callbackValue } from '@/changecase_modal';
import { PropType, ref } from 'vue';

const props = defineProps({
  close: { type: Function, required: true },
  insertData: { type: Function, required: true },
  values: { type: Object as PropType<ChangeCaseInputArgs>, required: true },
});

const optionsCase = [
  'Sentence case',
  'lower case',
  'UPPER CASE',
  'Capitalized Case',
  'aLtErNaTiNg cAsE',
  'Title Case',
  'InVeRsE CaSe',
];

const textContent = ref(props.values.selectedText);

const handleCancel = () => {
  props.close();
};

const handleInsert = () => {
  const v: callbackValue = {
    textContent: textContent.value,
  };

  props.insertData(v);
};

const handleCase = (optionCase: string) => {

  switch (optionCase) {
    case 'Sentence case':
      textContent.value = toSentenceCase(textContent.value);
      break;

    case 'lower case':
      textContent.value = toLowerCase(textContent.value);
      break;

    case 'UPPER CASE':
      textContent.value = toUpperCase(textContent.value);
      break;

    case 'Capitalized Case':
      textContent.value = toCapitalizedCase(textContent.value);
      break;

    case 'aLtErNaTiNg cAsE':
      textContent.value = toAlternatingCase(textContent.value);
      break;

    case 'Title Case':
      textContent.value = toTitleCase(textContent.value);
      break;

    case 'InVeRsE CaSe':
      textContent.value = toInverseCase(textContent.value);
      break;

    default:
      break;
  }
};

// 1. Sentence case
function toSentenceCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// 2. Lower case
function toLowerCase(str: string): string {
    return str.toLowerCase();
}

// 3. UPPER CASE
function toUpperCase(str: string): string {
    return str.toUpperCase();
}

// 4. Capitalized Case
function toCapitalizedCase(str: string): string {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

// 5. aLtErNaTiNg cAsE
function toAlternatingCase(str: string): string {
    return str.split('').map((char, index) => index % 2 === 0 ? char.toUpperCase() : char.toLowerCase()).join('');
}

// 6. Title Case
function toTitleCase(str: string): string {
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

// 7. InVeRsE CaSe
function toInverseCase(str: string): string {
    return str.split('').map(char => char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()).join('');
}
</script>

<template>
<div><textarea v-model="textContent" class="tbx" placeholder="Type here..."></textarea></div>
<div class="fitsizer">
  <template v-for="item in optionsCase">
    <div class="btnwrapper"><button @click="handleCase(item)" class="insertbtn">{{ item }}</button></div>
  </template>
</div>
<div class="fitsizer">
  <div class="btnwrapper"><button @click="handleCancel" class="cancelbtn">Cancel</button></div>
  <div class="btnwrapper"><button @click="handleInsert" class="insertbtn">Insert</button></div>
</div>
</template>



<style scoped>
.tbx {
  @apply w-full h-[150px] font-mono bg-gray-100 border border-gray-300 rounded-lg p-2 resize-none;
}

.fitsizer {
  @apply w-full h-auto flex flex-wrap justify-items-start items-start;
}

.cancelbtn {
  @apply bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500;
}

.insertbtn {
  @apply bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.btnwrapper {
  @apply p-1
}

</style>
