/*
* CONFIGURE DEBUG, YOUR CHAT ROOM WEBHOOK URL, AND YOUR ARRAY OF FEEDS TO CHECK
*/

// When DEBUG is set to true, the topic is not actually posted to the room
var DEBUG = false;

// URL to a google sheet you have permissions to
// Columns MUST be in this order: 
// feed_name {STRING)}
// feed_url (URL)
// feed_type (RSS or ATOM)
// feed_logo (URL)
// webhook_url (URL)
// status (STRING) - active | disabled
var GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/your-sheet-id/edit";
var GOOGLE_SHEET_TAB_NAME = "feed_data";
var RESET_LAST_LOOKUP_TIME = 'Fri Dec 10 00:00:00 GMT-05:00 2021';  // Format: Fri Dec 10 14:37:12 GMT-05:00 2021

/*
* DO NOT CHANGE ANYTHING BELOW THIS LINE
*/

// only use this if you want to reset the time back to the specified time
function job_reset_last_lookup_time() {
  Logger.log(PropertiesService.getScriptProperties().getProperty("lastUpdate"));
  PropertiesService.getScriptProperties().setProperty("lastUpdate", new Date(RESET_LAST_LOOKUP_TIME).getTime());
  Logger.log(PropertiesService.getScriptProperties().getProperty("lastUpdate"));
}

// loop through all the filtered rows (the active ones)
function job_fetch_all_feeds() {

  var all_sheet_rows = SpreadsheetApp.openByUrl(GOOGLE_SHEET_URL).getSheetByName(GOOGLE_SHEET_TAB_NAME).getDataRange().getValues();

  var filteredRows = all_sheet_rows.filter(function(row){
    if (row[5] === 'active') {
      return row;
    }
  });

  filteredRows.forEach(function(row, index) {
    
      fetchNews_(row[0], row[1], row[2], row[3], row[4]);

  });

}

// fetch a feed, and send any new events through to the associated Chat room
function fetchNews_(FEED_NAME, FEED_URL, FEED_TYPE, FEED_LOGO_URL, WEBHOOK_URL) {
  
  var lastUpdate = new Date(parseFloat(PropertiesService.getScriptProperties().getProperty("lastUpdate")) || 0);

  Logger.log("Last update: " + lastUpdate);
  
  Logger.log("Fetching '" + FEED_NAME + "'...");
  
  var xml = UrlFetchApp.fetch(FEED_URL).getContentText();
  var document = XmlService.parse(xml);
  
  if(FEED_TYPE == "RSS") {

    Logger.log("RSS Feed being parsed - " + FEED_NAME);

    var items = document.getRootElement().getChild('channel').getChildren('item').reverse();
    
    Logger.log(items.length + " entrie(s) found");
    
    var count = 0;
    
    for (var i = 0; i < items.length; i++) {
      
      var pubDate = new Date(items[i].getChild('pubDate').getText());
      var title = items[i].getChild("title").getText();
      var description = items[i].getChild("description").getText();
      var link = items[i].getChild("link").getText();
      var eventDate = items[i].getChild("pubDate").getText();
      
      if(DEBUG){
        Logger.log(pubDate);
        Logger.log(pubDate.getTime());
        Logger.log(title);
        Logger.log(link);
        // Logger.log(description);
        Logger.log("--------------------");
      }

      // check to make sure the feed event is after the last time we ran the script
      if(pubDate.getTime() > lastUpdate.getTime()) {
        //Logger.log("Logging Event - Title: " + title + " | Date: " + eventDate + " | Link: " + link);
        if(!DEBUG){
          postTopicAsCard_(WEBHOOK_URL, FEED_NAME, FEED_URL, FEED_LOGO_URL, title, eventDate, link);
        }
        PropertiesService.getScriptProperties().setProperty("lastUpdate", pubDate.getTime());
        Logger.log('Last Update Setting to...');
        Logger.log(PropertiesService.getScriptProperties().getProperty("lastUpdate"));
        count++;
      }
    }

  } else {
    //must be ATOM then
    Logger.log("ATOM Feed being parsed - " + FEED_NAME);

    var url = FEED_URL;
    var xml = UrlFetchApp.fetch(url).getContentText();
    var document = XmlService.parse(xml);
    var root = document.getRootElement();
    var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');

    var entries = root.getChildren('entry', atom);
    var count = 0;
    for (var i = 0; i < entries.length; i++) {
      var title = entries[i].getChild('title', atom).getText();
      var pubDate = new Date(entries[i].getChild('updated', atom).getText());
      var link = entries[i].getChild("link", atom).getAttribute('href').getValue();
      var eventDate = entries[i].getChild("updated", atom).getText();

      if(DEBUG){
        Logger.log(pubDate);
        Logger.log(pubDate.getTime());
        Logger.log(title);
        Logger.log(link);
        // Logger.log(description);
        Logger.log("--------------------");
      }

      // check to make sure the feed event is after the last time we ran the script
      if(pubDate.getTime() > lastUpdate.getTime()) {
        //Logger.log("Logging Event - Title: " + title + " | Date: " + eventDate + " | Link: " + link);
        if(!DEBUG){
          postTopicAsCard_(WEBHOOK_URL, FEED_NAME, FEED_URL, FEED_LOGO_URL, title, eventDate, link);
        }
        PropertiesService.getScriptProperties().setProperty("lastUpdate", pubDate.getTime());
        Logger.log('Last Update Setting to...');
        Logger.log(PropertiesService.getScriptProperties().getProperty("lastUpdate"));
        count++;
      }

    }

    Logger.log(entries.length + " entrie(s) found");
    Logger.log("--> " + count + " item(s) posted");
  }
  
}

// quick function to take the info, send it to create a card, and then post the card.
function postTopicAsCard_(webhook_url, feed_name, feed_url, feed_logo_url, card_title, card_subtitle, card_link) {
  
  var card_json = createCardJson_(feed_name, feed_url, feed_logo_url, card_title, card_subtitle, card_link);

  // set options for what will be sent to Chat according to documentation
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify(card_json)
  };
  
  UrlFetchApp.fetch(webhook_url, options);
}

/**
 * Creates a card-formatted response.
  * @return {object} JSON-formatted response
 */
function createCardJson_(feed_name, feed_url, feed_logo_url, card_title, card_subtitle, card_link) {
  return {
    cards: [{
        "header": {
          "title": feed_name,
          "subtitle": feed_url,
          "imageUrl": feed_logo_url
        },
        sections: [{
          widgets: [{
            "keyValue": {
                "topLabel": "New Post",
                "content": card_title,
                "contentMultiline": "false",
                "bottomLabel": card_subtitle,
                "onClick": {
                      "openLink": {
                        "url": card_link
                      }
                  },
                "icon": "DESCRIPTION",
                "button": {
                    "textButton": {
                        "text": "LINK",
                        "onClick": {
                            "openLink": {
                                "url": card_link
                            }
                        }
                      }
                  }
              }
          }]
        }]
      }]
    };
}
