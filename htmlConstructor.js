﻿const jsdom = require('jsdom');
const dataHandler = require('./dataHandler');
const fs = require('fs');

const YT_SEARCH_URL = 'https://www.youtube.com/results?search_query=';
const GOOGLE_SEARCH_URL = 'https://www.google.com/search?q=';
const GENIUS_LYRICS_SEARCH_URL = 'https://genius.com/search?q=';
const SPOTIFY_SEARCH_URL = 'https://play.spotify.com/search/';

function constructHTML(fileName, regExRadioNameCapture) {

	switch (fileName) {
		case '/index.html':
			constructIndexPage(fileName);
			break;
		case '/radioList.html':
			constructRadiosPage(fileName);
			break;
		case '/radioPage.html':
			constructConcreteRadioPage(fileName, regExRadioNameCapture);
			break;
		case '/about.html':
			constructAboutPage(fileName);
			break;
		case '/feedback.html':
			constructFeedbackPage(fileName);
			break;
	}
}


function constructIndexPage(fileName) {

	var file = fs.readFileSync('views' + fileName);

	var dom = new jsdom.JSDOM(file);
	addRadiosToNavbar(dom);

	var accessTimes = dataHandler.getAccessTimes();
	var availability = dataHandler.getAvailability();
	//console.log(accessTimes);

	if (availability['db']) dom.window.document.getElementById('db-access-time').textContent = accessTimes['db-access-time'].toLocaleString();
	if (availability['icecast']) dom.window.document.getElementById('icecast-access-time').textContent = accessTimes['icecast-access-time'].toLocaleString();
	if (availability['metacast']) dom.window.document.getElementById('metacast-access-time').textContent = accessTimes['metacast-access-time'].toLocaleString();

	dom.window.document.getElementById('db-card-title').textContent = (availability['db'] ? 'Състояние: ДОСТЪПНА' : 'Състояние: ОТКАЗАН ДОСТЪП');
	dom.window.document.getElementById('icecast-card-title').textContent = (availability['icecast'] ? 'Състояние: ОНЛАЙН' : 'Състояние: ОФЛАЙН');
	dom.window.document.getElementById('metacast-card-title').textContent = (availability['metacast'] ? 'Състояние: ОНЛАЙН' : 'Състояние: ОФЛАЙН');

	[...dom.window.document.getElementsByClassName('card')].forEach(x => { x.classList.remove('bg-success', 'bg-danger'); });
	dom.window.document.getElementById('db-card').classList.add(availability['db'] ? 'bg-success' : 'bg-danger');
	dom.window.document.getElementById('icecast-card').classList.add(availability['icecast'] ? 'bg-success' : 'bg-danger');
	dom.window.document.getElementById('metacast-card').classList.add(availability['metacast'] ? 'bg-success' : 'bg-danger');

	//console.log(dom.window.document.getElementById('db-access-time').textContent);
	console.log(availability);

}

