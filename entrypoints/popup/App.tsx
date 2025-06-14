import { useState, useEffect } from 'react';
import './App.css';

interface TableMeta {
  id: string;
  rows: number;
  cols: number;
  preview: string;
}

interface TableItemProps {
  table: TableMeta;
  onExport: (id: string) => void;
  onHighlight: (id: string) => void;
  isExporting: boolean;
}

function TableItem({ table, onExport, onHighlight, isExporting }: TableItemProps) {
  return (
    <div className="table-item" onClick={() => onHighlight(table.id)}>
      <div className="table-info">
        <div className="table-size">{table.rows} × {table.cols}</div>
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
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

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

  const handleExport = async (tableId: string) => {
    try {
      setExportingId(tableId);
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('Unable to access current tab');
      }

      await browser.tabs.sendMessage(tab.id, { type: 'export_table', id: tableId });
    } catch (err) {
      setError('Failed to export table. Please try again.');
      console.error('Error exporting table:', err);
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

      await browser.tabs.sendMessage(tab.id, { type: 'highlight_table', id: tableId });
    } catch (err) {
      console.error('Error highlighting table:', err);
    }
  };

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
        <p className="subtitle">Found {tables.length} table{tables.length !== 1 ? 's' : ''} on this page</p>
        <button onClick={handleScan} disabled={scanning} className="scan-btn secondary">
          {scanning ? 'Scanning...' : 'Refresh'}
        </button>
      </div>
      <TableList tables={tables} onExport={handleExport} onHighlight={handleHighlight} exportingId={exportingId} />
    </div>
  );
}

export default App;
