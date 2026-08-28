import { app, BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function generatePdfFromHtml(html: string, fileName: string): Promise<string> {
  const outputDir = path.join(app.getPath('documents'), 'Kraga Desktop');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);

  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    await win.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    const buffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    await fs.writeFile(outputPath, buffer);
  } finally {
    win.destroy();
  }

  return outputPath;
}
