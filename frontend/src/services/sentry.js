
import Vue from 'vue';
import * as Sentry from '@sentry/browser';
import * as Integrations from '@sentry/integrations';

const dsn = process.env.VUE_APP_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      new Integrations.Vue({ Vue }),
    ],
  });
}
