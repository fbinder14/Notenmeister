import './styles/app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { app } from './lib/state/app.svelte';
// Schriftgröße vor dem ersten Zeichnen setzen, damit nichts springt.
import './lib/state/fontScale.svelte';

mount(App, { target: document.getElementById('app')! });
void app.init();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service Worker nicht registriert', e));
  });
  // Neue Version übernehmen: sofort, wenn gesperrt; sonst beim nächsten Sperren.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (app.phase === 'ready') app.updateReady = true;
    else location.reload();
  });
}
