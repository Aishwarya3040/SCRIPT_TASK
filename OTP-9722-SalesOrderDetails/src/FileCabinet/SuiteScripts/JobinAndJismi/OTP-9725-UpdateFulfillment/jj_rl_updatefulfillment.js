/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/format'],
(log, record, format) => {

    function updateItemFulfillment(requestBody) {
        try {
            if (!requestBody || !requestBody.itemFulfillmentId) {
                return {
                    RESULT: "FAILED",
                    error: "Missing itemFulfillmentId in request body"
                };
            }

            const fulfillmentId = requestBody.itemFulfillmentId;

            const itemFulfillment = record.load({
                type: record.Type.ITEM_FULFILLMENT,
                id: fulfillmentId,
                isDynamic: false
            });

            if (requestBody.trandate) {
                const formattedDate = format.parse({
                    value: requestBody.trandate,
                    type: format.Type.DATE
                });
                itemFulfillment.setValue({
                    fieldId: 'trandate',
                    value: formattedDate
                });
            }

            if (requestBody.postingPeriod) {
                itemFulfillment.setValue({
                    fieldId: 'postingperiod',
                    value: requestBody.postingPeriod
                });
            }

            if (requestBody.memo) {
                itemFulfillment.setValue({
                    fieldId: 'memo',
                    value: requestBody.memo
                });
            }

            const lineCount = itemFulfillment.getLineCount({ sublistId: 'item' });

            if (requestBody.items && Array.isArray(requestBody.items)) {
                requestBody.items.forEach((item) => {
                    if (typeof item.line === 'number' && item.line < lineCount) {
                        itemFulfillment.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            line: item.line,
                            value: true
                        });

                        if (item.quantity !== undefined) {
                            itemFulfillment.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: item.line,
                                value: item.quantity
                            });
                        }
                    }
                });
            }

            const updatedId = itemFulfillment.save();
            log.audit({
                title: 'Item Fulfillment Updated',
                details: `ID: ${updatedId}`
            });

            return {
                RESULT: "Item Fulfillment Updated",
                fulfillmentId: updatedId
            };
        } catch (error) {
            log.error({
                title: 'Failed to update Item Fulfillment',
                details: error.message
            });
            return {
                RESULT: "FAILED",
                error: error.message
            };
        }
    }

    const put = (requestBody) => {
        try {
            return updateItemFulfillment(requestBody);
        } catch (error) {
            log.error({
                title: 'Failed to process PUT request',
                details: error
            });
            return {
                RESULT: "FAILED",
                error: error.message
            };
        }
    }

    return { put }

});
