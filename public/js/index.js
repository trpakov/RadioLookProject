var dbAccessSpan = document.querySelector('#db-access-time');
var iceAccessSpan = document.querySelector('#icecast-access-time');
var metaAccessSpan = document.querySelector('#metacast-access-time');

var dbCard = document.querySelector('#db-card');
var iceCard = document.querySelector('#icecast-card');
var metaCard = document.querySelector('#metacasst-card');
var statusCards = document.querySelectorAll('.status-card');

var dbCardText = document.querySelector('#db-text-span');
var iceCardText = document.querySelector('#ice-text-span');
var metaCardText = document.querySelector('#meta-text-span');
var cardTexts = document.querySelectorAll('.card-text-span');

var dbCardTitle = document.querySelector('#db-card-title');
var iceCardTitle = document.querySelector('#icecast-card-title');
var metaCardTitle = document.querySelector('#metacast-card-title');
var cardTitles = document.querySelectorAll('.card-title');

function getServiceStatus(){
	
	$.ajax({
	url: window.location.pathname + 'getServiceStatus/',
	type:'GET',
	cache: false
	}).done(function(returnedData)  {
		//console.log(returnedData);
		var status = returnedData.status;
		
		dbAccessSpan.textContent = new Date(returnedData['db-access-time']).toLocaleString('en-GB');
		iceAccessSpan.textContent = new Date(returnedData['db-access-time']).toLocaleString('en-GB');
		metaAccessSpan.textContent = new Date(returnedData['db-access-time']).toLocaleString('en-GB');		
		
		if(status == 'OK'){
			statusCards.forEach(x => {
				x.classList.remove('bg-danger');
				x.classList.add('bg-success');				
			});
			cardTexts.forEach(x => {
				x.textContent = 'Последен достъп: ';
			});
			cardTitles.forEach(x => {
				x.textContent = 'Състояние: ' + (x.id == 'db-card-title' ? 'ДОСТЪПНА' : 'ОНЛАЙН');
			});
		}
		else {
			if(!returnedData.icecast){
				iceCard.remove('bg-success');
				iceCard.add('bg-danger');
				iceCardText.textContent = 'Последен опит за достъп: ';
				iceCardTitle.textContent = 'Състояние: ОФЛАЙН';
			}
			
			if(!returnedData.metacast){
				metaCard.remove('bg-success');
				metaCard.add('bg-danger');
				metaCardText.textContent = 'Последен опит за достъп: ';	
				metaCardTitle.textContent = 'Състояние: ОФЛАЙН';

			}			
		}

	}).fail(function()  {
		console.log('FAILURE');
		});	
}

setInterval(getServiceStatus, 10000);

