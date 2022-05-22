/**
 * @OnlyCurrentDoc
 */

/**
 * Google Sheet (Slushy v2):
 * https://docs.google.com/spreadsheets/d/1NM6yX734cTQMVrJZvkawAmFVgwqafehTWLWU8BbIP-U/edit?usp=sharing
 */

var ss  = SpreadsheetApp.getActiveSpreadsheet();
var rewardSheet = ss.getSheetByName('Rewards');
var dailySheet = ss.getSheetByName("Daily");
var monthlySheet = ss.getSheetByName("Monthly");
var controlSheet = ss.getSheetByName('Control Panel');

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Control Board')
      .addItem('Refresh Slush Data', 'menuItem1')
      .addToUi();
  rewardSheet.getRange(7,1).activate(); // set cursor
}
function menuItem1() {
  getBlockData();
}

function getBlockData() {
  triggerCheck();
  var slushToken = controlSheet.getRange(1,2).getValue();
  var slushStatsURL = 'https://slushpool.com/stats/json/btc'; // request block data
  var response = UrlFetchApp.fetch( 
    slushStatsURL, 
    {
      "headers":{
        "SlushPool-Auth-Token":slushToken
      }
    }
  );
  var blockData = response.getContentText();
  var blockJson = JSON.parse(blockData);
  var block = [blockJson.btc.blocks];
  var rows = [Object.keys(block)];
  var headers = block[rows[0]];
  var getHeaders = [Object.keys(headers)]; 
  var blockArray = getHeaders[0]; // this is the block numbers
  var lastBlock = rewardSheet.getRange(8,1);
  if (lastBlock.isBlank()) {
    var coinbaseURL = "https://api.pro.coinbase.com/products/btc-usd/ticker" // request BTC USD price and date
    var tickerResponse = UrlFetchApp.fetch(coinbaseURL);
    var tickerJson = JSON.parse(tickerResponse.getContentText());
    var price = [[tickerJson.price]];
    var cbFormattedDate = Utilities.formatDate(new Date([[tickerJson.time]]), "GMT", "MM/dd/yyyy HH:mm:ss");

    Utilities.sleep(5000); //wait 5 seconds before next Slush API call
    var slushAccountURL = 'https://slushpool.com/accounts/profile/json/btc'; // request active workers and 24h avg hashrate
    var responseAcct = UrlFetchApp.fetch( 
      slushAccountURL,
      {
        "headers":{
          "SlushPool-Auth-Token":slushToken
        }
      }
    );
    var acctData = responseAcct.getContentText();
    var acctJson = JSON.parse(acctData)
    var okWorkers = acctJson["btc"]["ok_workers"];
     setNewBlocks(blockJson, blockArray, price, cbFormattedDate, okWorkers);
     setRewardStats();
  } else {
    refreshSlushy(blockJson, blockArray, slushToken);
  }
   rewardSheet.getRange(2, 14).setNumberFormat("0").setValue((blockJson["btc"]["luck_b10"] * 100) + "%");
   rewardSheet.getRange(3, 14).setNumberFormat("0").setValue((blockJson["btc"]["luck_b50"] * 100) + "%");
   rewardSheet.getRange(4, 14).setNumberFormat("0").setValue((blockJson["btc"]["luck_b250"] * 100) + "%");
}

function refreshSlushy(blockJson, blockArray, slushToken) {
   refreshBlockState(blockJson, blockArray);
  var lastArrayBlock = blockArray[14];
  var lastSheetBlock = rewardSheet.getRange(8,1).getValue();
  if (lastArrayBlock > lastSheetBlock) {
    var coinbaseURL = "https://api.pro.coinbase.com/products/btc-usd/ticker" // request BTC USD price and date
    var tickerResponse = UrlFetchApp.fetch(coinbaseURL);
    var tickerJson = JSON.parse(tickerResponse.getContentText());
    var price = [[tickerJson.price]];
    var cbFormattedDate = Utilities.formatDate(new Date([[tickerJson.time]]), "GMT", "MM/dd/yyyy HH:mm:ss");

    Utilities.sleep(5000); //wait 5 seconds before next Slush API call
    var slushAccountURL = 'https://slushpool.com/accounts/profile/json/btc'; // request active workers and 24h avg hashrate
    var responseAcct = UrlFetchApp.fetch( 
      slushAccountURL,
      {
        "headers":{
          "SlushPool-Auth-Token":slushToken
        }
      }
    );
    var acctData = responseAcct.getContentText();
    var acctJson = JSON.parse(acctData)
    var okWorkers = acctJson["btc"]["ok_workers"];
     setNewBlocks(blockJson, blockArray, price, cbFormattedDate, okWorkers);
     rewardSheet.getRange(5, 14).setNumberFormat("0.0").setValue((acctJson["btc"]["hash_rate_24h"] / 1000).toFixed(1) + " TH/s");
  }
  setRewardStats();
}

