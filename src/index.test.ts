import { hello } from './index';

describe('hello function', () => {
  it('should return a greeting message', () => {
    expect(hello('World')).toBe('Hello, World!');
  });

  it('should handle different names', () => {
    expect(hello('TypeScript')).toBe('Hello, TypeScript!');
  });
});