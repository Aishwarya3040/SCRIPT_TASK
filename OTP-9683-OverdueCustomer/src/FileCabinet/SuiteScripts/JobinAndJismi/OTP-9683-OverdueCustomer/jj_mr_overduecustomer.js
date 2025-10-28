/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
 
define(['N/search', 'N/log', 'N/file', 'N/email', 'N/record'],
(search, log, file, email, record) => {
 
  
  const createInvoiceSearch = () => {
    return search.create({
      type: search.Type.INVOICE,
      filters: [
        ['duedate', 'onorbefore', 'lastmonth'],
        'AND',
        ['status', 'anyof', ['CustInvc:A']],
        'AND',
        ['mainline', 'is', 'T']
      ],
      columns: [
        'internalid',
        'tranid',
        'entity',
        'amount',
        'duedate',
        'salesrep',
        search.createColumn({
          name: 'formulanumeric',
          formula: '{today} - {duedate}',
          label: 'Days Overdue'
        })
      ]
    });
  };
 
  
  const logSearchResults = (searchObj) => {
    searchObj.run().each(result => {
      const customerName = result.getText('entity');
      const invoiceNumber = result.getValue('tranid');
      const amount = result.getValue('amount');
      const dueDate = result.getValue('duedate');
      const daysOverdue = result.getValue({
        name: 'formulanumeric',
        formula: '{today} - {duedate}'
      });
 
      log.debug('Search Result', `Customer: ${customerName}, Invoice: ${invoiceNumber}, Amount: ${amount}, Due: ${dueDate}, Days Overdue: ${daysOverdue}`);
      return true;
    });
  };
 
  
  const getCustomerEmail = (customerId) => {
    try {
      return record.load({
        type: record.Type.CUSTOMER,
        id: customerId
      }).getValue('email');
    } catch (e) {
      log.error('Customer Email Lookup Error', e.message);
      return null;
    }
  };
 
  
  const createCsvFile = (customerName, invoices,customerEmail) => {
    const csvContent = ['Customer Name, Customer Email,Invoice Number,Invoice Amount,Due Date,Days Overdue'];
    invoices.forEach(inv => {
      csvContent.push(`${inv.customerName},${customerEmail},${inv.invoiceNumber},${inv.invoiceAmount},${inv.dueDate},${inv.daysOverdue.toFixed(0)}`);
    });
 
    const csvFile = file.create({
      name: `Overdue_Invoices_${customerName}.csv`,
      fileType: file.Type.CSV,
      contents: csvContent.join('\n'),
      folder: 409
       
    });
 
    csvFile.save();
    return csvFile;
  };
 
  
  const sendEmailWithAttachment = (senderId, customerId, customerName, csvFile, customerEmail) => {
    try {
      email.send({
        author: senderId,
        recipients: customerId,
        subject: 'Monthly Overdue Invoice Notification',
        body: `Dear ${customerName},\n\nPlease find attached your overdue invoices as of last month.\n\nRegards,\nFinance Team`,
        attachments: [csvFile]
      });
 
      log.audit('Email Sent', `Email sent to ${customerName} (${customerEmail}) from sender ID ${senderId}.`);
    } catch (e) {
      log.error('Email Send Failed', `Customer: ${customerName}, Error: ${e.message}`);
    }
  };
 
 
  const getInputData = () => {
    try {
      log.debug('getInputData', 'Starting overdue invoice search');
      const searchObj = createInvoiceSearch();
      logSearchResults(searchObj);
      return searchObj;
    } catch (error) {
      log.error('getInputData Error', error.message);
      throw error;
    }
  };
 
  const map = (scriptContext) => {
    try {
      const result = JSON.parse(scriptContext.value);
      const invoiceData = result.values;
 
      const customerId = invoiceData.entity.value;
      const invoiceSummary = {
        invoiceId: result.id,
        invoiceNumber: invoiceData.tranid,
        invoiceAmount: invoiceData.amount,
        dueDate: invoiceData.duedate,
        daysOverdue: parseFloat(invoiceData.formulanumeric),
        customerName: invoiceData.entity.text,
        salesRep: invoiceData.salesrep ? invoiceData.salesrep.value : null
      };
 
      scriptContext.write({
        key: customerId,
        value: invoiceSummary
      });
    } catch (error) {
      log.error('Map Error', error.message);
    }
  };
 
  const reduce = (scriptContext) => {
    try {
      const customerId = scriptContext.key;
      const invoices = scriptContext.values.map(JSON.parse);
      const customerName = invoices[0].customerName;
      const salesRepId = invoices[0].salesRep;
      const fallbackSenderId = -5; 
 
      const customerEmail = getCustomerEmail(customerId);
      if (!customerEmail) {
        log.error('Missing Email', `Customer ${customerName} (${customerId}) has no email`);
        return;
      }
 
      const csvFile = createCsvFile(customerName, invoices, customerEmail);
      const senderId = salesRepId || fallbackSenderId;
 
      sendEmailWithAttachment(senderId, customerId, customerName, csvFile, customerEmail);
    } catch (error) {
      log.error('Reduce Error', error.message);
    }
  };
 
  return { getInputData, map, reduce };
});
 
 