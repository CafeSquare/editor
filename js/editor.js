$(document).ready(function() {

var editor = "#theEditor";

// editor left
$(editor).append("<div class='editor'>\
<div class='editorColors'></div>\
<div class='editorImages'></div>\
<div class='editorImagesClose'></div>\
<div class='browse'></div>\
<div class='editorOpacity'></div>\
<div class='editorOpacityOff'></div>\
<div id='slider' data-wjs-element='header'></div>\
<div id='box-slider'></div>\
<div class='editortrash animated flipInX'></div>\
<div class='editorAddJumbotron animated flipInX'></div>\
</div>");

// editor right
$(editor).append("<div class='editorRight'>\
<div class='editorLeftH1'></div>\
<div class='editorCenterH1'></div>\
<div class='editorRightH1'></div>\
</div>");

// editor IN
$('.editor').addClass ('animated slideInLeft');
$('.editorRight').addClass ('animated slideInRight');

// editor images
$(".editorImages").append('<i class="fa fa-camera"></i>');
$(".editorImagesClose").append('<i class="fa fa-camera"></i>');

// editor browse images > //
$('.editorImages').click(function() {
$('.browse').removeClass ('animated fadeOut');
$('.browse').addClass ('animated fadeIn');
$('.browse').css('display', 'block');
$('.editorImagesClose').css('display', 'block');
$('.editorImages').css('display', 'none');
});

// editor browse images < //
$('.editorImagesClose').click(function() {
$('.browse').removeClass ('animated fadeIn');
$('.browse').addClass ('animated fadeOut');
$('.editorImagesClose').css('display', 'none');
$('.editorImages').css('display', 'block');
});

// editor upload images //
$(".browse").append('<label class="fileUpload">\
<input id="uploadBtn" type="file" class="upload" accept="image/gif, image/jpeg, image/png" onchange="readURL(this);" />\
<span class="uploadBtn">Upload</span>\
</label>\
');

// editor opacity
$(".editorOpacity").append('<i class="fa fa-adjust"></i>');
$(".editorOpacityOff").append('<i class="fa fa-adjust"></i>');

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
                $(e).css('background-color', 'rgba(0, 0, 0, ' + o + ')');
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

    // editor trash / add
    $(".editortrash").append('<i class="fa fa-trash-o"></i>');
    $(".editorAddJumbotron").append('<i class="fa fa-plus"></i>');

    // DELETE JUMBOTRON.

    $('.editortrash').click(function() {
    $('.jumbotron').show().delay(500).fadeOut();
    $('.editorAddJumbotron').css('display', 'block');
    $('.editortrash').css('display', 'none');
    });

    // ADD JUMBOTRON.

    $('.editorAddJumbotron').click(function() {
    $('.jumbotron').show().delay(500).fadeIn();
    $('.editorAddJumbotron').css('display', 'none');
    $('.editortrash').css('display', 'block');
    });


});

// editor colors

$(document).ready(function() {

  $(".editorColors").append('<input type="hidden" id="header" data-control="wheel" value="#0FFADC" />');

  // #header colour

  $('#header').minicolors()

  // update table colour after changes in the colour picker
  $("#header").on('change', function() {
  var newCol = $(this).parent().find('.minicolors-swatch-color').attr('style');

  $('.colourChosen').attr('style', newCol);

  });

});

// DELETE THE TRIGGER EDITOR
// DELETE MINICOLORS
