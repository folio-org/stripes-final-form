import React from 'react';

import StripesFinalFormWrapper from './StripesFinalFormWrapper';

export default function stripesFinalForm(opts) {
  return (Form) => props => <StripesFinalFormWrapper {...props} Form={Form} formOptions={opts} />;
}
