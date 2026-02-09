import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Download, Upload, Database, AlertTriangle } from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { useState } from 'react';
import { loadData, saveData, type DBData } from '@/db';

export function BackupRestore() {
  const { init } = useStore();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const data = await loadData();
      const datum = new Date().toISOString().split('T')[0];

      const filePath = await save({
        defaultPath: `notenmeister-backup-${datum}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(data, null, 2));
        setMessage({ type: 'success', text: 'Backup erfolgreich erstellt!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (e) {
      console.error('Fehler beim Export:', e);
      setMessage({ type: 'error', text: 'Fehler beim Erstellen des Backups.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImport = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
      });

      if (filePath && typeof filePath === 'string') {
        const content = await readTextFile(filePath);
        const data = JSON.parse(content) as DBData;

        // Validierung
        if (!data.schuljahre || !data.klassen || !data.faecher || !data.schueler || !data.notenspalten || !data.noten) {
          throw new Error('Ungültiges Backup-Format');
        }

        await saveData(data);
        await init();

        setImportDialogOpen(false);
        setMessage({ type: 'success', text: 'Backup erfolgreich wiederhergestellt!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (e) {
      console.error('Fehler beim Import:', e);
      setMessage({ type: 'error', text: 'Fehler beim Wiederherstellen des Backups.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <>
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
            message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Database className="h-4 w-4 mr-2" />
            Backup
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backup & Wiederherstellung</DialogTitle>
            <DialogDescription>
              Sichere deine Noten oder stelle ein früheres Backup wieder her.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Backup erstellen</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Speichere alle deine Daten in einer Datei, die du sicher aufbewahren kannst.
              </p>
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Backup jetzt erstellen
              </Button>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Backup wiederherstellen</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Stelle deine Daten aus einer Backup-Datei wieder her.
              </p>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Backup wiederherstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bestätigungsdialog für Import */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Backup wiederherstellen
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Achtung:</strong> Beim Wiederherstellen eines Backups werden alle aktuellen Daten überschrieben.
              Stelle sicher, dass du ein aktuelles Backup hast, falls du die jetzigen Daten behalten möchtest.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleImport}>
              Backup laden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
