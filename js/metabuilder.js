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

// SLIDER OPACITY.

    $(document).ready(function() {
        //Step 1: set up the slider with some options. The valid values for opacity are 0 to 1
        //Step 2: Bind an event so when you slide the slider and stop, the following function gets called
        $('#slider').slider({ min: 0, max: 1, step: 0.1, value: 1 })
            .bind("slidechange", function() {
                //get the value of the slider with this call
                var o = $(this).slider('value');
                //the element to change with an attribute
                var e = '#' + $(this).data('wjs-element');
                // $(e).css('background-color', 'rgba(0, 0, 0, ' + o + ')');
                $(e).css('opacity', o);
            });
    });

    // OPACITY SLIDER ON //

    $('.editorOpacity').click(function() {
    $('#box-slider').addClass ('animated fadeIn');
    $('#box-slider').removeClass ('fadeOut');
    $('#box-slider').css('display', 'block');
    $('.editorOpacityOff').css('display', 'block');
    $('.editorOpacity').css('display', 'none');
    $('#slider').css('display', 'block');
    });

    // OPACITY SLIDER OFF //

    $('.editorOpacityOff').click(function() {
    $('#box-slider').addClass ('fadeOut');
    $('#box-slider').removeClass ('fadeIn');
    $('#box-slider').css('display', 'none');
    $('.editorOpacity').css('display', 'block');
    $('.editorOpacityOff').css('display', 'none');
    $('#slider').css('display', 'none');
    });

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
// HEADER COLOUR

$('#header').minicolors()

// update table colour after changes in the colour picker
$("#header").on('change', function() {
var newCol = $(this).parent().find('.minicolors-swatch-color').attr('style');

$('.colourChosen').attr('style', newCol);

});

// H1 COLOUR

$('#h1').minicolors()

$("#h1").on('change', function() {
//var newCol = $(this).parent().find('.minicolors-swatch-color').css("color");
var newCol = $(this).parent().find('.minicolors-swatch-color').attr('style');

// USE CSS NOT ATTRIB
$('.h1colour').css("color", newCol);
});

// H2 COLOUR

$('#h2').minicolors()

$("#h2").on('change', function() {
//var newCol = $(this).parent().find('.minicolors-swatch-color').css("color");
var newCol = $(this).parent().find('.minicolors-swatch-color').attr('style');

// USE CSS NOT ATTRIB
$('.h2colour').css("color", newCol);
});


// POSITIONING MINICOLORS-PANELS

$('.editorBox.row-5').click(function() {
$('div.minicolors.minicolors-theme-default').removeClass ('minicolors-position-left');
$('div.minicolors.minicolors-theme-default').addClass ('minicolors-position-right');
});

$('.editorColors').click(function() {
$('div.minicolors.minicolors-theme-default').removeClass ('minicolors-position-right');
$('div.minicolors.minicolors-theme-default').addClass ('minicolors-position-left');
});


// MINICOLORS SETTINGS (WHEEL)

// ADD JUMBOTRON.

$('.editorAddJumbotron').click(function() {
$('.jumbotron').show().delay(500).fadeIn();
$('.editorAddJumbotron').css('display', 'none');
$('.editortrash').css('display', 'block');
});

// DELETE JUMBOTRON.

$('.editortrash').click(function() {
$('.jumbotron').show().delay(500).fadeOut();
$('.editorAddJumbotron').css('display', 'block');
$('.editortrash').css('display', 'none');
});

// BROWSE IMAGES > //

$('.editorImages').click(function() {
$('#browse').addClass ('animated fadeIn');
$('#browse').css('display', 'block');
$('.editorImages').css('display', 'none');
$('.editorImagesOpen').css('display', 'block');
});

// BROWSE IMAGES < //

