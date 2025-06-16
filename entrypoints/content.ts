interface TableMeta {
  id: string;
  rows: number;
  cols: number;
  preview: string;
}

interface NonTableGrid extends TableMeta {
  type: 'non-table';
  elements: HTMLElement[];
}

interface SelectionState {
  enabled: boolean;
  selectedElement: HTMLElement | null;
  gridElements: HTMLElement[];
  overlay: HTMLElement | null;
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

let selectionState: SelectionState = {
  enabled: false,
  selectedElement: null,
  gridElements: [],
  overlay: null
};

function createOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    border: 2px dashed #4CAF50;
    background-color: rgba(76, 175, 80, 0.1);
    pointer-events: none;
    z-index: 99999;
    transition: all 0.2s ease;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function removeOverlay(): void {
  if (selectionState.overlay) {
    selectionState.overlay.remove();
    selectionState.overlay = null;
  }
}

function highlightElement(element: HTMLElement): void {
  if (!selectionState.overlay) {
    selectionState.overlay = createOverlay();
  }
  
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  selectionState.overlay.style.top = `${rect.top + scrollTop}px`;
  selectionState.overlay.style.left = `${rect.left + scrollLeft}px`;
  selectionState.overlay.style.width = `${rect.width}px`;
  selectionState.overlay.style.height = `${rect.height}px`;
}

function findSiblingRows(element: HTMLElement): HTMLElement[] {
  const parent = element.parentElement;
  if (!parent) return [element];
  
  const siblings = Array.from(parent.children) as HTMLElement[];
  const targetChildCount = element.children.length;
  
  // Get structural signature of the selected element
  const getStructureSignature = (el: HTMLElement): string => {
    const childTags = Array.from(el.children).map(child => child.tagName).join(',');
    const display = window.getComputedStyle(el).display;
    return `${el.tagName}-${childTags}-${display}`;
  };
  
  const targetSignature = getStructureSignature(element);
  const targetStyle = window.getComputedStyle(element);
  
  // Find all siblings with identical structure
  const identicalSiblings = siblings.filter(sibling => {
    if (sibling.children.length !== targetChildCount) return false;
    
    const siblingSignature = getStructureSignature(sibling);
    const siblingStyle = window.getComputedStyle(sibling);
    
    return siblingSignature === targetSignature && 
           siblingStyle.display === targetStyle.display;
  });
  
  // If we found at least 2 rows with identical structure (including the selected one)
  if (identicalSiblings.length >= 2) {
    // Look for a potential header row
    let headerRow: HTMLElement | null = null;
    
    // Check immediate previous sibling
    const prevSibling = identicalSiblings[0].previousElementSibling as HTMLElement;
    if (prevSibling && prevSibling.children.length === targetChildCount) {
      const prevStyle = window.getComputedStyle(prevSibling);
      const prevSignature = getStructureSignature(prevSibling);
      
      // Header often has same structure but different styling (bold, background)
      if (prevSignature === targetSignature || 
          prevStyle.fontWeight === 'bold' || 
          prevStyle.backgroundColor !== targetStyle.backgroundColor) {
        headerRow = prevSibling;
      }
    }
    
    // Check parent's previous sibling for separated header
    if (!headerRow && parent.previousElementSibling) {
      const headerContainer = parent.previousElementSibling as HTMLElement;
      const potentialHeaders = Array.from(headerContainer.children) as HTMLElement[];
      
      for (const potentialHeader of potentialHeaders) {
        if (potentialHeader.children.length === targetChildCount) {
          const headerSignature = getStructureSignature(potentialHeader);
          if (headerSignature === targetSignature) {
            headerRow = potentialHeader;
            break;
          }
        }
      }
    }
    
    // Return header + identical siblings
    if (headerRow && !identicalSiblings.includes(headerRow)) {
      return [headerRow, ...identicalSiblings];
    }
    
    return identicalSiblings;
  }
  
  // If no sufficient siblings found, return empty array to indicate not a table
  return [];
}

function elementsToGrid(elements: HTMLElement[]): NonTableGrid {
  const rows = elements.length;
  const cols = elements[0]?.children.length || 0;
  
  // Generate preview from first few rows
  const previewCells: string[] = [];
  for (let i = 0; i < Math.min(2, rows); i++) {
    for (let j = 0; j < Math.min(3, elements[i].children.length); j++) {
      const cellText = (elements[i].children[j].textContent || '').trim();
      if (cellText) {
        previewCells.push(cellText.substring(0, 20));
      }
    }
  }
  
  return {
    id: `grid-${Date.now()}`,
    type: 'non-table',
    rows,
    cols,
    preview: previewCells.join(' | ') || 'Empty grid',
    elements
  };
}

function gridToCsv(grid: NonTableGrid): string {
  const rows = grid.elements.map(row => {
    const cells = Array.from(row.children).map(cell => {
      const text = (cell.textContent || '').trim();
      return escapeCsv(text);
    });
    return cells.join(',');
  });
  
  return '\ufeff' + rows.join('\r\n');
}

function handleMouseMove(e: MouseEvent): void {
  if (!selectionState.enabled) return;
  
  const target = e.target as HTMLElement;
  
  // Skip if target is the overlay itself
  if (target === selectionState.overlay) return;
  
  // Find potential row element (might be the target or its parent)
  let rowElement = target;
  let depth = 0;
  
  // Try to find a suitable row element by going up the DOM tree
  while (rowElement && rowElement !== document.body && depth < 10) {
    // Check if this element has multiple children that could be cells
    if (rowElement.children.length > 1) {
      // Check if children have consistent structure
      const hasConsistentChildren = Array.from(rowElement.children).every(child => {
        return child.nodeType === 1; // Element node
      });
      
      if (hasConsistentChildren) {
        break;
      }
    }
    rowElement = rowElement.parentElement as HTMLElement;
    depth++;
  }
  
  if (rowElement && rowElement !== document.body) {
    highlightElement(rowElement);
  }
}

function handleClick(e: MouseEvent): void {
  if (!selectionState.enabled) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = e.target as HTMLElement;
  
  // Find the row element similar to mousemove
  let rowElement = target;
  let depth = 0;
  
  while (rowElement && rowElement !== document.body && depth < 10) {
    if (rowElement.children.length > 1) {
      const hasConsistentChildren = Array.from(rowElement.children).every(child => {
        return child.nodeType === 1;
      });
      
      if (hasConsistentChildren) {
        break;
      }
    }
    rowElement = rowElement.parentElement as HTMLElement;
    depth++;
  }
  
  if (rowElement && rowElement !== document.body) {
    selectionState.selectedElement = rowElement;
    const detectedRows = findSiblingRows(rowElement);
    
    // Only proceed if we detected a table-like structure (at least 2 rows)
    if (detectedRows.length >= 2) {
      selectionState.gridElements = detectedRows;
      
      // Highlight all selected elements
      selectionState.gridElements.forEach((el) => {
        el.style.outline = '2px solid #4CAF50';
        el.style.outlineOffset = '-2px';
      });
      
      // Send grid info back to popup
      const grid = elementsToGrid(selectionState.gridElements);
      
      // Store the grid data for when popup reopens
      (window as any).detectedGrid = grid;
      
      // Try to send message to popup (might fail if popup is closed)
      try {
        browser.runtime.sendMessage({ 
          type: 'grid_selected', 
          grid 
        });
      } catch (err) {
        // Popup likely closed, grid data is stored for next open
      }
      
      // Disable selection mode
      disableSelectionMode();
    } else {
      // Show feedback that no table structure was detected
      if (selectionState.overlay) {
        selectionState.overlay.style.borderColor = '#f44336';
        selectionState.overlay.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
        
        setTimeout(() => {
          if (selectionState.overlay) {
            selectionState.overlay.style.borderColor = '#4CAF50';
            selectionState.overlay.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
          }
        }, 500);
      }
    }
  }
}

function enableSelectionMode(): void {
  selectionState.enabled = true;
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick, true);
  
