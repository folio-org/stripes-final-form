import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { Form as FinalForm, FormSpy } from 'react-final-form';
import createDecorator from 'final-form-focus';
import arrayMutators from 'final-form-arrays';
import { FormattedMessage } from 'react-intl';
import { LastVisitedContext, isGuardable } from '@folio/stripes-core';
import { ConfirmationModal } from '@folio/stripes-components';

const focusOnErrors = createDecorator();

// recursively trim leading/trailing whitespace from every string value
const trimValues = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(trimValues);
  }

  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, trimValues(v)])
    );
  }

  return value;
};

const StripesFinalFormWrapper = (props) => {
  const {
    history,
    onSubmit,
    Form,
    initialValues,
    formOptions,
  } = props;
  const {
    navigationCheck,
    mutators,
    decorators = [],
    subscription,
  } = formOptions;

  const [openModal, setOpenModal] = useState(false);
  const [nextLocation, setNextLocation] = useState(null);

  // latest form state, readable from the long-lived history.block callback
  const formState = useRef({});
  const unblock = useRef(null);

  useEffect(() => {
    if (navigationCheck) {
      unblock.current = history.block(location => {
        // some nav (e.g. to `/logout` when a session ends) cannot be guarded
        if (!isGuardable(location.pathname)) {
          return true;
        }

        const { dirty, submitSucceeded, submitting } = formState.current;
        const shouldPrompt = dirty && !submitSucceeded && !submitting;

        if (shouldPrompt) {
          setOpenModal(true);
          setNextLocation(location);
        }

        return !shouldPrompt;
      });
    }

    return () => {
      if (navigationCheck) {
        unblock.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setOpenModal(false);
  };

  const continueNavigation = (ctx) => {
    const { pathname, search } = nextLocation;

    closeModal();
    ctx.cachePreviousUrl();
    unblock.current();
    history.push(`${pathname}${search}`);
  };

  const handleSubmit = (values, ...rest) => onSubmit(trimValues(values), ...rest);

  return (
    <LastVisitedContext.Consumer>
      {ctx => (
        <>
          <FinalForm
            {...formOptions}
            subscription={{
              dirty: true,
              initialValues: true,
              invalid: true,
              pristine: true,
              submitting: true,
              submitSucceeded: true,
              ...subscription,
            }}
            onSubmit={handleSubmit}
            decorators={[
              focusOnErrors,
              ...decorators
            ]}
            mutators={{
              ...mutators,
              ...arrayMutators,
            }}
            initialValues={initialValues}
            render={formProps => (
              <>
                <Form {...props} {...formProps} />
                <FormSpy
                  subscription={{
                    dirty: true,
                    submitSucceeded: true,
                    invalid: true,
                    submitting: true,
                  }}
                  onChange={state => {
                    formState.current = state;
                  }}
                  {...formProps}
                />
              </>
            )}
          />
          <ConfirmationModal
            id="cancel-editing-confirmation"
            open={openModal}
            message={<FormattedMessage id="stripes-form.unsavedChanges" />}
            heading={<FormattedMessage id="stripes-form.areYouSure" />}
            onConfirm={closeModal}
            onCancel={() => continueNavigation(ctx)}
            confirmLabel={<FormattedMessage id="stripes-form.keepEditing" />}
            cancelLabel={<FormattedMessage id="stripes-form.closeWithoutSaving" />}
          />
        </>
      )}
    </LastVisitedContext.Consumer>
  );
};

StripesFinalFormWrapper.propTypes = {
  Form: PropTypes.elementType,
  formOptions: PropTypes.shape({
    decorators: PropTypes.arrayOf(PropTypes.object),
    mutators: PropTypes.object,
    navigationCheck: PropTypes.bool,
    subscription: PropTypes.object
  }),
  history: PropTypes.shape({
    block: PropTypes.func,
    push: PropTypes.func,
  }),
  initialValues: PropTypes.object,
  onSubmit: PropTypes.func,
};

export default withRouter(StripesFinalFormWrapper);
