export function isSupportedTab(tab: browser.tabs.Tab | undefined): boolean {
  if (!tab || !tab.id || !tab.url) {
    return false;
  }
  const unsupportedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'chrome-devtools://'
  ];
  return !unsupportedPrefixes.some(prefix => tab.url!.startsWith(prefix));
}
