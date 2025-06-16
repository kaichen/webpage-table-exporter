import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['activeTab'],
    action: {
      default_title: '__MSG_extActionTitle__',
      default_popup: 'popup/index.html',
    },
  }
});
