/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/runtime', 'N/search'], (record, runtime, search) => {
 
    const beforeSubmit = (scriptContext) => {
        try {
            const execContext = runtime.executionContext;
 
           
            if (execContext !== runtime.ContextType.USER_INTERFACE) {
                return;
            }
 
            if (scriptContext.type !== scriptContext.UserEventType.CREATE) {
                return;
            }
 
            const newRecord = scriptContext.newRecord;
            const salesOrderId = newRecord.getValue({ fieldId: 'createdfrom' });
 
            if (!salesOrderId) {
                return;
            }
 
            const salesOrder = record.load({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                isDynamic: false
            });
 
            const soStatus = salesOrder.getText({ fieldId: 'status' });
            const soTotal = parseFloat(salesOrder.getValue({ fieldId: 'total' })) || 0;
 
            if (soStatus !== 'Pending Fulfillment') {
                return;
            }
 
            const depositTotal = getCustomerDepositTotal(salesOrderId);
 
            if (depositTotal < soTotal) {
                throw new Error(
                    'Deposit ₹' + depositTotal.toFixed(2) +
                    ' is less than Sales Order total ₹' + soTotal.toFixed(2) +
                    '. Fulfillment blocked.'
                );
            }
 
        } catch (e) {
            throw e;
        }
    };
 
    function getCustomerDepositTotal(salesOrderId) {
        try {
            const depositSearch = search.create({
                type: search.Type.CUSTOMER_DEPOSIT,
                filters: [
                    ['createdfrom', 'anyof', salesOrderId],
                    'AND',
                    ['mainline', 'is', 'T']
                ],
                columns: ['total']
            });
 
            let depositTotal = 0;
 
            depositSearch.run().each(function (result) {
                const amount = parseFloat(result.getValue('total'));
                if (!isNaN(amount)) {
                    depositTotal += amount;
                }
                return true;
            });
 
            return depositTotal;
 
        } catch (e) {
            return 0;
        }
    }
 
    return { beforeSubmit };
});
 
 