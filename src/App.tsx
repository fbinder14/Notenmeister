import { useEffect } from 'react';
import { useStore } from '@/store';
import { Sidebar } from '@/views/Sidebar';
import { NotenTabelle } from '@/views/NotenTabelle';
import { PdfExport } from '@/views/PdfExport';
import { BackupRestore } from '@/views/BackupRestore';

function App() {
  const { init, aktuellesFachId, isLoading } = useStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b px-6 py-3 flex justify-end gap-2">
          <BackupRestore />
          {aktuellesFachId && <PdfExport />}
        </header>
        <NotenTabelle />
      </main>
    </div>
  );
}

export default App;
