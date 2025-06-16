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
          {table.cols} × {table.rows}
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
        <p>No tables or grids found</p>
        <p className="empty-hint">Use the "Select Elements" button to select grid elements from this page</p>
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
  const [hasSelectedGrid, setHasSelectedGrid] = useState(false);
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
        return;
      }

      const response = await browser.tabs.sendMessage(tab.id, { type: 'get_tables' });
      setTables(response || []);
      
      // Check if response contains grids and update hasSelectedGrid accordingly
      const hasGridInResponse = response && response.some((item: any) => item.type === 'non-table');
      if (hasGridInResponse) {
        setHasSelectedGrid(true);
      }
    } catch (err) {
      // Handle connection errors silently - likely means content script not available
      if (err instanceof Error && err.message.includes('Could not establish connection')) {
        setTables([]);
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

  // Auto-scan on popup open and listen for grid selection
  useEffect(() => {
    // Auto-scan when popup opens
    handleScan();
    
    const handleMessage = (message: any) => {
      if (message.type === 'grid_selected' && message.grid) {
        setGrids([message.grid]);
        setHasSelectedGrid(true);
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

  const allItems = [...tables, ...grids];
  const hasTablesOnly = tables.length > 0 && grids.length === 0;
  const hasGridsOnly = tables.length === 0 && grids.length > 0;
  const hasBoth = tables.length > 0 && grids.length > 0;
  const hasNone = tables.length === 0 && grids.length === 0;
  
  return (
    <div className="app">
      <h1>Table Exporter</h1>
      <div className="header">
        <p className="subtitle">
          {hasNone && 'No tables found on this page'}
          {hasTablesOnly && `Found ${tables.length} table${tables.length !== 1 ? 's' : ''} on this page`}
          {hasGridsOnly && `Found ${grids.length} grid${grids.length !== 1 ? 's' : ''} on this page`}
          {hasBoth && `Found ${tables.length} table${tables.length !== 1 ? 's' : ''} and ${grids.length} grid${grids.length !== 1 ? 's' : ''} on this page`}
        </p>
      </div>
      <TableList 
        tables={allItems} 
        onExport={handleExport} 
        onHighlight={handleHighlight} 
        exportingId={exportingId} 
      />
      
      <div className="bottom-actions">
        <button 
          onClick={handleSelectionMode} 
          className="scan-btn selection-btn"
        >
          {selectionMode ? 'Cancel Selection' : 'Select Elements'}
        </button>
        {/* Show Refresh button only after selection has been used */}
        {hasSelectedGrid && (
          <button onClick={handleScan} disabled={scanning} className="scan-btn secondary">
            {scanning ? 'Scanning...' : 'Refresh'}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
