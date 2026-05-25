(() => {
  var e = {};
  ((e.id = 974),
    (e.ids = [974]),
    (e.modules = {
      846: (e) => {
        'use strict';
        e.exports = require('next/dist/compiled/next-server/app-page.runtime.prod.js');
      },
      9121: (e) => {
        'use strict';
        e.exports = require('next/dist/server/app-render/action-async-storage.external.js');
      },
      3295: (e) => {
        'use strict';
        e.exports = require('next/dist/server/app-render/after-task-async-storage.external.js');
      },
      9294: (e) => {
        'use strict';
        e.exports = require('next/dist/server/app-render/work-async-storage.external.js');
      },
      3033: (e) => {
        'use strict';
        e.exports = require('next/dist/server/app-render/work-unit-async-storage.external.js');
      },
      3873: (e) => {
        'use strict';
        e.exports = require('path');
      },
      5235: (e, r, t) => {
        'use strict';
        (t.r(r),
          t.d(r, {
            GlobalError: () => o.a,
            __next_app__: () => u,
            pages: () => p,
            routeModule: () => m,
            tree: () => l,
          }));
        var s = t(5992),
          n = t(3623),
          i = t(6431),
          o = t.n(i),
          a = t(7968),
          d = {};
        for (let e in a)
          0 >
            ['default', 'tree', 'pages', 'GlobalError', '__next_app__', 'routeModule'].indexOf(e) &&
            (d[e] = () => a[e]);
        t.d(r, d);
        let l = [
            '',
            {
              children: [
                '__PAGE__',
                {},
                {
                  page: [
                    () => Promise.resolve().then(t.bind(t, 5516)),
                    '/home/user/meridiano/apps/web/app/page.tsx',
                  ],
                },
              ],
            },
            {
              layout: [
                () => Promise.resolve().then(t.bind(t, 3127)),
                '/home/user/meridiano/apps/web/app/layout.tsx',
              ],
              'not-found': [
                () => Promise.resolve().then(t.t.bind(t, 3005, 23)),
                'next/dist/client/components/not-found-error',
              ],
              forbidden: [
                () => Promise.resolve().then(t.t.bind(t, 976, 23)),
                'next/dist/client/components/forbidden-error',
              ],
              unauthorized: [
                () => Promise.resolve().then(t.t.bind(t, 3265, 23)),
                'next/dist/client/components/unauthorized-error',
              ],
            },
          ],
          p = ['/home/user/meridiano/apps/web/app/page.tsx'],
          u = { require: t, loadChunk: () => Promise.resolve() },
          m = new s.AppPageRouteModule({
            definition: {
              kind: n.RouteKind.APP_PAGE,
              page: '/page',
              pathname: '/',
              bundlePath: '',
              filename: '',
              appPaths: [],
            },
            userland: { loaderTree: l },
          });
      },
      6917: () => {},
      8773: () => {},
      6507: (e, r, t) => {
        (Promise.resolve().then(t.t.bind(t, 1783, 23)),
          Promise.resolve().then(t.t.bind(t, 4955, 23)),
          Promise.resolve().then(t.t.bind(t, 6431, 23)),
          Promise.resolve().then(t.t.bind(t, 8190, 23)),
          Promise.resolve().then(t.t.bind(t, 586, 23)),
          Promise.resolve().then(t.t.bind(t, 1374, 23)),
          Promise.resolve().then(t.t.bind(t, 8453, 23)));
      },
      2531: (e, r, t) => {
        (Promise.resolve().then(t.t.bind(t, 9071, 23)),
          Promise.resolve().then(t.t.bind(t, 1843, 23)),
          Promise.resolve().then(t.t.bind(t, 4247, 23)),
          Promise.resolve().then(t.t.bind(t, 3334, 23)),
          Promise.resolve().then(t.t.bind(t, 4322, 23)),
          Promise.resolve().then(t.t.bind(t, 198, 23)),
          Promise.resolve().then(t.t.bind(t, 9045, 23)));
      },
      5725: () => {},
      989: () => {},
      3127: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => i, metadata: () => n }));
        var s = t(8128);
        t(1862);
        let n = {
          title: 'Meridiano',
          description: 'Plataforma de gest\xe3o e intelig\xeancia do AWQ Group',
        };
        function i({ children: e }) {
          return (0, s.jsx)('html', {
            lang: 'pt-BR',
            children: (0, s.jsx)('body', { children: e }),
          });
        }
      },
      5516: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => n }));
        var s = t(8128);
        function n() {
          return (0, s.jsxs)('main', {
            className:
              'mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16',
            children: [
              (0, s.jsx)('h1', {
                className: 'text-4xl font-semibold tracking-tight',
                children: 'Meridiano',
              }),
              (0, s.jsx)('p', {
                className: 'text-lg text-zinc-600 dark:text-zinc-400',
                children: 'Plataforma de gest\xe3o e intelig\xeancia do AWQ Group.',
              }),
              (0, s.jsx)('p', {
                className: 'text-sm text-zinc-500',
                children: 'Sprint 1 foundation — auth, database, and ledger UI wiring up next.',
              }),
            ],
          });
        }
      },
      1862: () => {},
    }));
  var r = require('../webpack-runtime.js');
  r.C(e);
  var t = (e) => r((r.s = e)),
    s = r.X(0, [35], () => t(5235));
  module.exports = s;
})();
