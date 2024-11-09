<!-- src/components/MyModal.vue -->
<template>
  <div class="modal-content">
    <h2>My Vue Modal</h2>
    <p class="">This is a modal content powered by Vue.</p>
    <button @click="closeModal" class="mgreen">Close</button>
  </div>


</template>

<script>
export default {
  props: ['close'],
  methods: {
    closeModal() {
      this.close();
    }
  }
}
</script>

<style>
.modal-content {
  padding: 20px;
}



.mgreen {
  @apply focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900;
}
</style>
