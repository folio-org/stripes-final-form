# stripes-final-form

A [react-final-form](https://github.com/final-form/react-final-form) wrapper for Stripes

**Usage:**

    stripesFinalForm({
	  ...options
	})(StripesComponent);

The options are passed through to `FinalForm`, so any applicable form options can be used here. In addition to the `FinalForm` options there are the following `stripesForm`-specific options:

    {navigationCheck: [true *defaults to false]}

This option will cause Stripes Form to do a dirty check on the form and in a case where there is unsaved data the user is prompted before navigating from the form.

