import test from 'ava';
import fs from 'node:fs';
import {parser} from '../src/index.js';
import aai from './aai.json' assert { type: "json" };

test('aai', async t => {
  const stream = fs.createReadStream('./test/examples/aai.xml');
  t.deepEqual(await parser(stream), aai);
});
