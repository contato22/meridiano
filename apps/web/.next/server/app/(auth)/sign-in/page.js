(() => {
  var e = {};
  ((e.id = 6),
    (e.ids = [6]),
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
      5539: (e, r, t) => {
        'use strict';
        (t.r(r),
          t.d(r, {
            GlobalError: () => o.a,
            __next_app__: () => p,
            pages: () => u,
            routeModule: () => m,
            tree: () => l,
          }));
        var n = t(5992),
          i = t(3623),
          s = t(6431),
          o = t.n(s),
          d = t(7968),
          a = {};
        for (let e in d)
          0 >
            ['default', 'tree', 'pages', 'GlobalError', '__next_app__', 'routeModule'].indexOf(e) &&
            (a[e] = () => d[e]);
        t.d(r, a);
        let l = [
            '',
            {
              children: [
                '(auth)',
                {
                  children: [
                    'sign-in',
                    {
                      children: [
                        '__PAGE__',
                        {},
                        {
                          page: [
                            () => Promise.resolve().then(t.bind(t, 1722)),
                            '/home/user/meridiano/apps/web/app/(auth)/sign-in/page.tsx',
                          ],
                        },
                      ],
                    },
                    {},
                  ],
                },
                {
                  layout: [
                    () => Promise.resolve().then(t.bind(t, 1777)),
                    '/home/user/meridiano/apps/web/app/(auth)/layout.tsx',
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
          u = ['/home/user/meridiano/apps/web/app/(auth)/sign-in/page.tsx'],
          p = { require: t, loadChunk: () => Promise.resolve() },
          m = new n.AppPageRouteModule({
            definition: {
              kind: i.RouteKind.APP_PAGE,
              page: '/(auth)/sign-in/page',
              pathname: '/sign-in',
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
      1777: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => i }));
        var n = t(8128);
        function i({ children: e }) {
          return (0, n.jsx)('div', {
            className:
              'flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950',
            children: (0, n.jsx)('div', { className: 'w-full max-w-sm', children: e }),
          });
        }
      },
      1722: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => i }));
        var n = t(8128);
        function i() {
          return (0, n.jsxs)('div', {
            className:
              'rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
            children: [
              (0, n.jsx)('h1', { className: 'mb-2 text-2xl font-semibold', children: 'Entrar' }),
              (0, n.jsx)('p', {
                className: 'text-sm text-zinc-500',
                children: 'Authentication coming in PR-B (Clerk integration).',
              }),
            ],
          });
        }
      },
      3127: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => s, metadata: () => i }));
        var n = t(8128);
        t(1862);
        let i = {
          title: 'Meridiano',
          description: 'Plataforma de gest\xe3o e intelig\xeancia do AWQ Group',
        };
        function s({ children: e }) {
          return (0, n.jsx)('html', {
            lang: 'pt-BR',
            children: (0, n.jsx)('body', { children: e }),
          });
        }
      },
      1862: () => {},
    }));
  var r = require('../../../webpack-runtime.js');
  r.C(e);
  var t = (e) => r((r.s = e)),
    n = r.X(0, [35], () => t(5539));
  module.exports = n;
})();
