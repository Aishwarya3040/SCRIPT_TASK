/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search'], (log, record, search) => {

    function getOpenSalesOrders() {
        try {
            log.debug('getOpenSalesOrders', 'Starting grouped search');

            const salesOrderSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [['status', 'anyof', ['SalesOrd:A', 'SalesOrd:B', 'SalesOrd:F']]],
                columns: [
                    search.createColumn({ name: 'internalid', summary: 'GROUP' }),
                    search.createColumn({ name: 'tranid', summary: 'GROUP' }),
                    search.createColumn({ name: 'trandate', summary: 'GROUP' }),
                    search.createColumn({ name: 'total', summary: 'SUM' })
                ]
            });

            const results = salesOrderSearch.run().getRange({ start: 0, end: 10 });
            log.debug('getOpenSalesOrders', `Grouped results found: ${results.length}`);

            const salesOrderResults = results.map((result, i) => {
                log.debug(`Grouped Result ${i}`, 'Processing row');
                return {
                    internalId: String(result.getValue({ name: 'internalid', summary: 'GROUP' }) || ''),
                    documentNumber: String(result.getValue({ name: 'tranid', summary: 'GROUP' }) || ''),
                    date: String(result.getValue({ name: 'trandate', summary: 'GROUP' }) || ''),
                    totalAmount: Number(result.getValue({ name: 'total', summary: 'SUM' }) || 0)
                };
            });

            return { result: salesOrderResults };
        } catch (error) {
            log.error('getOpenSalesOrders Error', JSON.stringify(error));
            return {
                error: {
                    code: 'UNEXPECTED_ERROR',
                    message: error.message || 'Unknown error',
                    stack: error.stack || 'No stack trace'
                }
            };
        }
    }

    function getSingleSalesOrder(salesOrderId) {
        try {
            log.debug('getSingleSalesOrder', `Checking Sales Order ID: ${salesOrderId}`);

            const searchResult = search.lookupFields({
                type: search.Type.SALES_ORDER,
                id: salesOrderId,
                columns: ['internalid']
            });

            if (!searchResult || !searchResult.internalid) {
                log.debug('getSingleSalesOrder', 'Sales Order not found');
                return { RESULT: 'NOT FOUND' };
            }

            const salesOrderRecord = record.load({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                isDynamic: false
            });

            const itemCount = salesOrderRecord.getLineCount({ sublistId: 'item' });
            log.debug('getSingleSalesOrder', `Item count: ${itemCount}`);

            const items = [];
            for (let i = 0; i < itemCount; i++) {
                items.push({
                    itemName: String(salesOrderRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }) || ''),
                    quantity: Number(salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || 0),
                    rate: Number(salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) || 0),
                    grossAmount: Number(salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || 0)
                });
            }

            return {
                result: {
                    internalId: String(salesOrderRecord.id),
                    documentNumber: String(salesOrderRecord.getValue('tranid') || ''),
                    date: String(salesOrderRecord.getValue('trandate') || ''),
                    totalAmount: Number(salesOrderRecord.getValue('total') || 0),
                    items: items
                }
            };
        } catch (error) {
            log.error('getSingleSalesOrder Error', JSON.stringify(error));
            return {
                error: {
                    code: 'UNEXPECTED_ERROR',
                    message: error.message || 'Unknown error',
                    stack: error.stack || 'No stack trace'
                }
            };
        }
    }

    const get = (requestParams) => {
        try {
            log.debug('GET Request', JSON.stringify(requestParams));

            if (requestParams && requestParams.id) {
                return getSingleSalesOrder(requestParams.id);
            } else {
                return getOpenSalesOrders();
            }
        } catch (error) {
            log.error('GET Handler Error', JSON.stringify(error));
            return {
                error: {
                    code: 'UNEXPECTED_ERROR',
                    message: error.message || 'Unknown error',
                    stack: error.stack || 'No stack trace'
                }
            };
        }
    };

    return { get };
});
