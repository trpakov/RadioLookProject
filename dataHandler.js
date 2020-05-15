'use strict';

// Required modules
const http = require('http');
const jsdom = require('jsdom'); // Module for using DOM inside node.js
const fs = require('fs');

// Module to use async read and write to file functions with promises instead of callbacks 
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const sqlite3 = require('sqlite3'); // Main SQLite module
const { open } = require('sqlite'); // A wrapper library that adds ES6 promises 

// Database object
var dataBase;

// Function to open the database (runs at startup)
(async () => {
	try {
		dataBase = await open({
			filename: './radio_look.db',
			driver: sqlite3.Database,
			mode: sqlite3.OPEN_READWRITE
		})
	} catch (e) {
			// If database file not found, stop the server
			console.log('Database file "radiolook.db" not found in main directory');
			console.log('STOPPING THE SERVER');
			process.exit(1);
	}
	// get availabe radios info from the database
	await getRadioNamesFromDB();
	// Get data from the Icecast server
	getIcecastData();
	// get data from the metacast server
	getMetacastData();
})()

// Icecast page URL
const url = 'http://stream.radioreklama.bg/status.xsl';
// Metacast API URL
const songURL = 'http://meta.metacast.eu/?radio=';

// Object with access times
const accessTimes = { 'db-access-time': '', 'icecast-access-time': '', 'metacast-access-time': '' };

// Object with servers availability
const availability = { 'db': true, 'icecast': true, 'metacast': true };

// Array for radios info
const radioNames = [];

// Import URLs for external searches
const { YT_SEARCH_URL, GOOGLE_SEARCH_URL, GENIUS_LYRICS_SEARCH_URL, SPOTIFY_SEARCH_URL } = require('./htmlConstructor');

// Module for email sending
var nodemailer = require('nodemailer');
var mailInfo;

// Get tartget email and password
try { mailInfo = require('./secrets'); }
catch { console.log('Auth file not found, email sending is disabled') }

var transporter = nodemailer.createTransport({
	host: 'smtp.mail.bg',
	port: 465,
	secure: true,
	auth: {
		user: 'trpakov@mail.bg',
		pass: mailInfo === undefined ? '' : mailInfo.emailPassword
	},
	tls: { rejectUnauthorized: false }

});

// Function to get data from Icecast server
function getIcecastData() {

	// Update Icecast server access time
	accessTimes['icecast-access-time'] = new Date();

	// HTTP GET request
	http.get(url, (res) => {
		
		const statusCode = res.statusCode;

		// Erroe handling
		let error;

		if (statusCode != 200)
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);

		if (error) {
			console.error(error.message);
			// If an error occured, update availability accordingly
			availability['icecast'] = false;
			res.resume();
			return;
		}

		res.setEncoding('utf8');

		// Save response data
		let rawData = '';
		res.on('data', function (chunk) { rawData += chunk; });
		res.on('end', function () {

			try {
				console.log('GETTING ICECAST DATA');
				// When done, persist the data
				persistIcecastData(rawData);
			} catch (e) {
				console.error(e.message);
			}

			// Update Icecast server availability
			availability['icecast'] = true;			
			
		});
	}).on('error', e => {
		// If an error occured, update availability accordingly
		availability['icecast'] = false;
		console.error(e.message);
	});

}

// Function to get data from Metacast server
async function getMetacastData() {
	var token;

	// Update Metacast server access time

	accessTimes['metacast-access-time'] = new Date();
	// Update database access time
	accessTimes['db-access-time'] = new Date();

	// Console log radio objects (for test purposes)
	console.log(radioNames);

	// Get all available radio tokens and titles (excluding avtoradio)
	try {
		var rows = await dataBase.all('select token, stream_title from radio_info where token != \'avtoradio\';')

	} catch (e) {
		console.log(e);
		return;
	}

	// For each available radio
	rows.forEach(row => {

		token = row.token;

		if (token != null) {

			// Make HTTP GET request to the appropriate Metacast url
			http.get(songURL + token, (res) => {

				const statusCode = res.statusCode;

				// Error handling
				let error;

				if (statusCode != 200)
					error = new Error('Request Failed.\n' +
						`Status Code: ${statusCode}`);

				if (error) {
					console.error(error.message);
					// If an error occured, update availability accordingly
					availability['metacast'] = false;
					res.resume();
					return;
				}

				res.setEncoding('utf8');
				let rawData = '';

				// Save response data
				res.on('data', function (chunk) { rawData += chunk; });
				res.on('end', function () {
					try {
						// When done, persist the data
						persistMetacastData(rawData, row.token);
					} catch (e) {
						console.error(e.message);
					}

					// Update Metacast server availability
					availability['metacast'] = true;

				});
			}).on('error', e => {
				// If an error occured, update availability accordingly
				availability['metacast'] = false;
				console.error(e.message);
			});

		}
	});	

}

