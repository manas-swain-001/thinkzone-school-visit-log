import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanString, cleanObject } from '../src/utils/clean.js';

test('trims the edges', () => {
  assert.equal(cleanString('  AMBABHONA  '), 'AMBABHONA');
});

test('collapses internal runs of whitespace', () => {
  // Straight from schools.json
  assert.equal(cleanString('GOVT. PRIMARY SCHOOL,  AMBABHONA'), 'GOVT. PRIMARY SCHOOL, AMBABHONA');
  assert.equal(cleanString('a\t\t\tb'), 'a b');
  assert.equal(cleanString('a\n\nb'), 'a b');
});

test('trims and collapses at the same time', () => {
  assert.equal(cleanString('  Govt.  School   No 1  '), 'Govt. School No 1');
});

test('turns empty and whitespace-only strings into null', () => {
  assert.equal(cleanString(''), null);
  assert.equal(cleanString('   '), null);
  assert.equal(cleanString('\t\n'), null);
  assert.equal(cleanString(null), null);
  assert.equal(cleanString(undefined), null);
});

test('passes non-strings through untouched', () => {
  assert.equal(cleanString(0), 0);
  assert.equal(cleanString(false), false);
  assert.equal(cleanString(42), 42);
});

test('leaves a clean string identical', () => {
  assert.equal(cleanString('AMBABHONA'), 'AMBABHONA');
});

test('never returns undefined, so an omitted field becomes null not absent', () => {
  assert.equal(cleanString(), null);
});

test('cleanObject normalises every value', () => {
  assert.deepEqual(
    cleanObject({ a: '  x  ', b: '', c: 'y   z', d: 5, e: false, f: null }),
    { a: 'x', b: null, c: 'y z', d: 5, e: false, f: null }
  );
});

test('cleanObject normalises arrays of strings', () => {
  assert.deepEqual(cleanObject({ options: [' Yes ', 'No', '  '] }), { options: ['Yes', 'No', null] });
});