function refreshBlockState(blockJson, blockArray) {
  var lastRow = rewardSheet.getLastRow();
  var stateRangeValues = rewardSheet.getRange(8,7,lastRow - 7,1).getValues();
  var rewardValues = rewardSheet.getRange(8,6,lastRow - 7,1).getValues();
  var stateRangeValuesLength = stateRangeValues.length;
  var firstArrayBlock =  blockArray[0];
  for (var i = 0; i < stateRangeValuesLength; i++) {
    if (stateRangeValues[i] == "new") {
      var unconfirmedRow = i + 8;
      var blockNumber = rewardSheet.getRange(unconfirmedRow,1).getValue();
      if (blockNumber >= firstArrayBlock) {
        var blockValue = blockJson["btc"]["blocks"][blockNumber]["value"];
        var userReward = blockJson["btc"]["blocks"][blockNumber]["user_reward"];
        var poolHashrate = blockJson["btc"]["blocks"][blockNumber]["pool_scoring_hash_rate"];
        var userHashrate = poolHashrate * (userReward/(blockValue*.98));
         rewardSheet.getRange(unconfirmedRow, 4).setValue(poolHashrate / 1000);
         rewardSheet.getRange(unconfirmedRow, 5).setValue(userHashrate / 1000);
         if (poolHashrate == 0) {
           rewardSheet.getRange(unconfirmedRow, 6).setValue(0);
         } else {
           rewardSheet.getRange(unconfirmedRow, 6).setValue(userReward);
         }
         rewardSheet.getRange(unconfirmedRow, 7).setValue(blockJson["btc"]["blocks"][blockNumber]["state"]);
         rewardSheet.getRange(unconfirmedRow, 14).setValue(blockJson["btc"]["blocks"][blockNumber]["total_shares"]);
         var btcPrice = rewardSheet.getRange(unconfirmedRow,10).getValue();
         rewardSheet.getRange(unconfirmedRow, 9).setValue(userReward * btcPrice); 
         if (blockJson["btc"]["blocks"][blockNumber]["confirmations_left"] == 0) {
           rewardSheet.getRange(unconfirmedRow, 8).setValue(blockJson["btc"]["blocks"][blockNumber]["confirmations_left"]).setBackground(null);
         } else {
           rewardSheet.getRange(unconfirmedRow, 8).setValue(blockJson["btc"]["blocks"][blockNumber]["confirmations_left"]);
         }
      } else {
        rewardSheet.getRange(unconfirmedRow, 7).setValue('confirmed');
        rewardSheet.getRange(unconfirmedRow, 8).setValue(0).setBackground(null);
      }
    } else if (stateRangeValues[i] == "invalid" && rewardValues[i] > 0) {
      var invalidRow = i + 8;
      rewardSheet.getRange(invalidRow, 6).setValue(0.00000000);
      rewardSheet.getRange(invalidRow, 9).setValue(0);
      rewardSheet.getRange(invalidRow, 7).setBackground('#f4cccc');
    }
  }
}

