import { nextTick, onBeforeUnmount, readonly, ref } from 'vue';
import type { Ref } from 'vue';

interface PanelOptions {
  alignment: 'left' | 'right';
  matchTriggerWidth?: boolean;
  focusOnShow: () => void;
  onShow?: () => void;
  onClose?: () => void;
  keydown?: (event: KeyboardEvent) => void;
  restoreFocusOnDismiss?: boolean;
  selectionFocus?: 'before' | 'after';
}

export interface PanelLifecycle<T extends HTMLElement = HTMLButtonElement> {
  readonly open: Readonly<Ref<boolean>>;
  readonly trigger: Ref<T | undefined>;
  readonly panel: Ref<HTMLDivElement | undefined>;
  readonly position: Ref<{ left: string; top: string; width?: string }>;
  show(): Promise<void>;
  // False when a newer operation or unmount supersedes this dismissal.
  close(restoreFocus?: boolean): Promise<boolean>;
  reposition(): void;
  runAfterClose(action: () => void): Promise<void>;
}

export function usePanelLifecycle<T extends HTMLElement = HTMLButtonElement>(
  options: PanelOptions,
): PanelLifecycle<T> {
  const open = ref(false);
  const trigger = ref<T>() as Ref<T | undefined>;
  const panel = ref<HTMLDivElement>();
  const position = ref<{ left: string; top: string; width?: string }>({
    left: '8px',
    top: '8px',
  });
  let sizeObserver: ResizeObserver | undefined;
  let revision = 0;
  let disposed = false;

  function reposition() {
    if (!open.value || !trigger.value || !panel.value) return;
    const anchor = trigger.value.getBoundingClientRect();
    const width = options.matchTriggerWidth ? `${anchor.width}px` : undefined;
    // Measure height after fitting the width, because long options can wrap.
    if (width) panel.value.style.width = width;
    const bounds = panel.value.getBoundingClientRect();
    const left = options.alignment === 'right' ? anchor.right - bounds.width : anchor.left;
    position.value = {
      left: `${Math.max(8, Math.min(left, window.innerWidth - bounds.width - 8))}px`,
      top: `${Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 8))}px`,
      ...(width ? { width } : {}),
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
    if (options.matchTriggerWidth && typeof ResizeObserver !== 'undefined') {
      sizeObserver ??= new ResizeObserver(reposition);
      sizeObserver.observe(trigger.value);
    }
    options.focusOnShow();
  }

  async function close(restoreFocus = options.restoreFocusOnDismiss ?? true) {
    const current = ++revision;
    open.value = false;
    sizeObserver?.disconnect();
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
    sizeObserver?.disconnect();
    document.removeEventListener('keydown', keydown);
  });

  return { open: readonly(open), trigger, panel, position, show, close, reposition, runAfterClose };
}