// Function to persist data from Icecast server into the databse
async function persistIcecastData(rawData) {

	// If no data is returned from the request
	if (rawData == '') {
		console.error("No data to persist.");
		return;
	}

	// Convert returned data into DOM object
	var dom = new jsdom.JSDOM(rawData);
	var mainDiv = dom.window.document.body.getElementsByClassName('main')[0];

	// Traverse every radio html element
	for (var i = 0; i < mainDiv.childElementCount - 1; i = i + 3) {
		var currentEntry = mainDiv.childNodes[i].childNodes[1].childNodes[1].firstChild;

		// Skip all radios that are not .acc streams (skipes different audio formats of the same radio)
		if (!/aac/.test(mainDiv.childNodes[i].childNodes[1].childNodes[0].childNodes[0].childNodes[2].firstChild.firstChild.firstChild.textContent)) continue;

		// Object to save current radio data
		var radioData = {};

		// Populate object with radio data
		if (currentEntry.childElementCount == 10) {
			radioData = {
				$streamTitle: currentEntry.firstChild.lastChild.textContent,
				$streamDescription: currentEntry.childNodes[1].lastChild.textContent,
				$currentListeners: parseInt(currentEntry.childNodes[5].lastChild.textContent),
				$peakListeners: parseInt(currentEntry.childNodes[6].lastChild.textContent),
				$streamGenre: currentEntry.childNodes[7].lastChild.textContent,
				$currentSong: currentEntry.childNodes[9].lastChild.textContent,
			}

			// If radio name is 'Avto Radio' persist the current song now. (Done because Avto Radio has no Metacast info)
			if (radioData['$streamTitle'] == 'Avto Radio') {
				if (radioData['$currentSong'] == 'Avto Radio - Авто Радио' || radioData['$currentSong'].split('-').length < 2) return;

				var artist = radioData['$currentSong'].split('-')[0].trim();
				var song = radioData['$currentSong'].split('-')[1].trim();

				if (radioNames.find(x => x['token'] == 'avtoradio')['artist_song'] != artist + ' - ' + song) {

					radioNames.find(x => x['token'] == 'avtoradio')['artist_song'] = artist + ' - ' + song;

					try {
						dataBase.run('insert into song_list(timestamp, artist, title, token) values(?, ?, ?, ?);', [(new Date()).valueOf(), artist, song, 'avtoradio']);
								
					} catch (e) {
						console.log(e);
					}
				}					
			}
		}
		else {
			radioData = {
				$streamTitle: currentEntry.firstChild.lastChild.textContent,
				$streamDescription: '',
				$currentListeners: parseInt(currentEntry.childNodes[4].lastChild.textContent),
				$peakListeners: parseInt(currentEntry.childNodes[5].lastChild.textContent),
				$streamGenre: currentEntry.childNodes[6].lastChild.textContent,
				$currentSong: currentEntry.childNodes[8].lastChild.textContent,
			}
		}

		// Console log radio object (for test purposes)
		console.log(radioData);

		// Update radio_info table with the new data
		try {
			dataBase.run('update radio_info set stream_description = $streamDescription, current_listeners = $currentListeners, peak_listeners = $peakListeners, stream_genre = $streamGenre, current_song = $currentSong where stream_title = $streamTitle;', radioData)

		} catch (e) {
			console.log(e);
		}
	}
}

// Function to persist data from Metacast server into the databse
async function persistMetacastData(rawData, token) {
	//if (rawData = '') return;

	// Convert data to JSON object
	let jsonData = JSON.parse(rawData.trim());

	// Make changes only if the song is different
	if (radioNames.find(x => x['token'] == token) ['artist_song'] != jsonData.current_artist + ' - ' + jsonData.current_song)
	{
		// Update radio info object
		radioNames.find(x => x['token'] == token)['artist_song'] = jsonData.current_artist + ' - ' + jsonData.current_song;
		radioNames.find(x => x['token'] == token)['image'] = jsonData.image;

		// Update database access time
		accessTimes['db-access-time'] = new Date();

		// Insert new song into song_list table
		try {
			dataBase.run('insert into song_list(timestamp, internal_id, artist, title, image, token) values(?, ?, ?, ?, ?, ?);', [(new Date()).valueOf(), jsonData.id, jsonData.current_artist, jsonData.current_song, jsonData.image, token]);
			accessTimes['db-access-time'] = new Date();
			availability['db'] = true;

		} catch (e) {
			console.log(e);
		}
	}
}

// Function to get last aceess time
function getAccessTimes() { return accessTimes; }

// Function to get servers availability
function getAvailability() { return availability; }

// Function to get database object
function getDataBase() { return dataBase; }

// Functio to load avaulable radios from the database (run on startup)
async function getRadioNamesFromDB() {

	// Get radio token, bg title, url and website from radio_info table
	try {
		var rows = await dataBase.all('select token, stream_title_bg, stream_url, website from radio_info;');
		rows.forEach(row => { radioNames.push({ 'token': row['token'], 'stream_title_bg': row['stream_title_bg'], 'stream_url': row['stream_url'], 'website':row['website'] }); });

		console.log('Database connection - SUCCESSFUL');
		accessTimes['db-access-time'] = new Date();
		//console.log(radioNames);

	} catch (e) {
		console.error(e);
	}
}