function setNewBlocks(blockJson, blockArray, price, cbFormattedDate, okWorkers) {
  var sheetLastBlock = rewardSheet.getRange(8,1).getValue();
  for(var i = 0; i < blockArray.length; i++) {
    if(sheetLastBlock < blockArray[i]) {
      rewardSheet.insertRows(8);
      var dateFound = blockJson["btc"]["blocks"][blockArray[i]]["date_found"];
      var dateFoundMilli = new Date (dateFound*1000);
      var formattedDate = Utilities.formatDate(dateFoundMilli, "GMT", "MM/dd/yyyy HH:mm:ss");
      var blockValue = blockJson["btc"]["blocks"][blockArray[i]]["value"];
      var poolHashrate = blockJson["btc"]["blocks"][blockArray[i]]["pool_scoring_hash_rate"];
      var userReward = blockJson["btc"]["blocks"][blockArray[i]]["user_reward"];
      var userHashrate = poolHashrate * (userReward/(blockValue*.98));
      rewardSheet.getRange(8, 1).setValue(blockArray[i]);
      rewardSheet.getRange(8, 2).setValue(formattedDate);
      rewardSheet.getRange(8, 3).setNumberFormat("0.00000000").setValue(blockValue);
      rewardSheet.getRange(8, 4).setNumberFormat("0,000").setValue(poolHashrate / 1000);
      if (userHashrate / 1000 > 1000) {
        rewardSheet.getRange(8, 5).setNumberFormat("0,000.0").setValue(userHashrate / 1000);
      } else {
        rewardSheet.getRange(8, 5).setNumberFormat("0.0").setValue(userHashrate / 1000);
      }
      if (poolHashrate == 0) {
        rewardSheet.getRange(8, 6).setValue(0);
      } else {
        rewardSheet.getRange(8, 6).setNumberFormat("0.00000000").setValue(userReward);
      }
      rewardSheet.getRange(8, 7).setValue(blockJson["btc"]["blocks"][blockArray[i]]["state"]);
      if (blockJson["btc"]["blocks"][blockArray[i]]["confirmations_left"] > 0) {
        rewardSheet.getRange(8, 8).setValue(blockJson["btc"]["blocks"][blockArray[i]]["confirmations_left"]).setBackground('#fff2cc');
      } else {
        rewardSheet.getRange(8, 8).setValue(blockJson["btc"]["blocks"][blockArray[i]]["confirmations_left"])
      }
      rewardSheet.getRange(8, 12).setNumberFormat("0").setValue(blockJson["btc"]["blocks"][blockArray[i]]["mining_duration"] / 60);
      rewardSheet.getRange(8, 14).setValue(blockJson["btc"]["blocks"][blockArray[i]]["total_shares"]);
      rewardSheet.getRange(8, 10).setNumberFormat("$0,000.00").setValue(price);
      rewardSheet.getRange(8, 11).setValue(cbFormattedDate);
      rewardSheet.getRange(8, 13).setValue(okWorkers);
      rewardSheet.getRange(8, 9).setNumberFormat("$0.00").setValue(userReward * price);
    }
  }
}

