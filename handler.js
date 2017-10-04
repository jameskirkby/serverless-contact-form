'use strict';

// load the AWS SDK
const AWS = require('aws-sdk');

// I was getting an error saying that the region wasn't set, so this fixes it
if (!AWS.config.region) {
  AWS.config.update({
    region: 'eu-west-1'
  });
}

// load ses, for sending emails
const ses = new AWS.SES();


// function to convert query string to object
function QueryStringToObj(str) {
  let obj = {};
  str.replace(/([^=&]+)=([^&]*)/g, (m, key, value) => {
    obj[decodeURIComponent(key)] = decodeURIComponent(value).replace(/\+/g, ' ');
  });
  return obj;
}

module.exports.processFormData = (event, context, callback) => {

  // log the incoming data
  console.log('Received event:', JSON.stringify(event, null, 2));

  // check if form data has actually been sent
  if(! event.body || event.body.trim() === '') {

    callback(null, {
      statusCode: 500,
      body: 'Form data not sent'
    });

    return;

  } else {

    // convert form fields to an object
    event.body = QueryStringToObj(event.body);

  }

  // log form data object
  console.log('Form Data:', JSON.stringify(event.body, null, 2));

  // Check that the name has been sent, and that the name isn't empty
  if (! event.body.name || event.body.name.trim() === '') {

    callback(null, {
      statusCode: 500,
      body: 'Name is required.'
    });

    return;

  }

  // check that the email has been sent
  if (! event.body.email) {

    callback(null, {
      statusCode: 500,
      body: 'Email address is required.'
    });

    return;

  }

  // setup an email regex
  const email_regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  // check the submitted email is valid
  if (! email_regex.test(event.body.email)) {

    callback(null, {
      statusCode: 500,
      body: 'The email not valid'
    });

    return;

  }

  // check the message has been sent, and that it's not empty
  if (! event.body.message || event.body.message.trim() === '') {

    callback(null, {
      statusCode: 500,
      body: 'Message is required.'
    });

    return;

  }

  // basic spam check
  if (event.body.message.indexOf('<a') !== -1) {

    callback(null, {
      statusCode: 500,
      body: 'Spam detected.'
    });

    return;

  }

  // Put together all info needed to send the email
  const name = event.body.name.trim(),
        email = unescape(event.body.email.trim()),
        replyTo = event.body.name + " <" + email + ">",
        subject = "Website message from " + name,
        message = "Website message from " + name + " <" + email + ">\n\n" + event.body.message.trim();

  // Send the email via SES.
  ses.sendEmail({
    Destination: {
      ToAddresses: [
        'YOUR NAME <your_email@domain.com>'
      ]
    },
    Message: {
      Body: {
        Text: {
          Data: message,
          Charset: 'UTF-8'
        }
      },
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      }
    },
    Source: "Contact Form <your_email@domain.com>",
    ReplyToAddresses: [
      replyTo
    ]
  }, (err, data) => {

    if (err) {
      // email was not sent
      console.log('Error Sending Email:', JSON.stringify(err, null, 2));

      callback(null, {
        statusCode: 500,
        body: 'Message could not be sent'
      });

    } else {

      if(event.body.redirectUrl) {
        // if a redirect URL has been passed, redirect to that URL
        callback(null, {
          statusCode: 302,
          headers: {
            'Location': event.body.redirectUrl
          }

        });

      } else {

        callback(null, {
          statusCode: 200,
          body: 'success'
        });

      }

    }

  });

};
