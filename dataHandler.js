const http = require('http');
const jsdom = require('jsdom');
//const sqlite3 = require('sqlite3').verbose();
const better_sqlite3 = require('better-sqlite3');
const fs = require('fs');

const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
	try {
		dataBase = await open({
			filename: './radio_look.db',
			driver: sqlite3.Database,
			mode: sqlite3.OPEN_READWRITE
		})
	} catch (e) {
			console.log('Database file "radiolook.db" not found in main directory');
			console.log('STOPPING THE SERVER');
			process.exit(1);
	}	
	await getRadioNamesFromDB();
	getIcecastData();
	getMetacastData();
})()

const url = 'http://stream.radioreklama.bg/status.xsl';
const songURL = 'http://meta.metacast.eu/?radio=';

var dataBase;

const accessTimes = { 'db-access-time': '', 'icecast-access-time': '', 'metacast-access-time': '' };
const availability = { 'db': true, 'icecast': true, 'metacast': true };
const radioNames = [];

const { YT_SEARCH_URL, GOOGLE_SEARCH_URL, GENIUS_LYRICS_SEARCH_URL, SPOTIFY_SEARCH_URL } = require('./htmlConstructor');

// Module for email sending
var nodemailer = require('nodemailer');
var mailInfo;
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

function getIcecastData() {
	accessTimes['icecast-access-time'] = new Date();

	http.get(url, (res) => {
		
		const statusCode = res.statusCode;

		let error;

		if (statusCode != 200)
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);

		if (error) {
			console.error(error.message);
			availability['icecast'] = false;
			res.resume();
			return;
		}

		res.setEncoding('utf8');
		let rawData = '';
		res.on('data', function (chunk) { rawData += chunk; });
		res.on('end', function () {

			try {
				//dom = new jsdom.JSDOM(rawData);
				console.log('GETTING ICECAST DATA');
				persistIcecastData(rawData);
			} catch (e) {
				console.error(e.message);
			}
			availability['icecast'] = true;			
			
		});
	}).on('error', e => {
		availability['icecast'] = false;
		console.error(e.message);
	});

}

async function getMetacastData() {
	var token;
	accessTimes['metacast-access-time'] = new Date();

	accessTimes['db-access-time'] = new Date();
	console.log(radioNames);

	try {
		var rows = await dataBase.all('select token, stream_title from radio_info where token != \'avtoradio\';')

	} catch (e) {
		console.log(e);
		return;
	}

	rows.forEach(row => {

		token = row.token;
		//tokens[`${row.stream_title}`] = row.token;
		//console.log(row.token + ' ' + row.stream_title);
		//console.log(tokens);

		if (token != null) {
			http.get(songURL + token, (res) => {

				const statusCode = res.statusCode;

				let error;

				if (statusCode != 200)
					error = new Error('Request Failed.\n' +
						`Status Code: ${statusCode}`);

				if (error) {
					console.error(error.message);
					availability['metacast'] = false;
					res.resume();
					return;
				}
				//accessTimes['metacast-access-time'] = new Date();

				res.setEncoding('utf8');
				let rawData = '';

				res.on('data', function (chunk) { rawData += chunk; });
				res.on('end', function () {
					try {
						//console.log(row.token);						
						persistMetacastData(rawData, row.token);
					} catch (e) {
						console.error(e.message);
					}
					availability['metacast'] = true;

				});
			}).on('error', e => {
				availability['metacast'] = false;
				console.error(e.message);
			});

		}
	});	

}

