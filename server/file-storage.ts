import fs from 'fs/promises';
import path from 'path';

export class FileStorage {
  private dataDir = path.join(process.cwd(), 'data');

  constructor() {
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  async readFile(filename: string): Promise<string[]> {
    try {
      const filePath = path.join(this.dataDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return content.split('\n').filter(line => line.trim());
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async writeFile(filename: string, data: string[]): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, filename);
      await fs.writeFile(filePath, data.join('\n'), 'utf-8');
    } catch (error) {
      console.error(`Error writing to ${filename}:`, error);
      throw error;
    }
  }

  async appendToFile(filename: string, line: string): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, filename);
      await fs.appendFile(filePath, line + '\n', 'utf-8');
    } catch (error) {
      console.error(`Error appending to ${filename}:`, error);
      throw error;
    }
  }
}

export const fileStorage = new FileStorage();
