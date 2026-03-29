import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ResourceExportService {

  downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(','))
    ];
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    this.triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  }

  downloadXlsx(filename: string, sheetName: string, rows: Record<string, unknown>[]): void {
    const safeName = sheetName.replace(/[*?:/\\[\]]/g, '').slice(0, 31) || 'Sheet1';
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No data' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeName);
    const out = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, out);
  }

  private triggerDownload(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