async function persistIcecastData(rawData) {
			if (rawData == '') {
				console.error("No data to persist.");
				return;
			}
			
			var dom = new jsdom.JSDOM(rawData);
			var mainDiv = dom.window.document.body.getElementsByClassName('main')[0];

			for (var i = 0; i < mainDiv.childElementCount - 1; i = i + 3) {
				var currentEntry = mainDiv.childNodes[i].childNodes[1].childNodes[1].firstChild;
				//console.log(mainDiv.childNodes[i].childNodes[1].childNodes[0].childNodes[0].childNodes[2].firstChild.firstChild.firstChild.textContent);
				if (!/aac/.test(mainDiv.childNodes[i].childNodes[1].childNodes[0].childNodes[0].childNodes[2].firstChild.firstChild.firstChild.textContent)) continue;

				var radioData = {};

				if (currentEntry.childElementCount == 10) {
					radioData = {
						$streamTitle: currentEntry.firstChild.lastChild.textContent,
						$streamDescription: currentEntry.childNodes[1].lastChild.textContent,
						//bitrate: currentEntry.childNodes[4].lastChild.textContent,
						$currentListeners: parseInt(currentEntry.childNodes[5].lastChild.textContent),
						$peakListeners: parseInt(currentEntry.childNodes[6].lastChild.textContent),
						$streamGenre: currentEntry.childNodes[7].lastChild.textContent,
						$currentSong: currentEntry.childNodes[9].lastChild.textContent,
					}

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
				
				console.log(radioData);

				try {
					dataBase.run('update radio_info set stream_description = $streamDescription, current_listeners = $currentListeners, peak_listeners = $peakListeners, stream_genre = $streamGenre, current_song = $currentSong where stream_title = $streamTitle;', radioData)

				} catch (e) {
					console.log(e);
				}
			}
		}

async function persistMetacastData(rawData, token) {
	//if (rawData = '') return;
	let jsonData = JSON.parse(rawData.trim());
	
	if (radioNames.find(x => x['token'] == token) ['artist_song'] != jsonData.current_artist + ' - ' + jsonData.current_song)
	{
		radioNames.find(x => x['token'] == token)['artist_song'] = jsonData.current_artist + ' - ' + jsonData.current_song;
		radioNames.find(x => x['token'] == token)['image'] = jsonData.image;

		accessTimes['db-access-time'] = new Date();

		try {
			dataBase.run('insert into song_list(timestamp, internal_id, artist, title, image, token) values(?, ?, ?, ?, ?, ?);', [(new Date()).valueOf(), jsonData.id, jsonData.current_artist, jsonData.current_song, jsonData.image, token]);
			accessTimes['db-access-time'] = new Date();
			availability['db'] = true;

		} catch (e) {
			console.log(e);
		}

	}

}

function dbOpenCallback() {
	getRadioNamesFromDB();
	console.log('Database connection - SUCCESSFUL');
	accessTimes['db-access-time'] = new Date();
}

function getAccessTimes() { return accessTimes; }
function getAvailability() { return availability; }
function getDataBase() { return dataBase; }

async function getRadioNamesFromDB() {

	try {
		var rows = await dataBase.all('select token, stream_title_bg, stream_url from radio_info;');
		rows.forEach(row => { radioNames.push({ 'token': row['token'], 'stream_title_bg': row['stream_title_bg'], 'stream_url': row['stream_url'] }); });

		console.log('Database connection - SUCCESSFUL');
		accessTimes['db-access-time'] = new Date();
		//console.log(radioNames);

	} catch (e) {
		console.error(e);
	}

}

function processFeedback(feedback) {

	try {
		dataBase.run('insert into user_feedback(timestamp, name, email, subject, message) values($timestamp, $name, $email, $subject, $message)', feedback);
	} catch (e) {
		console.log(e);
	}


	if (mailInfo === undefined) return;
	transporter.sendMail({
		from: '  <trpakov@mail.bg>',
		//from: 'trpakov@mail.bg',
		to: mailInfo.recieverEmail,
		subject: 'RadioLook - Feedback | ' + feedback['$name'] + ' | ' + feedback['$email'] + ' | ' + feedback['$subject'],
		text: feedback['$message']
	});
}

function updateCurrentSong(token) {

	var radioToUpdate = radioNames.find(x => x['token'] == token);
	return {
		'artist_song': radioToUpdate['artist_song'], 'image': radioToUpdate['image'] != null ? radioToUpdate['image'] : '../cover.jpg'
	};
}

async function loadMoreSongs(token, tableRows) {

	// Make database query from table with songs, get the previous 10 songs played on the current radio
	var rows;

	try {
		rows = await dataBase.all('select * from song_list where token == ? order by timestamp desc limit 10 offset ?;', token, tableRows.numberOfTableRows);
	} catch (e) {
		console.log(e);
		return { status: 'DB ACCESS ERROR' };
	}

	if (rows.length == 0) return { status: 'NO MORE DATA' };


	// Get Songs table layout from html file and Import external website search html file
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
	return newRows;
}

function getRadioNames() {
	return radioNames;
}

function getData() {
	getIcecastData();
	getMetacastData();
}

function getServiceStatus(response) {

	var isEverythingOK = true;

	Object.keys(availability).forEach(x => {
		if (!availability[x]) isEverythingOK = false;
	});

	if (isEverythingOK) {
		response.send(Object.assign({ status: 'OK' }, availability, accessTimes));
	}
	else {
		response.send(Object.assign({ status: 'ERROR' }, availability, accessTimes));
	}
}


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