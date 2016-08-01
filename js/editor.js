$(document).ready(function() {

var editor = "#theEditor";

$(editor).append("<div class='editor'>\
<div class='editorColors'></div>\
<div class='editorImages'></div>\
<div class='editorImagesOpen'></div>\
<div class='browse'></div>\
<div class='editortrash'></div>\
</div>");

$(editor).append("<div class='editorRight'>\
<div class='editorLeftH1'></div>\
<div class='editorCenterH1'></div>\
<div class='editorRightH1'></div>\
</div>");

// TRIGGER EDITOR OFF  < //
$('.editor').addClass ('animated slideInLeft');
$('.editorRight').addClass ('animated slideInRight');

// DELETE THE TRIGGER EDITOR

});