function constructRadiosPage(fileName) {
	var file = fs.readFileSync('views' + fileName);

	var db = dataHandler.getDataBase();
	var rowLayout = fs.readFileSync('views/tableLayout.html', 'utf8');
	var searchPopoverContent = fs.readFileSync('views/searchPopoverContent.html', 'utf8');
	var radios = fs.readFileSync('views/radioList.html', 'utf8');
	var dom = new jsdom.JSDOM(radios);
	addRadiosToNavbar(dom);

	var table = dom.window.document.querySelector('tbody');
	table.innerHTML = '';

	var statement = db.prepare('select * from radio_info;');
	for (const row of statement.iterate()) {

		var currentRow = new jsdom.JSDOM(rowLayout).window.document.querySelector('tr');

		currentRow.getElementsByClassName('link')[0].setAttribute('href', row['website']);
		currentRow.getElementsByClassName('logo')[0].setAttribute('src', row['logo']);
		currentRow.getElementsByClassName('name')[0].textContent = row['stream_title_bg'];
		currentRow.getElementsByClassName('currentListeners')[0].textContent = row['current_listeners'];
		currentRow.getElementsByClassName('peakListeners')[0].textContent = row['peak_listeners'];
		currentRow.getElementsByClassName('genre')[0].textContent = row['stream_genre'];
		currentRow.getElementsByClassName('currentSong')[0].textContent = row['current_song'];
		currentRow.getElementsByClassName('externalPlayer')[0].setAttribute('href', row['stream_url']);

		var searchPopoverContentDOM = new jsdom.JSDOM(searchPopoverContent);
		//console.log(searchPopoverContentDOM.window.document.body.innerHTML + '\n');
		searchPopoverContentDOM.window.document.getElementsByClassName('youtube-link1')[0].setAttribute('href', YT_SEARCH_URL + row['current_song'].split(' ').join('+'));
		searchPopoverContentDOM.window.document.getElementsByClassName('google-link')[0].setAttribute('href', GOOGLE_SEARCH_URL + row['current_song'].split(' ').join('+'));
		searchPopoverContentDOM.window.document.getElementsByClassName('genius-link')[0].setAttribute('href', GENIUS_LYRICS_SEARCH_URL + row['current_song'].split(' ').join('+'));
		searchPopoverContentDOM.window.document.getElementsByClassName('spotify-link')[0].setAttribute('href', SPOTIFY_SEARCH_URL + row['current_song']);
		//console.log(searchPopoverContentDOM.window.document.body.innerHTML);
		currentRow.getElementsByClassName('popupElement')[0].setAttribute('data-content', searchPopoverContentDOM.window.document.body.innerHTML);

		table.appendChild(currentRow);
	}



	//db.each('select * from radio_info;', (err, row) => {
	//	if (err) console.error(err.message);

	//	var currentRow = new jsdom.JSDOM(rowLayout).window.document.querySelector('tr');

	//	currentRow.getElementsByClassName('link')[0].setAttribute('href', row['website']);
	//	currentRow.getElementsByClassName('logo')[0].setAttribute('src', row['logo']);
	//	currentRow.getElementsByClassName('name')[0].textContent = row['stream_title_bg'];
	//	currentRow.getElementsByClassName('currentListeners')[0].textContent = row['current_listeners'];
	//	currentRow.getElementsByClassName('peakListeners')[0].textContent = row['peak_listeners'];
	//	currentRow.getElementsByClassName('genre')[0].textContent = row['stream_genre'];
	//	currentRow.getElementsByClassName('currentSong')[0].textContent = row['current_song'];
	//	currentRow.getElementsByClassName('externalPlayer')[0].setAttribute('href', row['stream_url']);

	//	var searchPopoverContentDOM = new jsdom.JSDOM(searchPopoverContent);
	//	//console.log(searchPopoverContentDOM.window.document.body.innerHTML + '\n');
	//	searchPopoverContentDOM.window.document.getElementsByClassName('youtube-link1')[0].setAttribute('href', YT_SEARCH_URL + row['current_song'].split(' ').join('+'));
	//	searchPopoverContentDOM.window.document.getElementsByClassName('google-link')[0].setAttribute('href', GOOGLE_SEARCH_URL + row['current_song'].split(' ').join('+'));
	//	searchPopoverContentDOM.window.document.getElementsByClassName('genius-link')[0].setAttribute('href', GENIUS_LYRICS_SEARCH_URL + row['current_song'].split(' ').join('+'));
	//	//console.log(searchPopoverContentDOM.window.document.body.innerHTML);
	//	currentRow.getElementsByClassName('popupElement')[0].setAttribute('data-content', searchPopoverContentDOM.window.document.body.innerHTML);
		
	//	table.appendChild(currentRow);

	//}, (err, row) => {
	//	if (err) console.error(err.message);
	//	fs.writeFileSync('views/radioList.html', dom.serialize());
	//	});

	dom.window.document.getElementById('popoverScript').remove();
	var popoverScript = dom.window.document.createElement('script');
	popoverScript.setAttribute('id', 'popoverScript');
	popoverScript.innerHTML = '$(".popupElement").each(function() { var $this = $(this); $this.popover({ trigger: "focus"}) });';
	dom.window.document.body.appendChild(popoverScript);

	fs.writeFileSync('views/radioList.html', dom.serialize());
}

