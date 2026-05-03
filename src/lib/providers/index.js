import { MoviesProvider } from './movies';

/**
 * Provider Registry
 * 
 * Modular system for content providers.
 * To add a new provider (e.g., Drama, ShortTV):
 * 
 * 1. Create src/lib/providers/drama.js extending BaseProvider
 * 2. Import and register it here
 * 3. Use getProvider('drama') in your API routes/pages
 * 
 * Example:
 *   import { DramaProvider } from './drama';
 *   registerProvider('drama', DramaProvider);
 */

const providers = {};

// Register a provider class
export function registerProvider(name, ProviderClass) {
  providers[name] = new ProviderClass();
}

// Get a provider instance by name
export function getProvider(name = 'movies') {
  if (!providers[name]) {
    throw new Error(`Provider "${name}" not registered. Available: ${Object.keys(providers).join(', ')}`);
  }
  return providers[name];
}

// Get all registered provider names
export function getProviderNames() {
  return Object.keys(providers);
}

// ─── Register default providers ──────────────────────────────
registerProvider('movies', MoviesProvider);

// Future providers (uncomment when ready):
// import { DramaProvider } from './drama';
// import { ShortsProvider } from './shorts';
// registerProvider('drama', DramaProvider);
// registerProvider('shorts', ShortsProvider);

export default getProvider;
