/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record'], (log, record) => {

    function deleteItemFulfillment(requestParams) {
        try {
            const fulfillmentId = requestParams?.itemFulfillmentId;

            if (!fulfillmentId) {
                return {
                    RESULT: "FAILED",
                    error: "Missing itemFulfillmentId in request parameters"
                };
            }

            try {
                record.load({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: fulfillmentId
                });
            } catch (loadError) {
                return {
                    RESULT: "FAILED",
                    error: "Item Fulfillment record not found"
                };
            }

            record.delete({
                type: record.Type.ITEM_FULFILLMENT,
                id: fulfillmentId
            });

            log.audit({
                title: 'Item Fulfillment Deleted',
                details: `ID: ${fulfillmentId}`
            });

            return {
                RESULT: "Item Fulfillment Deleted",
                fulfillmentId: fulfillmentId
            };

        } catch (error) {
            log.error({
                title: 'Failed to delete Item Fulfillment',
                details: error
            });
            return {
                RESULT: "FAILED",
                error: error.message
            };
        }
    }

    return {
        delete: deleteItemFulfillment
    };

});
