export const environment = {
  production: false,
  environmentName: 'development' as const,
  // Pour développement local uniquement
  apiUrl: 'http://localhost:3000',
  websocketUrl: 'http://localhost:3000',
  enableLogging: true,
};
