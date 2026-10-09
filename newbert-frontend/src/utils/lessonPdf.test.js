import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pdfPreviewUrl} from './lessonPdf.js';
test('PDF notes and Drive file links stay in the inline reader',()=>{
  assert.equal(pdfPreviewUrl({url:'https://example.com/notes.pdf'}),'https://example.com/notes.pdf');
  assert.equal(pdfPreviewUrl({url:'https://example.com/download?id=1',format:'pdf'}),'https://example.com/download?id=1');
  assert.equal(pdfPreviewUrl({url:'https://drive.google.com/file/d/abc_123/view?usp=sharing'}),'https://drive.google.com/file/d/abc_123/preview');
  assert.equal(pdfPreviewUrl({url:'https://drive.google.com/open?id=abc_123'}),'https://drive.google.com/file/d/abc_123/preview');
});
test('unsupported links and unsafe URLs do not become PDF frames',()=>{
  for(const url of ['javascript:alert(1)','http://example.com/notes.pdf','https://user:password@example.com/notes.pdf','https://drive.google.com/folder/abc','https://example.com/page'])assert.equal(pdfPreviewUrl({url}),null);
});
