export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // Handle messages from content script
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'selection_mode_enabled') {
      // Show magnifying glass when in select mode
      await updateBadge('🔍', '#F5F5DC', sender.tab?.id);
    } else if (message.type === 'selection_mode_disabled') {
      // Clear badge when select mode is disabled
      await updateBadge('', 'transparent', sender.tab?.id);
    } else if (message.type === 'grid_selected') {
      // Show badge when grid is selected
      await updateBadge('✓', '#4CAF50', sender.tab?.id);
    } else if (message.type === 'clear_badge') {
      // Clear badge
      await updateBadge('', 'transparent', sender.tab?.id);
    }
  });

  // Clear badge when popup is opened
  browser.action.onClicked.addListener(async (tab) => {
    await updateBadge('', 'transparent', tab.id);
  });

  async function updateBadge(text: string, color: string, tabId?: number) {
    try {
      await browser.action.setBadgeText({ text, tabId });
      await browser.action.setBadgeBackgroundColor({ color, tabId });
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }
});
