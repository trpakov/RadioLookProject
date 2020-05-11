var stopShowingModal = false;

$(".popupElement").each(function() { 
	var $this = $(this); 
	$this.popover({ 
		trigger: "focus"
	});
});

function getServiceStatus(){
	
	$.ajax({
	url: '/getServiceStatus/',
	type:'GET',
	cache: false
	}).done(function(returnedData)  {
		//console.log(returnedData);
		var status = returnedData.status;
		//status = 'ERROR';
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