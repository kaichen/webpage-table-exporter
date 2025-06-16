# Webpage Table Exporter

![promo-image](assets/promo-img-1400x560.jpg)

> A friendly open-source browser extension that lets you export HTML tables and non-table grid structures from any webpage to CSV files with just one click. Works great in Chrome and Firefox!

Install from [Chrome Web Store](https://chromewebstore.google.com/detail/web-page-table-exporter/llceinicghclnlgofnagejkeibfpgcop)

## Features
- **Smart Table Detection**: Instantly scans and lists all visible HTML tables on the page
- **Non-Table Grid Export**: Select and export div-based grids and tabular layouts that don't use HTML `<table>` tags
- **Mouse Selection Mode**: Click to select grid elements, automatically detects similar sibling structures
- **CSV Export**: Exports data as UTF-8 CSV (with BOM), fully compatible with Excel
- **Visual Feedback**: Highlights and locates tables/grids for easy identification
- **Smart File Naming**: Downloads use format `table-{hostname}-{timestamp}.csv` for organization
- **Complex Layout Support**: Handles merged cells, special characters, and all sorts of complex layouts
- **Dynamic Website Support**: Works on multi-page and dynamically loaded content
- **Modern Architecture**: Built with React, TypeScript, and WXT for maintainable, modern code

## Developer Setup
Want to play with the source or contribute? Here's how to get started:

```bash
git clone https://github.com/kaichen/webpage-table-exporter.git
cd webpage-table-exporter
bun install
bun run build
```

Then load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" and select the `.output/chrome-mv3` folder

## How to Use

### For HTML Tables
1. Click the extension icon in your browser toolbar to open the popup
2. The extension automatically scans and lists all tables on the page
3. Click on any table item to highlight it on the page
4. Click "Export CSV" to download the table data
5. Files are saved as `table-{hostname}-{timestamp}.csv`

### For Non-Table Grids (New!)
1. If no tables are found, or to select custom grid structures, click "Select Elements"
2. Your cursor changes to crosshair mode - hover over elements to see potential grid rows
3. Click on any row element that's part of a grid structure
4. The extension automatically detects similar sibling elements and treats them as table rows
5. A green "GRID" indicator appears in the popup for detected grid structures
6. Click "Export CSV" to download the grid data as `grid-{hostname}-{timestamp}.csv`
7. Use "Refresh" button to scan for both tables and previously selected grids

### Tips
- Grid detection requires at least 2 similar sibling elements with consistent structure
- Works great with div-based layouts, card grids, and CSS flexbox/grid layouts
- Visual feedback shows green highlights for valid selections, red for invalid ones

## Example Pages
Check out the `examples/` folder for a bunch of sample tables you can use for testing and demos.

## Contributing
Pull requests are super welcome! Feel free to suggest features or report issues.

## License
MIT License