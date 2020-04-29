'use strict';
var http = require('http');
var jsdom = require('jsdom');
var bodyParser = require('body-parser');
var dataHandler = require('./dataHandler');
var htmlConstructor = require('./htmlConstructor');
var express = require('express');
var app = express();
var jsonParser = bodyParser.json();

var path = __dirname + '/views/';
var favicon = require('serve-favicon');

//var port = process.env.PORT || 1337;

//http.createServer(function (request, response) {

//	setInterval(dataHandler.getData, 180000);
	
//}).listen(port);

app.use(favicon(__dirname + '/assets/favicon.ico'));
app.use(express.static(__dirname + '/public/'));


app.get('/', function (req, res) {
	htmlConstructor.constructHTML('/index.html');
	res.sendFile(path + 'index.html');
});

app.get('/about', function (req, res) {
	htmlConstructor.constructHTML('/about.html');
	res.sendFile(path + 'about.html');
});

app.get('/radios', function (req, res) {
	htmlConstructor.constructHTML('/radioList.html');
	res.sendFile(path + 'radioList.html');
});

app.get('/feedback', function (req, res) {
	htmlConstructor.constructHTML('/feedback.html');
	res.sendFile(path + 'feedback.html');
});

app.post('/feedback', jsonParser, function (req, res) {
	console.log(req.body);
	dataHandler.processFeedback(req.body);
	res.send();

});

app.post(new RegExp('loadMoreSongs'), jsonParser, function (req, res) {

	var token = req.url.match(/(?<=radio\/).+(?=\/load)/);
	res.send(dataHandler.loadMoreSongs(token, req.body));

});

app.get(new RegExp('updateCurrentSong'), function (req, res) {

	var token = req.url.match(/(?<=radio\/).+(?=\/update)/);
	//console.log(token);
	res.send(dataHandler.updateCurrentSong(token));
})


app.get(new RegExp('^/radio/(.+)$'), function (req, res) {

	var radioNames = dataHandler.getRadioNames();
	var pageName = req.params['0'];
	var validURL = false;

	if (pageName.slice(-1) == '/') pageName = pageName.slice(0, -1);

	radioNames.forEach(x => { if (x['token'] == pageName) validURL = true; });

	if (!validURL) { //radioNames.indexOf(pageName) == -1
		res.send('Error 404: Not Found!');
		return;
	}

	htmlConstructor.constructHTML('/radioPage.html', pageName);
	res.sendFile(path + 'radioPage.html');
});


app.use('*', function (req, res) {
	res.send('Error 404: Not Found!');
});

app.listen(3000, function () {
	console.log('RadioLook listening on port 3000');
	dataHandler.getIcecastData();
	dataHandler.getMetacastData();

	setInterval(dataHandler.getData, 60000);
});