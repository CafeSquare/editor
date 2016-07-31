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
$('#editorRight').removeClass ('slideInRight');
$('#editorRight').addClass ('slideOutRight');
$('.editorOpenRight').css ('display', 'block');
$('.editorCloseRight').css ('display', 'none');
});

// TRIGGER EDITOR RIGHT ON  < //

$('.editorOpenRight').click(function() {
$('#editorRight').removeClass ('slideOutRight');
$('#editorRight').addClass ('slideInRight');
$('.editorOpenRight').css ('display', 'none');
$('.editorCloseRight').css ('display', 'block');
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
$('.jumbotron').show().delay(200).fadeOut();
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

        $(".h1-selected").css("display","block");
        $(".h2-selected").css("display","none");

        $(".editorBox").addClass("animated slideInRight");
        $('.editorCloseRight').css("display","block");

        $('.regularMe').css("display","none");


    });
});

// H2 EDITOR.

$(function() {
    $("h2").focus( function() {

        $("#editorRightH2").css("display","block");
        $("#editorRight").css("display","none");

        $(".h1-selected").css("display","none");
        $(".h2-selected").css("display","block");

        $(".editorBox").addClass("animated slideInRight");
        $('.editorCloseRight').css("display","block");


        /* $(".alignMeLeft").css("display","none");
        $(".alignMeCenter").css("display","none");
        $(".alignMeRight").css("display","none");
        $(".alignMeLeft-h2").css("display","block");
        $(".alignMeCenter-h2").css("display","block");
        $(".alignMeRight-h2").css("display","block");
        $(".boldMe-h2").css("display","block");
        $(".boldMe").css("display","none");
        $(".regularMe-h2").css("display","none");
        $(".regularMe").css("display","none"); */
  });
});

// H1 EDITOR.

/* $(function() {
    $("h1").focus( function() {
        $(".h1-selected").css("display","block");
        $(".h2-selected").css("display","none");

        $("#editorRightH2").css("display","none");
        $("#editorRight").css("display","block");


        $(".alignMeLeft").css("display","block");
        $(".alignMeCenter").css("display","block");
        $(".alignMeRight").css("display","block");
        $(".alignMeLeft-h2").css("display","none");
        $(".alignMeCenter-h2").css("display","none");
        $(".alignMeRight-h2").css("display","none");

        $(".editorBoxRegular").css("display","none");

        $(".boldMe").css("display","block");
        $(".regularMe").css("display","none");
        $(".boldMe-h2").css("display","none");
        $(".regularMe-h2").css("display","none");
  });
});
*/

// H1/H2 ALIGNMENT + FONT WEIGHT

$('.alignMeLeft').click(function() {
$("h1").css("text-align", "left");
});

$('.alignMeRight').click(function() {
$("h1").css("text-align", "right");
});

$('.alignMeCenter').click(function() {
$("h1").css("text-align", "center");
});

$('.alignMeLeft-h2').click(function() {
$("h2").css("text-align", "left");
});

$('.alignMeRight-h2').click(function() {
$("h2").css("text-align", "right");
});

$('.alignMeCenter-h2').click(function() {
$("h2").css("text-align", "center");
});

$('.boldMe').click(function() {
$('h1').css ('font-weight', '700');
$('.regularMe').css ('display', 'block');
$('.BoldMe').css ('display', 'none');
});

$('.regularMe').click(function() {
$('h1').css ('font-weight', '500');
$('.regularMe').css ('display', 'none');
$('.BoldMe').css ('display', 'block');
});

$('.boldMe-h2').click(function() {
$('h2').css ('font-weight', '700');
$('.regularMe-h2').css ('display', 'block');
$('.boldMe-h2').css ('display', 'none');
});

$('.regularMe-h2').click(function() {
$('h2').css ('font-weight', '500');
$('.boldMe-h2').css ('display', 'block');
$('.regularMe-h2').css ('display', 'none');
});

// H1 BOLD - REGULAR SELECTOR

$('.editorBox.row-4').click(function() {
$('.editorBox.row-4').css ('display', 'none');
$('.editorBoxRegular').css ('display', 'block');
});

$('.editorBoxRegular').click(function() {
$('.editorBox.row-4').css ('display', 'block');
$('.editorBox.row-4').removeClass ('slideInRight');
$('.editorBoxRegular').css ('display', 'none');
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