// Function that deals with user feedback AJAX POST request
function processFeedback(feedback) {

	// Save the message in the database
	try {
		dataBase.run('insert into user_feedback(timestamp, name, email, subject, message) values($timestamp, $name, $email, $subject, $message)', feedback);
	} catch (e) {
		console.log(e);
	}

	// If authentication info is available, use nodemailer module to send email to the administrator with the feedback message
	if (mailInfo === undefined) return;
	transporter.sendMail({
		from: '  <trpakov@mail.bg>',
		to: mailInfo.recieverEmail,
		subject: 'RadioLook - Feedback | ' + feedback['$name'] + ' | ' + feedback['$email'] + ' | ' + feedback['$subject'],
		text: feedback['$message']
	});
}

// Function that sends the new song on AJAX request
function updateCurrentSong(token) {

	// Find the correct radio
	var radioToUpdate = radioNames.find(x => x['token'] == token);

	// Return artist, song and cover image
	return {
		'artist_song': radioToUpdate['artist_song'], 'image': radioToUpdate['image'] != null ? radioToUpdate['image'] : '../cover.jpg'
	};
}

// Function that sends the previous n songs on AJAX request
async function loadMoreSongs(token, tableRows) {

	// Make database query from table with songs, get the previous n songs played on the current radio
	var rows;

	try {
		rows = await dataBase.all('select * from song_list where token == ? order by timestamp desc limit 10 offset ?;', token, tableRows.numberOfTableRows);
	} catch (e) {
		console.log(e);
		return { status: 'DB ACCESS ERROR' };
	}

	// If there are no more songs, send appropriate info message
	if (rows.length == 0) return { status: 'NO MORE DATA' };

	// Import songs table layout from html file and external website search html file
	var rowLayout, searchPopoverContent;
	
	try {
		rowLayout = await readFileAsync('views/songlistTableLayout.html', 'utf8');
		searchPopoverContent = await readFileAsync('views/searchPopoverContent.html', 'utf8');
	} catch (e) {
		console.log(e);
		return { status: 'FILE ACCESS ERROR' };
	}

	var rowLayoutDOM = new jsdom.JSDOM(rowLayout);
	var currentRow = rowLayoutDOM.window.document.querySelector('tr');
	var searchPopoverContentDOM = new jsdom.JSDOM(searchPopoverContent);
	var newRows = '';

	// Constrcut the table row for each databse record and append it to the html response
	rows.forEach(row => {		
		
		// Insert scraping time, song and artist name, cover
		currentRow.getElementsByClassName('date')[0].textContent = new Date(parseInt(row['timestamp'])).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
		currentRow.getElementsByClassName('cover-art')[0].setAttribute('src', row['image'] == null ? '../cover.jpg' : row['image']);
		currentRow.getElementsByClassName('artist')[0].textContent = row['artist'];
		currentRow.getElementsByClassName('song')[0].textContent = row['title'];

		// Modify the links to external sites using the current song
		searchPopoverContentDOM.window.document.getElementsByClassName('youtube-link1')[0].setAttribute('href', YT_SEARCH_URL + row['artist'] + '+' + row['title']);
		searchPopoverContentDOM.window.document.getElementsByClassName('google-link')[0].setAttribute('href', GOOGLE_SEARCH_URL + row['artist'] + '+' + row['title']);
		searchPopoverContentDOM.window.document.getElementsByClassName('genius-link')[0].setAttribute('href', GENIUS_LYRICS_SEARCH_URL + row['artist'] + '+' + row['title']);
		searchPopoverContentDOM.window.document.getElementsByClassName('spotify-link')[0].setAttribute('href', SPOTIFY_SEARCH_URL + row['artist'] + ' ' + row['title']);

		// Add the constructed html to the popUp element data-content atribute (Bootstrap)
		currentRow.getElementsByClassName('popupElement')[0].setAttribute('data-content', searchPopoverContentDOM.window.document.body.innerHTML);

		newRows += rowLayoutDOM.serialize();

	});

	// Return the response
	return newRows;
}

// Function that returns the array of objects with current radio info
function getRadioNames() {
	return radioNames;
}

// Function that calls the main getter functions together
function getData() {
	getIcecastData();
	getMetacastData();
}

// Function that sends server error status on AJAX request
function getServiceStatus(response) {

	var isEverythingOK = true;

	// If some of the servers is not availble, there is an error
	Object.keys(availability).forEach(x => {
		if (!availability[x]) isEverythingOK = false;
	});

	// Send status, availability and last access time
	if (isEverythingOK) {
		response.send(Object.assign({ status: 'OK' }, availability, accessTimes));
	}
	else {
		response.send(Object.assign({ status: 'ERROR' }, availability, accessTimes));
	}
}

// Exports (used in other files)
exports.getIcecastData = getIcecastData;
exports.getMetacastData = getMetacastData;
exports.getAccessTimes = getAccessTimes;
exports.getAvailability = getAvailability;
exports.getDataBase = getDataBase;
exports.getRadioNames = getRadioNames;
exports.getData = getData;
exports.processFeedback = processFeedback;
exports.updateCurrentSong = updateCurrentSong;
exports.loadMoreSongs = loadMoreSongs;
exports.getServiceStatus = getServiceStatus;