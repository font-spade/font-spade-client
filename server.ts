import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppServerModule } from './src/main.server';
import { environment } from './src/environments/environment';
const fs = require('fs');


// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  let jsonData = {}
// 파일 읽기

  let clientFolder = '';
  if(environment.production) {
    clientFolder = join('/var/www/font-spade/browser');
    // clientFolder = join('/Users/doheyonkim/Depot/font-spade-client/dist/font-spade/browser');
  } else {
    clientFolder = join('/Users/doheyonkim/Depot/font-spade-client/dist/font-spade/browser');
  }
// JSON 파일 경로
  const filePath = clientFolder+'/data/metadata.json';
  // const

  const indexHtml = existsSync(join(clientFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('파일을 읽을 수 없습니다.', err);
      return;
    }

    try {
      // JSON 형식의 데이터로 변환
      jsonData = JSON.parse(data);

      // 읽은 데이터 출력 또는 활용
      // console.log('JSON 데이터:', jsonData);
      console.log('JSON 파일 Read가 메모리에 올라왔습니다')

      // 이곳에서 데이터에 대한 추가 작업 수행 가능
    } catch (jsonError) {
      console.error('JSON 데이터를 파싱하는 동안 오류가 발생했습니다.', jsonError);
    }
  });

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/main/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule
  }));

  server.set('view engine', 'html');
  server.set('views', clientFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(clientFolder, {
    maxAge: '1y'
  }));

  server.get('/api', (req: any, res: any) => {
    // 쿼리 파라미터에서 'path' 값을 가져옴
    const queryPath = req.query.path;

    // 쿼리 파라미터 'path' 값이 없을 경우 에러 응답
    if (!queryPath) {
      return res.status(400).json({ error: 'Missing path parameter in the query.' });
    }

    // 쿼리 파라미터 'path'를 '.'로 분리하여 객체를 탐색
    const keys = queryPath.split('.');
    let result = jsonData;

    for (const key of keys) {
      // 각 키에 대한 객체가 존재하는지 확인
      if (result.hasOwnProperty(key)) {
        result = result[key];
      } else {
        return res.status(404).json({ error: 'Object not found.' });
      }
    }

    // 결과를 JSON 형태로 응답
    res.json(result);

  });

  // All regular routes use the Universal engine
  server.get('*', (req, res) => {
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
