// set variables for environment
var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
var path = require('path');
var scraper = require('./scripts/scraper');
var http = require('http');

var url_requests;
var request_counter;
var error_flag;
var year_frequency = {older : 0
                    , seventies : 0
                    , eighties : 0
                    , nineties : 0
                    , modern : 0 };
var genre_frequency = {hip : 0
                     , dance : 0
                     , rock : 0
                     , soul : 0
                     , jazz: 0
                     , reggae : 0
                     , country : 0
                     , world : 0
                     , soundtrack : 0
                     , classical : 0
                     , spoken : 0
                     , easy : 0
                     , gospel : 0
                     , other: 0 };


//  routes
app.get('/', function(req, res) {
  res.render('index');
});

app.get('/years/:artist', function(req, res) {
  request_counter = 0;
  error_flag = false;
  get_urls_to_songs_from_artist(req.params.artist, "years", res);
});

app.get('/genres/:artist', function(req, res) {
  request_counter = 0;
  get_urls_to_songs_from_artist(req.params.artist, "genres", res);
});

// views as directory for all template files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// instruct express to server up static assets
app.use(express.static('public'));

// set server port
app.listen(process.env.PORT || 4000);
console.log('magic happens on port 4000');
exports = module.exports = app;

var get_urls_to_songs_from_artist = function (artist, option, res) {
	artist = artist.split('+').join(' ');
  artist = toTitleCase(artist);
	artist = artist.split(' ').join('-');
	url = 'http://www.whosampled.com/' + artist + '/';
  url_requests = 0;

	callback = function(response) {
    sleep(500); // so it doesn't think I'm scraping
		var str;
		response.on('data', function(html) {
  		str += html;
		});

		response.on('end', function() {
			var $ = cheerio.load(str);

      var track_list = $('.trackList').children('.trackItem').children('.trackItemHead').children('.trackName').children('a');
      if (track_list.html() == null) {
        console.log("ERROR: 404 A");
        if (!error_flag) res.send('Error 404: No Artist Found');
        error_flag = true;
      }

      url_requests += track_list.length;
      console.log("url_requests " + url_requests);
      track_list.each(function() {
        var data = $(this).attr('href');
        data = 'http://www.whosampled.com' + data;
        if (option == "years") {
          get_years_from_songs(data, res);
        } else {
          get_genres_from_songs(data, res);
        }
      })
		})
	}

  var url_changed = url;
  for (var x = 1; x <= 4; x++) {
    if (x != 1) {
      url_changed = url + "?sp=" + x;
    }
    console.log(url_changed);
    var req = http.request(url_changed, callback);
    req.end();
  }
}

var get_genres_from_songs = function(url, res) {
	callback = function(response) {
		var str;
  		response.on('data', function(html) {
	  		str += html;
  		});

  		response.on('end', function() {
        request_counter++;
        console.log("request_counter " + request_counter);
        console.log("url_requests " + url_requests);
  			var $ = cheerio.load(str);

  			var check = $('.sectionHeader').first().text();
        if (check.indexOf('Contains') > -1) {
    			var data = $('.list').first();
    			
          data.children('li').each(function() {
    				var genre = $(this).children('.trackDetails').children('.trackBadge').children('.bottomItem').text();
            genre = genre.trim();
            store_genre_frequency(genre);
            console.log(genre);
    			});
        }

        if (request_counter == url_requests) {
          console.log(genre_frequency);
          res.json(genre_frequency);
        } else if (request_counter == 0) {
          console.log('ERROR: 404 B');
          if (!error_flag) res.send('Error 505: No Samples Found');
          error_flag = true;
        }
  		});
  	}

  var req = http.request(url, callback);
	req.end();
}

var get_years_from_songs = function(url, res) {
	callback = function(response) {
		var str;
		response.on('data', function(html) {
  		str += html;
		});

		response.on('end', function() {
      request_counter++;
      console.log("request_counter " + request_counter);
      console.log("url_requests " + url_requests);
			var $ = cheerio.load(str);

			var check = $('.sectionHeader').first().text();

      if (check.indexOf('Contains') > -1) {
        var data = $('.list').first();
      
        data.children('li').each(function() {
          var artist_year_raw = $(this).children('.trackDetails').children('.trackArtist').text();
          var year = artist_year_raw.slice(-9);
          year = stripNonNumbers(year);
          year = Number(year);
          store_year_frequency(year);
          console.log(year);
        });
      }

      if (request_counter == url_requests) {
        console.log(year_frequency);
        res.json(year_frequency);
      } else if (request_counter == 0) {
        console.log('ERROR: 404 B');
        if (!error_flag) res.send('Error 505: No Samples Found');
          error_flag = true;
      }
		});
	}

  var req = http.request(url, callback);
	req.end();
}

var store_year_frequency = function(year) {
  if (year <= 1969) {
    year_frequency.older++;
  } else if (year >= 1970 && year < 1980) {
    year_frequency.seventies++;
  } else if (year >= 1980 && year < 1990) {
    year_frequency.eighties++;
  } else if (year >= 1990 && year < 2000) {
    year_frequency.nineties++;
  } else {
    year_frequency.modern++;
  }
}

var store_genre_frequency = function(genre) {
  switch(genre) {
    case "Hip-Hop / R&B":
      genre_frequency.hip++;
      break;
    case "Electronic / Dance":
      genre_frequency.dance++;
      break;
    case "Rock / Pop":
      genre_frequency.rock++;
      break;
    case "Jazz / Blues":
      genre_frequency.jazz++;
    case "Reggae":
      genre_frequency.reggae++;
      break;
    case "Country / Folk":
      genre_frequency.country++;
      break;
    case "World":
      genre_frequency.world++;
      break;
    case "Soundtrack":
      genre_frequency.soundtrack++;
      break;
    case "Classical":
      genre_frequency.classical++;
      break;
    case "Spoken Word": 
      genre_frequency.spoken++;
      break;
    case "Easy Listening":
      genre_frequency.easy++;
      break;
    case "Gospel": 
      genre_frequency.gospel++;
      break;
    default:
      genre_frequency.other++;
  }
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function stripNonNumbers(str) {
	return str.replace(/\D/g,'');
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}