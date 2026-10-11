import { nextTick, onBeforeUnmount, readonly, ref } from 'vue';
import type { Ref } from 'vue';

interface PanelOptions {
  alignment: 'left' | 'right';
  focusOnShow: () => void;
  onShow?: () => void;
  onClose?: () => void;
  keydown?: (event: KeyboardEvent) => void;
  restoreFocusOnDismiss?: boolean;
  selectionFocus?: 'before' | 'after';
}

export interface PanelLifecycle {
  readonly open: Readonly<Ref<boolean>>;
  readonly trigger: Ref<HTMLButtonElement | undefined>;
  readonly panel: Ref<HTMLDivElement | undefined>;
  readonly position: Ref<{ left: string; top: string }>;
  show(): Promise<void>;
  // False when a newer operation or unmount supersedes this dismissal.
  close(restoreFocus?: boolean): Promise<boolean>;
  reposition(): void;
  runAfterClose(action: () => void): Promise<void>;
}

export function usePanelLifecycle(options: PanelOptions): PanelLifecycle {
  const open = ref(false);
  const trigger = ref<HTMLButtonElement>();
  const panel = ref<HTMLDivElement>();
  const position = ref({ left: '8px', top: '8px' });
  let revision = 0;
  let disposed = false;

  function reposition() {
    if (!open.value || !trigger.value || !panel.value) return;
    const anchor = trigger.value.getBoundingClientRect();
    const bounds = panel.value.getBoundingClientRect();
    const left = options.alignment === 'right' ? anchor.right - bounds.width : anchor.left;
    position.value = {
      left: `${Math.max(8, Math.min(left, window.innerWidth - bounds.width - 8))}px`,
      top: `${Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 8))}px`,
    };
  }

  async function show() {
    if (disposed) return;
    const current = ++revision;
    options.onShow?.();
    open.value = true;
    document.addEventListener('keydown', keydown);
    await nextTick();
    if (disposed || current !== revision || !open.value || !trigger.value || !panel.value) return;
    reposition();
    options.focusOnShow();
  }

  async function close(restoreFocus = options.restoreFocusOnDismiss ?? true) {
    const current = ++revision;
    open.value = false;
    document.removeEventListener('keydown', keydown);
    options.onClose?.();
    await nextTick();
    if (disposed || current !== revision) return false;
    if (restoreFocus) trigger.value?.focus();
    return true;
  }

  async function runAfterClose(action: () => void) {
    // Callers cannot run an action or save while the panel is still rendered.
    if (!(await close(false))) return;
    if (options.selectionFocus !== 'after') trigger.value?.focus();
    action();
    if (!disposed && options.selectionFocus === 'after') trigger.value?.focus();
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      void close(true);
    } else options.keydown?.(event);
  }

  onBeforeUnmount(() => {
    disposed = true;
    revision++;
    document.removeEventListener('keydown', keydown);
  });

  return { open: readonly(open), trigger, panel, position, show, close, reposition, runAfterClose };
}
