import React from 'react';
import { render } from '@folio/jest-config-stripes/testing-library/react';

import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { isGuardable } from '@folio/stripes-core';

import StripesFinalFormWrapper from './StripesFinalFormWrapper';

jest.mock('react-router', () => ({
  // bypass router context; tests supply `history` directly
  withRouter: Component => Component,
}), { virtual: true });

jest.mock('react-final-form', () => ({
  Form: jest.fn(({ render: renderForm }) => renderForm({ formProp: 'from-final-form' })),
  FormSpy: () => null,
}));

jest.mock('final-form-focus', () => jest.fn(() => 'focusOnErrors'));

jest.mock('react-intl', () => ({
  FormattedMessage: ({ id }) => id,
}), { virtual: true });

jest.mock('@folio/stripes-core', () => ({
  LastVisitedContext: {
    Consumer: ({ children }) => children({ cachePreviousUrl: jest.fn() }),
  },
  isGuardable: jest.fn(() => true),
}));

jest.mock('@folio/stripes-components', () => ({
  ConfirmationModal: () => null,
}));

describe('StripesFinalFormWrapper formOptions', () => {
  const unblock = jest.fn();
  const history = { block: jest.fn(() => unblock), push: jest.fn() };
  const onSubmit = jest.fn();
  const initialValues = { a: 1 };
  const Form = jest.fn(() => <div>form</div>);

  const renderWrapper = (formOptions) => render(
    <StripesFinalFormWrapper
      Form={Form}
      formOptions={formOptions}
      history={history}
      initialValues={initialValues}
      onSubmit={onSubmit}
    />
  );

  // props most recently passed to react-final-form's <Form>
  const finalFormProps = () => FinalForm.mock.calls[FinalForm.mock.calls.length - 1][0];

  beforeEach(() => {
    jest.clearAllMocks();
    isGuardable.mockReturnValue(true);
  });

  describe('decorators', () => {
    it('always includes the focusOnErrors decorator', () => {
      renderWrapper({});

      expect(finalFormProps().decorators).toEqual(['focusOnErrors']);
    });

    it('appends custom decorators after focusOnErrors', () => {
      const custom = [{ name: 'one' }, { name: 'two' }];
      renderWrapper({ decorators: custom });

      expect(finalFormProps().decorators).toEqual(['focusOnErrors', ...custom]);
    });
  });

  describe('mutators', () => {
    it('provides array mutators by default', () => {
      renderWrapper({});

      expect(finalFormProps().mutators).toEqual({ ...arrayMutators });
    });

    it('merges custom mutators with array mutators', () => {
      const setFoo = jest.fn();
      renderWrapper({ mutators: { setFoo } });

      expect(finalFormProps().mutators).toEqual({ setFoo, ...arrayMutators });
    });

    it('does not let custom mutators override array mutators', () => {
      const custom = { push: jest.fn() };
      renderWrapper({ mutators: custom });

      expect(finalFormProps().mutators.push).toBe(arrayMutators.push);
    });
  });

  describe('subscription', () => {
    it('applies the default subscription', () => {
      renderWrapper({});

      expect(finalFormProps().subscription).toEqual({
        dirty: true,
        initialValues: true,
        invalid: true,
        submitting: true,
        submitSucceeded: true,
        pristine: true,
      });
    });

    it('merges custom subscription over the defaults', () => {
      renderWrapper({ subscription: { values: true, pristine: false } });

      expect(finalFormProps().subscription).toEqual({
        dirty: true,
        initialValues: true,
        invalid: true,
        submitting: true,
        submitSucceeded: true,
        pristine: false,
        values: true,
      });
    });
  });

  describe('navigationCheck', () => {
    it('blocks navigation when true', () => {
      renderWrapper({ navigationCheck: true });

      expect(history.block).toHaveBeenCalledTimes(1);
    });

    it('does not block navigation when false', () => {
      renderWrapper({ navigationCheck: false });

      expect(history.block).not.toHaveBeenCalled();
    });

    it('does not block navigation when omitted', () => {
      renderWrapper({});

      expect(history.block).not.toHaveBeenCalled();
    });

    it('unblocks on unmount when true', () => {
      const { unmount } = renderWrapper({ navigationCheck: true });
      unmount();

      expect(unblock).toHaveBeenCalledTimes(1);
    });

    it('does not unblock on unmount when false', () => {
      const { unmount } = renderWrapper({ navigationCheck: false });
      unmount();

      expect(unblock).not.toHaveBeenCalled();
    });

    it('allows navigation to unguardable paths', () => {
      isGuardable.mockReturnValue(false);
      renderWrapper({ navigationCheck: true });
      const blocker = history.block.mock.calls[0][0];

      expect(blocker({ pathname: '/logout' })).toBe(true);
    });

    it('allows navigation when the form is not dirty', () => {
      renderWrapper({ navigationCheck: true });
      const blocker = history.block.mock.calls[0][0];

      expect(blocker({ pathname: '/somewhere' })).toBe(true);
    });
  });

  describe('other formOptions', () => {
    it('passes unrecognized options through to react-final-form', () => {
      const validate = jest.fn();
      renderWrapper({ validate, keepDirtyOnReinitialize: true });

      expect(finalFormProps().validate).toBe(validate);
      expect(finalFormProps().keepDirtyOnReinitialize).toBe(true);
    });

    it('delegates submit to the onSubmit prop', () => {
      renderWrapper({});
      finalFormProps().onSubmit({ a: 1 }, 'extra');

      expect(onSubmit).toHaveBeenCalledWith({ a: 1 }, 'extra');
    });

    it('trims whitespace from submitted values, recursively', () => {
      const date = new Date(0);
      renderWrapper({});
      finalFormProps().onSubmit({
        name: '  Ada  ',
        blank: '   ',
        count: 3,
        flag: false,
        nothing: null,
        date,
        tags: [' a ', 'b  ', 7],
        nested: { title: '\tTitle\n', deeper: { x: ' y ' } },
        list: [{ s: ' z ' }],
      }, 'extra');

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Ada',
        blank: '',
        count: 3,
        flag: false,
        nothing: null,
        date,
        tags: ['a', 'b', 7],
        nested: { title: 'Title', deeper: { x: 'y' } },
        list: [{ s: 'z' }],
      }, 'extra');
    });

    it('renders Form with wrapper props and final-form render props', () => {
      renderWrapper({});

      expect(Form).toHaveBeenCalledWith(
        expect.objectContaining({ onSubmit, initialValues, formProp: 'from-final-form' }),
        expect.anything()
      );
    });
  });
});
