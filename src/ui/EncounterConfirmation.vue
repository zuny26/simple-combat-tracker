<script setup lang="ts">
import { computed, nextTick, ref, shallowRef } from 'vue';
import type { Ref } from 'vue';

const { focusFallback } = defineProps<{ focusFallback: () => void }>();

interface ConfirmationRequest {
  title: string;
  message?: string;
  acceptLabel: string;
  changes?: readonly string[];
  destructive?: boolean;
  required: boolean;
  onAccept: () => void;
}

interface EncounterConfirmation {
  readonly open: Readonly<Ref<boolean>>;
  confirm(request: ConfirmationRequest, trigger: HTMLElement): Promise<void>;
}

const pending = shallowRef<(ConfirmationRequest & { trigger: HTMLElement }) | null>(null);
const cancelButton = ref<HTMLButtonElement>();
const acceptButton = ref<HTMLButtonElement>();

async function confirm(request: ConfirmationRequest, trigger: HTMLElement) {
  if (!request.required) {
    request.onAccept();
    return;
  }
  pending.value = { ...request, trigger };
  await nextTick();
  cancelButton.value?.focus();
}

async function closeConfirmation(accepted = false) {
  const request = pending.value;
  if (!request) return;
  pending.value = null;
  if (accepted) request.onAccept();
  await nextTick();
  if (request.trigger.isConnected) request.trigger.focus();
  else focusFallback();
}

function confirmationKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    void closeConfirmation();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    if (document.activeElement === cancelButton.value) acceptButton.value?.focus();
    else cancelButton.value?.focus();
  }
}

defineExpose<EncounterConfirmation>({
  open: computed(() => pending.value !== null),
  confirm,
});
</script>

<template>
  <div
    v-if="pending"
    class="confirm-backdrop"
    @click.self="closeConfirmation()"
    @keydown="confirmationKeydown"
  >
    <section
      class="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
    >
      <h2 id="confirm-title" class="confirm-title">
        {{ pending.title }}
      </h2>
      <div id="confirm-body" class="confirm-body">
        <p v-if="pending.message">{{ pending.message }}</p>
        <ul v-if="pending.changes?.length">
          <li v-for="change in pending.changes" :key="change">
            <strong>{{ change }}</strong>
          </li>
        </ul>
      </div>
      <div class="confirm-actions">
        <button
          id="confirm-cancel-btn"
          ref="cancelButton"
          type="button"
          class="btn"
          @click="closeConfirmation()"
        >
          Cancel
        </button>
        <button
          id="confirm-ok-btn"
          ref="acceptButton"
          type="button"
          class="btn"
          :class="pending.destructive === false ? 'btn-primary' : 'btn-danger'"
          @click="closeConfirmation(true)"
        >
          {{ pending.acceptLabel }}
        </button>
      </div>
    </section>
  </div>
</template>
