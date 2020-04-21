$(".popupElement").each(function() { var $this = $(this); $this.popover({ trigger: "focus"}) });

function updateCurrentSong(){
	
	$.ajax({
	url: window.location.pathname + /updateCurrentSong/,
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
		}

}).fail(function()  {
		console.log('FAILURE');
});
		
}

setInterval(updateCurrentSong, 10000);