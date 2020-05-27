'use strict';

// Module for using DOM inside node.js
const jsdom = require('jsdom');

const dataHandler = require('./dataHandler');
const fs = require('fs');

// Module to use async read and write to file functions with promises instead of callbacks 
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// URLs for external searches
const YT_SEARCH_URL = 'https://www.youtube.com/results?search_query=';
const GOOGLE_SEARCH_URL = 'https://www.google.com/search?q=';
const GENIUS_LYRICS_SEARCH_URL = 'https://genius.com/search?q=';
const SPOTIFY_SEARCH_URL = 'https://play.spotify.com/search/';

// Main router function
function constructHTML(fileName, response, regExRadioNameCapture) {

	switch (fileName) {
		case '/index.html':
			constructIndexPage(fileName, response);
			break;
		case '/radioList.html':
			constructRadiosPage(fileName, response);
			break;
		case '/radioPage.html':
			constructConcreteRadioPage(fileName, response, regExRadioNameCapture);
			break;
		case '/about.html':
			constructAboutPage(fileName, response);
			break;
		case '/feedback.html':
			constructFeedbackPage(fileName, response);
			break;
	}
}

// Function that constructs the index page
async function constructIndexPage(fileName, response) {

	var file, dom;

	try {
		// Get HTML page, convert it to DOM object
		file = await readFileAsync('views' + fileName);

		dom = new jsdom.JSDOM(file);
		addRadiosToNavbar(dom);

		// Update access times
		var accessTimes = dataHandler.getAccessTimes();
		var availability = dataHandler.getAvailability();
		//console.log(accessTimes);

		// Update access times in DOM
		dom.window.document.getElementById('db-access-time').textContent = new Date(accessTimes['db-access-time']).toLocaleString('bg-BG').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, '$3/$2/$1,').replace(/\/(\d{1})\//, '/0$1/');
		dom.window.document.getElementById('icecast-access-time').textContent = new Date(accessTimes['icecast-access-time']).toLocaleString('bg-BG').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, '$3/$2/$1,').replace(/\/(\d{1})\//, '/0$1/');
		dom.window.document.getElementById('metacast-access-time').textContent = new Date(accessTimes['metacast-access-time']).toLocaleString('bg-BG').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, '$3/$2/$1,').replace(/\/(\d{1})\//, '/0$1/');

		//if (availability['db']) dom.window.document.getElementById('db-access-time').textContent = new Date(accessTimes['db-access-time']).toLocaleString('en-GB');
		//if (availability['icecast']) dom.window.document.getElementById('icecast-access-time').textContent = new Date(accessTimes['icecast-access-time']).toLocaleString('en-GB');
		//if (availability['metacast']) dom.window.document.getElementById('metacast-access-time').textContent = new Date(accessTimes['metacast-access-time']).toLocaleString('en-GB');

		// Update info cards depending on availability
		dom.window.document.getElementById('db-text-span').textContent = (availability['db'] ? 'Последен достъп: ' : 'Последен опит за достъп: ');
		dom.window.document.getElementById('ice-text-span').textContent = (availability['icecast'] ? 'Последен достъп: ' : 'Последен опит за достъп: ');
		dom.window.document.getElementById('meta-text-span').textContent = (availability['metacast'] ? 'Последен достъп: ' : 'Последен опит за достъп: ');

		dom.window.document.getElementById('db-card-title').textContent = (availability['db'] ? 'Състояние: ДОСТЪПНА' : 'Последен опит за достъп: ');
		dom.window.document.getElementById('icecast-card-title').textContent = (availability['icecast'] ? 'Състояние: ОНЛАЙН' : 'Състояние: ОФЛАЙН');
		dom.window.document.getElementById('metacast-card-title').textContent = (availability['metacast'] ? 'Състояние: ОНЛАЙН' : 'Състояние: ОФЛАЙН');

		[...dom.window.document.getElementsByClassName('card')].forEach(x => { x.classList.remove('bg-success', 'bg-danger'); });
		dom.window.document.getElementById('db-card').classList.add(availability['db'] ? 'bg-success' : 'bg-danger');
		dom.window.document.getElementById('icecast-card').classList.add(availability['icecast'] ? 'bg-success' : 'bg-danger');
		dom.window.document.getElementById('metacast-card').classList.add(availability['metacast'] ? 'bg-success' : 'bg-danger');

		//console.log(dom.window.document.getElementById('db-access-time').textContent);
		//console.log(availability);

		// Send the constructed page
		response.send(dom.serialize());

	} catch (e) {
		console.log(e);
		// Send error response if an error occured
		response.status(500).send('В момента изпитваме технически затруднения, съжаляваме за причиненото неудобство.');
	}

	try {
		// Save the edited file
		writeFileAsync('views' + fileName, dom.serialize());
	} catch (e) {
		console.log('Could not save modified file');
		console.log(e);
	}
	
}

