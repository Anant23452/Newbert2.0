const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeProviderError} = require('../services/ai/aiService');
test('Google SDK numeric error codes are recognised without status fields',()=>{
  assert.equal(normalizeProviderError({code:404,message:'Model not found'}).code,'AI_MODEL_UNAVAILABLE');
  assert.equal(normalizeProviderError({code:429,message:'Too many requests'}).code,'AI_PROVIDER_LIMIT');
  assert.equal(normalizeProviderError({code:403,message:'Forbidden'}).code,'AI_PROVIDER_AUTH');
  assert.equal(normalizeProviderError({code:400,message:'User location is not supported'}).code,'AI_REGION_UNAVAILABLE');
  assert.equal(normalizeProviderError({code:503,message:'Unavailable'}).code,'AI_PROVIDER_BUSY');
});
