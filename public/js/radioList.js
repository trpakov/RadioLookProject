// window.addEventListener('load', (event) => {
	// if(false) $('#errorModal').modal({backdrop: 'static', keyboard: false});
// });

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
		status = 'ERROR';
		if (status == 'ERROR'){
			$('#errorModal').modal();
		}

	}).fail(function()  {
		console.log('FAILURE');
		});	
}

setInterval(getServiceStatus, 10000);