export const environment = {
  production: true,
  apiUrl: 'https://api.fluidpack.com/api', // Replace with your actual production API URL
  appName: 'Fluid Pack',
  version: '1.0.0',
  defaultLanguage: 'en',
  supportedLanguages: ['en'],
  defaultPageSize: 10,
  maxPageSize: 100,
  uploadMaxSize: 10 * 1024 * 1024, // 10MB
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  supportedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  refreshTokenInterval: 5 * 60 * 1000, // 5 minutes
  errorRetryAttempts: 3,
  errorRetryDelay: 1000, // 1 second
  debugMode: false,
  logLevel: 'error',
};