  // Change cursor
  document.body.style.cursor = 'crosshair';
}

function disableSelectionMode(): void {
  selectionState.enabled = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleClick, true);
  
  // Reset cursor
  document.body.style.cursor = '';
  
  // Remove overlay
  removeOverlay();
  
  // Remove outlines from selected elements
  selectionState.gridElements.forEach(el => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  });
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'get_tables') {
        const tables = scanTables();
        
        // Also check if we have a stored grid from previous selection
        const storedGrid = (window as any).detectedGrid;
        if (storedGrid) {
          sendResponse([...tables, storedGrid]);
          // Clear the stored grid after sending
          delete (window as any).detectedGrid;
        } else {
          sendResponse(tables);
        }
        return true;
      } else if (message.type === 'export_table') {
        exportTable(message.id);
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'highlight_table') {
        highlightTableById(message.id);
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'enable_selection_mode') {
        enableSelectionMode();
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'disable_selection_mode') {
        disableSelectionMode();
        sendResponse({ success: true });
        return true;
      } else if (message.type === 'export_grid') {
        if (selectionState.gridElements.length > 0) {
          const grid = elementsToGrid(selectionState.gridElements);
          const csv = gridToCsv(grid);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          
          const hostname = (window.location.hostname || 'unknown').replace(/[<>:"/\\|?*]/g, '_');
          const timestamp = Date.now();
          const filename = `grid-${hostname}-${timestamp}.csv`;
          
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(link.href);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'No grid selected' });
        }
        return true;
      }
    });
  },
});
