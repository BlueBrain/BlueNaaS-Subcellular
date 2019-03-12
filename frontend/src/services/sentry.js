
import Vue from 'vue';
import * as Sentry from '@sentry/browser';

const dsn = process.env.VUE_APP_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [new Sentry.Integrations.Vue({ Vue })],
  });
}
