# Webpage Table Exporter

![promo-image](/assets/prompo-img-1400x560.jpg)

> A friendly open-source browser extension that lets you export any HTML table from a webpage to a CSV file with just one click. Works great in Chrome and Firefox!

Install from [Chrome Web Store](https://chromewebstore.google.com/detail/web-page-table-exporter/llceinicghclnlgofnagejkeibfpgcop)

## Features
- Instantly scans and lists all visible tables on the page
- Exports tables as UTF-8 CSV (with BOM), fully compatible with Excel
- Highlights and locates tables for easy selection
- Handles merged cells, special characters, and all sorts of complex table layouts
- Works on multi-page and dynamic websites
- Built with React, TypeScript, and WXT for maintainable, modern code

## Developer Setup
Want to play with the source or contribute? Here’s how to get started:

```bash
git clone https://github.com/kaichen/webpage-table-exporter.git
cd webpage-table-exporter
bun install
bun run build
```

Then load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable Developer Mode
3. Click “Load unpacked” and select the `.output/chrome-mv3` folder

## How to Use
1. After installing, click the extension icon in your browser toolbar to open the popup
2. Hit “Scan Tables” to automatically detect all tables on the current page
3. Highlight and locate tables as needed, then click “Export CSV” to download the data
4. The exported file name includes the site name and timestamp, so you never overwrite old files

## Example Pages
Check out the `examples/` folder for a bunch of sample tables you can use for testing and demos.

## Contributing
Pull requests are super welcome! Feel free to suggest features or report issues.

## License
MIT License
