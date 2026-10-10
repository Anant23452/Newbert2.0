import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lectureUnit} from './lectureUnit.js';
test('import selects only an unambiguous explicit unit',()=>{
  assert.equal(lectureUnit('Power System 1 || Unit 2 || One Shot Part 1 || 3rd Yr'),2);
  assert.equal(lectureUnit('UNIT: 4'),4);
  assert.equal(lectureUnit('Unit 1 and Unit 2'),null);
  assert.equal(lectureUnit('Part 3'),null);
});
