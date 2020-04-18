const http = require('http');
const jsdom = require('jsdom');
//const sqlite3 = require('sqlite3').verbose();
const better_sqlite3 = require('better-sqlite3');

const url = 'http://stream.radioreklama.bg/status.xsl';
const songURL = 'http://meta.metacast.eu/?radio=';

const dataBase = new better_sqlite3('./radio_look.db', { fileMustExist: true });

//const db = new sqlite3.Database('./radio_look.db', sqlite3.OPEN_READWRITE, dbOpenCallback);
const accessTimes = { 'db-access-time': '', 'icecast-access-time': '', 'metacast-access-time': '' };
const availability = { 'db': true, 'icecast': true, 'metacast': true };
const radioNames = [];
dbOpenCallback();

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
				persistIcecastData(rawData);
			} catch (e) {
				console.error(e.message);
			}
			accessTimes['icecast-access-time'] = new Date();
			
		});
	}).on('error', e => {
		availability['icecast'] = false;
		console.error(e.message);
	});

}

function getMetacastData() {
	var token;
	accessTimes['metacast-access-time'] = new Date();

	var statement = dataBase.prepare('select token, stream_title from radio_info where token != \'avtoradio\';');
	var rows = statement.all();

	accessTimes['db-access-time'] = new Date();
	console.log(radioNames);

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

				});
			}).on('error', e => {
				availability['metacast'] = false;
				console.error(e.message);
			});

		}
	});	

}

function persistIcecastData(rawData) {
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
						streamTitle: currentEntry.firstChild.lastChild.textContent,
						streamDescription: currentEntry.childNodes[1].lastChild.textContent,
						//bitrate: currentEntry.childNodes[4].lastChild.textContent,
						currentListeners: parseInt(currentEntry.childNodes[5].lastChild.textContent),
						peakListeners: parseInt(currentEntry.childNodes[6].lastChild.textContent),
						streamGenre: currentEntry.childNodes[7].lastChild.textContent,
						currentSong: currentEntry.childNodes[9].lastChild.textContent,
					}

					if (radioData['streamTitle'] == 'Avto Radio') {
						if (radioData['currentSong'] == 'Avto Radio - ���� �����' || radioData['currentSong'].split('-').length < 2) continue;

						var artist = radioData['currentSong'].split('-')[0].trim();
						var song = radioData['currentSong'].split('-')[1].trim();
						
						var statement = dataBase.prepare('insert into song_list(timestamp, artist, title, token) values(?, ?, ?, ?);');
						statement.run((new Date()).valueOf(), artist, song, 'avtoradio');

						//db.run('insert into song_list(timestamp, artist, title, token) values(?, ?, ?, ?);', [(new Date()).valueOf(), artist, song, 'avtoradio'], (err) => {
						//	if (err) return console.error(err.message);
						//});

					}
				}
				else {
					radioData = {
						streamTitle: currentEntry.firstChild.lastChild.textContent,
						streamDescription: '',
						currentListeners: parseInt(currentEntry.childNodes[4].lastChild.textContent),
						peakListeners: parseInt(currentEntry.childNodes[5].lastChild.textContent),
						streamGenre: currentEntry.childNodes[6].lastChild.textContent,
						currentSong: currentEntry.childNodes[8].lastChild.textContent,
					}
				}
				
				console.log(radioData);

				var statement = dataBase.prepare('update radio_info set stream_description = $streamDescription, current_listeners = $currentListeners, peak_listeners = $peakListeners, stream_genre = $streamGenre, current_song = $currentSong where stream_title = $streamTitle;');
				statement.run(radioData);

				//db.run('update radio_info set stream_description = $streamDescription, current_listeners = $currentListeners, peak_listeners = $peakListeners, stream_genre = $streamGenre, current_song = $currentSong where stream_title = $streamTitle;', radioData, (err) => {
				//	if (err) {
				//		availability['db'] = false;
				//		return console.error(err.message);
				//	}
				//});
				//insert into radio_info(stream_title, stream_description, current_listeners, peak_listeners, stream_genre, current_song) values ($streamTitle, $streamDescription, $currentListeners, $peakListeners, $streamGenre, $currentSong);	

			}
		}

function persistMetacastData(rawData, token) {
	//if (rawData = '') return;
	let jsonData = JSON.parse(rawData.trim());
	
	if (radioNames.find(x => x['token'] == token) ['artist_song'] != jsonData.current_artist + ' - ' + jsonData.current_song)
	{
		var statement = dataBase.prepare('insert into song_list(timestamp, internal_id, artist, title, image, token) values(?, ?, ?, ?, ?, ?);');
		statement.run((new Date()).valueOf(), jsonData.id, jsonData.current_artist, jsonData.current_song, jsonData.image, token);
		accessTimes['db-access-time'] = new Date();

		//db.run('insert into song_list(timestamp, internal_id, artist, title, image, token) values(?, ?, ?, ?, ?, ?);', [(new Date()).valueOf(), jsonData.id, jsonData.current_artist, jsonData.current_song, jsonData.image, token], (err) => {
		//		if (err) return console.error(err.message);
		//		accessTimes['db-access-time'] = new Date();
		//		availability['db'] = true;
		//});

		radioNames.find(x => x['token'] == token)['artist_song'] = jsonData.current_artist + ' - ' + jsonData.current_song;
	}

}

function dbOpenCallback(err) {
	if (err) {
		availability['db'] = false;
		return console.error(err.message);
	}
	getRadioNamesFromDB();
	console.log('Database connection - SUCCESSFUL');
	accessTimes['db-access-time'] = new Date();
}

function getAccessTimes() { return accessTimes; }
function getAvailability() { return availability; }
function getDataBase() { return dataBase; }

function getRadioNamesFromDB() {

	var statement = dataBase.prepare('select token, stream_title_bg, stream_url from radio_info;');
	var rows = statement.all();
	rows.forEach(row => { radioNames.push({ 'token': row['token'], 'stream_title_bg': row['stream_title_bg'], 'stream_url': row['stream_url'] }); });

	//db.all('select token, stream_title_bg, stream_url from radio_info;', (err, rows) => { // where token is not null
	//	if (err) {
	//		availability['db'] = false;
	//		return console.error(err.message);
	//	}
	//	rows.forEach(row => { radioNames.push({ 'token': row['token'], 'stream_title_bg': row['stream_title_bg'], 'stream_url': row['stream_url'] }); });
	//	//console.log(radioNames);
	//});


}

function processFeedback(feedback) {

	var statement = dataBase.prepare('insert into user_feedback(timestamp, name, email, subject, message) values($timestamp, $name, $email, $subject, $message)');
	statement.run(feedback);

	if (mailInfo === undefined) return;
	transporter.sendMail({
		from: '  <trpakov@mail.bg>',
		//from: 'trpakov@mail.bg',
		to: mailInfo.recieverEmail,
		subject: 'RadioLook - Feedback | ' + feedback['name'] + ' | ' + feedback['email'] + ' | ' + feedback['subject'],
		text: feedback['message']
	});
}

function getRadioNames() {
	return radioNames;
}

function getData() {
	getIcecastData();
	getMetacastData();
}


exports.getIcecastData = getIcecastData;
exports.getMetacastData = getMetacastData;
exports.getAccessTimes = getAccessTimes;
exports.getAvailability = getAvailability;
exports.getDataBase = getDataBase;
exports.getRadioNames = getRadioNames;
exports.getData = getData;
exports.processFeedback = processFeedback;