// Function to construct the radios table page
async function constructRadiosPage(fileName, response) {
	var radios, rowLayout, searchPopoverContent, dom;

	try {
		// Get database object, radios HTML page, table template HTML page, external search HTML page, convert them to DOM objects
		var db = dataHandler.getDataBase();
		radios = await readFileAsync('views' + fileName);
		rowLayout = await readFileAsync('views/tableLayout.html', 'utf8');
		searchPopoverContent = await readFileAsync('views/searchPopoverContent.html', 'utf8');

		dom = new jsdom.JSDOM(radios);
		addRadiosToNavbar(dom);

		// Get table body and clear it
		var table = dom.window.document.querySelector('tbody');
		table.innerHTML = '';

		// Get all rows from radio_info table
		await db.each('select * from radio_info;', (err, row) => {
			if (err) {
				console.error(err.message);
				throw err;
			}
			// Add each radio information to a new row and append it to the table
			var currentRow = new jsdom.JSDOM(rowLayout).window.document.querySelector('tr');

			currentRow.getElementsByClassName('link')[0].setAttribute('href', row['website']);
			currentRow.getElementsByClassName('logo')[0].setAttribute('src', row['logo']);
			currentRow.getElementsByClassName('name')[0].textContent = row['stream_title_bg'];
			currentRow.getElementsByClassName('currentListeners')[0].textContent = row['current_listeners'];
			currentRow.getElementsByClassName('peakListeners')[0].textContent = row['peak_listeners'];
			currentRow.getElementsByClassName('genre')[0].textContent = row['stream_genre'];
			currentRow.getElementsByClassName('currentSong')[0].textContent = row['current_song'];
			currentRow.getElementsByClassName('externalPlayer')[0].setAttribute('href', row['stream_url']);

			// Using the external search template, add links for external search engines for the current radio
			var searchPopoverContentDOM = new jsdom.JSDOM(searchPopoverContent);

			searchPopoverContentDOM.window.document.getElementsByClassName('youtube-link1')[0].setAttribute('href', YT_SEARCH_URL + row['current_song'].split(' ').join('+'));
			searchPopoverContentDOM.window.document.getElementsByClassName('google-link')[0].setAttribute('href', GOOGLE_SEARCH_URL + row['current_song'].split(' ').join('+'));
			searchPopoverContentDOM.window.document.getElementsByClassName('genius-link')[0].setAttribute('href', GENIUS_LYRICS_SEARCH_URL + row['current_song'].split(' ').join('+'));

			currentRow.getElementsByClassName('popupElement')[0].setAttribute('data-content', searchPopoverContentDOM.window.document.body.innerHTML);

			table.appendChild(currentRow);
		});

		// Send the constructed page
		response.send(dom.serialize());

	} catch (e) {
		console.log(e);
		// Send error response if an error occured
		response.status(500).send('В момента изпитваме технически затруднения, съжаляваме за причиненото неудобство.');
	}

	try {
		// Save the edited file
		writeFileAsync('views/radioList.html', dom.serialize());
	} catch (e) {
		console.log('Could not save modified file');
		console.log(e);
	}

}

