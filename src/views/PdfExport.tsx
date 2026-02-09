import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileDown } from 'lucide-react';

const NOTENSPALTEN_TYPEN_MAP: Record<string, string> = {
  schulaufgabe: 'Schulaufgabe',
  stegreifaufgabe: 'Stegreifaufgabe',
  muendlich: 'Mündlich',
  sonstiges: 'Sonstiges',
};

export function PdfExport() {
  const {
    schueler,
    notenspalten,
    noten,
    aktuellesFachId,
    faecher,
    klassen,
    schuljahre,
    aktuelleKlasseId,
    aktuellesSchuljahrId,
    berechneSchuelerDurchschnitt,
  } = useStore();

  const aktuelleSchueler = schueler
    .filter(s => s.fachId === aktuellesFachId)
    .sort((a, b) => a.nachname.localeCompare(b.nachname));
  const aktuelleSpalten = notenspalten.filter(n => n.fachId === aktuellesFachId);

  const aktuellesFach = faecher.find(f => f.id === aktuellesFachId);
  const aktuelleKlasse = klassen.find(k => k.id === aktuelleKlasseId);
  const aktuellesSchuljahr = schuljahre.find(s => s.id === aktuellesSchuljahrId);

  const getNoteForCell = (schuelerId: string, spalteId: string) => {
    return noten.find(n => n.schuelerId === schuelerId && n.notenspalteId === spalteId);
  };

  const generatePdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Notenübersicht - ${aktuelleKlasse?.name} - ${aktuellesFach?.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      font-size: 12px;
    }
    .header {
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .header h1 {
      font-size: 18px;
      margin-bottom: 5px;
    }
    .header p {
      color: #666;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px 6px;
      text-align: center;
    }
    th {
      background-color: #f5f5f5;
      font-weight: 600;
    }
    th.name-col, td.name-col {
      text-align: left;
      min-width: 150px;
    }
    .spalten-info {
      font-size: 9px;
      color: #666;
      font-weight: normal;
    }
    .note-gut { color: #16a34a; }
    .note-mittel { color: #ca8a04; }
    .note-schlecht { color: #dc2626; }
    .durchschnitt {
      font-weight: bold;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 10px;
      color: #666;
    }
    @media print {
      body { padding: 10px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Notenübersicht</h1>
    <p>
      <strong>Klasse:</strong> ${aktuelleKlasse?.name} |
      <strong>Fach:</strong> ${aktuellesFach?.name} |
      <strong>Schuljahr:</strong> ${aktuellesSchuljahr?.name}
    </p>
  </div>

  <table>
    <thead>
      <tr>
        <th class="name-col">Schüler</th>
        ${aktuelleSpalten
          .map(
            spalte => `
          <th>
            ${spalte.visibleName}
            <div class="spalten-info">${NOTENSPALTEN_TYPEN_MAP[spalte.typ]} (${spalte.gewichtung}x)</div>
          </th>
        `
          )
          .join('')}
        <th>Ø</th>
      </tr>
    </thead>
    <tbody>
      ${aktuelleSchueler
        .map(s => {
          const durchschnitt = berechneSchuelerDurchschnitt(s.id);
          const getNoteClass = (wert: number) => {
            if (wert <= 2) return 'note-gut';
            if (wert <= 4) return 'note-mittel';
            return 'note-schlecht';
          };
          return `
          <tr>
            <td class="name-col">${s.nachname}, ${s.vorname}</td>
            ${aktuelleSpalten
              .map(spalte => {
                const note = getNoteForCell(s.id, spalte.id);
                return `<td class="${note ? getNoteClass(note.wert) : ''}">${note ? note.wert : '-'}</td>`;
              })
              .join('')}
            <td class="durchschnitt ${durchschnitt ? getNoteClass(durchschnitt) : ''}">
              ${durchschnitt !== null ? durchschnitt.toFixed(2) : '-'}
            </td>
          </tr>
        `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    Erstellt am ${new Date().toLocaleDateString('de-DE')} mit Notenmeister
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!aktuellesFachId) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          PDF Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notenübersicht exportieren</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Exportiere die Notenübersicht für <strong>{aktuelleKlasse?.name} - {aktuellesFach?.name}</strong> als PDF.
          </p>
          <div className="bg-muted p-4 rounded-lg text-sm">
            <p><strong>Enthält:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{aktuelleSchueler.length} Schüler</li>
              <li>{aktuelleSpalten.length} Notenspalten</li>
              <li>Gewichteter Durchschnitt</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={generatePdf}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF erstellen & drucken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
