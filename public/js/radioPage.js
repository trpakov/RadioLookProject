$(".popupElement").each(function() { 
	var $this = $(this); 
	$this.popover({ 
		trigger: "focus"
	});
});

var numberOfTableRows = 11;
var tbody = document.querySelector('tbody');
var stopShowingModal = false;

const YT_SEARCH_URL = 'https://www.youtube.com/results?search_query=';
const GOOGLE_SEARCH_URL = 'https://www.google.com/search?q=';
const GENIUS_LYRICS_SEARCH_URL = 'https://genius.com/search?q=';
const SPOTIFY_SEARCH_URL = 'https://play.spotify.com/search/';

function updateCurrentSong(){
	
	$.ajax({
	url: window.location.pathname + '/updateCurrentSong/',
	type:'GET',
	cache: false
	}).done(function(returnedData)  {
		//console.log(returnedData);
		var newAritst = returnedData['artist_song'].split(' - ')[0];
		var newSong = returnedData['artist_song'].split(' - ')[1];
		var newImage = returnedData['image'];
		
		var artistSpan = document.querySelector('#artist_name');
		var songSpan = document.querySelector('#song_name');
		var coverImage =  document.querySelector('#cover_image');
		
		if(newAritst != artistSpan.textContent || newSong != songSpan.textContent){
			artistSpan.textContent = newAritst;
			songSpan.textContent = newSong;
			coverImage.setAttribute('src', returnedData['image']);
			
			document.querySelectorAll('.google-link')[0].href = GOOGLE_SEARCH_URL + newAritst + '+' + newSong;
			document.querySelectorAll('.youtube-link1')[0].href = YT_SEARCH_URL + newAritst + '+' + newSong;
			document.querySelectorAll('.genius-link')[0].href = GENIUS_LYRICS_SEARCH_URL + newAritst + '+' + newSong;
			document.querySelectorAll('.spotify-link')[0].href = SPOTIFY_SEARCH_URL + newAritst + ' ' + newSong;			
		}

}).fail(function()  {
		console.log('FAILURE');
});
		
}

setInterval(updateCurrentSong, 10000);

document.querySelector('#load-more').addEventListener('click', loadMoreTableEntries);

function loadMoreTableEntries(){
	
	$.ajax({
	url: window.location.pathname + '/loadMoreSongs/',
	type:'POST',
	data: JSON.stringify({'numberOfTableRows':numberOfTableRows}),
	contentType:"application/json; charset=utf-8",
	cache: false
	}).done(function(returnedData)  {

		if(returnedData.hasOwnProperty('status')) {			
			document.querySelector('#load-more').style.display = 'none';
			return;
		}
		tbody.innerHTML += returnedData;
		numberOfTableRows += 10;
		$(".popupElement").each(function() { var $this = $(this); $this.popover({ trigger: "focus"}) });
		
	}).fail(function()  {
		alert('FAILURE');
	}); 	
}

function getServiceStatus(){
	
	$.ajax({
	url: '/getServiceStatus/',
	type:'GET',
	cache: false
	}).done(function(returnedData)  {
		//console.log(returnedData);
		var status = returnedData.status;
		status = 'ERROR';
		if (!stopShowingModal && status == 'ERROR'){
			$('#errorModal').modal();
		}

	}).fail(function()  {
		console.log('FAILURE');
		});	
}

setInterval(getServiceStatus, 30000);

document.querySelector('#stopShowingModal').addEventListener('click', ()=>{
	stopShowingModal = true;	
});

