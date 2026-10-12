<script setup lang="ts">
import type { BookmarkState } from '../profiles/profileRegistry';
defineProps<{ state: BookmarkState }>();
</script>

<template>
  <svg
    :data-bookmark-state="state"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path class="bookmark-shape" d="M6 3h12v18l-6-4-6 4z" />
    <path class="bookmark-difference" d="M12 7v4m0 3h.01" />
  </svg>
</template>
