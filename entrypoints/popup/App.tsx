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
  isExporting: boolean;
}

function TableItem({ table, onExport, isExporting }: TableItemProps) {
  return (
    <div className="table-item">
      <div className="table-info">
        <div className="table-size">{table.rows} × {table.cols}</div>
        <div className="table-preview">{table.preview}</div>
      </div>
      <button 
        onClick={() => onExport(table.id)}
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
  exportingId: string | null;
}

function TableList({ tables, onExport, exportingId }: TableListProps) {
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
          isExporting={exportingId === table.id}
        />
      ))}
    </div>
  );
}

function App() {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getTables = async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) {
          setError('Unable to access current tab');
          setLoading(false);
          return;
        }

        const response = await browser.tabs.sendMessage(tab.id, { type: 'get_tables' });
        setTables(response || []);
      } catch (err) {
        setError('Failed to scan tables. Please refresh the page and try again.');
        console.error('Error getting tables:', err);
      } finally {
        setLoading(false);
      }
    };

    getTables();
  }, []);

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

  if (loading) {
    return (
      <div className="app">
        <h1>Table Exporter</h1>
        <div className="loading">Scanning for tables...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <h1>Table Exporter</h1>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Table Exporter</h1>
      <p className="subtitle">Found {tables.length} table{tables.length !== 1 ? 's' : ''} on this page</p>
      <TableList tables={tables} onExport={handleExport} exportingId={exportingId} />
    </div>
  );
}

export default App;
