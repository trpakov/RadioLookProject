'use strict';

// Required modules
var express = require('express');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');

var dataHandler = require('./dataHandler');
var htmlConstructor = require('./htmlConstructor');

// Create the main express application
var app = express();

// JSON parser (used by express)
var jsonParser = bodyParser.json();

// Use a favicon
app.use(favicon(__dirname + '/assets/favicon.ico'));
app.use(express.static(__dirname + '/public/'));

// Handle index page GET request
app.get('/', function (req, res) {
	htmlConstructor.constructHTML('/index.html', res);
});

// Handle service status AJAX GET request
app.get('/getServiceStatus', function (req, res) {
		dataHandler.getServiceStatus(res);
});

// Handle About page GET request
app.get('/about', function (req, res) {
	htmlConstructor.constructHTML('/about.html', res);
});

// Handle radios table page GET request
app.get('/radios', function (req, res) {
	htmlConstructor.constructHTML('/radioList.html', res);
});

// Handle Feedback page GET request
app.get('/feedback', function (req, res) {
	htmlConstructor.constructHTML('/feedback.html', res);
});

// Handle feedback page AJAX POST request (containing user feedback)
app.post('/feedback', jsonParser, function (req, res) {
	dataHandler.processFeedback(req.body);
	res.send();
});

// Handle individual radio page AJAX POST request for loading more songs
app.post(new RegExp('loadMoreSongs'), jsonParser, async function (req, res) {
	// Get radio token
	var token = req.url.match(/(?<=radio\/).+(?=\/load)/);
	var result = await dataHandler.loadMoreSongs(token[0], req.body);
	res.send(result);
});

// Handle individual radio page AJAX GET request for updating current song
app.get(new RegExp('updateCurrentSong'), function (req, res) {
	// Get radio token
	var token = req.url.match(/(?<=radio\/).+(?=\/update)/);
	res.send(dataHandler.updateCurrentSong(token));
})

// Handle individual radio page GET request
app.get(new RegExp('^/radio/(.+)$'), function (req, res) {

	var radioNames = dataHandler.getRadioNames();
	var pageName = req.params['0'];
	var validURL = false;

	if (pageName.slice(-1) == '/') pageName = pageName.slice(0, -1);

	// Find which radio page the request comes from
	radioNames.forEach(x => { if (x['token'] == pageName) validURL = true; });

	if (!validURL) {
		// If no such radio, send error response
		res.status(404).send('Error 404: Not Found!');
		return;
	}

	htmlConstructor.constructHTML('/radioPage.html', res, pageName);
});

// For all other requests send error response
app.use('*', function (req, res) {
	res.status(404).send('Error 404: Not Found!');
});

// Function that starts the server on the selected port
app.listen(3000, function () {
	console.log('RadioLook Server Started');

	// Execute getData function every minute
	setInterval(dataHandler.getData, 60000);
});