function setRewardStats() {
  var lastRow = rewardSheet.getLastRow();
  var stateRangeValues = rewardSheet.getRange(8,7,lastRow - 7,1).getValues();
  var unconfirmedTotal = 0;
  var unconfirmedBlocks = 0;
  for (var i = 0; i < stateRangeValues.length; i++) {
    if (stateRangeValues[i] == "new") {
      var unconfirmedReward = rewardSheet.getRange(i + 8,6).getValue();
      var unconfirmedTotal = unconfirmedTotal + unconfirmedReward;
      var unconfirmedBlocks = unconfirmedBlocks + 1;
    }
  }
  rewardSheet.getRange(3, 1).setNumberFormat("0.00000000").setValue(unconfirmedTotal);
  rewardSheet.getRange(5, 1).setValue("# Blocks: " + unconfirmedBlocks);

  var foundDates = rewardSheet.getRange(8, 2, lastRow - 7, 1).getValues();
  var utcDate = Utilities.formatDate(new Date(), "GMT", "MM/dd/yyyy HH:mm:ss");
  var millisPerDay = 1000 * 60 * 60 * 24;
  var now = new Date();  
  var twtyFourHoursAgo = new Date(Utilities.formatDate(new Date(now.getTime() - millisPerDay), "GMT", "MM/dd/yyyy HH:mm:ss"));
  var frtyEightHoursAgo = new Date(Utilities.formatDate(new Date(now.getTime() - (millisPerDay * 2)), "GMT", "MM/dd/yyyy HH:mm:ss"));0,00
  var weekAgo = new Date(Utilities.formatDate(new Date(now.getTime() - (millisPerDay * 7)), "GMT", "MM/dd/yyyy HH:mm:ss"));
  var twoweeksAgo = new Date(Utilities.formatDate(new Date(now.getTime() - (millisPerDay * 14)), "GMT", "MM/dd/yyyy HH:mm:ss"));
  var thrtyDaysAgo = new Date(Utilities.formatDate(new Date(now.getTime() - (millisPerDay * 30)), "GMT", "MM/dd/yyyy HH:mm:ss"));
  var sixtyDaysAgo = new Date(Utilities.formatDate(new Date(now.getTime() - (millisPerDay * 60)), "GMT", "MM/dd/yyyy HH:mm:ss"));
  var twtyFourHourTotal = 0;
  var twtyFourHourBlocks = 0;
  var yesterdayTotal = 0;
  var yesterdayBlocks = 0;
  var lastWeekTotal = 0;
  var lastWeekBlocks = 0;
  var twoWeeksAgoTotal = 0;
  var twoWeeksAgoBlocks = 0;
  var lastThirtyDayTotal = 0;
  var lastThirtyDayBlocks = 0;
  var prevMonthTotal = 0;
  var allTimeTotal = 0;
  for (var i = 0; i < foundDates.length; i++) {
    var dateValue = new Date(Utilities.formatDate(new Date(foundDates[i]), "GMT", "MM/dd/yyyy HH:mm:ss"));
    if (dateValue > twtyFourHoursAgo) {
      var twtyFourHourReward = rewardSheet.getRange(i + 8, 6).getValue();
      var twtyFourHourTotal = twtyFourHourTotal + twtyFourHourReward;
      var twtyFourHourBlocks = twtyFourHourBlocks + 1;
    }
    if (dateValue > frtyEightHoursAgo && dateValue < twtyFourHoursAgo) {
      var yesterdayRerward = rewardSheet.getRange(i + 8, 6).getValue();
      var yesterdayTotal = yesterdayTotal + yesterdayRerward;
      var yesterdayBlocks = yesterdayBlocks + 1;
    }
    if (dateValue > weekAgo) {
      var lastWeekRerward = rewardSheet.getRange(i + 8, 6).getValue();
      var lastWeekTotal = lastWeekTotal + lastWeekRerward;
      var lastWeekBlocks = lastWeekBlocks + 1;
    }
    if (dateValue > twoweeksAgo && dateValue < weekAgo) {
      var twoWeeksAgoRerward = rewardSheet.getRange(i + 8, 6).getValue();
      var twoWeeksAgoTotal = twoWeeksAgoTotal + twoWeeksAgoRerward;
      var twoWeeksAgoBlocks = twoWeeksAgoBlocks + 1;
    }
    if (dateValue > thrtyDaysAgo) {
      var lastThirtyDayRerward = rewardSheet.getRange(i + 8, 6).getValue();
      var lastThirtyDayTotal = lastThirtyDayTotal + lastThirtyDayRerward;
      var lastThirtyDayBlocks = lastThirtyDayBlocks + 1;
    }
    if (dateValue > sixtyDaysAgo && dateValue < thrtyDaysAgo) {
      var prevMonthRerward = rewardSheet.getRange(i + 8, 6).getValue();
      var prevMonthTotal = prevMonthTotal + prevMonthRerward;
    }
    var allTimeRerward = rewardSheet.getRange(i + 8, 6).getValue();
    var allTimeTotal = allTimeTotal + allTimeRerward;
  }
  rewardSheet.getRange(3,3).setNumberFormat("0.00000000").setValue(twtyFourHourTotal);
  rewardSheet.getRange(5,3).setValue("# Blocks: " + twtyFourHourBlocks);
  rewardSheet.getRange(3,5).setNumberFormat("0.00000000").setValue(yesterdayTotal);
  rewardSheet.getRange(5,5).setValue("# Blocks: " + yesterdayBlocks);
  rewardSheet.getRange(3,7).setNumberFormat("0.00000000").setValue(lastWeekTotal);
  rewardSheet.getRange(5,7).setValue("# Blocks: " + lastWeekBlocks);
  rewardSheet.getRange(3,9).setNumberFormat("0.00000000").setValue(twoWeeksAgoTotal);
  rewardSheet.getRange(5,9).setValue("# Blocks: " + twoWeeksAgoBlocks);
  rewardSheet.getRange(2,12).setNumberFormat("0.00000000").setValue(lastThirtyDayTotal);
  rewardSheet.getRange(3,12).setNumberFormat("0.00000000").setValue(prevMonthTotal);
  rewardSheet.getRange(5,12).setNumberFormat("0.00000000").setValue(allTimeTotal);
  rewardSheet.getRange(1,1).setValue("Last Updated: " + utcDate + " UTC");
  var getSheets = ss.getSheets();
  var  s;
  for(s in getSheets){
    if (getSheets[s].getName() === 'Daily') {
      popDailySheets()
    }
  }
}

function triggerCheck() {
  var triggerStatus = controlSheet.getRange(2,2).getValue();
  var triggers = ScriptApp.getScriptTriggers();
  if(triggerStatus == 'Off' && triggers.length > 0) {
    for (var i = 0; i < triggers.length; i++) {
     ScriptApp.deleteTrigger(triggers[i]);
    }
  controlSheet.getRange(2,2).setBackground(null);
  } else if(triggerStatus == 'On' && triggers.length == 0) {
    ScriptApp.newTrigger("getBlockData")
      .timeBased()
      .everyHours(1)
      .create();
    controlSheet.getRange(2,2).setBackground("#d9ead3");
  }
}

