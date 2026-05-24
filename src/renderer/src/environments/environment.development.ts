export const environment = {
  production: false,

  apiBaseUrl: 'http://localhost:8080/api',

  // Compatibilidad con código viejo
  apiUrl: 'http://localhost:8080/api/auth',

  // URLs nuevas
  authApiUrl: 'http://localhost:8080/api/auth',
  catalogApiUrl: 'http://localhost:8080/api',

  paymentSimulationToken: 'tap2eat-payment-dev-token',

  paypalClientId: 'AbjxAbMVy1MFSQdHEFGkgDixLMEU-4nf96vbpDSxQzbVYEr3K8bBaE2u5aw9Wen6O5cT_diTxx5rF7uy',

  notificationWsUrl: 'http://localhost:8084/ws'
};
