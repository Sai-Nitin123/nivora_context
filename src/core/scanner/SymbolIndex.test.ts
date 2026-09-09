import { describe, it, expect } from 'vitest';
import { SymbolIndex } from './SymbolIndex.js';

describe('SymbolIndex', () => {
  const indexer = new SymbolIndex();

  it('indexes Python function and class symbols', () => {
    const pyCode = `
class AuthService:
    def __init__(self):
        pass

    def create_access_token(self, user_id: str):
        return "token"

def verify_token(token: str):
    return True
`;

    const symbols = indexer.indexFile('app/auth/jwt.py', pyCode);
    const names = symbols.map((s) => s.name);

    expect(names).toContain('AuthService');
    expect(names).toContain('create_access_token');
    expect(names).toContain('verify_token');
    expect(names).not.toContain('__init__');
  });

  it('indexes TypeScript functions, arrow functions, and classes', () => {
    const tsCode = `
export class PaymentService {
  constructor() {}
}

export function processPayment() {}

export const cancelSubscription = async () => {};

export interface PaymentConfig {}
`;

    const symbols = indexer.indexFile('src/payments/service.ts', tsCode);
    const names = symbols.map((s) => s.name);

    expect(names).toContain('PaymentService');
    expect(names).toContain('processPayment');
    expect(names).toContain('cancelSubscription');
    expect(names).toContain('PaymentConfig');
  });

  it('finds callers of a symbol across file contents', () => {
    const callerCode = `
import { processPayment } from './service.js';

export function checkout() {
  processPayment();
}
`;
    const files = new Map<string, string>();
    files.set('src/routes/checkout.ts', callerCode);

    const callers = indexer.findCallers('processPayment', files);
    expect(callers.length).toBeGreaterThan(0);
    expect(callers[0].file).toBe('src/routes/checkout.ts');
  });
});
