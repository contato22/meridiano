(() => {
  var e = {};
  ((e.id = 337),
    (e.ids = [337]),
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
      5855: (e, r, t) => {
        'use strict';
        (t.r(r),
          t.d(r, {
            GlobalError: () => o.a,
            __next_app__: () => c,
            pages: () => h,
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
                '(dashboard)',
                {
                  children: [
                    'dashboard',
                    {
                      children: [
                        '__PAGE__',
                        {},
                        {
                          page: [
                            () => Promise.resolve().then(t.bind(t, 8419)),
                            '/home/user/meridiano/apps/web/app/(dashboard)/dashboard/page.tsx',
                          ],
                        },
                      ],
                    },
                    {},
                  ],
                },
                {
                  layout: [
                    () => Promise.resolve().then(t.bind(t, 3075)),
                    '/home/user/meridiano/apps/web/app/(dashboard)/layout.tsx',
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
          h = ['/home/user/meridiano/apps/web/app/(dashboard)/dashboard/page.tsx'],
          c = { require: t, loadChunk: () => Promise.resolve() },
          m = new s.AppPageRouteModule({
            definition: {
              kind: n.RouteKind.APP_PAGE,
              page: '/(dashboard)/dashboard/page',
              pathname: '/dashboard',
              bundlePath: '',
              filename: '',
              appPaths: [],
            },
            userland: { loaderTree: l },
          });
      },
      6917: () => {},
      8773: () => {},
      5617: (e, r, t) => {
        Promise.resolve().then(t.t.bind(t, 7515, 23));
      },
      5889: (e, r, t) => {
        Promise.resolve().then(t.t.bind(t, 1347, 23));
      },
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
      8419: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => n }));
        var s = t(8128);
        function n() {
          return (0, s.jsxs)('div', {
            children: [
              (0, s.jsx)('h1', {
                className: 'text-2xl font-semibold tracking-tight',
                children: 'Dashboard',
              }),
              (0, s.jsx)('p', {
                className: 'mt-2 text-sm text-zinc-500',
                children:
                  'Stub — vir\xe1 com dados reais quando auth + DB estiverem ligados (PR-B/PR-C).',
              }),
            ],
          });
        }
      },
      3075: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => o }));
        var s = t(8128),
          n = t(7515),
          i = t.n(n);
        function o({ children: e }) {
          return (0, s.jsxs)('div', {
            className: 'grid min-h-screen grid-cols-[16rem_1fr] bg-zinc-50 dark:bg-zinc-950',
            children: [
              (0, s.jsxs)('aside', {
                className:
                  'border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900',
                children: [
                  (0, s.jsx)(i(), {
                    href: '/',
                    className: 'text-lg font-semibold',
                    children: 'Meridiano',
                  }),
                  (0, s.jsxs)('nav', {
                    className: 'mt-8 flex flex-col gap-2 text-sm',
                    children: [
                      (0, s.jsx)(i(), {
                        href: '/dashboard',
                        className: 'text-zinc-600 hover:text-zinc-900 dark:hover:text-white',
                        children: 'Dashboard',
                      }),
                      (0, s.jsx)(i(), {
                        href: '/accounts',
                        className: 'text-zinc-600 hover:text-zinc-900 dark:hover:text-white',
                        children: 'Contas',
                      }),
                      (0, s.jsx)(i(), {
                        href: '/ledger',
                        className: 'text-zinc-600 hover:text-zinc-900 dark:hover:text-white',
                        children: 'Raz\xe3o',
                      }),
                      (0, s.jsx)(i(), {
                        href: '/transactions/new',
                        className: 'text-zinc-600 hover:text-zinc-900 dark:hover:text-white',
                        children: 'Nova transa\xe7\xe3o',
                      }),
                    ],
                  }),
                ],
              }),
              (0, s.jsx)('main', { className: 'p-8', children: e }),
            ],
          });
        }
      },
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
      1862: () => {},
    }));
  var r = require('../../../webpack-runtime.js');
  r.C(e);
  var t = (e) => r((r.s = e)),
    s = r.X(0, [35, 793], () => t(5855));
  module.exports = s;
})();
