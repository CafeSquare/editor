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

// TRASH H1

       $(document).ready(function() {
           //Step 1: set up the slider with some options. The valid values for opacity are 0 to 1
           //Step 2: Bind an event so when you slide the slider and stop, the following function gets called
           $('#slider').slider({ min: 0, max: 1, step: 0.1, value: 1 })
               .bind("slidechange", function() {
                   //get the value of the slider with this call
                   var o = $(this).slider('value');
                   //here I am just specifying the element to change with a "made up" attribute (but don't worry, this is in the HTML specs and supported by all browsers).
                   var e = '#' + $(this).attr('data-wjs-element');
                   $(e).css('opacity', o)
               });
       });

       // SHOW THE SLIDER //

       $('.editorOpacity').click(function() {
       $('#box').css('display', 'block');
       $('#box').addClass ('animated slideInLeft');
       });
