/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope public
 */

define(['N/currentRecord', 'N/format', 'N/url'],
    function (currentRecord, format, url) {

        function fieldChanged(context) {
            var currentRec = currentRecord.get();
            var sublistId = context.sublistId;
            var fieldId = context.fieldId;
            var line = context.line;

            if (!sublistId) {
                if (fieldId == 'custpage_startperiod' || fieldId == 'custpage_endperiod') {
                    var startPeriodId = currentRec.getValue({ fieldId: 'custpage_startperiod' });
                    var startPeriodIdtext = currentRec.getText({ fieldId: 'custpage_startperiod' });
                    var endPeriodId = currentRec.getValue({ fieldId: 'custpage_endperiod' });
                    log.debug("endPeriodId",endPeriodId);
                    // Check if both From Date and To Date are selected
                    if (!!startPeriodId && !!endPeriodId) {
                        // fromDate = format.format({ value: fromDate, type: format.Type.DATE });
                        // toDate = format.format({ value: toDate, type: format.Type.DATE });

                        var suiteletURL = getSuiteletURL();
                        suiteletURL += '&startPeriodId=' + startPeriodId + '&endPeriodId=' + endPeriodId;

                        // Redirect to the Suitelet URL with date parameters
                        window.location.href = suiteletURL;
                    }
                }
            }
        }

        function resetFilters() {
            var suiteletURL = getSuiteletURL();

            // Redirect to the Suitelet URL to reset filters
            window.location.href = suiteletURL;
        }

        function getSuiteletURL() {
            return url.resolveScript({
                scriptId: 'customscript_location_wise_is',
                deploymentId: 'customdeploy_location_wise_is'
            });
        }

        return {
            fieldChanged: fieldChanged,
            resetFilters: resetFilters
        };
    });
