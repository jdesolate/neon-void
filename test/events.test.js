import test from 'node:test';
import assert from 'node:assert/strict';
import { createBus } from '../src/engine/events.js';

test('emit calls subscribers with the payload', () => {
  const bus = createBus();
  const seen = [];
  bus.on('enemy-killed', p => seen.push(p));
  bus.emit('enemy-killed', { tier: 2 });
  assert.deepEqual(seen, [{ tier: 2 }]);
});

test('multiple subscribers fire in subscription order', () => {
  const bus = createBus();
  const order = [];
  bus.on('x', () => order.push('a'));
  bus.on('x', () => order.push('b'));
  bus.emit('x');
  assert.deepEqual(order, ['a', 'b']);
});

test('emit with no subscribers does not throw', () => {
  const bus = createBus();
  assert.doesNotThrow(() => bus.emit('nothing', 1));
});

test('off removes a subscriber; others keep firing', () => {
  const bus = createBus();
  let a = 0, b = 0;
  const fnA = () => a++;
  bus.on('x', fnA);
  bus.on('x', () => b++);
  bus.emit('x');
  bus.off('x', fnA);
  bus.emit('x');
  assert.equal(a, 1);
  assert.equal(b, 2);
});

test('on returns an unsubscribe function', () => {
  const bus = createBus();
  let n = 0;
  const off = bus.on('x', () => n++);
  bus.emit('x');
  off();
  bus.emit('x');
  assert.equal(n, 1);
});

test('subscribing during emit does not fire for the current emit', () => {
  const bus = createBus();
  let late = 0;
  bus.on('x', () => { bus.on('x', () => late++); });
  bus.emit('x');
  assert.equal(late, 0);
  bus.emit('x');
  assert.equal(late, 1);
});

test('events are isolated per type', () => {
  const bus = createBus();
  let n = 0;
  bus.on('a', () => n++);
  bus.emit('b');
  assert.equal(n, 0);
});
