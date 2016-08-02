/*
 * MetaBuilder: The Engine behind SquareOne
 *
 * Copyright: Andres Buzzio https://andresbuzzio.github.io/portfolio
 *
 */

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

// EDITABLE H3

$(function(){
    var $div=$('h3'), isEditable=$div.is('.editable');
    $('h3').prop('contenteditable',!isEditable).toggleClass('editable');
})

// EDITABLE TEXT JUMBOTRON.

$(function(){
    var $div=$('h2.subtitle'), isEditable=$div.is('.editable');
    $('h2.subtitle').prop('contenteditable',!isEditable).toggleClass('editable');
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

// EDITABLE COLUMNS

$(function(){
    var $div=$('.col-md-4'), isEditable=$div.is('.editable');
    $('.col-md-4').prop('contenteditable',!isEditable).toggleClass('editable');
})

// TRIGGER EDITOR OFF  < //

$('.editorClose').click(function() {
$('#editor').removeClass ('slideInLeft');
$('#editor').addClass ('slideOutLeft');
$('.editorOpen').css ('display', 'block');
$('.editorClose').css ('display', 'none');
});

// TRIGGER EDITOR ON  > //

$('.editorOpen').click(function() {
$('#editor').removeClass ('slideOutLeft');
$('#editor').addClass ('slideInLeft');
$('.editorOpen').css ('display', 'none');
$('.editorClose').css ('display', 'block');
});

// TRIGGER EDITOR RIGHT OFF  > //

$('.editorCloseRight').click(function() {
$('#editorRightH2').css ('display', 'none');
$('#editorRight').removeClass ('slideInRight');
$('#editorRight').addClass ('slideOutRight');
$('.editorOpenRight').css ('display', 'block');
$('.editorCloseRight').css ('display', 'none');
$('.h1-selected').css ('display', 'none');
});

// TRIGGER EDITOR RIGHT ON  < //

$('.editorOpenRight').click(function() {
$('#editorRight').removeClass ('slideOutRight');
$('#editorRight').addClass ('slideInRight');
$('.editorOpenRight').css ('display', 'none');
$('.editorCloseRight').css ('display', 'block');
$('.h1-selected').css ('display', 'block');
});

// TRIGGER EDITOR RIGHT OFF  > //

$('.editorCloseRightH2').click(function() {
$('#editorRight').css ('display', 'none');
$('#editorRightH2').removeClass ('slideInRight');
$('#editorRightH2').addClass ('slideOutRight');
$('.editorOpenRightH2').css ('display', 'block');
$('.editorCloseRightH2').css ('display', 'none');
$('.h2-selected').css ('display', 'none');
});

// TRIGGER EDITOR RIGHT ON  < //

$('.editorOpenRightH2').click(function() {
$('#editorRightH2').removeClass ('slideOutRight');
$('#editorRightH2').addClass ('slideInRight');
$('.editorOpenRightH2').css ('display', 'none');
$('.editorCloseRightH2').css ('display', 'block');
$('.h2-selected').css ('display', 'block');
});

// COLOR PICKER


// H2 COLOUR

$('#h2').minicolors()

$("#h2").on('change', function() {
//var newCol = $(this).parent().find('.minicolors-swatch-color').css("color");
var newCol = $(this).parent().find('.minicolors-swatch-color').attr('style');

// USE CSS NOT ATTRIB
$('.h2colour').css("color", newCol);
});

// H2 EDITOR.

$(function() {
    $("h2").focus( function() {

        $("#editorRightH2").css("display","block");
        $("#editorRight").css("display","none");
        $(".editorOpenRight").css("display","none");
        $(".editorCloseRight").css("display","none");
        $(".editorCloseRightH2").css("display","block");

        $(".h2-selected").css("display","block");
        $(".h1-selected").css("display","none");

        $("#editorRightH2").addClass("animated slideInRight");
        $("#editorRight").removeClass("animated slideOutRight");

        // none of the editorBoxes apart of the BOLD option
        $(".editorBoxBoldH2").css("display","block");
        $(".boldMeH2").css("display","block");
        $(".editorBoxRegularH2").css("display","none");
        $(".editorBoxRegular").css("display","none");

    });
});

// buttonJumbotron EDITOR

$(function() {
    $("#buttonJumbotron").focus( function() {

    $("#buttonJumbotron").after( '<div class="deleteJumbotron"><i class="fa fa-trash-o small-trash"></i></div>' );
    $(".deleteJumbotron").css("display", "block");

    });
});

$('.deleteJumbotron').click(function() {
$("#buttonJumbotron").css("display", "none");
});

// UPLOAD IMAGE

function readURL(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#header-image')
                    .attr('src', e.target.result)
                    .width('100%')
                    .height('auto');
            };

            reader.readAsDataURL(input.files[0]);
        }
    }

// STORE THE DESIGN
