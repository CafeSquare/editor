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
    $( "#header" ).resizable();
  } );

// EDITABLE H1.

$(function(){
    var $div=$('h1.the-title'), isEditable=$div.is('.editable');
    $('h1.the-title').prop('contenteditable',!isEditable).toggleClass('editable');
})

$( "h1.the-title" ).focus(function() {
    $('.blinking-cursor').css('display','none');
})

// EDITABLE TEXT JUMBOTRON.

$(function(){
    var $div=$('p.the-title'), isEditable=$div.is('.editable');
    $('p.the-title').prop('contenteditable',!isEditable).toggleClass('editable');
})

$( "p.the-title" ).focus(function() {
    $('.blinking-cursor').css('display','none');
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
