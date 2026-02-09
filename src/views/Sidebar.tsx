import { useStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GraduationCap, BookOpen, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const {
    schuljahre,
    klassen,
    faecher,
    aktuellesSchuljahrId,
    aktuelleKlasseId,
    aktuellesFachId,
    addSchuljahr,
    setAktivesSchuljahr,
    addKlasse,
    deleteKlasse,
    setAktuelleKlasse,
    addFach,
    deleteFach,
    setAktuellesFach,
  } = useStore();

  const [neuesSchuljahr, setNeuesSchuljahr] = useState('');
  const [neueKlasse, setNeueKlasse] = useState('');
  const [neuesFach, setNeuesFach] = useState('');

  const [schuljahrDialogOpen, setSchuljahrDialogOpen] = useState(false);
  const [klasseDialogOpen, setKlasseDialogOpen] = useState(false);
  const [fachDialogOpen, setFachDialogOpen] = useState(false);

  const aktuelleKlassen = klassen.filter(k => k.schuljahrId === aktuellesSchuljahrId);
  const aktuelleFaecher = faecher.filter(f => f.klasseId === aktuelleKlasseId);

  // Automatisch erstes Fach auswählen, wenn Klasse gewechselt wird
  useEffect(() => {
    if (aktuelleKlasseId) {
      const faecherDerKlasse = faecher.filter(f => f.klasseId === aktuelleKlasseId);
      if (faecherDerKlasse.length > 0 && !aktuellesFachId) {
        setAktuellesFach(faecherDerKlasse[0].id);
      }
    }
  }, [aktuelleKlasseId, faecher, aktuellesFachId, setAktuellesFach]);

  const handleAddSchuljahr = () => {
    if (neuesSchuljahr.trim()) {
      addSchuljahr(neuesSchuljahr.trim());
      setNeuesSchuljahr('');
      setSchuljahrDialogOpen(false);
    }
  };

  const handleAddKlasse = () => {
    if (neueKlasse.trim()) {
      addKlasse(neueKlasse.trim());
      setNeueKlasse('');
      setKlasseDialogOpen(false);
    }
  };

  const handleAddFach = () => {
    if (neuesFach.trim()) {
      addFach(neuesFach.trim());
      setNeuesFach('');
      setFachDialogOpen(false);
    }
  };

  const handleKlasseClick = (klasseId: string) => {
    setAktuelleKlasse(klasseId);
    // Automatisch erstes Fach der Klasse auswählen
    const faecherDerKlasse = faecher.filter(f => f.klasseId === klasseId);
    if (faecherDerKlasse.length > 0) {
      setAktuellesFach(faecherDerKlasse[0].id);
    }
  };

  return (
    <aside className="w-80 border-r border-border/60 bg-secondary/30 p-5 flex flex-col gap-5 overflow-y-auto">
      {/* Schuljahr */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schuljahr
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={aktuellesSchuljahrId ?? ''} onValueChange={setAktivesSchuljahr}>
            <SelectTrigger className="text-base">
              <SelectValue placeholder="Schuljahr wählen" />
            </SelectTrigger>
            <SelectContent>
              {schuljahre.map(sj => (
                <SelectItem key={sj.id} value={sj.id} className="text-base">
                  {sj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={schuljahrDialogOpen} onOpenChange={setSchuljahrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="default" className="w-full">
                <Plus className="h-5 w-5 mr-2" />
                Neues Schuljahr
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Schuljahr anlegen</DialogTitle>
              </DialogHeader>
              <form onSubmit={e => { e.preventDefault(); handleAddSchuljahr(); }}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="schuljahr" className="text-base">Name (z.B. 2024/25)</Label>
                    <Input
                      id="schuljahr"
                      value={neuesSchuljahr}
                      onChange={e => setNeuesSchuljahr(e.target.value)}
                      placeholder="2024/25"
                      className="text-base"
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setSchuljahrDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit">Anlegen</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Klassen */}
      {aktuellesSchuljahrId && (
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Klassen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aktuelleKlassen.map(klasse => (
              <div
                key={klasse.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  aktuelleKlasseId === klasse.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-accent'
                }`}
                onClick={() => handleKlasseClick(klasse.id)}
              >
                <span className="text-base font-medium">{klasse.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={e => {
                    e.stopPropagation();
                    deleteKlasse(klasse.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Dialog open={klasseDialogOpen} onOpenChange={setKlasseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="default" className="w-full mt-2">
                  <Plus className="h-5 w-5 mr-2" />
                  Neue Klasse
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neue Klasse anlegen</DialogTitle>
                </DialogHeader>
                <form onSubmit={e => { e.preventDefault(); handleAddKlasse(); }}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="klasse" className="text-base">Name (z.B. 10a)</Label>
                      <Input
                        id="klasse"
                        value={neueKlasse}
                        onChange={e => setNeueKlasse(e.target.value)}
                        placeholder="10a"
                        className="text-base"
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setKlasseDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">Anlegen</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Fächer */}
      {aktuelleKlasseId && (
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Fächer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aktuelleFaecher.map(fach => (
              <div
                key={fach.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  aktuellesFachId === fach.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-accent'
                }`}
                onClick={() => setAktuellesFach(fach.id)}
              >
                <span className="text-base font-medium">{fach.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={e => {
                    e.stopPropagation();
                    deleteFach(fach.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Dialog open={fachDialogOpen} onOpenChange={setFachDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="default" className="w-full mt-2">
                  <Plus className="h-5 w-5 mr-2" />
                  Neues Fach
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neues Fach anlegen</DialogTitle>
                </DialogHeader>
                <form onSubmit={e => { e.preventDefault(); handleAddFach(); }}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="fach" className="text-base">Name (z.B. Mathematik)</Label>
                      <Input
                        id="fach"
                        value={neuesFach}
                        onChange={e => setNeuesFach(e.target.value)}
                        placeholder="Mathematik"
                        className="text-base"
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setFachDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button type="submit">Anlegen</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
