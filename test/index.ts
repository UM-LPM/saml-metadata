import test from 'ava';
import fs from 'node:fs';
import {classToPlain} from 'class-transformer';
import {parser} from '../src/index.js';

test('aai', async t => {
  const expected = JSON.parse(fs.readFileSync('./test/aai.json', 'utf-8'));
  const stream = fs.createReadStream('./test/aai.xml');
  t.deepEqual(classToPlain(await parser(stream)), expected);
});
