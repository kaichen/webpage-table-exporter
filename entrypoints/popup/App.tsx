import { useState, useEffect } from 'react';
import './App.css';

interface TableMeta {
  id: string;
  rows: number;
  cols: number;
  preview: string;
}

interface NonTableGrid extends TableMeta {
  type: 'non-table';
  elements?: HTMLElement[];
}

interface TableItemProps {
  table: TableMeta;
  onExport: (id: string) => void;
  onHighlight: (id: string) => void;
  isExporting: boolean;
}

function TableItem({ table, onExport, onHighlight, isExporting }: TableItemProps) {
  const isGrid = 'type' in table && table.type === 'non-table';
  
  return (
    <div className="table-item" onClick={() => onHighlight(table.id)}>
      <div className="table-info">
        <div className="table-size">
          {table.rows} × {table.cols}
          {isGrid && <span className="grid-indicator">GRID</span>}
        </div>
        <div className="table-preview">{table.preview}</div>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onExport(table.id);
        }}
        disabled={isExporting}
        className="export-btn"
      >
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </button>
    </div>
  );
}

interface TableListProps {
  tables: TableMeta[];
  onExport: (id: string) => void;
  onHighlight: (id: string) => void;
  exportingId: string | null;
}

function TableList({ tables, onExport, onHighlight, exportingId }: TableListProps) {
  if (tables.length === 0) {
    return (
      <div className="empty-state">
        <p>No tables found on this page</p>
        <p className="empty-hint">Try refreshing the page or navigate to a page with HTML tables</p>
      </div>
    );
  }

  return (
    <div className="table-list">
      {tables.map((table) => (
        <TableItem 
          key={table.id} 
          table={table} 
          onExport={onExport}
          onHighlight={onHighlight}
          isExporting={exportingId === table.id}
        />
      ))}
    </div>
  );
}

function App() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [grids, setGrids] = useState<NonTableGrid[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const handleScan = async () => {
    try {
      setScanning(true);
      setError(null);
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) {
        setError('Unable to access current tab');
        return;
      }

      // Skip chrome:// pages
      if (tab.url.startsWith('chrome://')) {
        setTables([]);
        setHasScanned(true);
        return;
      }

      const response = await browser.tabs.sendMessage(tab.id, { type: 'get_tables' });
      setTables(response || []);
      setHasScanned(true);
    } catch (err) {
      // Handle connection errors silently - likely means content script not available
      if (err instanceof Error && err.message.includes('Could not establish connection')) {
        setTables([]);
        setHasScanned(true);
      } else {
        setError('Failed to scan tables. Please refresh the page and try again.');
        console.error('Error getting tables:', err);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleSelectionMode = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        setError('Unable to access current tab');
        return;
      }

      if (!selectionMode) {
        await browser.tabs.sendMessage(tab.id, { type: 'enable_selection_mode' });
        setSelectionMode(true);
        // Close popup to allow user to select
        window.close();
      } else {
        await browser.tabs.sendMessage(tab.id, { type: 'disable_selection_mode' });
        setSelectionMode(false);
      }
    } catch (err) {
      setError('Failed to toggle selection mode. Please refresh the page.');
      console.error('Error toggling selection mode:', err);
    }
  };

  const handleExport = async (tableId: string) => {
    try {
      setExportingId(tableId);
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('Unable to access current tab');
      }

      const isGrid = tableId.startsWith('grid-');
      if (isGrid) {
        await browser.tabs.sendMessage(tab.id, { type: 'export_grid', id: tableId });
      } else {
        await browser.tabs.sendMessage(tab.id, { type: 'export_table', id: tableId });
      }
    } catch (err) {
      setError('Failed to export. Please try again.');
      console.error('Error exporting:', err);
    } finally {
      setExportingId(null);
    }
  };

  const handleHighlight = async (tableId: string) => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        return;
      }

      // Only highlight regular tables, not grids
      if (!tableId.startsWith('grid-')) {
        await browser.tabs.sendMessage(tab.id, { type: 'highlight_table', id: tableId });
      }
    } catch (err) {
      console.error('Error highlighting table:', err);
    }
  };

  // Listen for grid selection from content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'grid_selected' && message.grid) {
        setGrids([message.grid]);
        setHasScanned(true);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  if (error) {
    return (
      <div className="app">
        <h1>Table Exporter</h1>
        <div className="error">{error}</div>
        <button onClick={handleScan} disabled={scanning} className="scan-btn">
          {scanning ? 'Scanning...' : 'Try Again'}
        </button>
      </div>
    );
  }

  if (!hasScanned) {
    return (
      <div className="app">
        <h1>Table Exporter</h1>
        <p className="subtitle">Click to scan for tables on this page</p>
        <button onClick={handleScan} disabled={scanning} className="scan-btn">
          {scanning ? 'Scanning...' : 'Scan Tables'}
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Table Exporter</h1>
      <div className="header">
        <p className="subtitle">
          Found {tables.length} table{tables.length !== 1 ? 's' : ''}
          {grids.length > 0 && ` and ${grids.length} grid${grids.length !== 1 ? 's' : ''}`} on this page
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleScan} disabled={scanning} className="scan-btn secondary">
            {scanning ? 'Scanning...' : 'Refresh'}
          </button>
          <button 
            onClick={handleSelectionMode} 
            className="scan-btn secondary selection-btn"
          >
            {selectionMode ? 'Cancel Selection' : 'Select Elements'}
          </button>
        </div>
      </div>
      <TableList 
        tables={[...tables, ...grids]} 
        onExport={handleExport} 
        onHighlight={handleHighlight} 
        exportingId={exportingId} 
      />
    </div>
  );
}

export default App;
