import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Web Page Table Exporter',
    permissions: ['activeTab'],
    action: {
      default_popup: 'popup/index.html',
    },
  }
});