function popDailySheets() {
  var lastDailyDateCell = dailySheet.getRange(20,1);
  var lastMonthlyDateCell = monthlySheet.getRange(20,1);
  var newDate = new Date();
  var month = newDate.getMonth();
  var year = newDate.getFullYear();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var opEx = controlSheet.getRange(3,2).getValue();
  var dailyOpEx = opEx / daysInMonth;
  if (lastDailyDateCell.isBlank()) {
    setNewDailyDates(dailyOpEx);
  } else {
    checkLastDate(dailyOpEx);
  }
  if (lastMonthlyDateCell.isBlank()) {
    setNewMonthlyDates()
  } else {
    checkLastDate(dailyOpEx)
  }
}

function checkLastDate(dailyOpEx) {
  var lastDailyDate = Utilities.formatDate(new Date(dailySheet.getRange(20,1).getValue()), "GMT", "MM/dd/yyyy");
  var lastMonthlyDate = Utilities.formatDate(new Date(dailySheet.getRange(20,1).getValue()), "GMT", "yyyy-MM");
  var today = Utilities.formatDate(new Date(), "GMT", "MM/dd/yyyy");
  var todayMonth = Utilities.formatDate(new Date(), "GMT", "yyyy-MM");
  var hour = Utilities.formatDate(new Date(), "GMT", "H");
  if (today > lastDailyDate && hour >= 1) {
    dailySheet.insertRows(20);
    dailySheet.getRange(20,1).setValue(today);
    dailySheet.getRange(20,6).setNumberFormat("$0.00").setValue(dailyOpEx);
    setTodaysData(dailyOpEx)
  } else {
    setTodaysData(dailyOpEx)
  }
  if (todayMonth > lastMonthlyDate && hour >= 1) {
    monthlySheet.insertRows(20);
    monthlySheet.getRange(20,1).setValue(todayMonth);
    monthlySheet.getRange(20,6).setValue(controlSheet.getRange(3,2).getValue())
    setMonthData()
  } else {
    setMonthData()
  }
}

function setTodaysData(dailyOpEx) {
  var lastDailyDate = Utilities.formatDate(new Date(dailySheet.getRange(20,1).getValue()), "GMT", "MM/dd/yyyy");
  var rewardLastRow = rewardSheet.getLastRow();
  var rewardDates = rewardSheet.getRange(8,2,rewardLastRow-7,1).getValues();
  var rewardAmounts = rewardSheet.getRange(8,6,rewardLastRow-7,1).getValues();
  var rewardDollarAmounts = rewardSheet.getRange(8,9,rewardLastRow-7,1).getValues();
  var hashrates = rewardSheet.getRange(8,5,rewardLastRow-7,1).getValues();
  var poolHashrates = rewardSheet.getRange(8,4,rewardLastRow-7,1).getValues();
  var btcPrices = rewardSheet.getRange(8,10,rewardLastRow-7,1).getValues();
  var rewardDatesLength = rewardDates.length;
  var minedBTC = 0;
  var minedDollars = 0;
  var minedBlocks = 0;
  var userHashArray = [];
  var poolHashArray = [];
  var priceArray = [];
  const average = (array) => array.reduce((a, b) => a + b) / array.length;
  var taxRate = controlSheet.getRange(4,2).getValue();
  for (var i = 0; i < rewardDatesLength; i++) {
    var dateValue = Utilities.formatDate(new Date(rewardDates[i]), "GMT", "MM/dd/yyyy");
    if (lastDailyDate == dateValue) {
      var minedBTC = minedBTC + +rewardAmounts[i];
      var minedDollars = minedDollars + +rewardDollarAmounts[i];
      var minedBlocks = minedBlocks + 1;
      userHashArray.push(+hashrates[i]);
      poolHashArray.push(+poolHashrates[i]);
      priceArray.push(+btcPrices[i]);
    }
  }
  if (minedBlocks > 0) {
    var incomeTax = minedDollars * taxRate;
    dailySheet.getRange(20,2).setValue(minedBlocks);
    dailySheet.getRange(20,3).setValue(minedBTC);
    if (minedDollars >= 1000) {
      dailySheet.getRange(20,4).setNumberFormat("$0,000.00").setValue(minedDollars);
    } else {
      dailySheet.getRange(20,4).setNumberFormat("$0.00").setValue(minedDollars);
    }
    dailySheet.getRange(20,5).setNumberFormat("$0.00").setValue(incomeTax);
    dailySheet.getRange(20,7).setNumberFormat("$0.00").setValue(minedDollars - incomeTax - dailyOpEx);
    if (average(userHashArray) >= 1000) {
      dailySheet.getRange(20,8).setNumberFormat("0,000.0").setValue(average(userHashArray));
    } else {
      dailySheet.getRange(20,8).setNumberFormat("0.0").setValue(average(userHashArray));
    }
    dailySheet.getRange(20,9).setNumberFormat("0,000").setValue(average(poolHashArray));
    dailySheet.getRange(20,10).setNumberFormat("$0,000.00").setValue(average(priceArray));
  }
}

