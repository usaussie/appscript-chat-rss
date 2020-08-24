/*
* CONFIGURE DEBUG, YOUR CHAT ROOM WEBHOOK URL, AND YOUR ARRAY OF FEEDS TO CHECK
*/

// When DEBUG is set to true, the topic is not actually posted to the room
var DEBUG = false;

// [0] => Webhook URL
// [1] => Feed Name
// [2] => Feed URL
// [3] => Feed Image/Logo URL
var FEED_URL_ARRAY = [
    [ 
      "<web hook url for room A>",
      "Box", 
      "https://status.box.com/history.rss", 
      "https://logodix.com/logo/759466.png",
    ],
    [ 
      "<web hook url for room B>",
      "Another Service", 
      "https://another.service.com/feed/", 
      "https://another.service.com/logo.png"
    ]
];

/*
* DO NOT CHANGE ANYTHING BELOW THIS LINE
*/

// loop through all the feeds in the array above
function fetch_all_feeds() {

  FEED_URL_ARRAY.forEach(function(thisFeed) {
    
      fetchNews(thisFeed[0], thisFeed[1], thisFeed[2], thisFeed[3]);
    
  });

}

// fetch a feed, and send any new events through to the associated Chat room
function fetchNews(WEBHOOK_URL, FEED_NAME, FEED_URL, FEED_LOGO_URL) {
  
  var lastUpdate = new Date(parseFloat(PropertiesService.getScriptProperties().getProperty("lastUpdate")) || 0);

  Logger.log("Last update: " + lastUpdate);
  
  Logger.log("Fetching '" + FEED_NAME + "'...");
  Logger.log("URL '" + FEED_URL + "'...");
  Logger.log("LOGO '" + FEED_LOGO_URL + "'...");
  
  var xml = UrlFetchApp.fetch(FEED_URL).getContentText();
  var document = XmlService.parse(xml);
    
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
      Logger.log("------ " + (i+1) + "/" + items.length + " ------");
      Logger.log(pubDate);
      Logger.log(title);
      Logger.log(link);
      // Logger.log(description);
      Logger.log("--------------------");
    }

    // check to make sure the feed event is after the last time we ran the script
    if(pubDate.getTime() > lastUpdate.getTime()) {
      Logger.log("Logging Event - Title: " + title + " | Date: " + eventDate + " | Link: " + link);
      if(!DEBUG){
        postTopicAsCard_(WEBHOOK_URL, FEED_NAME, FEED_URL, FEED_LOGO_URL, title, eventDate, link);
      }
      PropertiesService.getScriptProperties().setProperty("lastUpdate", pubDate.getTime());
      count++;
    }
  }
  
  Logger.log("--> " + count + " item(s) posted");
}

// quick function to take the info, send it to create a card, and then post the card.
function postTopicAsCard_(webhook_url, feed_name, feed_url, feed_logo_url, card_title, card_subtitle, card_link) {
  
  var card_json = createCardJson(feed_name, feed_url, feed_logo_url, card_title, card_subtitle, card_link);

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
function createCardJson(feed_name, feed_url, feed_logo_url, card_title, card_subtitle, card_link) {
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
