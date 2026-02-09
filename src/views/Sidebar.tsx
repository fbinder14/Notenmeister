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
  DialogClose,
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
import { useState } from 'react';

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
    deleteSchuljahr,
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

  const aktuelleKlassen = klassen.filter(k => k.schuljahrId === aktuellesSchuljahrId);
  const aktuelleFaecher = faecher.filter(f => f.klasseId === aktuelleKlasseId);

  const handleAddSchuljahr = () => {
    if (neuesSchuljahr.trim()) {
      addSchuljahr(neuesSchuljahr.trim());
      setNeuesSchuljahr('');
    }
  };

  const handleAddKlasse = () => {
    if (neueKlasse.trim()) {
      addKlasse(neueKlasse.trim());
      setNeueKlasse('');
    }
  };

  const handleAddFach = () => {
    if (neuesFach.trim()) {
      addFach(neuesFach.trim());
      setNeuesFach('');
    }
  };

  return (
    <aside className="w-72 border-r bg-card p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Schuljahr */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schuljahr
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Select value={aktuellesSchuljahrId ?? ''} onValueChange={setAktivesSchuljahr}>
            <SelectTrigger>
              <SelectValue placeholder="Schuljahr wählen" />
            </SelectTrigger>
            <SelectContent>
              {schuljahre.map(sj => (
                <SelectItem key={sj.id} value={sj.id}>
                  {sj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Neues Schuljahr
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Schuljahr anlegen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="schuljahr">Name (z.B. 2024/25)</Label>
                  <Input
                    id="schuljahr"
                    value={neuesSchuljahr}
                    onChange={e => setNeuesSchuljahr(e.target.value)}
                    placeholder="2024/25"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Abbrechen</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleAddSchuljahr}>Anlegen</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Klassen */}
      {aktuellesSchuljahrId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Klassen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aktuelleKlassen.map(klasse => (
              <div
                key={klasse.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  aktuelleKlasseId === klasse.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setAktuelleKlasse(klasse.id)}
              >
                <span className="text-sm font-medium">{klasse.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={e => {
                    e.stopPropagation();
                    deleteKlasse(klasse.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Klasse
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neue Klasse anlegen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="klasse">Name (z.B. 10a)</Label>
                    <Input
                      id="klasse"
                      value={neueKlasse}
                      onChange={e => setNeueKlasse(e.target.value)}
                      placeholder="10a"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Abbrechen</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleAddKlasse}>Anlegen</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Fächer */}
      {aktuelleKlasseId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Fächer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {aktuelleFaecher.map(fach => (
              <div
                key={fach.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  aktuellesFachId === fach.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setAktuellesFach(fach.id)}
              >
                <span className="text-sm font-medium">{fach.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={e => {
                    e.stopPropagation();
                    deleteFach(fach.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Neues Fach
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neues Fach anlegen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="fach">Name (z.B. Mathematik)</Label>
                    <Input
                      id="fach"
                      value={neuesFach}
                      onChange={e => setNeuesFach(e.target.value)}
                      placeholder="Mathematik"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Abbrechen</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleAddFach}>Anlegen</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
