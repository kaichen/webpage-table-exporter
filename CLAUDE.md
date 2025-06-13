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
3. User selects table from popup list
4. Popup sends `export_table` message with table ID
5. Content script generates CSV and triggers browser download

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