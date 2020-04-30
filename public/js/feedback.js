// Construct feedback form data object
// feedbackformdata = {
// 'name': $('input[name=name]').val(),
// 'email': $('input[name=email]').val(),
// 'subject': $('input[name=subject]').val(),
// 'message': $('textarea[name=message]').val()
// };

// // construct ajax request using the feedback form data object
// $.ajax({
// url : "",
// type: "post",
// data : feedbackformdata,
// success: function(data, textstatus, jqxhr)
// {
// console.log(data.message);

// //if feedback was sent successfully, empty the form.
// if (data.code) 
	// $('#contact-form').closest('form').find("input[type=text], textarea").val("");
	// },
	// error: function (jqxhr, textstatus, errorthrown){
			// console.log(jqxhr);
		// });
		
const $form = $('#contact-form')

$form.on('submit', submitHandler)

function submitHandler (e) {
	e.preventDefault()

	var formArray = $form.serializeArray();
	
	var returnArray = {};
	for (var i = 0; i < formArray.length; i++){
		returnArray[formArray[i]['name']] = formArray[i]['value'];
	}
	returnArray['$timestamp'] = new Date().valueOf();

	$.ajax({
	url: '',
	type:'POST',
	data: JSON.stringify(returnArray),
	contentType:"application/json; charset=utf-8"
	}).done(function()  {
		$('#feedbackSuccessModal').modal({backdrop: 'static', keyboard: false});
}).fail(function()  {
		$('#feedbackErrorModal').modal({backdrop: 'static', keyboard: false});
}); 
}