// Function to construct individual radio page
async function constructConcreteRadioPage(fileName, response, regExRadioNameCapture) {

	var file, dom, radioPlayerHTML, radioPlayerDOM, searchPopoverContent, rowLayout;

	try {
		// Get HTML page, convert it to DOM object
		file = await readFileAsync('views' + fileName, 'utf8');
		dom = new jsdom.JSDOM(file);

		// Get current radios information
		var radioList = dataHandler.getRadioNames();

		// Add the list of currently available radios in the navbar dropdown
		addRadiosToNavbar(dom);

		// Change the title of the page
		var title = dom.window.document.querySelector('title');
		var currentRadio = radioList.find(x => x['token'] == regExRadioNameCapture);
		title.textContent = currentRadio['stream_title_bg'] + ' - RadioLook';

		// Make the current radio link active in the navbar dropdown
		var links = dom.window.document.getElementsByClassName('dropdown-item');

		for (let link of links) {
			if (link.textContent != currentRadio['stream_title_bg']) link.className = 'dropdown-item';
			else link.className = 'dropdown-item active';
		}

		// Set current radio name, logo and URL in main card
		var radioCard = dom.window.document.getElementById('radio-card');
		dom.window.document.getElementById('title').textContent = currentRadio['stream_title_bg'];
		radioCard.getElementsByClassName('logo')[0].setAttribute('src', '/' + currentRadio['token'] + '.png');
		radioCard.getElementsByClassName('radio-url')[0].setAttribute('href', currentRadio['website']);

		// Load Muses RadioPlayer Code
		radioPlayerHTML = await readFileAsync('views' + '\\radioPlayer.html', 'utf8');
		radioPlayerDOM = new jsdom.JSDOM(radioPlayerHTML);

		// RegEx helper function
		function replacer(match, p1, p2, p3, offset, string) {

			if (match == p1) return currentRadio['stream_url'].match(/(?<=reklama\.bg\/)(.+)(?=\.aac)/)[0];
			else return currentRadio['stream_title_bg'];
		}

		// Set current radio online stream and cyrillic name in player
		radioPlayerDOM.window.document.getElementById('radioplayer-script').textContent = radioPlayerDOM.window.document.getElementById('radioplayer-script').textContent.replace(/(?<=reklama\.bg\/)(.+)(?=\.aac)|(?<='title':')(.+)(?=',)/g, replacer)
		dom.window.document.getElementById('radioplayer-box').innerHTML = radioPlayerDOM.window.document.body.innerHTML;

		searchPopoverContent = await readFileAsync('views/searchPopoverContent.html', 'utf8');

		// Get Songs table layout from html file
		rowLayout = await readFileAsync('views/songlistTableLayout.html', 'utf8');

		// Delete the contents of previous table
		var table = dom.window.document.querySelector('tbody');
		table.innerHTML = '';

		// Make database query from table with songs, get the last 11 songs played on the current radio
		var db = dataHandler.getDataBase();
		var rows = await db.all('select * from song_list where token == ? order by timestamp desc limit 11', currentRadio['token']);

		// Do this for every extracted element from the songs_list table (the las 11 songs from the radio)
		rows.forEach((row, index) => {

			// If this is the last entry (currently playing song)
			if (index == 0) {
				// Add song name, singer name and cover to the main card
				dom.window.document.getElementsByClassName('artwork')[0].setAttribute('src', row['image'] == null ? '../cover.jpg' : row['image']);
				dom.window.document.getElementById('artist').innerHTML = 'ИЗПЪЛНИТЕЛ/И:<br><span id="artist_name">' + row['artist'] + '</span>';
				dom.window.document.getElementById('song').innerHTML = 'ПЕСЕН:<br><span id="song_name">' + row['title'] + '<span>';

				// Modify the links to external sites using the current song
				var searchPopoverContentDOM = new jsdom.JSDOM(searchPopoverContent);
				searchPopoverContentDOM.window.document.getElementsByClassName('youtube-link1')[0].setAttribute('href', YT_SEARCH_URL + row['artist'] + '+' + row['title']);
				searchPopoverContentDOM.window.document.getElementsByClassName('google-link')[0].setAttribute('href', GOOGLE_SEARCH_URL + row['artist'] + '+' + row['title']);
				searchPopoverContentDOM.window.document.getElementsByClassName('genius-link')[0].setAttribute('href', GENIUS_LYRICS_SEARCH_URL + row['artist'] + '+' + row['title']);
				searchPopoverContentDOM.window.document.getElementsByClassName('spotify-link')[0].setAttribute('href', SPOTIFY_SEARCH_URL + row['artist'] + ' ' + row['title']);

				dom.window.document.getElementById('search').innerHTML = searchPopoverContentDOM.serialize();

			}
			// Otherwise the song will be added as a row in the last songs table
			else {
				var currentRow = new jsdom.JSDOM(rowLayout).window.document.querySelector('tr');

				// Insert scraping time, song and artist name, cover
				currentRow.getElementsByClassName('date')[0].textContent = new Date(parseInt(row['timestamp'])).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
				currentRow.getElementsByClassName('cover-art')[0].setAttribute('src', row['image'] == null ? '../cover.jpg' : row['image']);
				currentRow.getElementsByClassName('artist')[0].textContent = row['artist'];
				currentRow.getElementsByClassName('song')[0].textContent = row['title'];

				// Modify the links to external sites using the current song
				var searchPopoverContentDOM = new jsdom.JSDOM(searchPopoverContent);
				searchPopoverContentDOM.window.document.getElementsByClassName('youtube-link1')[0].setAttribute('href', YT_SEARCH_URL + row['artist'] + '+' + row['title']);
				searchPopoverContentDOM.window.document.getElementsByClassName('google-link')[0].setAttribute('href', GOOGLE_SEARCH_URL + row['artist'] + '+' + row['title']);
				searchPopoverContentDOM.window.document.getElementsByClassName('genius-link')[0].setAttribute('href', GENIUS_LYRICS_SEARCH_URL + row['artist'] + '+' + row['title']);
				searchPopoverContentDOM.window.document.getElementsByClassName('spotify-link')[0].setAttribute('href', SPOTIFY_SEARCH_URL + row['artist'] + ' ' + row['title']);

				// Add the constructed html to the popUp element data-content atribute (Bootstrap)
				currentRow.getElementsByClassName('popupElement')[0].setAttribute('data-content', searchPopoverContentDOM.window.document.body.innerHTML);

				// Append current row to the table
				table.appendChild(currentRow);
			}

		});

		// Send the constructed page
		response.send(dom.serialize());

	} catch (e) {
		console.log(e);
		// Send error response if an error occured
		response.status(500).send('В момента изпитваме технически затруднения, съжаляваме за причиненото неудобство.');
	}

	try {
		// Save the edited file
		writeFileAsync('views' + fileName, dom.serialize());
	} catch (e) {
		console.log('Could not save modified file');
		console.log(e);
	}
}

