const jsdom = require('jsdom');
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
	fs.writeFileSync('views' + fileName, dom.serialize());
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

	fs.writeFileSync('views/radioList.html', dom.serialize());

	dom.window.document.getElementById('popoverScript').remove();
	var popoverScript = dom.window.document.createElement('script');
	popoverScript.setAttribute('id', 'popoverScript');
	popoverScript.innerHTML = '$(".popupElement").each(function() { var $this = $(this); $this.popover({ trigger: "focus"}) });';
	dom.window.document.body.appendChild(popoverScript);
}

function constructConcreteRadioPage(fileName, regExRadioNameCapture) {

	var file = fs.readFileSync('views' + fileName, 'utf8');
	var dom = new jsdom.JSDOM(file);
	var radioList = dataHandler.getRadioNames();
	addRadiosToNavbar(dom);

	var title = dom.window.document.querySelector('title');
	var currentRadio = radioList.find(x => x['token'] == regExRadioNameCapture);
	title.textContent = currentRadio['stream_title_bg'] + ' - RadioLook';
	var links = dom.window.document.getElementsByClassName('dropdown-item');

	for (let link of links) {
		if (link.textContent != currentRadio['stream_title_bg']) link.className = 'dropdown-item';
		else link.className = 'dropdown-item active';
	}

	var radioCard = dom.window.document.getElementById('radio-card');
	dom.window.document.getElementById('title').textContent = currentRadio['stream_title_bg'];
	radioCard.getElementsByClassName('logo')[0].setAttribute('src', '/' + currentRadio['token'] + '.png');






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