/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/log'], function(record, search, email, runtime, log) {
  const ADMIN_ID = -5;

  function findCustomerByEmail(emailValue) {
    try {
      const customerSearch = search.create({
        type: search.Type.CUSTOMER,
        filters: [['email', 'is', emailValue]],
        columns: ['internalid', 'salesrep']
      });

      const searchResult = customerSearch.run().getRange({ start: 0, end: 1 });
      return searchResult.length > 0 ? searchResult[0] : null;
    } catch (error) {
      log.error({ title: 'Error in findCustomerByEmail', details: error });
      return null;
    }
  }

  function linkCustomerToInquiry(inquiryId, customerId) {
    try {
      const inquiryRecord = record.load({
        type: 'customrecord_jj_customerinquiry',
        id: inquiryId,
        isDynamic: true
      });

      inquiryRecord.setValue({
        fieldId: 'custrecord_jj_customer_ref',
        value: customerId
      });

      inquiryRecord.save();

      log.debug({
        title: 'Customer Linked',
        details: 'Customer ID ' + customerId + ' linked to Inquiry ID ' + inquiryId
      });
    } catch (error) {
      log.error({ title: 'Error in linkCustomerToInquiry', details: error });
    }
  }

  function notifyAdmin(name, emailValue, subject, message) {
    try {
      email.send({
        author: runtime.getCurrentUser().id,
        recipients: ADMIN_ID,
        subject: 'New Customer Inquiry',
        body: 'Dear Admin,\n\nA new customer inquiry has been submitted.\n\nDetails:\n' +
              'Name: ' + name + '\n' +
              'Email: ' + emailValue + '\n' +
              'Subject: ' + subject + '\n' +
              'Message: ' + message + '\n\n' +
              'Please review the inquiry in NetSuite.\n\nBest regards,\nNetSuite Automation'
      });

      log.debug({
        title: 'Email Sent to Admin',
        details: 'Inquiry from ' + name + ' (' + emailValue + ') was emailed to Admin with subject: ' + subject
      });
    } catch (error) {
      log.error({ title: 'Error in notifyAdmin', details: error });
    }
  }

  function notifySalesRep(salesRepId, name, emailValue, subject, message) {
    try {
      email.send({
        author: runtime.getCurrentUser().id,
        recipients: salesRepId,
        subject: 'New Customer Inquiry',
        body: 'Dear Sales Representative,\n\nYour customer (' + name + ', ' + emailValue + ') has submitted a new inquiry.\n\n' +
              'Subject: ' + subject + '\n' +
              'Message: ' + message + '\n\n' +
              'Please follow up accordingly.\n\nWarm regards,\nNetSuite Automation'
      });

      log.debug({
        title: 'Email Sent to Sales Rep',
        details: 'Inquiry from ' + name + ' (' + emailValue + ') was emailed to Sales Rep ID: ' + salesRepId
      });
    } catch (error) {
      log.error({ title: 'Error in notifySalesRep', details: error });
    }
  }

  function afterSubmit(context) {
    if (context.type !== context.UserEventType.CREATE) return;

    try {
      const newRecord = context.newRecord;
      const emailValue = newRecord.getValue({ fieldId: 'custrecord_jj_customer_email' });
      const nameValue = newRecord.getValue({ fieldId: 'custrecord_jj_customername' });
      const subjectValue = newRecord.getValue({ fieldId: 'custrecord_jj_subject' });
      const messageValue = newRecord.getValue({ fieldId: 'custrecord_jj_message' });

      if (!emailValue) {
        log.debug({ title: 'No Email Provided', details: 'Skipping customer lookup and email notifications.' });
        return;
      }

      notifyAdmin(nameValue, emailValue, subjectValue, messageValue);

      const existingCustomer = newRecord.getValue({ fieldId: 'custrecord_jj_customer_ref' });

      if (!existingCustomer) {
        const customer = findCustomerByEmail(emailValue);

        if (customer) {
          const customerId = customer.getValue({ name: 'internalid' });
          const salesRepId = customer.getValue({ name: 'salesrep' });

          linkCustomerToInquiry(newRecord.id, customerId);

          if (salesRepId) {
            notifySalesRep(salesRepId, nameValue, emailValue, subjectValue, messageValue);
          } else {
            log.debug({
              title: 'No Sales Rep Assigned',
              details: 'Customer ID ' + customerId + ' has no Sales Rep.'
            });
          }
        } else {
          log.debug({
            title: 'Customer Not Found',
            details: 'No matching customer found for email: ' + emailValue
          });
        }
      } else {
        log.debug({
          title: 'Customer Already Linked',
          details: 'Inquiry already linked to Customer ID: ' + existingCustomer
        });
      }
    } catch (error) {
      log.error({ title: 'Error in afterSubmit', details: error });
    }
  }

  return {
    afterSubmit: afterSubmit
  };
});
