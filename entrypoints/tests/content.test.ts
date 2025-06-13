import { describe, it, expect, beforeEach, vi } from 'vitest'

// Extract the functions from content.ts for testing
interface TableMeta {
  id: string;
  rows: number;
  cols: number;
  preview: string;
}

function escapeCsv(text: string): string {
  const needsQuote = /[",\n]/.test(text);
  let res = text.replace(/"/g, '""');
  return needsQuote ? `"${res}"` : res;
}

function tableToCsv(table: HTMLTableElement): string {
  const rows = Array.from(table.rows);
  return '\ufeff' + rows.map(r =>
    Array.from(r.cells).map(c => escapeCsv(c.innerText || c.textContent || '')).join(',')
  ).join('\r\n');
}

function scanTables(): TableMeta[] {
  const tables = document.querySelectorAll('table');
  const visibleTables = Array.from(tables).filter(table => {
    const style = window.getComputedStyle(table);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  return visibleTables.map((table, index) => {
    const rows = table.rows.length;
    const cols = table.rows[0]?.cells.length || 0;
    
    // Generate preview from first few cells
    const previewCells: string[] = [];
    for (let i = 0; i < Math.min(2, rows); i++) {
      for (let j = 0; j < Math.min(3, table.rows[i].cells.length); j++) {
        const cellText = (table.rows[i].cells[j].innerText || table.rows[i].cells[j].textContent || '').trim();
        if (cellText) {
          previewCells.push(cellText.substring(0, 20));
        }
      }
    }
    
    return {
      id: `table-${index}`,
      rows,
      cols,
      preview: previewCells.join(' | ') || 'Empty table'
    };
  });
}

function exportTable(id: string): void {
  const tables = document.querySelectorAll('table');
  const visibleTables = Array.from(tables).filter(table => {
    const style = window.getComputedStyle(table);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  const index = parseInt(id.replace('table-', ''));
  if (index < 0 || index >= visibleTables.length) {
    console.error('Table not found:', id);
    return;
  }

  const table = visibleTables[index] as HTMLTableElement;
  const csv = tableToCsv(table);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `table-${index + 1}.csv`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(link.href);
}

describe('Content Script Functions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('escapeCsv', () => {
    it('should return text as-is when no special characters', () => {
      expect(escapeCsv('simple text')).toBe('simple text');
      expect(escapeCsv('123')).toBe('123');
      expect(escapeCsv('')).toBe('');
    });

    it('should wrap text in quotes when contains comma', () => {
      expect(escapeCsv('hello,world')).toBe('"hello,world"');
      expect(escapeCsv('a,b,c')).toBe('"a,b,c"');
    });

    it('should wrap text in quotes when contains newline', () => {
      expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCsv('text\n')).toBe('"text\n"');
    });

    it('should escape double quotes by doubling them', () => {
      expect(escapeCsv('say "hello"')).toBe('"say ""hello"""');
      expect(escapeCsv('"quoted"')).toBe('"""quoted"""');
    });

    it('should handle multiple special characters', () => {
      expect(escapeCsv('say "hello", world\nnext line')).toBe('"say ""hello"", world\nnext line"');
    });
  });

  describe('tableToCsv', () => {
    it('should convert simple table to CSV with BOM', () => {
      document.body.innerHTML = `
        <table id="test-table">
          <tr><td>A</td><td>B</td></tr>
          <tr><td>1</td><td>2</td></tr>
        </table>
      `;
      
      const table = document.getElementById('test-table') as HTMLTableElement;
      const csv = tableToCsv(table);
      
      expect(csv).toBe('\ufeffA,B\r\n1,2');
    });

    it('should handle empty table', () => {
      document.body.innerHTML = `<table id="empty-table"></table>`;
      
      const table = document.getElementById('empty-table') as HTMLTableElement;
      const csv = tableToCsv(table);
      
      expect(csv).toBe('\ufeff');
    });

    it('should escape special characters in cells', () => {
      document.body.innerHTML = `
        <table id="special-table">
          <tr><td>Name</td><td>Quote</td></tr>
          <tr><td>John, Jr.</td><td>He said "Hello"</td></tr>
        </table>
      `;
      
      const table = document.getElementById('special-table') as HTMLTableElement;
      const csv = tableToCsv(table);
      
      expect(csv).toBe('\ufeffName,Quote\r\n"John, Jr.","He said ""Hello"""');
    });

    it('should handle cells with newlines', () => {
      document.body.innerHTML = `
        <table id="newline-table">
          <tr><td>Multi\nLine</td><td>Single</td></tr>
        </table>
      `;
      
      const table = document.getElementById('newline-table') as HTMLTableElement;
      const csv = tableToCsv(table);
      
      expect(csv).toBe('\ufeff"Multi\nLine",Single');
    });
  });

  describe('scanTables', () => {
    it('should return empty array when no tables exist', () => {
      document.body.innerHTML = '<div>No tables here</div>';
      const result = scanTables();
      expect(result).toEqual([]);
    });

    it('should detect single table with correct metadata', () => {
      document.body.innerHTML = `
        <table>
          <tr><td>Header 1</td><td>Header 2</td><td>Header 3</td></tr>
          <tr><td>Row 1 Col 1</td><td>Row 1 Col 2</td><td>Row 1 Col 3</td></tr>
          <tr><td>Row 2 Col 1</td><td>Row 2 Col 2</td><td>Row 2 Col 3</td></tr>
        </table>
      `;
      
      const result = scanTables();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'table-0',
        rows: 3,
        cols: 3,
        preview: 'Header 1 | Header 2 | Header 3 | Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3'
      });
    });

    it('should detect multiple tables', () => {
      document.body.innerHTML = `
        <table>
          <tr><td>Table 1</td></tr>
        </table>
        <table>
          <tr><td>Table 2 A</td><td>Table 2 B</td></tr>
          <tr><td>Row 2</td><td>Data</td></tr>
        </table>
      `;
      
      const result = scanTables();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'table-0',
        rows: 1,
        cols: 1,
        preview: 'Table 1'
      });
      expect(result[1]).toEqual({
        id: 'table-1',
        rows: 2,
        cols: 2,
        preview: 'Table 2 A | Table 2 B | Row 2 | Data'
      });
    });

    it('should filter out hidden tables', () => {
      document.body.innerHTML = `
        <table style="display: none;">
          <tr><td>Hidden table</td></tr>
        </table>
        <table style="visibility: hidden;">
          <tr><td>Invisible table</td></tr>
        </table>
        <table>
          <tr><td>Visible table</td></tr>
        </table>
      `;
      
      const result = scanTables();
      
      expect(result).toHaveLength(1);
      expect(result[0].preview).toBe('Visible table');
    });

    it('should handle empty tables gracefully', () => {
      document.body.innerHTML = `
        <table>
          <tr></tr>
        </table>
        <table></table>
      `;
      
      const result = scanTables();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'table-0',
        rows: 1,
        cols: 0,
        preview: 'Empty table'
      });
      expect(result[1]).toEqual({
        id: 'table-1',
        rows: 0,
        cols: 0,
        preview: 'Empty table'
      });
    });

    it('should truncate long cell text in preview', () => {
      document.body.innerHTML = `
        <table>
          <tr><td>This is a very long cell content that should be truncated</td></tr>
        </table>
      `;
      
      const result = scanTables();
      
      expect(result[0].preview).toBe('This is a very long ');
    });
  });

  describe('exportTable', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      mockRevokeObjectURL = vi.fn();
      mockClick = vi.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      
      // Mock console.error to test error cases
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should export table successfully', () => {
      document.body.innerHTML = `
        <table>
          <tr><td>Name</td><td>Age</td></tr>
          <tr><td>John</td><td>25</td></tr>
        </table>
      `;

      // Mock createElement to track link creation
      const originalCreateElement = document.createElement;
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      document.createElement = vi.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          const link = originalCreateElement.call(document, tag);
          link.click = mockClick;
          return link;
        }
        return originalCreateElement.call(document, tag);
      });

      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;

      exportTable('table-0');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      );
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      // Restore original methods
      document.createElement = originalCreateElement;
    });

    it('should handle invalid table ID', () => {
      document.body.innerHTML = `<table><tr><td>Test</td></tr></table>`;
      
      exportTable('table-999');
      
      expect(console.error).toHaveBeenCalledWith('Table not found:', 'table-999');
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it('should handle negative table index', () => {
      document.body.innerHTML = `<table><tr><td>Test</td></tr></table>`;
      
      exportTable('table--1');
      
      expect(console.error).toHaveBeenCalledWith('Table not found:', 'table--1');
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it('should ignore hidden tables when exporting', () => {
      document.body.innerHTML = `
        <table style="display: none;">
          <tr><td>Hidden</td></tr>
        </table>
        <table>
          <tr><td>Visible</td></tr>
        </table>
      `;

      const originalCreateElement = document.createElement;
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      document.createElement = vi.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          const link = originalCreateElement.call(document, tag);
          link.click = mockClick;
          return link;
        }
        return originalCreateElement.call(document, tag);
      });

      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;

      exportTable('table-0');

      // Should export the visible table (index 0 of visible tables)
      expect(mockCreateObjectURL).toHaveBeenCalled();
      const blobCall = mockCreateObjectURL.mock.calls[0][0];
      expect(blobCall.type).toBe('text/csv;charset=utf-8;');

      document.createElement = originalCreateElement;
    });
  });
});