// Function to construct About page
async function constructAboutPage(fileName, response) {
	var file;
	var dom;

	try {
		// Get HTML page, convert it to DOM object
		file = await readFileAsync('views' + fileName);
		dom = new jsdom.JSDOM(file);

		// Add the available radios to the Nav bar
		addRadiosToNavbar(dom);

		// Send the constructed page
		response.send(dom.serialize());	

	} catch (e) {
		console.log(e);
		// Send error response if an error occured
		response.status(500).send('В момента изпитваме технически затруднения, съжаляваме за причиненото неудобство.');
	}

	try {
		// Save the edited file
		writeFileAsync('views' + fileName, dom.serialize());
	} catch (e) {
		console.log('Could not save modified file');
		console.log(e);
	}


}

// Function to construct the Feedback page
async function constructFeedbackPage(fileName, response) {
	var file;
	var dom;

	try {
		// Get HTML page, convert it to DOM object
		file = await readFileAsync('views' + fileName);
		dom = new jsdom.JSDOM(file);

		// Add the available radios to the Nav bar
		addRadiosToNavbar(dom);

		// Send the constructed page
		response.send(dom.serialize());	

	} catch (e) {
		console.log(e);
		// Send error response if an error occured
		response.status(500).send('В момента изпитваме технически затруднения, съжаляваме за причиненото неудобство.');
	}

	try {
		// Save the edited file
		writeFileAsync('views' + fileName, dom.serialize());
	} catch (e) {
		console.log('Could not save modified file');
		console.log(e);
	}
}

// Add currently available radios to the Nav bar
function addRadiosToNavbar(dom) {

	// Get the dropdown for the radios and clear it
	var dropdown = dom.window.document.getElementById('radios-dropdown');
	var radioNames = dataHandler.getRadioNames();
	dropdown.innerHTML = '';

	// Add each radio
	radioNames.forEach(x => {
		var link = dom.window.document.createElement('a');
		link.setAttribute('class', 'dropdown-item');
		link.setAttribute('href', '/radio/' + x['token']);
		link.textContent = x['stream_title_bg'];
		dropdown.appendChild(link);
		dropdown.innerHTML += '\n';

	});

}


// Exports (used in other files)
exports.constructHTML = constructHTML;
exports.YT_SEARCH_URL = YT_SEARCH_URL;
exports.GOOGLE_SEARCH_URL = GOOGLE_SEARCH_URL;
exports.GENIUS_LYRICS_SEARCH_URL = GENIUS_LYRICS_SEARCH_URL;
exports.SPOTIFY_SEARCH_URL = SPOTIFY_SEARCH_URL;