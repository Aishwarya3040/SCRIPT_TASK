/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/log'], 
function (serverWidget, record, log) {

    function onRequest(context) {
        try {
            if (context.request.method === 'GET') {
                displayForm(context);
            } else {
                saveRecord(context);
            }
        } catch (e) {
            log.error('Error in onRequest', e.message || e.toString());
        }
    }

    function displayForm(context) {
        const form = serverWidget.createForm({
            title: 'Blood Donor Registration Form'
        });

        form.addField({
            id: 'custrecord_jj_fname_',
            type: serverWidget.FieldType.TEXT,
            label: 'First Name'
        }).isMandatory = true;

        form.addField({
            id: 'custrecord_jj_lname_',
            type: serverWidget.FieldType.TEXT,
            label: 'Last Name'
        }).isMandatory = true;

        const genderField = form.addField({
            id: 'custrecord_jj_gender_',
            type: serverWidget.FieldType.SELECT,
            label: 'Gender'
        });
        genderField.isMandatory = true;
        genderField.addSelectOption({ value: '', text: '' });
        genderField.addSelectOption({ value: '1', text: 'Female' });
        genderField.addSelectOption({ value: '2', text: 'Male' });
        genderField.addSelectOption({ value: '3', text: 'Others' });

        form.addField({
            id: 'custrecord_jj_phone_number_',
            type: serverWidget.FieldType.PHONE,
            label: 'Phone Number'
        }).isMandatory = true;

        form.addField({
            id: 'custrecord_jj_blood_group_',
            type: serverWidget.FieldType.TEXT,
            label: 'Blood Group'
        }).isMandatory = true;

        form.addField({
            id: 'custrecord_jj_last_donation_date_',
            type: serverWidget.FieldType.DATE,
            label: 'Last Donation Date'
        }).isMandatory = true;

        form.addSubmitButton({ label: 'Submit' });

        context.response.writePage(form);
    }

    function saveRecord(context) {
        try {
            const params = context.request.parameters;

            const rawDate = params['custrecord_jj_last_donation_date_'];
            const donationDate = new Date(rawDate);

            if (isNaN(donationDate.getTime())) {
                throw new Error('Invalid date format submitted.');
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (donationDate > today) {
                throw new Error('Last Donation Date cannot be a future date.');
            }

            const donorRecord = record.create({
                type: 'customrecord_jj_blood_donor_record',
                isDynamic: true
            });

            donorRecord.setValue({
                fieldId: 'custrecord_jj_first_name',
                value: params['custrecord_jj_fname_'] || ''
            });

            donorRecord.setValue({
                fieldId: 'custrecord_jj_last_name',
                value: params['custrecord_jj_lname_'] || ''
            });

            donorRecord.setValue({
                fieldId: 'custrecord_jj_gender',
                value: params['custrecord_jj_gender_'] || ''
            });

            donorRecord.setValue({
                fieldId: 'custrecord_jj_phone_number',
                value: params['custrecord_jj_phone_number_'] || ''
            });

            donorRecord.setValue({
                fieldId: 'custrecord_jj_blood_group',
                value: params['custrecord_jj_blood_group_'] || ''
            });

            donorRecord.setValue({
                fieldId: 'custrecord_jj_last_donation_date',
                value: donationDate
            });

            donorRecord.save();

            const form = serverWidget.createForm({
                title: 'Blood Donor Registration'
            });

            const msgField = form.addField({
                id: 'custpage_confirmation_msg',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Confirmation'
            });
            msgField.defaultValue = '<div style="color:green;font-weight:bold;">Donor Registered Successfully.</div>';
            context.response.writePage(form);

        } catch (e) {
            log.error('Error saving record', e.message || e.toString());
            const errForm = serverWidget.createForm({ title: 'Error' });
            const errField = errForm.addField({
                id: 'custpage_error_msg',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Error'
            });
            errField.defaultValue = '<div style="padding:10px;border:1px solid #d32f2f;background:#ffebee;color:#c62828;font-weight:600;">Save Failed: ' + e.message + '</div>';
            context.response.writePage(errForm);
        }
    }

    return {
        onRequest: onRequest
    };
});
