/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/ui/dialog'], function (dialog) {

    function pageInit(context) {
        console.log('Client Script Loaded');
    }

    function validateDate(donationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedDate = new Date(donationDate);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            return { valid: false, message: 'Date cannot be in the future.' };
        }

        const diffDays = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));

        if (diffDays < 90) {
            return {
                valid: false,
                message: 'Date must be at least 90 days ago.\nDays entered: ' + diffDays + ' days'
            };
        }

        return { valid: true };
    }

    function saveRecord(context) {
        try {
            const record = context.currentRecord;

            const bloodGroup = record.getValue({ fieldId: 'custpage_blood_group' });
            const lastDonationDate = record.getValue({ fieldId: 'custpage_last_donation_date' });

            console.log('saveRecord triggered');
            console.log('Blood Group:', bloodGroup);
            console.log('Last Donation Date:', lastDonationDate);

            let missingFields = [];

            if (!bloodGroup) {
                missingFields.push('Blood Group');
            }

            if (!lastDonationDate) {
                missingFields.push('Last Donation Date');
            }

            if (missingFields.length > 0) {
                dialog.alert({
                    title: 'Missing Information',
                    message: 'Please enter: ' + missingFields.join(' and ')
                });
                return false;
            }

            const validation = validateDate(lastDonationDate);
            if (!validation.valid) {
                dialog.alert({ title: 'Validation Error', message: validation.message });
                return false;
            }

            return true;

        } catch (e) {
            console.error('Error in saveRecord', e.message);
            return false;
        }
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    };
});