# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Follow the instructions in the `plan.md` file to implement the functionality.

## Project Overview

This is a browser extension built with WXT + React + TypeScript that allows users to export HTML tables and custom grid elements from web pages as CSV files. The extension scans the current page for `<table>` elements and provides a popup interface to select and download tables as CSV files. It also supports manual selection of non-table grid elements for export.

## Development Commands

```bash
# Development
bun run dev

# Build for production
bun run build

# Create distributable zip
bun run zip

# Type checking
bun run compile

# Install dependencies and prepare WXT
bun install
```

## Architecture

The extension follows WXT's entrypoint-based architecture:

- **Content Script** (`entrypoints/content.ts`): Runs on web pages, scans for tables, generates CSV data
- **Popup** (`entrypoints/popup/`): React-based UI for displaying table list and triggering exports
- **Background** (`entrypoints/background.ts`): Service worker (currently minimal)

### Communication Flow
1. Popup sends `get_tables` message to content script
2. Content script scans DOM for tables and returns metadata
3. User can click table items to highlight them (sends `highlight_table` message)
4. User can enable selection mode to manually select non-table grid elements
5. User selects table/grid from popup list for export
6. Popup sends `export_table` or `export_grid` message with element ID
7. Content script generates CSV and triggers browser download

## Key Data Structures

```ts
interface TableMeta {
  id: string;        // Unique identifier for table
  rows: number;      // Number of rows
  cols: number;      // Number of columns  
  preview: string;   // Preview text for user identification
}

interface NonTableGrid extends TableMeta {
  type: 'non-table'; // Distinguishes from regular tables
  elements?: HTMLElement[]; // Selected DOM elements
}
```

## Technical Notes

- Uses `browser.tabs.sendMessage` for popup-to-content communication
- CSV generation includes UTF-8 BOM for Excel compatibility
- Handles CSV escaping for commas, quotes, and newlines in cell content
- Content script matches `['<all_urls>']` to work on any webpage
- Built on WXT framework which handles Manifest V3 generation and bundling
- Uses react-icons library for consistent iconography across the UI
- Supports both English and Chinese internationalization via Chrome's i18n API

## Features

### Table Highlighting
- Click table items in popup to scroll to and highlight corresponding table on page
- Smooth scrolling with `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Yellow background animation for 1.5 seconds with CSS transitions
- Event propagation control to prevent conflicts with export functionality

### Smart File Naming
- Download files use format: `table-${hostname}-${timestamp}.csv`
- Hostname sanitization: replaces invalid characters `<>:"/\|?*` with underscores
- Timestamp includes milliseconds for uniqueness

### Grid Selection Mode
- Interactive element selection for non-table structures
- Mouse-driven selection with visual feedback
- Badge notifications showing selection count
- Supports complex grid layouts that aren't HTML tables

### UI Enhancement with Icons
- Download icon (FiDownload) for Export CSV buttons
- Mouse pointer/X icons (FiMousePointer/FiX) for selection mode toggle
- Refresh icon (FiRefreshCw) with spinning animation for scan operations
- Grid indicator icon (RiGridLine) for non-table elements
- Proper icon styling with consistent spacing and alignment

### Internationalization (i18n)
- Full English and Chinese language support
- Localized table dimension display ("5 cols × 5 rows" / "5列×5行")
- Dynamic message loading for all UI text
- Locale files in `public/_locales/en/` and `public/_locales/zh/`

### Message Types
- `get_tables`: Scans page and returns table metadata array
- `export_table`: Exports specific table by ID to CSV download
- `export_grid`: Exports selected grid elements by ID to CSV download
- `highlight_table`: Scrolls to and highlights specific table by ID
- `enable_selection_mode`: Activates interactive element selection
- `disable_selection_mode`: Deactivates selection mode

## Development Infrastructure

### Testing
- 19 unit tests covering all core functions
- Vitest + jsdom for DOM testing
- Coverage for `escapeCsv()`, `tableToCsv()`, `scanTables()`, `exportTable()`
- Test examples in `examples/` folder with various table scenarios

### CI/CD
- GitHub Actions workflow (`.github/workflows/release.yml`)
- Automatic building on release publication
- Supports both Chrome builds
- Uploads `.zip` artifacts to GitHub releases

### File Structure
```
entrypoints/
├── content.ts          # Main content script with table/grid scanning and export
├── popup/
│   ├── App.tsx        # React popup interface with icon integration
│   ├── App.css        # Popup styling with icon animations
│   └── index.html     # Popup entry point
└── background.ts      # Service worker with badge management

public/_locales/        # Internationalization files
├── en/messages.json   # English translations
└── zh/messages.json   # Chinese translations

examples/               # Test HTML files for development
tests/                 # Unit test suites
.github/workflows/     # CI/CD configuration
```

## Development Memories

- 每次完成任务后执行 bun run build 取代 bun run dev 进行编译验证
- 页面元素可在必要时添加合适icon (已实现 react-icons 集成)
- 页面元素修改时记得更新对应的public目录下相关i18n配置 (已建立完整的中英文支持)
- 使用 react-icons 库提供统一的图标体验，主要使用 Feather icons (Fi) 和 Remix icons (Ri)
- CSS 动画通过 keyframes 实现，如刷新按钮的旋转效果
- 所有UI文本都通过 browser.i18n.getMessage() 进行国际化处理

## Recent Major Updates (v1.2.0)

- **Non-table Grid Export**: Added support for manually selecting and exporting non-table grid structures
- **UI Icon Integration**: Complete icon system using react-icons with appropriate icons for all buttons
- **Enhanced i18n**: Full bilingual support with localized table dimension display
- **Badge Notifications**: Visual feedback for grid selection count
- **Improved UX**: Better visual feedback with animations and consistent iconography