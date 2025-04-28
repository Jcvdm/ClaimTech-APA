// src/lib/api/index.ts
// Re-export everything for convenient imports
export * from './types';
export * from './client';
export * from './hooks';
export * from './utils';

// Import and re-export domain modules
export * from './domains/claims';
export * from './domains/clients';
export * from './domains/vehicles';
export * from './domains/posts';
export * from './domains/lookups';
export * from './domains/attachments';