// Function to construct individual radio page
function constructConcreteRadioPage(fileName, regExRadioNameCapture) {

	// Get HTML page, convert it to DOM object
	var file = fs.readFileSync('views' + fileName, 'utf8');
	var dom = new jsdom.JSDOM(file);

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

	// Set current radio name and logo in main card
	var radioCard = dom.window.document.getElementById('radio-card');
	dom.window.document.getElementById('title').textContent = currentRadio['stream_title_bg'];
	radioCard.getElementsByClassName('logo')[0].setAttribute('src', '/' + currentRadio['token'] + '.png');

	// Muses RadioPlayer Code
	var radioPlayerHTML = fs.readFileSync('views' + '\\radioPlayer.html', 'utf8');
	var radioPlayerDOM = new jsdom.JSDOM(radioPlayerHTML);

	// RegEx helper function
	function replacer(match, p1, p2, p3, offset, string) {

		if (match == p1) return currentRadio['stream_url'].match(/(?<=reklama\.bg\/)(.+)(?=\.aac)/)[0];
		else return currentRadio['stream_title_bg'];
	}

	// Set current radio online stream and cyrillic name in player
	radioPlayerDOM.window.document.getElementById('radioplayer-script').textContent = radioPlayerDOM.window.document.getElementById('radioplayer-script').textContent.replace(/(?<=reklama\.bg\/)(.+)(?=\.aac)|(?<='title':')(.+)(?=',)/g, replacer)
	dom.window.document.getElementById('radioplayer-box').innerHTML = radioPlayerDOM.window.document.body.innerHTML;

	// Import external website search html file
	var searchPopoverContent = fs.readFileSync('views/searchPopoverContent.html', 'utf8');

	// Get Songs table layout from html file
	var rowLayout = fs.readFileSync('views/songlistTableLayout.html', 'utf8');

	// Delete the contents of previous table
	var table = dom.window.document.querySelector('tbody');
	table.innerHTML = '';

	// Make database query from table with songs, get the last 11 songs played on the current radio
	var db = dataHandler.getDataBase();
	var statement = db.prepare('select * from song_list where token == ? order by timestamp desc limit 11');
	var rows = statement.all(currentRadio['token']);

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

	// Re-add front-end code that enables the Bootstrap pop-over elements
	//if(dom.window.document.contains(dom.window.document.getElementById('popoverScript')))
	//	dom.window.document.getElementById('popoverScript').remove();

	//var popoverScript = dom.window.document.createElement('script');
	//popoverScript.setAttribute('id', 'popoverScript');
	//popoverScript.innerHTML = '$(".popupElement").each(function() { var $this = $(this); $this.popover({ trigger: "focus"}) });';
	//dom.window.document.body.appendChild(popoverScript);

	// Save the modified file, that is ready to be served
	fs.writeFileSync('views' + fileName, dom.serialize());
}

function constructAboutPage(fileName) {
	var file = fs.readFileSync('views' + fileName);

	var dom = new jsdom.JSDOM(file);
	addRadiosToNavbar(dom);

	fs.writeFileSync('views' + fileName, dom.serialize());
}

function constructFeedbackPage(fileName) {
	var file = fs.readFileSync('views' + fileName);

	var dom = new jsdom.JSDOM(file);
	addRadiosToNavbar(dom);

	fs.writeFileSync('views' + fileName, dom.serialize());
}

function addRadiosToNavbar(dom) {

	var dropdown = dom.window.document.getElementById('radios-dropdown');
	var radioNames = dataHandler.getRadioNames();
	dropdown.innerHTML = '';

	radioNames.forEach(x => {
		var link = dom.window.document.createElement('a');
		link.setAttribute('class', 'dropdown-item');
		link.setAttribute('href', '/radio/' + x['token']);
		link.textContent = x['stream_title_bg'];
		dropdown.appendChild(link);
		dropdown.innerHTML += '\n';

	});

}



exports.constructHTML = constructHTML;
exports.YT_SEARCH_URL = YT_SEARCH_URL;
exports.GOOGLE_SEARCH_URL = GOOGLE_SEARCH_URL;
exports.GENIUS_LYRICS_SEARCH_URL = GENIUS_LYRICS_SEARCH_URL;
exports.SPOTIFY_SEARCH_URL = SPOTIFY_SEARCH_URL;