function setNewDailyDates() {
  var rewardLastRow = rewardSheet.getLastRow();
  var rewardDates = rewardSheet.getRange(8,2,rewardLastRow-7,1).getValues();
  var rewardDatesLength = rewardDates.length;
  var datesArray = [];
  for (var i = 0; i < rewardDatesLength; i++) {
    var dateValue = Utilities.formatDate(new Date(rewardDates[i]), "GMT", "MM/dd/yyyy");
    datesArray.push(dateValue);
  }
  var distDatesArray = Array.from(new Set(datesArray));
  var distDatesArrayLength = distDatesArray.length;
  for (var i = 0; i < distDatesArrayLength; i++) {
    dailySheet.getRange(20+i,1).setValue(distDatesArray[i]); // set dates
  }
  var minedBTCValues = rewardSheet.getRange(8,2,rewardLastRow-7,9).getValues();
  var minedBTCValuesLength = minedBTCValues.length;
  var minedBTCValuesArray = [];
  for (var i = 0; i < minedBTCValuesLength; i++) {
    var cleanDate = Utilities.formatDate(new Date(minedBTCValues[i][0]), "GMT", "MM/dd/yyyy");
    var ogDate = minedBTCValues[i][0];
    var month = ogDate.getMonth();
    var year = ogDate.getFullYear();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    minedBTCValuesArray.push(minedBTCValues[i].concat(cleanDate, daysInMonth));
  }
  var taxRate = controlSheet.getRange(4,2).getValue();
  var opEx = controlSheet.getRange(3,2).getValue();
  const average = (array) => array.reduce((a, b) => a + b) / array.length;
  for (var i = 0; i < distDatesArrayLength; i++) {
    var dailyDate = Utilities.formatDate(new Date(dailySheet.getRange(20 + i,1).getValue()), "GMT", "MM/dd/yyyy");
    var minedBTCArray = [];
    var minedDollarsArray = [];
    var blocksMinedArray = [];
    var hashrateArrary = [];
    var poolHashArrary = [];
    var btcPriceArray = [];
    var opExArray = [];
    for (var j = 0; j < minedBTCValuesLength; j++) {
      var rewardDate = minedBTCValuesArray[j][9];
      if (rewardDate == dailyDate) {
        minedBTCArray.push(minedBTCValuesArray[j][4]);
        minedDollarsArray.push(minedBTCValuesArray[j][7]);
        blocksMinedArray.push(1);
        hashrateArrary.push(minedBTCValuesArray[j][3]);
        poolHashArrary.push(minedBTCValuesArray[j][2])
        btcPriceArray.push(minedBTCValuesArray[j][8]);
        opExArray.push(minedBTCValuesArray[j][10])
      }
    }
    var dailyValue = minedDollarsArray.reduce((partialSum, a) => partialSum + a, 0);
    var dailyTax = minedDollarsArray.reduce((partialSum, a) => partialSum + a, 0) * taxRate;
    var dailyOpEx = opEx / average(opExArray);
    dailySheet.getRange(20+i,2).setValue(blocksMinedArray.reduce((partialSum, a) => partialSum + a, 0));
    dailySheet.getRange(20+i,3).setNumberFormat("0.00000000").setValue(minedBTCArray.reduce((partialSum, a) => partialSum + a, 0));
    if (dailyValue >= 1000) {
      dailySheet.getRange(20+i,4).setNumberFormat("$0,000.00").setValue(dailyValue);
    } else {
      dailySheet.getRange(20+i,4).setNumberFormat("$0.00").setValue(dailyValue);
    }
    dailySheet.getRange(20+i,4).setNumberFormat("$0.00").setValue(dailyValue);
    dailySheet.getRange(20+i,5).setNumberFormat("$0.00").setValue(dailyTax);
    dailySheet.getRange(20+i,6).setNumberFormat("$0.00").setValue(dailyOpEx);
    dailySheet.getRange(20+i,7).setNumberFormat("$0.00").setValue(dailyValue - dailyTax - dailyOpEx);
    if (average(hashrateArrary) >= 1000) {
      dailySheet.getRange(20+i,8).setNumberFormat("0,000.0").setValue(average(hashrateArrary));
    } else {
      dailySheet.getRange(20+i,8).setNumberFormat("0.0").setValue(average(hashrateArrary));
    }
    dailySheet.getRange(20+i,8).setNumberFormat("0.0").setValue(average(hashrateArrary));
    dailySheet.getRange(20+i,9).setNumberFormat("0,000").setValue(average(poolHashArrary));
    dailySheet.getRange(20+i,10).setNumberFormat("$0,000.00").setValue(average(btcPriceArray));
  }
}

