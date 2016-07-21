// DRAGGABLE

// DRAG WITHOUT SNAP

//  $( function() {
//    $( "#draggable-section" ).draggable();
//  } );

// DRAG & SNAP.

$( function() {
$( "#draggable-section" ).draggable({ snap: ".ui-widget-header" });
} );


// DRAG & DROP.

$( function() {
    $( "#draggable-section" ).draggable();
    $( "#droppable" ).droppable({
      drop: function( event, ui ) {
        $( this )
          .addClass( "ui-state-highlight" )
          .find( "p" )
            .html( "Dropped!" );
      }
    });
  } );


// RESIZE ME.
$( function() {
    $( "#resizable" ).resizable();
  } );

// EDITABLE H1.

$(function(){
    var $div=$('h1'), isEditable=$div.is('.editable');
    $('h1').prop('contenteditable',!isEditable).toggleClass('editable');
})

// EDITABLE TEXT JUMBOTRON.

$(function(){
    var $div=$('p.the-title'), isEditable=$div.is('.editable');
    $('p.the-title').prop('contenteditable',!isEditable).toggleClass('editable');
})

// EDITABLE CALL-TO-ACTION JUMBOTRON.

$(function(){
    var $div=$('.btn-primary'), isEditable=$div.is('.editable');
    $('.btn-primary').prop('contenteditable',!isEditable).toggleClass('editable');
})

// EDITABLE BRAND.

$(function(){
    var $div=$('.navbar-brand'), isEditable=$div.is('.editable');
    $('.navbar-brand').prop('contenteditable',!isEditable).toggleClass('editable');
})

// COLOR PICKER

$('#wheel-demo').minicolors({
    value: '#cc0000'
});

// TRASH HEADER

  $('.blocktrash').click(function() {
  $('#header').css('background-color', 'blue');
  $('#header').addClass ('animated slideOutUp');
  });

// EDITOR COLOR HEADER

$('.colors-list li').click(function(e) {
    var color = $(this).text();
    $('.results').css('background-color', color);
});
