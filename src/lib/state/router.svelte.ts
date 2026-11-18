/** Minimaler Hash-Router: #/kurs/<klasse>/<kurs> usw. */

export type Route =
  | { name: 'dashboard' }
  | { name: 'class'; classId: string }
  | { name: 'course'; classId: string; courseId: string }
  | { name: 'assessment'; classId: string; courseId: string; assessmentId: string }
  | { name: 'quick'; classId: string; courseId: string }
  | { name: 'report'; classId: string; courseId: string }
  | { name: 'observation'; classId: string; courseId: string; studentId: string }
  | { name: 'student'; classId: string; studentId: string }
  | { name: 'print'; classId: string; courseId: string }
  | { name: 'settings' };

function parse(hash: string): Route {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (p[0]) {
    case 'klasse':
      if (p[1]) return { name: 'class', classId: p[1] };
      break;
    case 'kurs':
      if (p[1] && p[2]) {
        if (p[3] === 'ln' && p[4]) return { name: 'assessment', classId: p[1], courseId: p[2], assessmentId: p[4] };
        if (p[3] === 'erfassen') return { name: 'quick', classId: p[1], courseId: p[2] };
        if (p[3] === 'zeugnis') return { name: 'report', classId: p[1], courseId: p[2] };
        if (p[3] === 'beobachtung' && p[4]) return { name: 'observation', classId: p[1], courseId: p[2], studentId: p[4] };
        return { name: 'course', classId: p[1], courseId: p[2] };
      }
      break;
    case 'schueler':
      if (p[1] && p[2]) return { name: 'student', classId: p[1], studentId: p[2] };
      break;
    case 'druck':
      if (p[1] && p[2]) return { name: 'print', classId: p[1], courseId: p[2] };
      break;
    case 'einstellungen':
      return { name: 'settings' };
  }
  return { name: 'dashboard' };
}

class Router {
  route = $state<Route>(parse(location.hash));
  constructor() {
    addEventListener('hashchange', () => {
      this.route = parse(location.hash);
      document.querySelector('main')?.scrollTo({ top: 0 });
    });
  }
}

export const router = new Router();

export const href = {
  dashboard: () => '#/',
  cls: (c: string) => `#/klasse/${c}`,
  course: (c: string, k: string) => `#/kurs/${c}/${k}`,
  assessment: (c: string, k: string, a: string) => `#/kurs/${c}/${k}/ln/${a}`,
  quick: (c: string, k: string) => `#/kurs/${c}/${k}/erfassen`,
  report: (c: string, k: string) => `#/kurs/${c}/${k}/zeugnis`,
  observation: (c: string, k: string, s: string) => `#/kurs/${c}/${k}/beobachtung/${s}`,
  student: (c: string, s: string) => `#/schueler/${c}/${s}`,
  print: (c: string, k: string) => `#/druck/${c}/${k}`,
  settings: () => '#/einstellungen',
};

export function go(h: string) {
  location.hash = h;
}
