const domain = require('domain');

const d = domain.create();
// Domain emits 'error' when it's given an unhandled error
d.on('error', (err) => {
  console.log(err.stack);
  // Our handler should deal with the error in an appropriate way
});

// Enter this domain
d.run(() => {
  // If an un-handled error originates from here, process.domain will handle it
  console.log(process.domain === d); // true
  woo.hello();
});

// domain has now exited. Any errors in code past this point will not be caught.