$('.editorImagesOpen').click(function() {
$('#browse').addClass ('fadeIn');
$('#browse').removeClass ('fadeOut');
$('#browse').css ('display', 'none');
$('.editorImages').css('display', 'block');
$('.editorImagesOpen').css('display', 'none');
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

// H1 EDITOR.

$(function() {
    $("h1").focus( function() {

        $("#editorRight").css("display","block");
        $("#editorRightH2").css("display","none");
        $(".editorCloseRight").css("display","block");
        $(".editorOpenRightH2").css("display","none");
        $(".editorCloseRightH2").css("display","none");

        $(".h1-selected").css("display","block");
        $(".h2-selected").css("display","none");

        $("#editorRight").addClass("animated slideInRight");
        $("#editorRightH2").removeClass("animated slideOutRight");
        $(".editorBox").addClass("animated slideInRight");

        // none of the editorBoxes apart of the BOLD option
        $(".editorBoxBold").css("display","block");
        $(".editorBoxRegularH2").css("display","none");
        $(".editorBoxRegular").css("display","none");


    });
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


// H1/H2 ALIGNMENT + FONT WEIGHT

$('.alignMeLeft').click(function() {
$("h1").css("text-align", "left");
});

$('.alignMeLeftH2').click(function() {
$("h2").css("text-align", "left");
});

$('.alignMeRight').click(function() {
$("h1").css("text-align", "right");
});

$('.alignMeRightH2').click(function() {
$("h2").css("text-align", "right");
});

$('.alignMeCenter').click(function() {
$("h1").css("text-align", "center");
});

$('.alignMeCenterH2').click(function() {
$("h2").css("text-align", "center");
});

$('.editorBoxBold').click(function() {
$('h1').css ('font-weight', '700');
$('.editorBoxRegular').css ('display', 'block');
$('.regularMe').css ('display', 'block');
$('.editorBoxBold').css ('display', 'none');
$('.editorBoxBold').css ('display', 'none');
});

$('.editorBoxRegular').click(function() {
$('h1').css ('font-weight', '400');
$('.editorBoxRegular').css ('display', 'none');
$('.regularMe').css ('display', 'none');
$('.boldMe').css ('display', 'block');
$('.editorBoxBold').css ('display', 'block');
});

$('.editorBoxBoldH2').click(function() {
$('h2').css ('font-weight', '700');
$('.regularMeH2').css ('display', 'block');
$('.editorBoxRegularH2').css ('display', 'block');
$('.editorBoxBoldH2').css ('display', 'none');
$('.boldMeH2').css ('display', 'none');
});

$('.editorBoxRegularH2').click(function() {
$('h2').css ('font-weight', '400');
$('.boldMeH2').css ('display', 'block');
$('.editorBoxBoldH2').css ('display', 'block');
$('.editorBoxRegularH2').css ('display', 'none');
$('.regularMeH2').css ('display', 'none');
});


// FONT SELECTOR

$(function(){
$('#font').fontselect().change(function(){

  // replace + signs with spaces for css
  var font = $(this).val().replace(/\+/g, ' ');

  // split font into family and weight
  font = font.split(':');

  // set family on H1
  $('h1').css('font-family', font[0]);
});
});

$('.font-select > a').click(function() {
$('.fs-drop').addClass ('animated fadeIn');
});

// FONT SELECTOR VISIBLE

$('.editorBox.row-6').click(function() {
$('#browseFonts').css ('display', 'block');
$('#plus-minus').css ('display', 'block');
$('.editorBox.row-6').css ('display', 'none');
$('.editorBoxOff').css ('display', 'block');
});

$('.editorBoxOff').click(function() {
$('#browseFonts').css ('display', 'none');
$('.editorBox.row-6').css ('display', 'block');
$('.editorBox.row-6').removeClass ('slideInRight');
$('.editorBoxOff').css ('display', 'none');
$('#plus-minus').css ('display', 'none');
});

// FONT SIZE

$('.plusFont').click(function() {
// The parseInt() function parses a string and returns an integer

  var fontSize = parseInt($("h1").css("font-size"));
  fontSize = fontSize + 1 + "px";
  $("h1").css({'font-size':fontSize});

});

$('.minusFont').click(function() {
// The parseInt() function parses a string and returns an integer

  var fontSize = parseInt($("h1").css("font-size"));
  fontSize = fontSize - 1 + "px";
  $("h1").css({'font-size':fontSize});

});

// STORE THE DESIGN

$('#saveButton').click(function() {
var options = {
  files: [
      // You can specify up to 100 files.
      {'url': 'http://www.psdwordpress.com/madesmart/index.html'},
      // ...
  ],
};
Dropbox.save(options);
});