function setMonthData() {
  var lastMonthDate = Utilities.formatDate(new Date(monthlySheet.getRange(20,1).getValue()), "GMT", "yyyy-MM");
  var rewardLastRow = rewardSheet.getLastRow();
  var rewardDates = rewardSheet.getRange(8,2,rewardLastRow-7,1).getValues();
  var rewardAmounts = rewardSheet.getRange(8,6,rewardLastRow-7,1).getValues();
  var rewardDollarAmounts = rewardSheet.getRange(8,9,rewardLastRow-7,1).getValues();
  var hashrates = rewardSheet.getRange(8,5,rewardLastRow-7,1).getValues();
  var poolHashrates = rewardSheet.getRange(8,4,rewardLastRow-7,1).getValues();
  var btcPrices = rewardSheet.getRange(8,10,rewardLastRow-7,1).getValues();
  var rewardDatesLength = rewardDates.length;
  var minedBTC = 0;
  var minedDollars = 0;
  var minedBlocks = 0;
  var userHashArray = [];
  var poolHashArray = [];
  var priceArray = [];
  const average = (array) => array.reduce((a, b) => a + b) / array.length;
  var opEx = controlSheet.getRange(3,2).getValue();
  var taxRate = controlSheet.getRange(4,2).getValue();
  for (var i = 0; i < rewardDatesLength; i++) {
    var dateValue = Utilities.formatDate(new Date(rewardDates[i]), "GMT", "yyyy-MM");
    if (lastMonthDate == dateValue) {
      var minedBTC = minedBTC + +rewardAmounts[i];
      var minedDollars = minedDollars + +rewardDollarAmounts[i];
      var minedBlocks = minedBlocks + 1;
      userHashArray.push(+hashrates[i]);
      poolHashArray.push(+poolHashrates[i]);
      priceArray.push(+btcPrices[i]);
    }
  }
  if (minedBlocks > 0) {
    var incomeTax = minedDollars * taxRate;
    monthlySheet.getRange(20,2).setValue(minedBlocks); // set number of blocks mined
    monthlySheet.getRange(20,3).setValue(minedBTC); // set mined btc
    monthlySheet.getRange(20,6).setValue(opEx); // set OpEx
    if (minedDollars > 1000) {
      monthlySheet.getRange(20,4).setNumberFormat("$0,000.00").setValue(minedDollars) // set mined USD value
    } else {
      monthlySheet.getRange(20,4).setNumberFormat("$0.00").setValue(minedDollars)
    }
    if (incomeTax >= 1000) {
      monthlySheet.getRange(20,5).setNumberFormat("$0,000.00").setValue(incomeTax); // set income tax
    } else {
      monthlySheet.getRange(20,5).setNumberFormat("$0.00").setValue(incomeTax);
    }
    if (minedDollars - incomeTax - opEx >= 1000) {
      monthlySheet.getRange(20,7).setNumberFormat("$0,000.00").setValue(minedDollars - incomeTax - opEx); // set net income
    } else {
      monthlySheet.getRange(20,7).setNumberFormat("$0.00").setValue(minedDollars - incomeTax - opEx);
    }
    if (average(userHashArray) >= 1000) {
      monthlySheet.getRange(20,8).setNumberFormat("0,000.0").setValue(average(userHashArray)); // set average hashrate
    } else {
      monthlySheet.getRange(20,8).setNumberFormat("0.0").setValue(average(userHashArray));
    }
    monthlySheet.getRange(20,9).setNumberFormat("0,000").setValue(average(poolHashArray)); // set pool hash
    monthlySheet.getRange(20,10).setNumberFormat("$0,000.00").setValue(average(priceArray)); // set average BTC price
  }

}


