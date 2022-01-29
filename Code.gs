/**
 * @OnlyCurrentDoc
 */

var ss  = SpreadsheetApp.getActiveSpreadsheet();
var rewardSheet = ss.getSheetByName('Rewards');
var controlSheet = ss.getSheetByName('Control Panel');

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Control Board')
      .addItem('Refresh Slush Data', 'menuItem1')
      .addToUi();
  rewardSheet.getRange(7,1).activate();
}
function menuItem1() {
  getBlockData();
}

function getBlockData() {
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
    var cbDate = [[tickerJson.time]].toString(); // to parse coinbase date
    var cbDateParsed = new Date(cbDate.substring(0, 4), cbDate.substring(5, 7) - 1, cbDate.substring(8, 10), cbDate.substring(11, 13), cbDate.substring(14, 16), cbDate.substring(17, 19));
    var cbFormattedDate = Utilities.formatDate(cbDateParsed, "GMT-05:00", "MM/dd/yyyy HH:mm:ss");

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
    var cbDate = [[tickerJson.time]].toString(); // to parse coinbase date
    var cbDateParsed = new Date(cbDate.substring(0, 4), cbDate.substring(5, 7) - 1, cbDate.substring(8, 10), cbDate.substring(11, 13), cbDate.substring(14, 16), cbDate.substring(17, 19));
    var cbFormattedDate = Utilities.formatDate(cbDateParsed, "GMT-05:00", "MM/dd/yyyy HH:mm:ss");

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
  rewardSheet.getRange(3, 1).setValue(unconfirmedTotal);
  rewardSheet.getRange(5, 1).setValue(" # Blocks: " + unconfirmedBlocks);

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
    var dateValue = new Date(Utilities.formatDate(new Date(foundDates[i]), "GMT-08:00", "MM/dd/yyyy HH:mm:ss"));
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
  rewardSheet.getRange(3,3).setValue(twtyFourHourTotal);
  rewardSheet.getRange(5,3).setValue(" # Blocks: " + twtyFourHourBlocks);
  rewardSheet.getRange(3,5).setValue(yesterdayTotal);
  rewardSheet.getRange(5,5).setValue(" # Blocks: " + yesterdayBlocks);
  rewardSheet.getRange(3,7).setValue(lastWeekTotal);
  rewardSheet.getRange(5,7).setValue(" # Blocks: " + lastWeekBlocks);
  rewardSheet.getRange(3,9).setValue(twoWeeksAgoTotal);
  rewardSheet.getRange(5,9).setValue(" # Blocks: " + twoWeeksAgoBlocks);
  rewardSheet.getRange(2,12).setValue(lastThirtyDayTotal);
  rewardSheet.getRange(3,12).setValue(prevMonthTotal);
  rewardSheet.getRange(5,12).setValue(allTimeTotal);
  rewardSheet.getRange(1,1).setValue("Last Updated: " + utcDate + " UTC");
  triggerCheck();
}

function triggerCheck() {
  var triggerStatus = controlSheet.getRange(2,2).getValue();
  var triggers = ScriptApp.getScriptTriggers();
  if(triggerStatus == 'Off' && triggers.length > 0) {
    for (var i = 0; i < triggers.length; i++) {
     ScriptApp.deleteTrigger(triggers[i]);
    }
  } else if(triggerStatus == 'On' && triggers.length == 0) {
    ScriptApp.newTrigger("getBlockData")
      .timeBased()
      .everyHours(1)
      .create();
  }
}
