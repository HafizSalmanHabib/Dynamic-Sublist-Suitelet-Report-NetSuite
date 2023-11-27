/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope public
 */
define(['N/search', 'N/format', 'N/ui/serverWidget', 'N/log'],
    function (nsSearch, nsFormat, nsUi, nsLog) {

        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    handleGetRequest(context);
                } else {
                    // Handle POST request if needed
                }
            } catch (e) {
                log.debug({ output: 'Error: ' + e.name + ' , Details: ' + e.message });
            }
        }

        function handleGetRequest(context) {
            try {
                var request = context.request;
                var response = context.response;
                var params = request.parameters;

                var form = nsUi.createForm({
                    title: "Location wise Income Statement Report"
                });
                form.clientScriptModulePath = './financial_report_sync_cs.js';

                form.addSubtab({ id: 'custpage_tab', label: 'Income Statement' });

                var startPeriodField = form.addField({
                    id: 'custpage_startperiod',
                    type: nsUi.FieldType.SELECT,
                    label: 'Start Period',
                    source: 'accountingperiod'
                });
                startPeriodField.defaultValue = params.startPeriodId;
                var endPeriodField = form.addField({
                    id: 'custpage_endperiod',
                    type: nsUi.FieldType.SELECT,
                    label: 'End Period',
                    source: 'accountingperiod'
                });
                endPeriodField.defaultValue = params.endPeriodId;
                var fromDateFld = form.addField({
                    id: 'custpage_fromdate',
                    type: nsUi.FieldType.DATE,
                    label: 'From Date',
                });
                fromDateFld.updateDisplayType({
                    displayType: nsUi.FieldDisplayType.HIDDEN,
                });

                var toDateFld = form.addField({
                    id: 'custpage_todate',
                    type: nsUi.FieldType.DATE,
                    label: 'To Date',
                });
                toDateFld.updateDisplayType({
                    displayType: nsUi.FieldDisplayType.HIDDEN,
                });

                var defaultFromDate = getFirstDayOfPreviousMonth();
                var defaultToDate = getLastDayOfCurrentMonth();

                if (params.startPeriodId) {
                    log.debug("startPeriodId", params.startPeriodId);
                    var periodDates = getAllAccountingPeriodDates(params.startPeriodId)
                    log.debug("periodDates", periodDates);
                    var periodfromdate = periodDates[0];
                    // Format the fromdate in "MM/DD/YYYY" format using nsFormat
                    var formattedFromDate = nsFormat.format({
                        value: new Date(periodfromdate),
                        type: nsFormat.Type.DATE
                    });
                    fromDateFld.defaultValue = formattedFromDate;
                } else {
                    fromDateFld.defaultValue = defaultFromDate;
                }



                if (params.endPeriodId) {
                    var periodDates = getAllAccountingPeriodDates(params.endPeriodId)
                    log.debug("periodDates2", periodDates);
                    var periodtodate = periodDates[1];
                    // Format the todate in "MM/DD/YYYY" format using nsFormat
                    var formattedToDate = nsFormat.format({
                        value: new Date(periodtodate),
                        type: nsFormat.Type.DATE
                    });
                    toDateFld.defaultValue = formattedToDate;
                } else {
                    toDateFld.defaultValue = defaultToDate;
                }

                var periodNames = getAllAccountingPeriodNames(fromDateFld.defaultValue, toDateFld.defaultValue);
                let monthMap = {
                    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
                    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
                };
                periodNames.sort(function (a, b) {
                    let [aMonth, aYear] = a.split(" ");
                    let [bMonth, bYear] = b.split(" ");
                    return new Date(aYear, monthMap[aMonth] - 1) - new Date(bYear, monthMap[bMonth] - 1);
                });
                log.debug("periodNames", periodNames);

                /*form.addSubmitButton({
                    label: 'Report'
                });*/

                form.addButton({
                    id: 'custpage_reset',
                    label: 'Reset Filters',
                    functionName: 'resetFilters'
                });

                var sublist = form.addSublist({
                    id: 'custpage_results',
                    label: 'Income Statement',
                    type: nsUi.SublistType.LIST,
                    tab: 'custpage_tab'
                });

                //sublist.addMarkAllButtons();

                var fromDate = nsFormat.parse({
                    value: fromDateFld.defaultValue,
                    type: nsFormat.Type.DATE
                });

                var toDate = nsFormat.parse({
                    value: toDateFld.defaultValue,
                    type: nsFormat.Type.DATE
                });

                // Populate the sublist with month and year names
                populateSublist(sublist, periodNames);

                response.writePage(form);
            } catch (e) {
                nsLog.debug('Error::handleGetRequest', e);
                nsLog.debug({ output: 'Error: ' + e.name + ' , Details: ' + e.message });
            }
        }


        // Function to get the first day of the previous month
        function getFirstDayOfPreviousMonth() {
            var today = new Date();
            var firstDayOfPreviousMonth = new Date(today);
            firstDayOfPreviousMonth.setMonth(today.getMonth(), 1); // Set to the first day of the previous month
            return nsFormat.format({
                value: firstDayOfPreviousMonth,
                type: nsFormat.Type.DATE
            });
        }

        function getAllAccountingPeriodDates(internalid) {
            var periodNames = [];
            var accountingPeriods = nsSearch.create({
                type: "accountingperiod",
                filters:
                    [
                        ["internalid", "anyof", internalid]
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: "periodname",
                            sort: nsSearch.Sort.ASC,
                            label: "Name"
                        }),
                        nsSearch.createColumn({ name: "startdate", label: "Start Date" }),
                        nsSearch.createColumn({ name: "enddate", label: "End Date" })
                    ]
            }).run().getRange({
                start: 0,
                end: 1000, // Adjust the number of results as needed
            });

            for (var i = 0; i < accountingPeriods.length; i++) {
                var startDate = accountingPeriods[i].getValue({
                    name: 'startdate'
                });
                var ebdDate = accountingPeriods[i].getValue({
                    name: 'enddate'
                });
                periodNames.push(startDate);
                periodNames.push(ebdDate);
            }


            return periodNames;
        }

        function getAllAccountingPeriodNames(fromDate, toDate) {
            var periodNames = [];
            var accountingPeriods = nsSearch.create({
                type: "accountingperiod",
                filters: [
                    ["startdate", "onorafter", fromDate],
                    "AND",
                    ["enddate", "onorbefore", toDate],
                    "AND",
                    ["isquarter", "is", "F"]
                ],
                columns: [
                    nsSearch.createColumn({
                        name: "periodname",
                        sort: nsSearch.Sort.ASC,
                        label: "Name"
                    })
                ]
            }).run().getRange({
                start: 0,
                end: 1000, // Adjust the number of results as needed
            });

            for (var i = 0; i < accountingPeriods.length; i++) {
                var periodName = accountingPeriods[i].getValue({
                    name: 'periodname'
                });
                periodNames.push(periodName);
            }

            return periodNames;
        }



        function getDefaultAccountingPeriod() {
            var today = new Date();
            var defaultAccountingPeriod =
                nsSearch.create({
                    type: "accountingperiod",
                    filters:
                        [
                            ["isquarter", "is", "F"]
                        ],
                    columns:
                        [
                            nsSearch.createColumn({
                                name: "enddate",
                                summary: "MAX",
                                label: "End Date"
                            }),
                            nsSearch.createColumn({
                                name: "periodname",
                                sort: nsSearch.Sort.ASC,
                                label: "Name"
                            }),
                            nsSearch.createColumn({ name: "startdate", label: "Start Date" }),
                            nsSearch.createColumn({ name: "enddate", label: "End Date" })
                        ]
                }).run().getRange({
                    start: 0,
                    end: 1,
                });

            if (defaultAccountingPeriod && defaultAccountingPeriod.length > 0) {
                return defaultAccountingPeriod[0].id;
            } else {
                return null;
            }
        }

        // Function to get the last day of the current month
        function getLastDayOfCurrentMonth() {
            var today = new Date();
            var lastDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1); // Set to the last day of the current month
            return nsFormat.format({
                value: lastDayOfCurrentMonth,
                type: nsFormat.Type.DATE
            });
        }

        // Function to populate the sublist with month and year names and additional fields
        function populateSublist(sublist, periodNames) {
            try {
                log.debug('periodNames', periodNames);

                // Create an array to store the filters for the accounting period
                var periodFilters = periodNames.map(function (periodName) {
                    return ["accountingperiod.periodname", "is", periodName];
                });

                // Combine the period filters using "OR"
                var combinedPeriodFilter = periodFilters.reduce(function (acc, filter, index) {
                    if (index > 0) {
                        acc.push("OR");
                    }
                    acc.push(filter);
                    return acc;
                }, []);

                log.debug('combinedPeriodFilter', combinedPeriodFilter)
                /*var transactionSearchObj = nsSearch.create({
                    type: "transaction",
                    filters:
                        [
                            ["accounttype", "anyof", "Income"],
                            "AND",
                            ["location", "anyof", "161", "294", "221", "296", "1065", "1218", "1134", "1151", "1159", "933", "133", "300", "204", "209", "211", "1196", "1217", "1154", "1158", "1157", "936", "302", "208", "210", "293", "1296", "1155", "1156", "1161", "931", "162", "207", "291", "225", "1195", "1298", "1300", "932", "937", "297", "298", "299", "301", "206", "205", "1193", "1239", "1169", "934", "1299", "938", "1064", "159", "220", "292", "295", "1153", "1162", "1194", "1297", "939", "166", "199", "1160", "1295", "1219", "160", "935", "1152", "1163", "1220", "940",
                                //"161","1151","1159","133","204","211","1157","302","208","210","293","1155","1156","1161","162","207","297","298","299","301","206","205","1299","292","295","1153","1297","166","199","1295","160",
                            ],
                            "AND",
                            //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                            combinedPeriodFilter
                        ],
                    columns:
                        [
                            nsSearch.createColumn({
                                name: "posting",
                                summary: "GROUP",
                                label: "Posting"
                            }),
                            nsSearch.createColumn({
                                name: "accounttype",
                                summary: "GROUP",
                                label: "Account Type"
                            }),
                            nsSearch.createColumn({
                                name: "amount",
                                summary: "SUM",
                                label: "Amount"
                            }),
                            nsSearch.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                                label: "Formula (Text)"
                            }),
                            /*nsSearch.createColumn({
                                name: "formulahtml",
                                summary: "GROUP",
                                formula: "CASE WHEN {location} = 'Ortho Summary : Ortho South Arlington' OR {location} = '1713 : 1713 Ortho Cypresswood' OR {location} = 'Ortho Summary : Ortho Heights' OR {location} = '1713 : 1713 Ortho Elmsworth' OR {location} = '1713 : 1713 Ortho Pasadena' OR {location} = 'Apollonia Summary : OR Summary Apollo : Midtown OR' OR {location} = 'Apollonia Summary : OR Summary Apollo' OR {location} = 'Apollonia Summary : OR Summary Apollo : Crosby-Richardson OR' OR {location} = 'Apollonia Summary : OR Summary Apollo : Mockingbird OR' OR {location} = '1713 : 1713 Corp : Dallas Billing Center' OR {location} = 'Ortho Summary : Ortho Mockingbird Station' OR {location} = '1713 : 1713 Ortho Heights' OR {location} = 'Ortho Summary : Ortho Garland' OR {location} = 'Ortho Summary : Ortho Cypresswood' OR {location} = 'Ortho Summary : Ortho Duncanville' OR {location} = 'Ortho Summary : Ortho Norcross' OR {location} = 'Apollonia Summary : OR Summary Apollo : Norcross OR' OR {location} = 'Apollonia Summary : OR Summary Apollo : Elmsworth OR' OR {location} = 'Apollonia Summary : OR Summary Apollo : Heights OR' OR {location} = 'Apollonia Summary : OR Summary Apollo : Grapevine OR' OR {location} = '1713 : 1713 Corp : IT Lab' OR {location} = '1713 : 1713 Ortho West McKinney'OR {location} = 'Ortho Summary : Ortho Crosby- Richardson' OR {location} = 'Ortho Summary : Ortho FT Worth Berry' OR {location} = '1713 : 1713 Ortho Crosby- Richardson' OR {location} = 'Ortho Summary : Ortho Conroe' OR {location} = 'Apollonia Summary : OR Summary Apollo : FT Worth Berry OR' OR {location} = 'Apollonia Summary : OR Summary Apollo : Garland OR' OR {location} = 'Apollonia Summary : OR Summary Apollo : West McKinney OR' OR {location} = '1713 : 1713 Corp' OR {location} = 'Ortho Summary : Ortho Grapevine' OR {location} = 'Ortho Summary : Ortho West McKinney' OR {location} = '1713 : 1713 Ortho Summary' OR {location} = '1713' OR {location} = 'Ortho Summary : Ortho Midtown' OR {location} = '1713 : 1713 Ortho Conroe' OR {location} = 'Apollonia Summary : OR Summary Apollo : Conroe OR' OR {location} = '1713 : 1713 Corp : Corp Summary' OR {location} = '1713 : 1713 Corp : Scheduling Center' OR {location} = '1713 : 1713 Ortho FT Worth Berry' OR {location} = '1713 : 1713 Ortho Garland' OR {location} = '1713 : 1713 Ortho Grapevine' OR {location} = '1713 : 1713 Ortho Mockingbird Station' OR {location} = 'Ortho Summary : Ortho Hulen' OR {location} = 'Ortho Summary : Ortho Oak CLiff' OR {location} = 'Ortho Summary : Ortho iGO' OR {location} = 'Apollonia Summary : OR Summary Apollo : Cypress OR' OR {location} = 'Apollonia Summary : OR Summary Apollo : College Park OR' OR {location} = '1713 : 1713 Corp : HOU Billing Center' OR {location} = 'Apollonia Summary : OR Summary Apollo : Irving OR' OR {location} = '1713 : 1713 Corp : Training DFW' OR {location} = 'Ortho Summary : Ortho Pasadena' OR {location} = 'Ortho Summary' OR {location} = 'Ortho Summary : Ortho Elmsworth' OR {location} = '1713 : 1713 Ortho Carrollton' OR {location} = '1713 : 1713 Ortho Duncanville' OR {location} = 'Apollonia Summary : OR Summary Apollo : Duncanville OR' OR {location} = 'Ortho Summary : Ortho College Park' OR {location} = '1713 : 1713 Ortho iGO' OR {location} = '1713 : 1713 Ortho Irving' OR {location} = '1713 : 1713 Corp : Training Houston' OR {location} = 'Ortho Summary : Ortho Cedar Hill' OR {location} = 'Ortho Summary : Ortho Carrollton' OR {location} = 'Apollonia Summary : OR Summary Apollo : Pasadena OR' OR {location} = 'Ortho Summary : Ortho Irving' OR {location} = 'Ortho Summary : Ortho Cypress' OR {location} = 'Ortho Summary : Ortho Plano Legacy' OR {location} = '1713 : 1713 Corp : Insurance' OR {location} = 'Apollonia Summary : OR Summary Apollo : Cypresswood OR' OR {location} = '1713 : 1713 Ortho College Park' OR {location} = '1713 : 1713 Ortho Cypress' OR {location} = '1713 : 1713 Corp : Warehouse' THEN 'All Ortho' ELSE 'No Location' END",
                                label: "Formula (HTML)"
                            }),*/
                /*nsSearch.createColumn({
                    name: "postingperiod",
                    summary: "GROUP",
                    label: "Period"
                })
            ]
    });
    var searchResults = [];
    var searchResultCount = transactionSearchObj.runPaged().count;
    log.debug("transactionSearchObj result count", searchResultCount);
    transactionSearchObj.run().each(function (result) {
        // .run().each has a limit of 4,000 results
        var tempObj = {};
        var postingValue = result.getValue({
            name: 'posting',
            summary: 'GROUP'
        });
        tempObj.postingValue = postingValue ? postingValue : '';
        var accountTypeValue = result.getValue({
            name: 'accounttype',
            summary: 'GROUP'
        });
        tempObj.accountTypeValue = accountTypeValue ? accountTypeValue : '';
        var amountValue = result.getValue({
            name: 'amount',
            summary: 'SUM'
        });
        tempObj.amountValue = amountValue ? amountValue : '';
        var formulaTextValue = result.getValue({
            name: 'formulatext',
            summary: 'GROUP'
        });
        tempObj.formulaTextValue = formulaTextValue ? formulaTextValue : '';
        var periodValue = result.getText({
            name: 'postingperiod',
            summary: 'GROUP'
        });
        tempObj.periodValue = periodValue ? periodValue : '';
        /*var formulaTextLocationValue = result.getValue({
            name: 'formulahtml',
            summary: 'GROUP'
        });*/
                //log.debug('formulaTextLocationValue', formulaTextLocationValue);
                /*tempObj.location = "All Ortho";
                searchResults.push(tempObj);
                return true;
            });

            var transactionSearchObj2 = nsSearch.create({
                type: "transaction",
                filters:
                    [
                        ["accounttype", "anyof", "Income"],
                        "AND",
                        ["location", "anyof", "161", "1151", "1159", "133", "204", "211", "1157", "302", "208", "210", "293", "1155", "1156", "1161", "162", "207", "297", "298", "299", "301", "206", "205", "1299", "292", "295", "1153", "1297", "166", "199", "1295", "160",
                        ],
                        "AND",
                        //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                        combinedPeriodFilter
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: "posting",
                            summary: "GROUP",
                            label: "Posting"
                        }),
                        nsSearch.createColumn({
                            name: "accounttype",
                            summary: "GROUP",
                            label: "Account Type"
                        }),
                        nsSearch.createColumn({
                            name: "amount",
                            summary: "SUM",
                            label: "Amount"
                        }),
                        nsSearch.createColumn({
                            name: "formulatext",
                            summary: "GROUP",
                            formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                            label: "Formula (Text)"
                        }),
                        nsSearch.createColumn({
                            name: "postingperiod",
                            summary: "GROUP",
                            label: "Period"
                        })
                    ]
            });
            var searchResults2 = [];
            var searchResultCount2 = transactionSearchObj2.runPaged().count;
            log.debug("transactionSearchObj result count 2", searchResultCount2);
            transactionSearchObj2.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                var tempObj2 = {};
                var postingValue = result.getValue({
                    name: 'posting',
                    summary: 'GROUP'
                });
                tempObj2.postingValue = postingValue ? postingValue : '';
                var accountTypeValue = result.getValue({
                    name: 'accounttype',
                    summary: 'GROUP'
                });
                tempObj2.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                var amountValue = result.getValue({
                    name: 'amount',
                    summary: 'SUM'
                });
                tempObj2.amountValue = amountValue ? amountValue : '';
                var formulaTextValue = result.getValue({
                    name: 'formulatext',
                    summary: 'GROUP'
                });
                tempObj2.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                var periodValue = result.getText({
                    name: 'postingperiod',
                    summary: 'GROUP'
                });
                tempObj2.periodValue = periodValue ? periodValue : '';
                tempObj2.location = 'DFW OR';
                searchResults2.push(tempObj2);
                return true;
            });

            var transactionSearchObj3 = nsSearch.create({
                type: "transaction",
                filters:
                    [
                        ["accounttype", "anyof", "Income"],
                        "AND",
                        ["location", "anyof", "294","221","296","1065","300","209","1154","1158","1296","1298","1300","1239","1064","220","1160","1219","1152","1220",
                    ],
                        "AND",
                        //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                        combinedPeriodFilter
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: "posting",
                            summary: "GROUP",
                            label: "Posting"
                        }),
                        nsSearch.createColumn({
                            name: "accounttype",
                            summary: "GROUP",
                            label: "Account Type"
                        }),
                        nsSearch.createColumn({
                            name: "amount",
                            summary: "SUM",
                            label: "Amount"
                        }),
                        nsSearch.createColumn({
                            name: "formulatext",
                            summary: "GROUP",
                            formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                            label: "Formula (Text)"
                        }),
                        nsSearch.createColumn({
                            name: "postingperiod",
                            summary: "GROUP",
                            label: "Period"
                        })
                    ]
            });
            var searchResults3 = [];
            var searchResultCount3 = transactionSearchObj3.runPaged().count;
            log.debug("transactionSearchObj result count 3", searchResultCount3);
            transactionSearchObj3.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                var tempObj3 = {};
                var postingValue = result.getValue({
                    name: 'posting',
                    summary: 'GROUP'
                });
                tempObj3.postingValue = postingValue ? postingValue : '';
                var accountTypeValue = result.getValue({
                    name: 'accounttype',
                    summary: 'GROUP'
                });
                tempObj3.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                var amountValue = result.getValue({
                    name: 'amount',
                    summary: 'SUM'
                });
                tempObj3.amountValue = amountValue ? amountValue : '';
                var formulaTextValue = result.getValue({
                    name: 'formulatext',
                    summary: 'GROUP'
                });
                tempObj3.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                var periodValue = result.getText({
                    name: 'postingperiod',
                    summary: 'GROUP'
                });
                tempObj3.periodValue = periodValue ? periodValue : '';
                tempObj3.location = 'HOU OR';
                searchResults3.push(tempObj3);
                return true;
            });

            var transactionSearchObj4 = nsSearch.create({
                type: "transaction",
                filters:
                    [
                        ["accounttype", "anyof", "Income"],
                        "AND",
                        ["location", "anyof","1218","1196","1217","1195","1169","1162","1163"],
                        "AND",
                        //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                        combinedPeriodFilter
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: "posting",
                            summary: "GROUP",
                            label: "Posting"
                        }),
                        nsSearch.createColumn({
                            name: "accounttype",
                            summary: "GROUP",
                            label: "Account Type"
                        }),
                        nsSearch.createColumn({
                            name: "amount",
                            summary: "SUM",
                            label: "Amount"
                        }),
                        nsSearch.createColumn({
                            name: "formulatext",
                            summary: "GROUP",
                            formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                            label: "Formula (Text)"
                        }),
                        nsSearch.createColumn({
                            name: "postingperiod",
                            summary: "GROUP",
                            label: "Period"
                        })
                    ]
            });
            var searchResults4 = [];
            var searchResultCount4 = transactionSearchObj4.runPaged().count;
            log.debug("transactionSearchObj result count 4", searchResultCount4);
            transactionSearchObj4.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                var tempObj4 = {};
                var postingValue = result.getValue({
                    name: 'posting',
                    summary: 'GROUP'
                });
                tempObj4.postingValue = postingValue ? postingValue : '';
                var accountTypeValue = result.getValue({
                    name: 'accounttype',
                    summary: 'GROUP'
                });
                tempObj4.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                var amountValue = result.getValue({
                    name: 'amount',
                    summary: 'SUM'
                });
                tempObj4.amountValue = amountValue ? amountValue : '';
                var formulaTextValue = result.getValue({
                    name: 'formulatext',
                    summary: 'GROUP'
                });
                tempObj4.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                var periodValue = result.getText({
                    name: 'postingperiod',
                    summary: 'GROUP'
                });
                tempObj4.periodValue = periodValue ? periodValue : '';
                tempObj4.location = 'GA OR';
                searchResults4.push(tempObj4);
                return true;
            });

            var transactionSearchObj5 = nsSearch.create({
                type: "transaction",
                filters:
                    [
                        ["accounttype", "anyof", "Income"],
                        "AND",
                        ["location", "anyof", "210","1155","297"],
                        "AND",
                        //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                        combinedPeriodFilter
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: "posting",
                            summary: "GROUP",
                            label: "Posting"
                        }),
                        nsSearch.createColumn({
                            name: "accounttype",
                            summary: "GROUP",
                            label: "Account Type"
                        }),
                        nsSearch.createColumn({
                            name: "amount",
                            summary: "SUM",
                            label: "Amount"
                        }),
                        nsSearch.createColumn({
                            name: "formulatext",
                            summary: "GROUP",
                            formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                            label: "Formula (Text)"
                        }),
                        nsSearch.createColumn({
                            name: "postingperiod",
                            summary: "GROUP",
                            label: "Period"
                        })
                    ]
            });
            var searchResults5 = [];
            var searchResultCount5 = transactionSearchObj5.runPaged().count;
            log.debug("transactionSearchObj result count 5", searchResultCount5);
            transactionSearchObj5.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                var tempObj5 = {};
                var postingValue = result.getValue({
                    name: 'posting',
                    summary: 'GROUP'
                });
                tempObj5.postingValue = postingValue ? postingValue : '';
                var accountTypeValue = result.getValue({
                    name: 'accounttype',
                    summary: 'GROUP'
                });
                tempObj5.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                var amountValue = result.getValue({
                    name: 'amount',
                    summary: 'SUM'
                });
                tempObj5.amountValue = amountValue ? amountValue : '';
                var formulaTextValue = result.getValue({
                    name: 'formulatext',
                    summary: 'GROUP'
                });
                tempObj5.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                var periodValue = result.getText({
                    name: 'postingperiod',
                    summary: 'GROUP'
                });
                tempObj5.periodValue = periodValue ? periodValue : '';
                tempObj5.location = 'Berry';
                searchResults5.push(tempObj5);
                return true;
            });


            var transactionSearchObj6 = nsSearch.create({
                type: "transaction",
                filters:
                    [
                        ["accounttype", "anyof", "Income"],
                        "AND",
                        ["location", "anyof", "1151","208","293"],
                        "AND",
                        //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                        combinedPeriodFilter
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: "posting",
                            summary: "GROUP",
                            label: "Posting"
                        }),
                        nsSearch.createColumn({
                            name: "accounttype",
                            summary: "GROUP",
                            label: "Account Type"
                        }),
                        nsSearch.createColumn({
                            name: "amount",
                            summary: "SUM",
                            label: "Amount"
                        }),
                        nsSearch.createColumn({
                            name: "formulatext",
                            summary: "GROUP",
                            formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                            label: "Formula (Text)"
                        }),
                        nsSearch.createColumn({
                            name: "postingperiod",
                            summary: "GROUP",
                            label: "Period"
                        })
                    ]
            });
            var searchResults6 = [];
            var searchResultCount6 = transactionSearchObj6.runPaged().count;
            log.debug("transactionSearchObj result count 6", searchResultCount6);
            transactionSearchObj6.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                var tempObj6 = {};
                var postingValue = result.getValue({
                    name: 'posting',
                    summary: 'GROUP'
                });
                tempObj6.postingValue = postingValue ? postingValue : '';
                var accountTypeValue = result.getValue({
                    name: 'accounttype',
                    summary: 'GROUP'
                });
                tempObj6.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                var amountValue = result.getValue({
                    name: 'amount',
                    summary: 'SUM'
                });
                tempObj6.amountValue = amountValue ? amountValue : '';
                var formulaTextValue = result.getValue({
                    name: 'formulatext',
                    summary: 'GROUP'
                });
                tempObj6.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                var periodValue = result.getText({
                    name: 'postingperiod',
                    summary: 'GROUP'
                });
                tempObj6.periodValue = periodValue ? periodValue : '';
                tempObj6.location = 'Crosby';
                searchResults6.push(tempObj6);
                return true;
            });

            var transactionSearchObj7 = nsSearch.create({
                type: "transaction",
                filters:
                    [
                        ["accounttype", "anyof", "Income"],
                        "AND",
                        ["location", "anyof", "211","295","1153"],
                        "AND",
                        //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                        combinedPeriodFilter
                    ],
                columns:
                    [
                        nsSearch.createColumn({
                            name: "posting",
                            summary: "GROUP",
                            label: "Posting"
                        }),
                        nsSearch.createColumn({
                            name: "accounttype",
                            summary: "GROUP",
                            label: "Account Type"
                        }),
                        nsSearch.createColumn({
                            name: "amount",
                            summary: "SUM",
                            label: "Amount"
                        }),
                        nsSearch.createColumn({
                            name: "formulatext",
                            summary: "GROUP",
                            formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                            label: "Formula (Text)"
                        }),
                        nsSearch.createColumn({
                            name: "postingperiod",
                            summary: "GROUP",
                            label: "Period"
                        })
                    ]
            });
            var searchResults7 = [];
            var searchResultCount7 = transactionSearchObj7.runPaged().count;
            log.debug("transactionSearchObj result count 7", searchResultCount7);
            transactionSearchObj7.run().each(function (result) {
                // .run().each has a limit of 4,000 results
                var tempObj7 = {};
                var postingValue = result.getValue({
                    name: 'posting',
                    summary: 'GROUP'
                });
                tempObj7.postingValue = postingValue ? postingValue : '';
                var accountTypeValue = result.getValue({
                    name: 'accounttype',
                    summary: 'GROUP'
                });
                tempObj7.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                var amountValue = result.getValue({
                    name: 'amount',
                    summary: 'SUM'
                });
                tempObj7.amountValue = amountValue ? amountValue : '';
                var formulaTextValue = result.getValue({
                    name: 'formulatext',
                    summary: 'GROUP'
                });
                tempObj7.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                var periodValue = result.getText({
                    name: 'postingperiod',
                    summary: 'GROUP'
                });
                tempObj7.periodValue = periodValue ? periodValue : '';
                tempObj7.location = 'Crosby';
                searchResults7.push(tempObj7);
                return true;
            });*/

                /*log.debug('searchResults', searchResults);
                log.debug('searchResults2', searchResults2);
                log.debug('searchResults3', searchResults3);
                log.debug('searchResults4', searchResults4);
                log.debug('searchResults5', searchResults5);
                log.debug('searchResults6', searchResults6);
                log.debug('searchResults7', searchResults7);*/

                var accountType = sublist.addField({
                    id: 'custpage_account_type',
                    label: 'Account Type',
                    type: nsUi.FieldType.TEXT
                });
                accountType.updateDisplaySize({
                    height: 1000,
                    width: 5000
                });
                sublist.addField({
                    id: 'custpage_location',
                    label: 'Location',
                    type: nsUi.FieldType.TEXT
                });
                // Create a field for each period name in the array
                for (var i = 0; i < periodNames.length; i++) {
                    var nme = periodNames[i];
                    var modifiedString = nme.replace(/ /g, '').toLowerCase();
                    var fieldId = 'custpage_month_year_' + modifiedString;

                    var subFieldObj = {
                        id: fieldId,
                        label: periodNames[i],
                        type: nsUi.FieldType.TEXT, // You can adjust the field type as needed
                    };

                    var fld = sublist.addField(subFieldObj);
                }

                // Add additional fields with dynamic year in the label
                var currentYear = new Date().getFullYear(); // Get the year dynamically

                sublist.addField({
                    id: 'custpage_total_amount',
                    label: 'Total Amount',
                    type: nsUi.FieldType.TEXT
                });

                sublist.addField({
                    id: 'custpage_ttm_percent_of_rev',
                    label: 'TTM % of Rev',
                    type: nsUi.FieldType.PERCENT
                });

                sublist.addField({
                    id: 'custpage_ytd_percent_of_rev',
                    //label: 'YTD ' + currentYear + ' % of Rev',
                    label: 'YTD % of Rev',
                    type: nsUi.FieldType.PERCENT
                });

                sublist.addField({
                    id: 'custpage_jul_percent_rev',
                    //label: 'Jul-' + currentYear + ' % Rev',
                    label: 'Last Month % Rev',
                    type: nsUi.FieldType.PERCENT
                });



                var inc = 0;
                var searchResults = [];
                for (var i = 0; i < 21; i++) {

                    if (i == 0) {
                        var locationFilters = ["location", "anyof", "161", "294", "221", "296", "1065", "1218", "1134", "1151", "1159", "933", "133", "300", "204", "209", "211", "1196", "1217", "1154", "1158", "1157", "936", "302", "208", "210", "293", "1296", "1155", "1156", "1161", "931", "162", "207", "291", "225", "1195", "1298", "1300", "932", "937", "297", "298", "299", "301", "206", "205", "1193", "1239", "1169", "934", "1299", "938", "1064", "159", "220", "292", "295", "1153", "1162", "1194", "1297", "939", "166", "199", "1160", "1295", "1219", "160", "935", "1152", "1163", "1220", "940"];
                    } else if (i == 1) {
                        var locationFilters = ["location", "anyof", "161", "1151", "1159", "133", "204", "211", "1157", "302", "208", "210", "293", "1155", "1156", "1161", "162", "207", "297", "298", "299", "301", "206", "205", "1299", "292", "295", "1153", "1297", "166", "199", "1295", "160"];
                    } else if (i == 2) {
                        var locationFilters = ["location", "anyof", "294", "221", "296", "1065", "300", "209", "1154", "1158", "1296", "1298", "1300", "1239", "1064", "220", "1160", "1219", "1152", "1220"]
                    } else if (i == 3) {
                        var locationFilters = ["location", "anyof", "1218", "1196", "1217", "1195", "1169", "1162", "1163"];
                    } else if (i == 4) {
                        var locationFilters = ["location", "anyof", "210", "1155", "297"];
                    } else if (i == 5) {
                        var locationFilters = ["location", "anyof", "1151", "208", "293"];
                    } else if (i == 6) {
                        var locationFilters = ["location", "anyof", "211", "295", "1153"];
                    } else if (i == 7) {
                        var locationFilters = ["location", "anyof", "204", "1156", "298"];
                    } else if (i == 8) {
                        var locationFilters = ["location", "anyof", "1157", "162", "299"];
                    } else if (i == 9) {
                        var locationFilters = ["location", "anyof", "301", "1159", "133"];
                    } else if (i == 10) {
                        var locationFilters = ["location", "anyof", "302", "1161", "207"];
                    }

                    else if (i == 11) {
                        var locationFilters = ["location", "anyof", "1299", "1295", "1297"];
                    } else if (i == 12) {
                        var locationFilters = ["location", "anyof", "1300", "1296", "1298"];
                    } else if (i == 13) {
                        var locationFilters = ["location", "anyof", "1220", "1239", "1219"];
                    } else if (i == 14) {
                        var locationFilters = ["location", "anyof", "294", "209", "1152"];
                    } else if (i == 15) {
                        var locationFilters = ["location", "anyof", "296", "1154", "220"];
                    } else if (i == 16) {
                        var locationFilters = ["location", "anyof", "221", "300", "1158"];
                    } else if (i == 17) {
                        var locationFilters = ["location", "anyof", "1065", "1064", "1160"];
                    }

                    else if (i == 18) {
                        var locationFilters = ["location", "anyof", "1169", "1162", "1163"];
                    } else if (i == 19) {
                        var locationFilters = ["location", "anyof", "1218", "1195"];
                    } else if (i == 20) {
                        var locationFilters = ["location", "anyof", "1217", "1196"];
                    }

                    var transactionSearchObj = nsSearch.create({
                        type: "transaction",
                        filters:
                            [
                                ["accounttype", "anyof", "Income"],
                                "AND",
                                locationFilters,
                                "AND",
                                //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                                combinedPeriodFilter
                            ],
                        columns:
                            [
                                nsSearch.createColumn({
                                    name: "posting",
                                    summary: "GROUP",
                                    label: "Posting"
                                }),
                                nsSearch.createColumn({
                                    name: "accounttype",
                                    summary: "GROUP",
                                    label: "Account Type"
                                }),
                                nsSearch.createColumn({
                                    name: "amount",
                                    summary: "SUM",
                                    label: "Amount"
                                }),
                                nsSearch.createColumn({
                                    name: "formulatext",
                                    summary: "GROUP",
                                    formula: "CASE WHEN {accounttype} = 'Income' THEN 'Total - Income' ELSE 'No Account Type' END",
                                    label: "Formula (Text)"
                                }),
                                nsSearch.createColumn({
                                    name: "postingperiod",
                                    summary: "GROUP",
                                    label: "Period"
                                })
                            ]
                    });
                    var searchResults1 = [];
                    var searchResultCount = transactionSearchObj.runPaged().count;
                    log.debug("transactionSearchObj result count", searchResultCount);
                    transactionSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        var tempObj = {};
                        var postingValue = result.getValue({
                            name: 'posting',
                            summary: 'GROUP'
                        });
                        tempObj.postingValue = postingValue ? postingValue : '';
                        var accountTypeValue = result.getValue({
                            name: 'accounttype',
                            summary: 'GROUP'
                        });
                        tempObj.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                        var amountValue = result.getValue({
                            name: 'amount',
                            summary: 'SUM'
                        });
                        tempObj.amountValue = amountValue ? amountValue : '';
                        var formulaTextValue = result.getValue({
                            name: 'formulatext',
                            summary: 'GROUP'
                        });
                        tempObj.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                        var periodValue = result.getText({
                            name: 'postingperiod',
                            summary: 'GROUP'
                        });
                        tempObj.periodValue = periodValue ? periodValue : '';

                        if (i == 0) {
                            tempObj.location = 'All Ortho';
                        } else if (i == 1) {
                            tempObj.location = 'DFW OR';
                        } else if (i == 2) {
                            tempObj.location = 'HOU OR';
                        } else if (i == 3) {
                            tempObj.location = 'GA OR';
                        } else if (i == 4) {
                            tempObj.location = 'Berry';
                        } else if (i == 5) {
                            tempObj.location = 'Crosby';
                        } else if (i == 6) {
                            tempObj.location = 'Duncanville';
                        } else if (i == 7) {
                            tempObj.location = 'Garland';
                        } else if (i == 8) {
                            tempObj.location = 'Grapevine';
                        } else if (i == 9) {
                            tempObj.location = 'Mockingbird';
                        } else if (i == 10) {
                            tempObj.location = 'W. Mckinney';
                        }

                        else if (i == 11) {
                            tempObj.location = 'Irving';
                        } else if (i == 12) {
                            tempObj.location = 'Conroe';
                        } else if (i == 13) {
                            tempObj.location = 'Cypress';
                        } else if (i == 14) {
                            tempObj.location = 'Cypresswood';
                        } else if (i == 15) {
                            tempObj.location = 'Elmsworth';
                        } else if (i == 16) {
                            tempObj.location = 'Heights';
                        } else if (i == 17) {
                            tempObj.location = 'Pasadena';
                        }

                        else if (i == 18) {
                            tempObj.location = 'College Park';
                        } else if (i == 19) {
                            tempObj.location = 'Midtown';
                        } else if (i == 20) {
                            tempObj.location = 'Norcross';
                        }




                        searchResults1.push(tempObj);
                        return true;
                    });

                    searchResults = [...searchResults, ...searchResults1];
                }

                //searchResults = [...searchResults, ...searchResults2, ...searchResults3, ...searchResults4, ...searchResults5, ...searchResults6, ...searchResults7];

                log.debug('Final Array ', searchResults);
                // Create an object to store data based on posting period



                var locationsMap = {};

                // Iterate through the inputArray
                searchResults.forEach(function (item) {
                    // Use the location as the key
                    var locationKey = item.location;

                    // If the key doesn't exist in locationsMap, create it with an empty array
                    if (!locationsMap[locationKey]) {
                        locationsMap[locationKey] = [];
                    }

                    // Push the current item to the array associated with the key
                    locationsMap[locationKey].push(item);
                });

                // Convert the object values to an array
                var finalResults = Object.values(locationsMap);


                /*var resultObject = {};

                // Loop through the input data array and organize it based on the posting period
                searchResults.forEach(function (dataItem) {
                    var periodValue = dataItem.periodValue + " | " + dataItem.location;

                    // Create an object for the posting period if it doesn't exist
                    if (!resultObject[periodValue]) {
                        resultObject[periodValue] = {
                            postingValue: dataItem.postingValue,
                            accountTypeValue: dataItem.accountTypeValue,
                            amountValue: 0, // Initialize amount to 0
                            formulaTextValue: dataItem.formulaTextValue,
                            periodValue: periodValue,
                            location: dataItem.location
                        };
                    }

                    // Accumulate the amount for the posting period
                    resultObject[periodValue].amountValue += parseFloat(dataItem.amountValue);
                });

                // Convert the result object into an array of values
                var resultArray = Object.values(resultObject);

                // Log the result
                log.debug("Result Object:", resultObject);
                //log.debug("Result Array:", resultArray);

                var finalResults = [];
                finalResults.push(resultObject);
                log.debug('finalResults', finalResults)*/





                //set values
                var accountLable = true;
                var incomeArray = [];
                for (var y = 0; y < finalResults.length; y++) {
                    var totalValue = 0;
                    var obj = {};
                    for (var z = 0; z < periodNames.length; z++) {
                        /*var arr = [];
                        arr.push(finalResults[y])
                        var periodToFind = periodNames[z]
                        var foundObject = arr.find(function(obj) {
                            return obj[periodToFind] !==periodToFind;
                        });*/
                        var periodToFind = periodNames[z]
                        var inputData = finalResults[y];
                        //var foundObject = inputData[periodToFind];
                        var foundObject = inputData.find(function (item) {
                            return item.periodValue === periodToFind;
                        });
                        log.debug('foundObject', foundObject);

                        if (foundObject) {

                            var periodName = periodNames[z];
                            var str = periodName.replace(/ /g, '').toLowerCase();
                            if(accountLable == true && foundObject.formulaTextValue){
                                sublist.setSublistValue({ id: 'custpage_account_type', value: foundObject.formulaTextValue, line: y });
                                accountLable = false;
                            }
                            sublist.setSublistValue({ id: 'custpage_location', value: foundObject.location, line: y });
                            
                            if (foundObject.amountValue) {
                                var amountValue = foundObject.amountValue;
                                amountValue = parseFloat(amountValue);
                                amountValue = Math.ceil(amountValue);
                                var formattedNumber = amountValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                if (!isNaN(amountValue)) {
                                    totalValue = parseFloat(totalValue + amountValue);
                                    totalValue = Math.ceil(totalValue);
                                    sublist.setSublistValue({ id: 'custpage_month_year_' + str, value: formattedNumber, line: y });
                                    //if(!isNaN(totalValue)){
                                    var formattedtotalNumber = totalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                    sublist.setSublistValue({ id: 'custpage_total_amount', value: formattedtotalNumber, line: y });
                                    //}
                                }
                            }

                        }
                    }
                }
                //payroll
                
                var lineCount = finalResults.length;
                log.debug('lineCount', lineCount);
                var searchResults = [];
                for (var i = 0; i < 21; i++) {

                    if (i == 0) {
                        var locationFilters = ["location", "anyof", "161", "294", "221", "296", "1065", "1218", "1134", "1151", "1159", "933", "133", "300", "204", "209", "211", "1196", "1217", "1154", "1158", "1157", "936", "302", "208", "210", "293", "1296", "1155", "1156", "1161", "931", "162", "207", "291", "225", "1195", "1298", "1300", "932", "937", "297", "298", "299", "301", "206", "205", "1193", "1239", "1169", "934", "1299", "938", "1064", "159", "220", "292", "295", "1153", "1162", "1194", "1297", "939", "166", "199", "1160", "1295", "1219", "160", "935", "1152", "1163", "1220", "940"];
                    } else if (i == 1) {
                        var locationFilters = ["location", "anyof", "161", "1151", "1159", "133", "204", "211", "1157", "302", "208", "210", "293", "1155", "1156", "1161", "162", "207", "297", "298", "299", "301", "206", "205", "1299", "292", "295", "1153", "1297", "166", "199", "1295", "160"];
                    } else if (i == 2) {
                        var locationFilters = ["location", "anyof", "294", "221", "296", "1065", "300", "209", "1154", "1158", "1296", "1298", "1300", "1239", "1064", "220", "1160", "1219", "1152", "1220"]
                    } else if (i == 3) {
                        var locationFilters = ["location", "anyof", "1218", "1196", "1217", "1195", "1169", "1162", "1163"];
                    } else if (i == 4) {
                        var locationFilters = ["location", "anyof", "210", "1155", "297"];
                    } else if (i == 5) {
                        var locationFilters = ["location", "anyof", "1151", "208", "293"];
                    } else if (i == 6) {
                        var locationFilters = ["location", "anyof", "211", "295", "1153"];
                    } else if (i == 7) {
                        var locationFilters = ["location", "anyof", "204", "1156", "298"];
                    } else if (i == 8) {
                        var locationFilters = ["location", "anyof", "1157", "162", "299"];
                    } else if (i == 9) {
                        var locationFilters = ["location", "anyof", "301", "1159", "133"];
                    } else if (i == 10) {
                        var locationFilters = ["location", "anyof", "302", "1161", "207"];
                    }

                    else if (i == 11) {
                        var locationFilters = ["location", "anyof", "1299", "1295", "1297"];
                    } else if (i == 12) {
                        var locationFilters = ["location", "anyof", "1300", "1296", "1298"];
                    } else if (i == 13) {
                        var locationFilters = ["location", "anyof", "1220", "1239", "1219"];
                    } else if (i == 14) {
                        var locationFilters = ["location", "anyof", "294", "209", "1152"];
                    } else if (i == 15) {
                        var locationFilters = ["location", "anyof", "296", "1154", "220"];
                    } else if (i == 16) {
                        var locationFilters = ["location", "anyof", "221", "300", "1158"];
                    } else if (i == 17) {
                        var locationFilters = ["location", "anyof", "1065", "1064", "1160"];
                    }

                    else if (i == 18) {
                        var locationFilters = ["location", "anyof", "1169", "1162", "1163"];
                    } else if (i == 19) {
                        var locationFilters = ["location", "anyof", "1218", "1195"];
                    } else if (i == 20) {
                        var locationFilters = ["location", "anyof", "1217", "1196"];
                    }

                    var transactionSearchObj = nsSearch.create({
                        type: "transaction",
                        filters:
                            [
                                ["accounttype", "anyof", "COGS"],
                                "AND",
                                locationFilters,
                                "AND",
                                //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                                combinedPeriodFilter
                            ],
                        columns:
                            [
                                nsSearch.createColumn({
                                    name: "posting",
                                    summary: "GROUP",
                                    label: "Posting"
                                }),
                                nsSearch.createColumn({
                                    name: "accounttype",
                                    summary: "GROUP",
                                    label: "Account Type"
                                }),
                                nsSearch.createColumn({
                                    name: "amount",
                                    summary: "SUM",
                                    label: "Amount"
                                }),
                                nsSearch.createColumn({
                                    name: "formulatext",
                                    summary: "GROUP",
                                    formula: "CASE WHEN {accounttype} = 'Cost of Goods Sold' THEN 'Total - Cost Of Sales' ELSE 'No Account Type' END",
                                    label: "Formula (Text)"
                                }),
                                nsSearch.createColumn({
                                    name: "postingperiod",
                                    summary: "GROUP",
                                    label: "Period"
                                })
                            ]
                    });
                    var searchResults1 = [];
                    var searchResultCount = transactionSearchObj.runPaged().count;
                    log.debug("transactionSearchObj result count", searchResultCount);
                    transactionSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        var tempObj = {};
                        var postingValue = result.getValue({
                            name: 'posting',
                            summary: 'GROUP'
                        });
                        tempObj.postingValue = postingValue ? postingValue : '';
                        var accountTypeValue = result.getValue({
                            name: 'accounttype',
                            summary: 'GROUP'
                        });
                        tempObj.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                        var amountValue = result.getValue({
                            name: 'amount',
                            summary: 'SUM'
                        });
                        tempObj.amountValue = amountValue ? amountValue : '';
                        var formulaTextValue = result.getValue({
                            name: 'formulatext',
                            summary: 'GROUP'
                        });
                        tempObj.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                        var periodValue = result.getText({
                            name: 'postingperiod',
                            summary: 'GROUP'
                        });
                        tempObj.periodValue = periodValue ? periodValue : '';

                        if (i == 0) {
                            tempObj.location = 'All Ortho';
                        } else if (i == 1) {
                            tempObj.location = 'DFW OR';
                        } else if (i == 2) {
                            tempObj.location = 'HOU OR';
                        } else if (i == 3) {
                            tempObj.location = 'GA OR';
                        } else if (i == 4) {
                            tempObj.location = 'Berry';
                        } else if (i == 5) {
                            tempObj.location = 'Crosby';
                        } else if (i == 6) {
                            tempObj.location = 'Duncanville';
                        } else if (i == 7) {
                            tempObj.location = 'Garland';
                        } else if (i == 8) {
                            tempObj.location = 'Grapevine';
                        } else if (i == 9) {
                            tempObj.location = 'Mockingbird';
                        } else if (i == 10) {
                            tempObj.location = 'W. Mckinney';
                        }

                        else if (i == 11) {
                            tempObj.location = 'Irving';
                        } else if (i == 12) {
                            tempObj.location = 'Conroe';
                        } else if (i == 13) {
                            tempObj.location = 'Cypress';
                        } else if (i == 14) {
                            tempObj.location = 'Cypresswood';
                        } else if (i == 15) {
                            tempObj.location = 'Elmsworth';
                        } else if (i == 16) {
                            tempObj.location = 'Heights';
                        } else if (i == 17) {
                            tempObj.location = 'Pasadena';
                        }

                        else if (i == 18) {
                            tempObj.location = 'College Park';
                        } else if (i == 19) {
                            tempObj.location = 'Midtown';
                        } else if (i == 20) {
                            tempObj.location = 'Norcross';
                        }




                        searchResults1.push(tempObj);
                        return true;
                    });

                    searchResults = [...searchResults, ...searchResults1];
                }

                //searchResults = [...searchResults, ...searchResults2, ...searchResults3, ...searchResults4, ...searchResults5, ...searchResults6, ...searchResults7];

                log.debug('Final Array ', searchResults);
                // Create an object to store data based on posting period



                var locationsMap = {};

                // Iterate through the inputArray
                searchResults.forEach(function (item) {
                    // Use the location as the key
                    var locationKey = item.location;

                    // If the key doesn't exist in locationsMap, create it with an empty array
                    if (!locationsMap[locationKey]) {
                        locationsMap[locationKey] = [];
                    }

                    // Push the current item to the array associated with the key
                    locationsMap[locationKey].push(item);
                });

                // Convert the object values to an array
                var finalResults = Object.values(locationsMap);
                var accountLable = true;
                for (var y = 0; y < finalResults.length; y++) {
                    var totalValue = 0;
                    for (var z = 0; z < periodNames.length; z++) {
                        /*var arr = [];
                        arr.push(finalResults[y])
                        var periodToFind = periodNames[z]
                        var foundObject = arr.find(function(obj) {
                            return obj[periodToFind] !==periodToFind;
                        });*/
                        var periodToFind = periodNames[z]
                        var inputData = finalResults[y];
                        //var foundObject = inputData[periodToFind];
                        var foundObject = inputData.find(function (item) {
                            return item.periodValue === periodToFind;
                        });
                        log.debug('foundObject', foundObject);

                        if (foundObject) {


                            var periodName = periodNames[z];
                            var str = periodName.replace(/ /g, '').toLowerCase();
                            if(accountLable == true && foundObject.formulaTextValue){
                                sublist.setSublistValue({ id: 'custpage_account_type', value: foundObject.formulaTextValue, line: parseInt(lineCount + y) });
                                accountLable = false;
                            }
                            sublist.setSublistValue({ id: 'custpage_location', value: foundObject.location, line: parseInt(lineCount + y) });
                            if (foundObject.amountValue) {



                                var amountValue = foundObject.amountValue;
                                amountValue = parseFloat(amountValue);
                                amountValue = Math.ceil(amountValue);
                                var formattedNumber = amountValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                if (!isNaN(amountValue)) {
                                    totalValue = parseFloat(totalValue + amountValue);
                                    totalValue = Math.ceil(totalValue);

                                    sublist.setSublistValue({ id: 'custpage_month_year_' + str, value: formattedNumber, line: parseInt(lineCount + y) });
                                    //if(!isNaN(totalValue)){
                                        var formattedtotalNumber = totalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                        sublist.setSublistValue({ id: 'custpage_total_amount', value: formattedtotalNumber, line: parseInt(lineCount + y) });
                                    //}
                                    
                                }
                            }
                            inc = parseInt(inc + 1);
                        }
                    }
                }


                //Expense
                
                lineCount = parseInt(lineCount + finalResults.length);
                log.debug('lineCount', lineCount);
                var searchResults = [];
                for (var i = 0; i < 21; i++) {

                    if (i == 0) {
                        var locationFilters = ["location", "anyof", "161", "294", "221", "296", "1065", "1218", "1134", "1151", "1159", "933", "133", "300", "204", "209", "211", "1196", "1217", "1154", "1158", "1157", "936", "302", "208", "210", "293", "1296", "1155", "1156", "1161", "931", "162", "207", "291", "225", "1195", "1298", "1300", "932", "937", "297", "298", "299", "301", "206", "205", "1193", "1239", "1169", "934", "1299", "938", "1064", "159", "220", "292", "295", "1153", "1162", "1194", "1297", "939", "166", "199", "1160", "1295", "1219", "160", "935", "1152", "1163", "1220", "940"];
                    } else if (i == 1) {
                        var locationFilters = ["location", "anyof", "161", "1151", "1159", "133", "204", "211", "1157", "302", "208", "210", "293", "1155", "1156", "1161", "162", "207", "297", "298", "299", "301", "206", "205", "1299", "292", "295", "1153", "1297", "166", "199", "1295", "160"];
                    } else if (i == 2) {
                        var locationFilters = ["location", "anyof", "294", "221", "296", "1065", "300", "209", "1154", "1158", "1296", "1298", "1300", "1239", "1064", "220", "1160", "1219", "1152", "1220"]
                    } else if (i == 3) {
                        var locationFilters = ["location", "anyof", "1218", "1196", "1217", "1195", "1169", "1162", "1163"];
                    } else if (i == 4) {
                        var locationFilters = ["location", "anyof", "210", "1155", "297"];
                    } else if (i == 5) {
                        var locationFilters = ["location", "anyof", "1151", "208", "293"];
                    } else if (i == 6) {
                        var locationFilters = ["location", "anyof", "211", "295", "1153"];
                    } else if (i == 7) {
                        var locationFilters = ["location", "anyof", "204", "1156", "298"];
                    } else if (i == 8) {
                        var locationFilters = ["location", "anyof", "1157", "162", "299"];
                    } else if (i == 9) {
                        var locationFilters = ["location", "anyof", "301", "1159", "133"];
                    } else if (i == 10) {
                        var locationFilters = ["location", "anyof", "302", "1161", "207"];
                    }

                    else if (i == 11) {
                        var locationFilters = ["location", "anyof", "1299", "1295", "1297"];
                    } else if (i == 12) {
                        var locationFilters = ["location", "anyof", "1300", "1296", "1298"];
                    } else if (i == 13) {
                        var locationFilters = ["location", "anyof", "1220", "1239", "1219"];
                    } else if (i == 14) {
                        var locationFilters = ["location", "anyof", "294", "209", "1152"];
                    } else if (i == 15) {
                        var locationFilters = ["location", "anyof", "296", "1154", "220"];
                    } else if (i == 16) {
                        var locationFilters = ["location", "anyof", "221", "300", "1158"];
                    } else if (i == 17) {
                        var locationFilters = ["location", "anyof", "1065", "1064", "1160"];
                    }

                    else if (i == 18) {
                        var locationFilters = ["location", "anyof", "1169", "1162", "1163"];
                    } else if (i == 19) {
                        var locationFilters = ["location", "anyof", "1218", "1195"];
                    } else if (i == 20) {
                        var locationFilters = ["location", "anyof", "1217", "1196"];
                    }

                    var transactionSearchObj = nsSearch.create({
                        type: "transaction",
                        filters:
                            [
                                ["accounttype", "anyof", "Expense"],
                                "AND",
                                locationFilters,
                                "AND",
                                //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                                combinedPeriodFilter
                            ],
                        columns:
                            [
                                nsSearch.createColumn({
                                    name: "posting",
                                    summary: "GROUP",
                                    label: "Posting"
                                }),
                                nsSearch.createColumn({
                                    name: "accounttype",
                                    summary: "GROUP",
                                    label: "Account Type"
                                }),
                                nsSearch.createColumn({
                                    name: "amount",
                                    summary: "SUM",
                                    label: "Amount"
                                }),
                                nsSearch.createColumn({
                                    name: "formulatext",
                                    summary: "GROUP",
                                    formula: "CASE WHEN {accounttype} = 'Expense' THEN 'Total - Expense' ELSE 'No Account Type' END",
                                    label: "Formula (Text)"
                                }),
                                nsSearch.createColumn({
                                    name: "postingperiod",
                                    summary: "GROUP",
                                    label: "Period"
                                })
                            ]
                    });
                    var searchResults1 = [];
                    var searchResultCount = transactionSearchObj.runPaged().count;
                    log.debug("transactionSearchObj result count", searchResultCount);
                    transactionSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        var tempObj = {};
                        var postingValue = result.getValue({
                            name: 'posting',
                            summary: 'GROUP'
                        });
                        tempObj.postingValue = postingValue ? postingValue : '';
                        var accountTypeValue = result.getValue({
                            name: 'accounttype',
                            summary: 'GROUP'
                        });
                        tempObj.accountTypeValue = accountTypeValue ? accountTypeValue : '';
                        var amountValue = result.getValue({
                            name: 'amount',
                            summary: 'SUM'
                        });
                        tempObj.amountValue = amountValue ? amountValue : '';
                        var formulaTextValue = result.getValue({
                            name: 'formulatext',
                            summary: 'GROUP'
                        });
                        tempObj.formulaTextValue = formulaTextValue ? formulaTextValue : '';
                        var periodValue = result.getText({
                            name: 'postingperiod',
                            summary: 'GROUP'
                        });
                        tempObj.periodValue = periodValue ? periodValue : '';

                        if (i == 0) {
                            tempObj.location = 'All Ortho';
                        } else if (i == 1) {
                            tempObj.location = 'DFW OR';
                        } else if (i == 2) {
                            tempObj.location = 'HOU OR';
                        } else if (i == 3) {
                            tempObj.location = 'GA OR';
                        } else if (i == 4) {
                            tempObj.location = 'Berry';
                        } else if (i == 5) {
                            tempObj.location = 'Crosby';
                        } else if (i == 6) {
                            tempObj.location = 'Duncanville';
                        } else if (i == 7) {
                            tempObj.location = 'Garland';
                        } else if (i == 8) {
                            tempObj.location = 'Grapevine';
                        } else if (i == 9) {
                            tempObj.location = 'Mockingbird';
                        } else if (i == 10) {
                            tempObj.location = 'W. Mckinney';
                        }

                        else if (i == 11) {
                            tempObj.location = 'Irving';
                        } else if (i == 12) {
                            tempObj.location = 'Conroe';
                        } else if (i == 13) {
                            tempObj.location = 'Cypress';
                        } else if (i == 14) {
                            tempObj.location = 'Cypresswood';
                        } else if (i == 15) {
                            tempObj.location = 'Elmsworth';
                        } else if (i == 16) {
                            tempObj.location = 'Heights';
                        } else if (i == 17) {
                            tempObj.location = 'Pasadena';
                        }

                        else if (i == 18) {
                            tempObj.location = 'College Park';
                        } else if (i == 19) {
                            tempObj.location = 'Midtown';
                        } else if (i == 20) {
                            tempObj.location = 'Norcross';
                        }




                        searchResults1.push(tempObj);
                        return true;
                    });

                    searchResults = [...searchResults, ...searchResults1];
                }

                //searchResults = [...searchResults, ...searchResults2, ...searchResults3, ...searchResults4, ...searchResults5, ...searchResults6, ...searchResults7];

                log.debug('Final Array ', searchResults);
                // Create an object to store data based on posting period



                var locationsMap = {};

                // Iterate through the inputArray
                searchResults.forEach(function (item) {
                    // Use the location as the key
                    var locationKey = item.location;

                    // If the key doesn't exist in locationsMap, create it with an empty array
                    if (!locationsMap[locationKey]) {
                        locationsMap[locationKey] = [];
                    }

                    // Push the current item to the array associated with the key
                    locationsMap[locationKey].push(item);
                });

                // Convert the object values to an array
                var finalResults = Object.values(locationsMap);
                var accountLable = true;
                for (var y = 0; y < finalResults.length; y++) {
                    for (var z = 0; z < periodNames.length; z++) {
                        /*var arr = [];
                        arr.push(finalResults[y])
                        var periodToFind = periodNames[z]
                        var foundObject = arr.find(function(obj) {
                            return obj[periodToFind] !==periodToFind;
                        });*/
                        var periodToFind = periodNames[z]
                        var inputData = finalResults[y];
                        //var foundObject = inputData[periodToFind];
                        var foundObject = inputData.find(function (item) {
                            return item.periodValue === periodToFind;
                        });
                        log.debug('foundObject', foundObject);

                        if (foundObject) {
                            var periodName = periodNames[z];
                            var str = periodName.replace(/ /g, '').toLowerCase();
                            if(accountLable == true && foundObject.formulaTextValue){
                                sublist.setSublistValue({ id: 'custpage_account_type', value: foundObject.formulaTextValue, line: parseInt(lineCount + y) });
                                accountLable = false;
                            }
                            sublist.setSublistValue({ id: 'custpage_location', value: foundObject.location, line: parseInt(lineCount + y) });
                            if (foundObject.amountValue) {
                                var amountValue = foundObject.amountValue;
                                amountValue = parseFloat(amountValue);
                                amountValue = Math.ceil(amountValue);
                                var formattedNumber = amountValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                if (!isNaN(amountValue)) {
                                    totalValue = parseFloat(totalValue + amountValue);
                                    totalValue = Math.ceil(totalValue);
                                    var formattedtotalNumber = totalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                    sublist.setSublistValue({ id: 'custpage_month_year_' + str, value: formattedNumber, line: parseInt(lineCount + y) });
                                    sublist.setSublistValue({ id: 'custpage_total_amount', value: formattedtotalNumber, line: parseInt(lineCount + y) });
                                }
                            }
                            inc = parseInt(inc + 1);
                        }
                    }
                }

                //Net Income
                var accountLable = true;
                lineCount = parseInt(lineCount + finalResults.length);
                log.debug('lineCount', lineCount);
                var searchResults = [];
                for (var i = 0; i < 21; i++) {

                    if (i == 0) {
                        var locationFilters = ["location", "anyof", "161", "294", "221", "296", "1065", "1218", "1134", "1151", "1159", "933", "133", "300", "204", "209", "211", "1196", "1217", "1154", "1158", "1157", "936", "302", "208", "210", "293", "1296", "1155", "1156", "1161", "931", "162", "207", "291", "225", "1195", "1298", "1300", "932", "937", "297", "298", "299", "301", "206", "205", "1193", "1239", "1169", "934", "1299", "938", "1064", "159", "220", "292", "295", "1153", "1162", "1194", "1297", "939", "166", "199", "1160", "1295", "1219", "160", "935", "1152", "1163", "1220", "940"];
                    } else if (i == 1) {
                        var locationFilters = ["location", "anyof", "161", "1151", "1159", "133", "204", "211", "1157", "302", "208", "210", "293", "1155", "1156", "1161", "162", "207", "297", "298", "299", "301", "206", "205", "1299", "292", "295", "1153", "1297", "166", "199", "1295", "160"];
                    } else if (i == 2) {
                        var locationFilters = ["location", "anyof", "294", "221", "296", "1065", "300", "209", "1154", "1158", "1296", "1298", "1300", "1239", "1064", "220", "1160", "1219", "1152", "1220"]
                    } else if (i == 3) {
                        var locationFilters = ["location", "anyof", "1218", "1196", "1217", "1195", "1169", "1162", "1163"];
                    } else if (i == 4) {
                        var locationFilters = ["location", "anyof", "210", "1155", "297"];
                    } else if (i == 5) {
                        var locationFilters = ["location", "anyof", "1151", "208", "293"];
                    } else if (i == 6) {
                        var locationFilters = ["location", "anyof", "211", "295", "1153"];
                    } else if (i == 7) {
                        var locationFilters = ["location", "anyof", "204", "1156", "298"];
                    } else if (i == 8) {
                        var locationFilters = ["location", "anyof", "1157", "162", "299"];
                    } else if (i == 9) {
                        var locationFilters = ["location", "anyof", "301", "1159", "133"];
                    } else if (i == 10) {
                        var locationFilters = ["location", "anyof", "302", "1161", "207"];
                    }

                    else if (i == 11) {
                        var locationFilters = ["location", "anyof", "1299", "1295", "1297"];
                    } else if (i == 12) {
                        var locationFilters = ["location", "anyof", "1300", "1296", "1298"];
                    } else if (i == 13) {
                        var locationFilters = ["location", "anyof", "1220", "1239", "1219"];
                    } else if (i == 14) {
                        var locationFilters = ["location", "anyof", "294", "209", "1152"];
                    } else if (i == 15) {
                        var locationFilters = ["location", "anyof", "296", "1154", "220"];
                    } else if (i == 16) {
                        var locationFilters = ["location", "anyof", "221", "300", "1158"];
                    } else if (i == 17) {
                        var locationFilters = ["location", "anyof", "1065", "1064", "1160"];
                    }

                    else if (i == 18) {
                        var locationFilters = ["location", "anyof", "1169", "1162", "1163"];
                    } else if (i == 19) {
                        var locationFilters = ["location", "anyof", "1218", "1195"];
                    } else if (i == 20) {
                        var locationFilters = ["location", "anyof", "1217", "1196"];
                    }

                    var transactionSearchObj = nsSearch.create({
                        type: "transaction",
                        filters:
                            [
                                ["accounttype", "anyof", "Income", "COGS", "Expense", "OthIncome", "OthExpense"],
                                "AND",
                                locationFilters,
                                "AND",
                                //[["accountingperiod.periodname","is","Jul 2022"],"OR",["accountingperiod.periodname","is","Aug 2022"]]
                                combinedPeriodFilter
                            ],
                        columns:
                            [
                                nsSearch.createColumn({
                                    name: "posting",
                                    summary: "GROUP",
                                    label: "Posting"
                                }),
                                nsSearch.createColumn({
                                    name: "formulanumeric",
                                    summary: "SUM",
                                    formula: "CASE WHEN {accounttype} = 'Income' OR {accounttype} = 'Other Income' THEN  {amount} ELSE {amount}*-1 END",
                                    label: "Formula (Numeric)"
                                }),
                                nsSearch.createColumn({
                                    name: "postingperiod",
                                    summary: "GROUP",
                                    label: "Period"
                                })
                            ]
                    });
                    var searchResults1 = [];
                    var searchResultCount = transactionSearchObj.runPaged().count;
                    log.debug("transactionSearchObj result count", searchResultCount);
                    transactionSearchObj.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        var tempObj = {};
                        var postingValue = result.getValue({
                            name: 'posting',
                            summary: 'GROUP'
                        });
                        tempObj.postingValue = postingValue ? postingValue : '';
                        /*var accountTypeValue = result.getValue({
                            name: 'accounttype',
                            summary: 'GROUP'
                        });
                        tempObj.accountTypeValue = accountTypeValue ? accountTypeValue : '';*/
                        tempObj.accountTypeValue = 'Net Income';
                        /*var amountValue = result.getValue({
                            name: 'amount',
                            summary: 'SUM'
                        });
                        tempObj.amountValue = amountValue ? amountValue : '';*/
                        var amountValue = result.getValue({
                            name: 'formulanumeric',
                            summary: 'SUM'
                        });
                        tempObj.amountValue = amountValue ? amountValue : '';

                        /*var formulaTextValue = result.getValue({
                            name: 'formulatext',
                            summary: 'GROUP'
                        });
                        tempObj.formulaTextValue = formulaTextValue ? formulaTextValue : '';*/
                        tempObj.formulaTextValue = 'Net Income';
                        var periodValue = result.getText({
                            name: 'postingperiod',
                            summary: 'GROUP'
                        });
                        tempObj.periodValue = periodValue ? periodValue : '';

                        if (i == 0) {
                            tempObj.location = 'All Ortho';
                        } else if (i == 1) {
                            tempObj.location = 'DFW OR';
                        } else if (i == 2) {
                            tempObj.location = 'HOU OR';
                        } else if (i == 3) {
                            tempObj.location = 'GA OR';
                        } else if (i == 4) {
                            tempObj.location = 'Berry';
                        } else if (i == 5) {
                            tempObj.location = 'Crosby';
                        } else if (i == 6) {
                            tempObj.location = 'Duncanville';
                        } else if (i == 7) {
                            tempObj.location = 'Garland';
                        } else if (i == 8) {
                            tempObj.location = 'Grapevine';
                        } else if (i == 9) {
                            tempObj.location = 'Mockingbird';
                        } else if (i == 10) {
                            tempObj.location = 'W. Mckinney';
                        }

                        else if (i == 11) {
                            tempObj.location = 'Irving';
                        } else if (i == 12) {
                            tempObj.location = 'Conroe';
                        } else if (i == 13) {
                            tempObj.location = 'Cypress';
                        } else if (i == 14) {
                            tempObj.location = 'Cypresswood';
                        } else if (i == 15) {
                            tempObj.location = 'Elmsworth';
                        } else if (i == 16) {
                            tempObj.location = 'Heights';
                        } else if (i == 17) {
                            tempObj.location = 'Pasadena';
                        }

                        else if (i == 18) {
                            tempObj.location = 'College Park';
                        } else if (i == 19) {
                            tempObj.location = 'Midtown';
                        } else if (i == 20) {
                            tempObj.location = 'Norcross';
                        }




                        searchResults1.push(tempObj);
                        return true;
                    });

                    searchResults = [...searchResults, ...searchResults1];
                }

                //searchResults = [...searchResults, ...searchResults2, ...searchResults3, ...searchResults4, ...searchResults5, ...searchResults6, ...searchResults7];

                log.debug('Final Array ', searchResults);
                // Create an object to store data based on posting period



                var locationsMap = {};

                // Iterate through the inputArray
                searchResults.forEach(function (item) {
                    // Use the location as the key
                    var locationKey = item.location;

                    // If the key doesn't exist in locationsMap, create it with an empty array
                    if (!locationsMap[locationKey]) {
                        locationsMap[locationKey] = [];
                    }

                    // Push the current item to the array associated with the key
                    locationsMap[locationKey].push(item);
                });

                // Convert the object values to an array
                var finalResults = Object.values(locationsMap);
                var accountLable = true;
                for (var y = 0; y < finalResults.length; y++) {
                    var totalValue = 0;
                    for (var z = 0; z < periodNames.length; z++) {
                        /*var arr = [];
                        arr.push(finalResults[y])
                        var periodToFind = periodNames[z]
                        var foundObject = arr.find(function(obj) {
                            return obj[periodToFind] !==periodToFind;
                        });*/
                        var periodToFind = periodNames[z]
                        var inputData = finalResults[y];
                        //var foundObject = inputData[periodToFind];
                        var foundObject = inputData.find(function (item) {
                            return item.periodValue === periodToFind;
                        });
                        log.debug('foundObject', foundObject);

                        if (foundObject) {
                            var periodName = periodNames[z];
                            var str = periodName.replace(/ /g, '').toLowerCase();
                            if(accountLable == true && foundObject.formulaTextValue){
                                sublist.setSublistValue({ id: 'custpage_account_type', value: foundObject.formulaTextValue, line: parseInt(lineCount + y) });
                                accountLable = false;
                            }
                            sublist.setSublistValue({ id: 'custpage_location', value: foundObject.location, line: parseInt(lineCount + y) });
                            if (foundObject.amountValue) {
                                var amountValue = foundObject.amountValue;
                                amountValue = parseFloat(amountValue);
                                amountValue = Math.ceil(amountValue);
                                var formattedNumber = amountValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                if (!isNaN(amountValue)) {
                                    totalValue = parseFloat(totalValue + amountValue);
                                    totalValue = Math.ceil(totalValue);
                                    //totalValue = totalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                    var formattedtotalNumber = totalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                    sublist.setSublistValue({ id: 'custpage_month_year_' + str, value: formattedNumber, line: parseInt(lineCount + y) });
                                    sublist.setSublistValue({ id: 'custpage_total_amount', value: formattedtotalNumber, line: parseInt(lineCount + y) });
                                }
                            }
                            inc = parseInt(inc + 1);
                        }
                    }
                }

            } catch (e) {
                log.debug('Error::populateSublist', e);

            }
        }


        return {
            onRequest: onRequest
        };
    });