function setNewMonthlyDates() {
  var rewardLastRow = rewardSheet.getLastRow();
  var rewardDates = rewardSheet.getRange(8,2,rewardLastRow-7,1).getValues();
  var rewardDatesLength = rewardDates.length;
  var monthArray = [];
  for (var i = 0; i < rewardDatesLength; i++) {
    var monthValue = Utilities.formatDate(new Date(rewardDates[i]), "GMT", "yyyy-MM");
    monthArray.push(monthValue);
  }
  var distMonthsArray = Array.from(new Set(monthArray));
  var distMonthsArrayLength = distMonthsArray.length;
  for (var i = 0; i < distMonthsArrayLength; i++) {
    monthlySheet.getRange(20+i,1).setValue(distMonthsArray[i]); // set months
  }
  var minedBTCValues = rewardSheet.getRange(8,2,rewardLastRow-7,9).getValues();
  var minedBTCValuesLength = minedBTCValues.length;
  var minedBTCValuesArray = [];
  for (var i = 0; i < minedBTCValuesLength; i++) {
    var cleanDate = Utilities.formatDate(new Date(minedBTCValues[i][0]), "GMT", "yyyy-MM");
    minedBTCValuesArray.push(minedBTCValues[i].concat(cleanDate));
  }
  var taxRate = controlSheet.getRange(4,2).getValue();
  var opEx = controlSheet.getRange(3,2).getValue();
  const average = (array) => array.reduce((a, b) => a + b) / array.length;

  for (var i = 0; i < distMonthsArrayLength; i++) {
    var dailyDate = Utilities.formatDate(new Date(monthlySheet.getRange(20 + i,1).getValue()), "GMT", "yyyy-MM");
    var minedBTCArray = [];
    var minedDollarsArray = [];
    var blocksMinedArray = [];
    var hashrateArrary = [];
    var poolHashArrary = [];
    var btcPriceArray = [];
    var opExArray = [];
    for (var j = 0; j < minedBTCValuesLength; j++) {
      var rewardDate = minedBTCValuesArray[j][9];
      if (rewardDate == dailyDate) {
        minedBTCArray.push(minedBTCValuesArray[j][4]);
        minedDollarsArray.push(minedBTCValuesArray[j][7]);
        blocksMinedArray.push(1);
        hashrateArrary.push(minedBTCValuesArray[j][3]);
        poolHashArrary.push(minedBTCValuesArray[j][2])
        btcPriceArray.push(minedBTCValuesArray[j][8]);
        opExArray.push(minedBTCValuesArray[j][10])
      }
    }
    var dailyValue = minedDollarsArray.reduce((partialSum, a) => partialSum + a, 0);
    var dailyTax = minedDollarsArray.reduce((partialSum, a) => partialSum + a, 0) * taxRate;
    monthlySheet.getRange(20+i,2).setValue(blocksMinedArray.reduce((partialSum, a) => partialSum + a, 0));
    monthlySheet.getRange(20+i,3).setNumberFormat("0.00000000").setValue(minedBTCArray.reduce((partialSum, a) => partialSum + a, 0));
    if (dailyValue >= 1000) {
      monthlySheet.getRange(20+i,4).setNumberFormat("$0,000.00").setValue(dailyValue)
    } else {
      monthlySheet.getRange(20+i,4).setNumberFormat("$0.00").setValue(dailyValue)
    }
    if (dailyTax >= 1000) {
      monthlySheet.getRange(20+i,5).setNumberFormat("$0,000.00").setValue(dailyTax);
    } else {
      monthlySheet.getRange(20+i,5).setNumberFormat("$0.00").setValue(dailyTax);
    }
    if (opEx >= 1000) {
      monthlySheet.getRange(20+i,6).setNumberFormat("$0,000.00").setValue(opEx);
    } else {
      monthlySheet.getRange(20+i,6).setNumberFormat("$0.00").setValue(opEx);
    }
    if (dailyValue - dailyTax - opEx >= 1000) {
      monthlySheet.getRange(20+i,7).setNumberFormat("$0,000.00").setValue(dailyValue - dailyTax - opEx);
    } else {
      monthlySheet.getRange(20+i,7).setNumberFormat("$0.00").setValue(dailyValue - dailyTax - opEx);
    }
    if (average(hashrateArrary) >= 1000) {
      monthlySheet.getRange(20+i,8).setNumberFormat("0,000.0").setValue(average(hashrateArrary));
    } else {
      monthlySheet.getRange(20+i,8).setNumberFormat("0.0").setValue(average(hashrateArrary));
    }
    monthlySheet.getRange(20+i,9).setNumberFormat("0,000").setValue(average(poolHashArrary));
    monthlySheet.getRange(20+i,10).setNumberFormat("$0,000.00").setValue(average(btcPriceArray));
  }
}
