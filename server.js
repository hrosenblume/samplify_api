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
var res_sent;
var emptyArray = [];
var year_frequency = {older : []
                    , seventies : []
                    , eighties : []
                    , nineties : []
                    , modern : [] };
var genre_frequency = {hip : []
                     , dance : []
                     , rock : []
                     , soul : []
                     , jazz: []
                     , reggae : []
                     , country : []
                     , world : []
                     , soundtrack : []
                     , classical : []
                     , spoken : []
                     , easy : []
                     , gospel : []
                     , other: [] };
var samples_stored = [];


//  routes
app.get('/', function(req, res) {
  res.render('index');
});

app.get('/years/:artist', function(req, res) {
  year_frequency = {older : []
                  , seventies : []
                  , eighties : []
                  , nineties : []
                  , modern : [] };
  request_counter = 0;
  error_flag = false;
  get_urls_to_songs_from_artist(req.params.artist, "years", res);
});

app.get('/genres/:artist', function(req, res) {
  genre_frequency = {hip : []
                   , dance : []
                   , rock : []
                   , soul : []
                   , jazz: []
                   , reggae : []
                   , country : []
                   , world : []
                   , soundtrack : []
                   , classical : []
                   , spoken : []
                   , easy : []
                   , gospel : []
                   , other: [] };
  request_counter = 0;
  error_flag = false;
  get_urls_to_songs_from_artist(req.params.artist, "genres", res);
});

app.get('/samples/:song', function(req, res) {
  res_sent = false;
  request_counter = 0;
  samples_stored = [];
  error_flag = false;
  query_songs(req.params.song, res);
});

// views as directory for all template files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// instruct express to server up static assets
app.use(express.static('public'));

// set server port
app.listen(process.env.PORT || 4001);
console.log('magic happens on port 4001');
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
        if (!error_flag) res.send('Error 404');
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
            var title = $(this).children('.trackDetails').children('.trackName').attr('title');
            title = title.trim();
            store_genre_frequency(genre, title);
            console.log(genre);
    			});
        }

        if (request_counter == url_requests) {
          console.log(genre_frequency);
          res.json(genre_frequency);
        } else if (request_counter == 0) {
          console.log('ERROR: 404 B');
          if (!error_flag) res.send('Error 404');
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
          var title = $(this).children('.trackDetails').children('.trackName').attr('title');
          title = title.trim();
          year = stripNonNumbers(year);
          year = Number(year);
          store_year_frequency(year, title);
          console.log(year);
        });
      }

      if (request_counter == url_requests) {
        console.log(year_frequency);
        res.json(year_frequency);
      } else if (request_counter == 0) {
        console.log('ERROR: 404 B');
        if (!error_flag) res.send('Error 404');
        error_flag = true;
      }
		});
	}

  var req = http.request(url, callback);
	req.end();
}

var query_songs = function(song, res) {
  //http://www.whosampled.com/search/tracks/?q=
  sleep(500); 
  url_requests = 0;
  song = song.split('+').join('%20');
  url = 'http://www.whosampled.com/search/tracks/?q=' + song;
  callback = function(response) {
    var str;
    response.on('data', function(html) {
      str += html;
    });

    response.on('end', function() {
      var $ = cheerio.load(str);

      var list = $('.list');
      if (list.html() != null) {
        var link = list.children('li').first().children('.trackDetails').children('.trackName').attr('href');
        link = 'http://www.whosampled.com' + link;
        console.log(link);
        get_urls_and_initial_samples(link, res);
      } else {
        console.log('ERROR: 404 A');
        if (!error_flag) res.send('Error 404');
        error_flag = true;
      }
    })
  }

  var req = http.request(url, callback);
  req.end();
}

var get_urls_and_initial_samples= function(url, res) {
  callback = function(response) {
    var str;

    response.on('data', function(html) {
      str += html;
    });

    response.on('end', function() {
      var $ = cheerio.load(str);

      var check = $('.sectionHeader').first().text();
      if (check.indexOf('Contains') > -1) {
        var data = $('.list').first();
        url_requests += data.children('li').length;
        data.children('li').each(function() {
          var a_tag = $(this).children('.trackDetails').children('.trackName');
          var link = a_tag.attr('href');
          var title = a_tag.text();
          link = 'http://www.whosampled.com' + link;
          bypass_buffer_link(title, link, res);
        });
      }
    });
  }

  var req = http.request(url, callback);
  req.end();
}

