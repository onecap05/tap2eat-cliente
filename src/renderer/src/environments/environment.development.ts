export const environment = {
  production: false,

  apiBaseUrl: 'http://localhost:8080/api',

  // Compatibilidad con código viejo
  apiUrl: 'http://localhost:8080/api/auth',

  // URLs nuevas
  authApiUrl: 'http://localhost:8080/api/auth',
  catalogApiUrl: 'http://localhost:8080/api',

  paymentSimulationToken: 'tap2eat-payment-dev-token',

  notificationWsUrl: 'http://localhost:8084/ws'
};
