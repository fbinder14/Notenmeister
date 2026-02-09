import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit, FileText } from 'lucide-react';
import { useState } from 'react';
import type { NotenspaltenTyp, Note } from '@/types';
import { getCurrentDate } from '@/db';

const NOTENSPALTEN_TYPEN: { value: NotenspaltenTyp; label: string }[] = [
  { value: 'schulaufgabe', label: 'Schulaufgabe' },
  { value: 'stegreifaufgabe', label: 'Stegreifaufgabe' },
  { value: 'muendlich', label: 'Mündliche Note' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export function NotenTabelle() {
  const {
    schueler,
    notenspalten,
    noten,
    aktuellesFachId,
    faecher,
    klassen,
    aktuelleKlasseId,
    addSchueler,
    updateSchueler,
    deleteSchueler,
    addNotenspalte,
    updateNotenspalte,
    deleteNotenspalte,
    addNote,
    updateNote,
    deleteNote,
    berechneSchuelerDurchschnitt,
  } = useStore();

  // Schüler Dialog State
  const [schuelerVorname, setSchuelerVorname] = useState('');
  const [schuelerNachname, setSchuelerNachname] = useState('');
  const [editSchueler, setEditSchueler] = useState<{ id: string; vorname: string; nachname: string } | null>(null);

  // Notenspalte Dialog State
  const [spaltenName, setSpaltenName] = useState('');
  const [spaltenTyp, setSpaltenTyp] = useState<NotenspaltenTyp>('muendlich');
  const [spaltenGewichtung, setSpaltenGewichtung] = useState('1');
  const [editSpalte, setEditSpalte] = useState<{ id: string; name: string; typ: NotenspaltenTyp; gewichtung: number } | null>(null);

  // Note Dialog State
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteSchuelerId, setNoteSchuelerId] = useState('');
  const [noteSpalteId, setNoteSpalteId] = useState('');
  const [noteWert, setNoteWert] = useState('');
  const [noteDatum, setNoteDatum] = useState(getCurrentDate());
  const [noteKommentar, setNoteKommentar] = useState('');
  const [editNote, setEditNote] = useState<Note | null>(null);

  const aktuelleSchueler = schueler
    .filter(s => s.fachId === aktuellesFachId)
    .sort((a, b) => a.nachname.localeCompare(b.nachname));
  const aktuelleSpalten = notenspalten.filter(n => n.fachId === aktuellesFachId);

  const aktuellesFach = faecher.find(f => f.id === aktuellesFachId);
  const aktuelleKlasse = klassen.find(k => k.id === aktuelleKlasseId);

  const handleAddSchueler = () => {
    if (schuelerVorname.trim() && schuelerNachname.trim()) {
      addSchueler(schuelerVorname.trim(), schuelerNachname.trim());
      setSchuelerVorname('');
      setSchuelerNachname('');
    }
  };

  const handleUpdateSchueler = () => {
    if (editSchueler && editSchueler.vorname.trim() && editSchueler.nachname.trim()) {
      updateSchueler(editSchueler.id, editSchueler.vorname.trim(), editSchueler.nachname.trim());
      setEditSchueler(null);
    }
  };

  const handleAddSpalte = () => {
    if (spaltenName.trim()) {
      addNotenspalte(spaltenName.trim(), spaltenTyp, Number(spaltenGewichtung) || 1);
      setSpaltenName('');
      setSpaltenTyp('muendlich');
      setSpaltenGewichtung('1');
    }
  };

  const handleUpdateSpalte = () => {
    if (editSpalte && editSpalte.name.trim()) {
      updateNotenspalte(editSpalte.id, editSpalte.name.trim(), editSpalte.typ, editSpalte.gewichtung);
      setEditSpalte(null);
    }
  };

  const openNoteDialog = (schuelerId: string, spalteId: string) => {
    const existingNote = noten.find(n => n.schuelerId === schuelerId && n.notenspalteId === spalteId);
    if (existingNote) {
      setEditNote(existingNote);
      setNoteWert(existingNote.wert.toString());
      setNoteDatum(existingNote.datum);
      setNoteKommentar(existingNote.kommentar);
    } else {
      setEditNote(null);
      setNoteWert('');
      setNoteDatum(getCurrentDate());
      setNoteKommentar('');
    }
    setNoteSchuelerId(schuelerId);
    setNoteSpalteId(spalteId);
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    const wert = Number(noteWert);
    if (wert >= 1 && wert <= 6) {
      if (editNote) {
        updateNote(editNote.id, wert, noteDatum, noteKommentar);
      } else {
        addNote(noteSchuelerId, noteSpalteId, wert, noteDatum, noteKommentar);
      }
      setNoteDialogOpen(false);
    }
  };

  const handleDeleteNote = () => {
    if (editNote) {
      deleteNote(editNote.id);
      setNoteDialogOpen(false);
    }
  };

  const getNoteForCell = (schuelerId: string, spalteId: string) => {
    return noten.find(n => n.schuelerId === schuelerId && n.notenspalteId === spalteId);
  };

  const getNoteColor = (wert: number) => {
    if (wert <= 2) return 'text-green-600 dark:text-green-400';
    if (wert <= 4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (!aktuellesFachId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Wähle ein Fach aus der Seitenleiste</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {aktuelleKlasse?.name} - {aktuellesFach?.name}
        </h1>
        <p className="text-muted-foreground">
          {aktuelleSchueler.length} Schüler, {aktuelleSpalten.length} Notenspalten
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {/* Schüler hinzufügen */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Schüler
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Schüler anlegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname</Label>
                <Input
                  id="vorname"
                  value={schuelerVorname}
                  onChange={e => setSchuelerVorname(e.target.value)}
                  placeholder="Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nachname">Nachname</Label>
                <Input
                  id="nachname"
                  value={schuelerNachname}
                  onChange={e => setSchuelerNachname(e.target.value)}
                  placeholder="Mustermann"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Abbrechen</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleAddSchueler}>Anlegen</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notenspalte hinzufügen */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Notenspalte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Notenspalte anlegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="spaltenName">Name</Label>
                <Input
                  id="spaltenName"
                  value={spaltenName}
                  onChange={e => setSpaltenName(e.target.value)}
                  placeholder="1. Schulaufgabe"
                />
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={spaltenTyp} onValueChange={v => setSpaltenTyp(v as NotenspaltenTyp)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTENSPALTEN_TYPEN.map(typ => (
                      <SelectItem key={typ.value} value={typ.value}>
                        {typ.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gewichtung">Gewichtung</Label>
                <Input
                  id="gewichtung"
                  type="number"
                  min="1"
                  max="10"
                  value={spaltenGewichtung}
                  onChange={e => setSpaltenGewichtung(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  z.B. 2 für doppelte Gewichtung bei Schulaufgaben
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Abbrechen</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleAddSpalte}>Anlegen</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notentabelle */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48 sticky left-0 bg-background">Schüler</TableHead>
              {aktuelleSpalten.map(spalte => (
                <TableHead key={spalte.id} className="text-center min-w-24">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium">{spalte.visibleName}</span>
                    <span className="text-xs text-muted-foreground">
                      {NOTENSPALTEN_TYPEN.find(t => t.value === spalte.typ)?.label} ({spalte.gewichtung}x)
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setEditSpalte({ id: spalte.id, name: spalte.visibleName, typ: spalte.typ, gewichtung: spalte.gewichtung })}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => deleteNotenspalte(spalte.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center min-w-20 font-bold">Ø</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aktuelleSchueler.map(s => {
              const durchschnitt = berechneSchuelerDurchschnitt(s.id);
              return (
                <TableRow key={s.id}>
                  <TableCell className="sticky left-0 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {s.nachname}, {s.vorname}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditSchueler({ id: s.id, vorname: s.vorname, nachname: s.nachname })}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteSchueler(s.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  {aktuelleSpalten.map(spalte => {
                    const note = getNoteForCell(s.id, spalte.id);
                    return (
                      <TableCell
                        key={spalte.id}
                        className="text-center cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => openNoteDialog(s.id, spalte.id)}
                      >
                        {note ? (
                          <span className={`text-lg font-bold ${getNoteColor(note.wert)}`}>
                            {note.wert}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-bold">
                    {durchschnitt !== null ? (
                      <span className={getNoteColor(durchschnitt)}>{durchschnitt.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Note bearbeiten Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editNote ? 'Note bearbeiten' : 'Neue Note eintragen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="noteWert">Note (1-6)</Label>
              <Select value={noteWert} onValueChange={setNoteWert}>
                <SelectTrigger>
                  <SelectValue placeholder="Note wählen" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="noteDatum">Datum</Label>
              <Input
                id="noteDatum"
                type="date"
                value={noteDatum}
                onChange={e => setNoteDatum(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noteKommentar">Kommentar</Label>
              <Textarea
                id="noteKommentar"
                value={noteKommentar}
                onChange={e => setNoteKommentar(e.target.value)}
                placeholder="Optionaler Kommentar zur Note..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            {editNote && (
              <Button variant="destructive" onClick={handleDeleteNote} className="mr-auto">
                Löschen
              </Button>
            )}
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveNote} disabled={!noteWert}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schüler bearbeiten Dialog */}
      <Dialog open={!!editSchueler} onOpenChange={open => !open && setEditSchueler(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schüler bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editVorname">Vorname</Label>
              <Input
                id="editVorname"
                value={editSchueler?.vorname ?? ''}
                onChange={e => setEditSchueler(prev => prev ? { ...prev, vorname: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNachname">Nachname</Label>
              <Input
                id="editNachname"
                value={editSchueler?.nachname ?? ''}
                onChange={e => setEditSchueler(prev => prev ? { ...prev, nachname: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchueler(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateSchueler}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notenspalte bearbeiten Dialog */}
      <Dialog open={!!editSpalte} onOpenChange={open => !open && setEditSpalte(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notenspalte bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editSpaltenName">Name</Label>
              <Input
                id="editSpaltenName"
                value={editSpalte?.name ?? ''}
                onChange={e => setEditSpalte(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select
                value={editSpalte?.typ ?? 'muendlich'}
                onValueChange={v => setEditSpalte(prev => prev ? { ...prev, typ: v as NotenspaltenTyp } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTENSPALTEN_TYPEN.map(typ => (
                    <SelectItem key={typ.value} value={typ.value}>
                      {typ.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editGewichtung">Gewichtung</Label>
              <Input
                id="editGewichtung"
                type="number"
                min="1"
                max="10"
                value={editSpalte?.gewichtung ?? 1}
                onChange={e => setEditSpalte(prev => prev ? { ...prev, gewichtung: Number(e.target.value) || 1 } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSpalte(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateSpalte}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
