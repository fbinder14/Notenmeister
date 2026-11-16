export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

let next = 1;

class Toasts {
  items = $state<Toast[]>([]);

  push(kind: Toast['kind'], text: string, ms = 3200) {
    const id = next++;
    this.items.push({ id, kind, text });
    setTimeout(() => this.dismiss(id), ms);
  }
  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
  success(t: string) {
    this.push('success', t);
  }
  error(t: string) {
    this.push('error', t, 6000);
  }
  info(t: string) {
    this.push('info', t);
  }
}

export const toast = new Toasts();
