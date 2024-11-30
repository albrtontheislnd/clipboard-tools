<script lang="ts" setup>
import { ImgS3PluginSettings } from '@/interfaces';
import { PropType, Ref, ref } from 'vue';
import { z } from 'zod';

const props = defineProps({
  close: { type: Function, required: true },
  updateSettings: { type: Function, required: true },
  values: { type: Object as PropType<ImgS3PluginSettings>, required: true },
});

// config fields
const enabled: Ref<boolean> = ref(false);
const region: Ref<string> = ref('auto');
const bucket: Ref<string> = ref('obsidian');
const accessKey: Ref<string> = ref('');
const secret: Ref<string> = ref('');
const endpoint: Ref<string> = ref('');
const publicURLPrefix: Ref<string> = ref('https://www.yourdomain.com');

// assign values
if(typeof props.values.enabled == 'boolean') enabled.value = props.values.enabled;
if(props.values.region) region.value = props.values.region;
if(props.values.bucket) bucket.value = props.values.bucket;
if(props.values.accessKey) accessKey.value = props.values.accessKey;
if(props.values.secret) secret.value = props.values.secret;
if(props.values.endpoint) endpoint.value = props.values.endpoint;
if(props.values.publicURLPrefix) publicURLPrefix.value = props.values.publicURLPrefix;

// Define a custom validation function for HTTPS URLs
const httpUrlSchema = z.string().refine((url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch (e) {
    return false;
  }
}, {
  message: "Invalid HTTP/HTTPS URL",
});

const httpsUrlSchema = z.string().refine((url) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:';
  } catch (e) {
    return false;
  }
}, {
  message: "Invalid HTTPS URL",
});

const s3BucketNameSchema = z.string().refine((name) => {
  const s3BucketNamePattern = /^[a-z0-9.-]{3,63}$/;
  const isValidLength = name.length >= 3 && name.length <= 63;
  const isValidPattern = s3BucketNamePattern.test(name);
  const isNotIpAddress = !/^\d+\.\d+\.\d+\.\d+$/.test(name);
  return isValidLength && isValidPattern && isNotIpAddress;
}, {
  message: "Invalid S3 bucket name",
});

const alphanumericHyphenSchema = z.string().regex(/^[a-zA-Z0-9-]+$/, {
  message: "Invalid string: only alphanumeric characters and hyphens are allowed",
});

const handleCancel = () => {
  if (confirm("Do you want to cancel?")) {
    props.close();
  } 
};

const handleInsert = () => {
  const result: ImgS3PluginSettings = {
    enabled: enabled.value
  };

  // check endpoint:
  const trimmedEndpoint = endpoint.value.trim();
  result.endpoint = httpsUrlSchema.safeParse(trimmedEndpoint).success ? trimmedEndpoint : '';

  // check bucket
  result.bucket = s3BucketNameSchema.safeParse(bucket.value).success ? bucket.value : '';

  // check region
  result.region = alphanumericHyphenSchema.safeParse(region.value).success ? region.value : 'auto';

  // check accessKey and secret
  result.accessKey = accessKey.value.trim();
  result.secret = secret.value.trim();

  // check endpoint:
  const trimmedPublicURLPrefix = publicURLPrefix.value.trim();
  result.publicURLPrefix = httpUrlSchema.safeParse(trimmedPublicURLPrefix).success ? trimmedPublicURLPrefix : '';

  props.updateSettings(result, 'save');
};
</script>

<template>
<div></div>
<!-- table -->
<div class="editor-table-wrapper">
    <table class="editor-table">
    <caption><b>S3 Image Upload settings</b></caption>
      <tbody>
          <tr>
            <td><label for="f_enabled" class="tbx-lbl">Enable?</label></td>
            <td><input type="checkbox" id="f_enabled" class="tbx-lbl" v-model="enabled" /></td>
          </tr>
          <tr>
            <td><label class="tbx-lbl">Public URL Prefix</label></td>
            <td><input type="text" class="tbx" v-model="publicURLPrefix" spellcheck="false" autocomplete="off"/></td>
          </tr>
          <tr>
            <td><label class="tbx-lbl">Endpoint</label></td>
            <td><input type="text" class="tbx" v-model="endpoint" spellcheck="false" autocomplete="off"/></td>
          </tr>
          <tr>
            <td><label class="tbx-lbl">Bucket</label></td>
            <td><input type="text" class="tbx" v-model="bucket" spellcheck="false" autocomplete="off"/></td>
          </tr>
          <tr>
            <td><label class="tbx-lbl">Region</label></td>
            <td><input type="text" class="tbx" v-model="region" spellcheck="false" autocomplete="off"/></td>
          </tr>
          <tr>
            <td><label class="tbx-lbl">Access Key</label></td>
            <td><input type="text" class="tbx" v-model="accessKey" spellcheck="false" autocomplete="off"/></td>
          </tr>
          <tr>
            <td><label class="tbx-lbl">Secret</label></td>
            <td><input type="text" class="tbx" v-model="secret" spellcheck="false" autocomplete="off"/></td>
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
