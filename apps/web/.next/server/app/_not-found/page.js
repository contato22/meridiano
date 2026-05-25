(() => {
  var e = {};
  ((e.id = 492),
    (e.ids = [492]),
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
      753: (e, r, t) => {
        'use strict';
        (t.r(r),
          t.d(r, {
            GlobalError: () => i.a,
            __next_app__: () => p,
            pages: () => u,
            routeModule: () => m,
            tree: () => l,
          }));
        var n = t(5992),
          o = t(3623),
          s = t(6431),
          i = t.n(s),
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
                '/_not-found',
                {
                  children: [
                    '__PAGE__',
                    {},
                    {
                      page: [
                        () => Promise.resolve().then(t.t.bind(t, 3005, 23)),
                        'next/dist/client/components/not-found-error',
                      ],
                    },
                  ],
                },
                {},
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
          u = [],
          p = { require: t, loadChunk: () => Promise.resolve() },
          m = new n.AppPageRouteModule({
            definition: {
              kind: o.RouteKind.APP_PAGE,
              page: '/_not-found/page',
              pathname: '/_not-found',
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
      3127: (e, r, t) => {
        'use strict';
        (t.r(r), t.d(r, { default: () => s, metadata: () => o }));
        var n = t(8128);
        t(1862);
        let o = {
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
  var r = require('../../webpack-runtime.js');
  r.C(e);
  var t = (e) => r((r.s = e)),
    n = r.X(0, [35], () => t(753));
  module.exports = n;
})();
