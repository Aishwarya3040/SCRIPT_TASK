/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/search', 'N/log'], function(serverWidget, record, search, log) {

  function buildInquiryForm() {
    const form = serverWidget.createForm({ title: 'Customer Inquiry Form' });

    form.addField({
      id: 'custpage_name',
      type: serverWidget.FieldType.TEXT,
      label: 'Customer Name'
    }).isMandatory = true;

    form.addField({
      id: 'custpage_email',
      type: serverWidget.FieldType.EMAIL,
      label: 'Customer Email'
    }).isMandatory = true;

    form.addField({
      id: 'custpage_subject',
      type: serverWidget.FieldType.TEXT,
      label: 'Subject'
    }).isMandatory = true;

    form.addField({
      id: 'custpage_message',
      type: serverWidget.FieldType.TEXTAREA,
      label: 'Message'
    }).isMandatory = true;

    
    const customerField = form.addField({
      id: 'custpage_customer_ref',
      type: serverWidget.FieldType.SELECT,
      label: 'Link to Customer (optional)'
    });
    customerField.addSelectOption({ value: '', text: '' });

   
    const customerSearch = search.create({
      type: search.Type.CUSTOMER,
      filters: [],
      columns: ['internalid', 'entityid']
    });

    customerSearch.run().each(function(result) {
      const id = result.getValue({ name: 'internalid' });
      const name = result.getValue({ name: 'entityid' });
      customerField.addSelectOption({ value: id, text: name });
      return true;
    });

    form.addSubmitButton({ label: 'Submit Inquiry' });
    return form;
  }

  function createInquiryRecord(params) {
    try {
      
      let customerId = params.customerRef || null;

      if (!customerId && params.email) {
        const customerSearch = search.create({
          type: search.Type.CUSTOMER,
          filters: [['email', 'is', params.email]],
          columns: ['internalid']
        });

        customerSearch.run().each(function(result) {
          customerId = result.getValue({ name: 'internalid' });
          return false;
        });
      }

      const inquiryRecord = record.create({
        type: 'customrecord_jj_customerinquiry',
        isDynamic: true
      });

      inquiryRecord.setValue({ fieldId: 'custrecord_jj_customername', value: params.name });
      inquiryRecord.setValue({ fieldId: 'custrecord_jj_customer_email', value: params.email });
      inquiryRecord.setValue({ fieldId: 'custrecord_jj_subject', value: params.subject });
      inquiryRecord.setValue({ fieldId: 'custrecord_jj_message', value: params.message });

  
      if (customerId) {
        inquiryRecord.setValue({ fieldId: 'custrecord_jj_customer_ref', value: customerId });
      }

      inquiryRecord.save();
    } catch (error) {
      log.error({ title: 'Error creating inquiry record', details: error });
      throw error;
    }
  }

  function onRequest(context) {
    if (context.request.method === 'GET') {
      const form = buildInquiryForm();
      context.response.writePage(form);
    } else {
      try {
        const params = {
          name: context.request.parameters.custpage_name,
          email: context.request.parameters.custpage_email,
          subject: context.request.parameters.custpage_subject,
          message: context.request.parameters.custpage_message,
          customerRef: context.request.parameters.custpage_customer_ref
        };

        createInquiryRecord(params); 
        context.response.write('Thank you! Your inquiry has been submitted.');
      } catch (error) {
        log.error({ title: 'Error submitting inquiry', details: error });
        context.response.write('An error occurred while submitting your inquiry. Please try again later.');
      }
    }
  }

  return {
    onRequest: onRequest
  };
});
