# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Follow the instructions in the `plan.md` file to implement the functionality.

## Project Overview

This is a browser extension built with WXT + React + TypeScript that allows users to export HTML tables from web pages as CSV files. The extension scans the current page for `<table>` elements and provides a popup interface to select and download tables as CSV files.

## Development Commands

```bash
# Development (Chrome)
bun run dev

# Development (Firefox)
bun run dev:firefox

# Build for production
bun run build
bun run build:firefox

# Create distributable zip
bun run zip
bun run zip:firefox

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
4. User selects table from popup list for export
5. Popup sends `export_table` message with table ID
6. Content script generates CSV and triggers browser download

## Key Data Structures

```ts
interface TableMeta {
  id: string;        // Unique identifier for table
  rows: number;      // Number of rows
  cols: number;      // Number of columns  
  preview: string;   // Preview text for user identification
}
```

## Technical Notes

- Uses `browser.tabs.sendMessage` for popup-to-content communication
- CSV generation includes UTF-8 BOM for Excel compatibility
- Handles CSV escaping for commas, quotes, and newlines in cell content
- Content script matches `['<all_urls>']` to work on any webpage
- Built on WXT framework which handles Manifest V3 generation and bundling

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

### Message Types
- `get_tables`: Scans page and returns table metadata array
- `export_table`: Exports specific table by ID to CSV download
- `highlight_table`: Scrolls to and highlights specific table by ID

## Development Infrastructure

### Testing
- 19 unit tests covering all core functions
- Vitest + jsdom for DOM testing
- Coverage for `escapeCsv()`, `tableToCsv()`, `scanTables()`, `exportTable()`
- Test examples in `examples/` folder with various table scenarios

### CI/CD
- GitHub Actions workflow (`.github/workflows/release.yml`)
- Automatic building on release publication
- Supports both Chrome and Firefox builds
- Uploads `.zip` artifacts to GitHub releases

### File Structure
```
entrypoints/
├── content.ts          # Main content script with table scanning and export
├── popup/
│   ├── App.tsx        # React popup interface
│   ├── App.css        # Popup styling
│   └── index.html     # Popup entry point
└── background.ts      # Service worker (minimal)

examples/               # Test HTML files for development
tests/                 # Unit test suites
.github/workflows/     # CI/CD configuration
```

## Development Memories

- 每次完成任务后执行 bun run build 取代 bun run dev 进行编译验证