/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/log'], function (serverWidget, search, log) {

    const CUSTOM_RECORD_TYPE = 'customrecord_jj_blood_donor_record';
    const CLIENT_SCRIPT_PATH = './jj_cs_donorsearch.js';

    function onRequest(context) {
        try {
            log.debug('Suitelet Triggered', 'Request method: ' + context.request.method);

            // Handle both GET and POST
            displayForm(context);
        } catch (e) {
            log.error('Error in onRequest', e.message);
        }
    }

    function displayForm(context) {
        log.debug('Display Form', 'Initializing form');

        const form = serverWidget.createForm({
            title: 'Blood Donor Search'
        });

        form.clientScriptModulePath = CLIENT_SCRIPT_PATH;

        const bloodGroup = form.addField({
            id: 'custpage_blood_group',
            type: serverWidget.FieldType.TEXT,
            label: 'Blood Group'
        });
        bloodGroup.isMandatory = true;

        const lastDonationDate = form.addField({
            id: 'custpage_last_donation_date',
            type: serverWidget.FieldType.DATE,
            label: 'Last Donation Date (Before)'
        });
        lastDonationDate.isMandatory = true;

        const params = context.request.parameters;
        const selectedBloodGroup = params.custpage_blood_group;
        const selectedDate = params.custpage_last_donation_date;

        log.debug('Received Parameters', `Blood Group: ${selectedBloodGroup}, Date: ${selectedDate}`);

        if (selectedBloodGroup && selectedDate) {
            bloodGroup.defaultValue = selectedBloodGroup;
            lastDonationDate.defaultValue = selectedDate;

            try {
                log.debug('Search Start', 'Creating donor search');

                const donorSearch = search.create({
                    type: CUSTOM_RECORD_TYPE,
                    filters: [
                        ['custrecord_jj_blood_group', 'is', selectedBloodGroup],
                        'AND',
                        ['custrecord_jj_last_donation_date', 'onorbefore', selectedDate]
                    ],
                    columns: [
                        'custrecord_jj_first_name',
                        'custrecord_jj_last_name',
                        'custrecord_jj_phone_number',
                        'custrecord_jj_gender',
                        'custrecord_jj_last_donation_date',
                        'custrecord_jj_blood_group'
                    ]
                });

                const donors = [];
                donorSearch.run().each(function (result) {
                    donors.push({
                        name: result.getValue('custrecord_jj_first_name') + ' ' + result.getValue('custrecord_jj_last_name'),
                        phone: result.getValue('custrecord_jj_phone_number'),
                        bloodGroup: result.getValue('custrecord_jj_blood_group'),
                        lastDonation: result.getValue('custrecord_jj_last_donation_date')
                    });
                    return true;
                });

                log.audit('Search Results', `Found ${donors.length} donor(s)`);

                const resultMsg = form.addField({
                    id: 'custpage_result_msg',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                });
                resultMsg.defaultValue = `<b>Found ${donors.length} eligible donor(s)</b>`;

                if (donors.length > 0) {
                    const sublist = form.addSublist({
                        id: 'custpage_donors',
                        type: serverWidget.SublistType.LIST,
                        label: 'Eligible Donors'
                    });

                    sublist.addField({ id: 'custpage_name', type: serverWidget.FieldType.TEXT, label: 'Name' });
                    sublist.addField({ id: 'custpage_phone', type: serverWidget.FieldType.PHONE, label: 'Phone Number' });
                    sublist.addField({ id: 'custpage_bloodgroup', type: serverWidget.FieldType.TEXT, label: 'Blood Group' });
                    sublist.addField({ id: 'custpage_lastdonation', type: serverWidget.FieldType.DATE, label: 'Last Donation Date' });

                    for (let i = 0; i < donors.length; i++) {
                        sublist.setSublistValue({ id: 'custpage_name', line: i, value: donors[i].name });
                        sublist.setSublistValue({ id: 'custpage_phone', line: i, value: donors[i].phone });
                        sublist.setSublistValue({ id: 'custpage_bloodgroup', line: i, value: donors[i].bloodGroup });
                        sublist.setSublistValue({ id: 'custpage_lastdonation', line: i, value: donors[i].lastDonation });
                    }
                } else {
                    log.debug('Search Result', 'No donors found');

                    const noResultMsg = form.addField({
                        id: 'custpage_no_result',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: ' '
                    });
                    noResultMsg.defaultValue = '<p>No eligible donors found for selected criteria.</p>';
                }

            } catch (e) {
                log.error('Search Error', e.message);
            }
        } else {
            log.debug('Form Load', 'No parameters provided yet');
        }

        form.addSubmitButton({ label: 'Search' });

        log.debug('Form Ready', 'Writing form to response');
        context.response.writePage(form);
    }

    return {
        onRequest: onRequest
    };
});