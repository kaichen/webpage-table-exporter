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

function scrollToElement(element: HTMLElement): void {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function highlightTable(element: HTMLElement): void {
  const originalBackgroundColor = element.style.backgroundColor;
  const originalTransition = element.style.transition;
  
  element.style.transition = 'background-color 0.3s ease';
  element.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
  
  setTimeout(() => {
    element.style.backgroundColor = originalBackgroundColor;
    setTimeout(() => {
      element.style.transition = originalTransition;
    }, 300);
  }, 1500);
}

function highlightTableById(id: string): void {
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
  scrollToElement(table);
  highlightTable(table);
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
  
  const hostname = (window.location.hostname || 'unknown').replace(/[<>:"/\\|?*]/g, '_');
  const timestamp = Date.now();
  const filename = `table-${hostname}-${timestamp}.csv`;
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(link.href);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'get_tables') {
        const tables = scanTables();
        sendResponse(tables);
        return true;
      } else if (message.type === 'export_table') {
        exportTable(message.id);
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'highlight_table') {
        highlightTableById(message.id);
        sendResponse({ success: true });
        return true;
      }
    });
  },
});
