import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import {instanceToPlain} from 'class-transformer';
import {parser} from '../src/index.js';

test('aai', async t => {
  const expected = JSON.parse(fs.readFileSync('./test/aai.json', 'utf-8'));
  const stream = fs.createReadStream('./test/aai.xml');
  assert.deepStrictEqual(instanceToPlain(await parser(stream)), expected);
});