var bypass_buffer_link = function(title, url, res) {
  callback = function(response) {
    var str;

    response.on('data', function(html) {
      str += html;
    });
    response.on('end', function() {
      var $ = cheerio.load(str);
      var link = $('.sampleTrackWrap.sampleTrackWrapRight');
      link = link.children('tbody').children('tr').first();
      link = link.children('td:nth-child(2)').children('.sampleTrackInfo');
      link = link.children('h1').children('.trackName').attr('href');
      link = 'http://www.whosampled.com' + link;
      get_samples_of_samples(title, link, res);
    });
  }

  var req = http.request(url, callback);
  req.end();
}

var get_samples_of_samples = function(original_title, url, res) {
  callback = function(response) {
    var str;

    response.on('data', function(html) {
      str += html;
    });

    response.on('end', function() {
      var $ = cheerio.load(str);
      var check = $('.sectionHeader').first().text();
      var title;
      if (check.indexOf('Contains') > -1) {
        var data = $('.list').first();
        data.children('li').each(function() {
          var a_tag = $(this).children('.trackDetails').children('.trackName');
          var link = a_tag.attr('href');
          title = a_tag.text();
          link = 'http://www.whosampled.com' + link;
          store_sample(original_title, title, res);
        });
      } else {
        store_sample(original_title, title, res);
      }
    console.log("URL REQUESTS: " + url_requests);
    console.log("REQUEST COUNTER: " + request_counter);
    });
  }

  var req = http.request(url, callback);
  req.end();
}

var store_sample = function (original_title, title, res) {
  var sample_exists = false;
  for (var x = 0; x < samples_stored.length; x++) {
    var list = samples_stored[x];
    console.log(list[0] + " ::: " + original_title);
    if (list[0] == original_title) {
      if (title != null) { 
        list[1][list[1].length] = title;
      }
      sample_exists = true;
    }
  }
  if (!sample_exists) {
    request_counter++;
    var list = [];
    list[0] = original_title
    list[1] = [];
    list[1][list[1].length] = title;
    //console.log(list);
    samples_stored[samples_stored.length] = list;
  }

  if (request_counter == url_requests) {
    console.log(samples_stored);
    if (!res_sent) {
      res.json(samples_stored);
      res_sent = true;
    }
    //error check
  }
}

var store_year_frequency = function(year, title) {
  if (year <= 1969) {
    year_frequency.older[year_frequency.older.length] = title;
  } else if (year >= 1970 && year < 1980) {
    year_frequency.seventies[year_frequency.seventies.length] = title;
  } else if (year >= 1980 && year < 1990) {
    year_frequency.eighties[year_frequency.eighties.length] = title;
  } else if (year >= 1990 && year < 2000) {
    year_frequency.nineties[year_frequency.nineties.length] = title;
  } else {
    year_frequency.modern[year_frequency.modern.length] = title;
  }
}

var store_genre_frequency = function(genre, title) {
  switch(genre) {
    case "Hip-Hop / R&B":
      genre_frequency.hip[genre_frequency.hip.length] = title;
      break;
    case "Electronic / Dance":
      genre_frequency.dance[genre_frequency.dance.length] = title;
      break;
    case "Rock / Pop":
      genre_frequency.rock[genre_frequency.rock.length] = title;
      break;
    case "Jazz / Blues":
      genre_frequency.jazz[genre_frequency.jazz.length] = title;
    case "Reggae":
      genre_frequency.reggae[genre_frequency.reggae.length] = title;
      break;
    case "Country / Folk":
      genre_frequency.country[genre_frequency.country.length] = title;
      break;
    case "World":
      genre_frequency.world[genre_frequency.world.length] = title;
      break;
    case "Soundtrack":
      genre_frequency.soundtrack[genre_frequency.soundtrack.length] = title;
      break;
    case "Classical":
      genre_frequency.classical[genre_frequency.classical.length] = title;
      break;
    case "Spoken Word": 
      genre_frequency.spoken[genre_frequency.spoken.length] = title;
      break;
    case "Easy Listening":
      genre_frequency.easy[genre_frequency.easy.length] = title;
      break;
    case "Gospel": 
      genre_frequency.gospel[genre_frequency.gospel.length] = title;
      break;
    default:
      genre_frequency.other[genre_frequency.other.length] = title;
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