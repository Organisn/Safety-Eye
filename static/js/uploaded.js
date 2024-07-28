// Wait for document to be fully loaded before running script
$(function(){
    // Display configurators
    $('input[name=detection]').on('click', function() {
        // Hide every configurator
        $('.subConfigurator').hide();
        $('.configurator').hide();
        // Display only selected
        $('#' + $(this).attr('id') + 'Configurator').show();
        if ($(this).attr('id') == 'interference' && $('#interferences').is(':checked')) 
            $('#interferencesConfigurator').show(); 
    });

    $('#reset').on('click', function() {
        // Hide every configurator and subconfigurator
        $('.subConfigurator').hide();
        $('.configurator').hide();
    });
    // Display interferences configurator
    $('#interferences').on('click', function() {
        if($(this).is(':checked')) {
            // Cannot detect interferences without before detect people and their own vests
            $('#people').prop('checked', true);
            $('#people').attr('disabled', true);
            $('#suits').prop('checked', true);
            $('#suits').attr('disabled', true);
            $('input[name=interdiction]').prop('checked', true);
            $('#interferencesConfigurator').show();
        } else {
            $('#people').attr('disabled', false);
            $('#people').prop('checked', false);
            $('#suits').attr('disabled', false);
            $('#suits').prop('checked', false);
            $('input[name=interdiction]').prop('checked', false);
            $('#interferencesConfigurator').hide();
        }
    });
    // Team membership is highlighted within people labels
    $('#teams').on('click', function() {
        if($(this).is(':checked')) {
            $('#people').prop('checked', true);
            $('#people').attr('disabled', true);
        }
        else {
            $('#people').attr('disabled', false);
            $('#people').prop('checked', false);
        }
    });
    // Canvases setup
    let shapeCanvas = document.getElementById("shapeCanvas");
    const shapeCtx = shapeCanvas.getContext("2d");
    let pickCanvas = document.getElementById("pickCanvas");
    const pickCtx = pickCanvas.getContext("2d");
    let img;
    // Fill canvas with image once this one is loaded
    //$('#canvasImage').on('load', function(){
        // const video = document.getElementById("resource");
        // // Set canvas dimensions same as video source dimensions
        // canvas.width = video.width;
        // canvas.heigth = video.height;
        img = document.getElementById("canvasImage");
        // Resize image
        img.width = Math.round(img.width / 2);
        img.height = Math.round(img.height / 2);
        // Set canvases dimensions same as image dimensions
        shapeCanvas.width = img.width;
        shapeCanvas.height = img.height;
        pickCanvas.width = img.width;
        pickCanvas.height = img.height;
        // Fill hidden input value with canvas dimensions
        // to let server maintain proportions during video editing
        $('input[name="canvas-dimensions"]').val(`(${img.width}, ${img.height})`);
        // Fill canvases with first video frame
        // ctx.drawImage(video, 0, 0, video.width, video.height);
        shapeCtx.drawImage(img, 0, 0, img.width, img.height);
        pickCtx.drawImage(img, 0, 0, img.width, img.height);
    //});
    // New shape as array of points
    let actualShape = [];
    // Enable shaper
    $('#shaper').on('click', function() {
        $('#shaperContainer').toggle();
    });
    // Get mouse click coordinates,
    // draw it on canvas 
    // and store it in last shape points array
    // only if not already picked in componing shape
    $('#shapeCanvas').on('mouseup', function(e){
        let vertex = shapeVertex(shapeCanvas, actualShape, e)
        if (vertex.length == 2) 
            actualShape.push(vertex);
    });
    // Clear actual shape on reset button click
    $('#shapeEraser').on('click', function() {
        actualShape = [];
        shapeCtx.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
        // Redraw first video frame
        shapeCtx.drawImage(img, 0, 0, img.width, img.height);
    });
    // Clear actual shape on save button click -> must save a checkbox with point list as value
    $('#shapeSaver').on('click', function() {
        // Check if at least 3 vertex have been selected
        if (actualShape.length >= 3) {
            // Check if already saved
            // Pick all already saved shapes
            // and compare text content
            let alreadyShaped = false;
            $('#shapes li').each(function(){
                if ($(this).text() == actualShape.toString()) alreadyShaped = true;
            });
            if (alreadyShaped) alert('Already shaped');
            else {
                shapeCtx.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
                // Redraw first video frame
                shapeCtx.drawImage(img, 0, 0, img.width, img.height);
                // Add shape to list to let user remember its composition
                $("#shapes").append(`<li>${actualShape}</li>`);
                // Add button to ruler container to let user associate area to teams
                // To let the shape points list be used as selectable jQuery id
                // ',' can't be used as separator between each coordinate in string converted array
                // Put an underscore between coords instead
                let validShape = actualShape.toString().replaceAll(',', '_');
                $('#areasContainer').append(`<div class="colorSaver">
                    <label for="${validShape}">${actualShape}</label>
                    <input type="button" id="${validShape}" value="Associate to teams">
                    </div>`);
                // Append event listener to show teams container on every association button
                $(`#${validShape}`).on('click', function(){
                    if ($('#teamsContainer').is(":hidden")) {
                        // Reset selections
                        $('#teamsContainer div input').each(function(){
                            $(this).prop('checked', false);
                        });
                        // Fill title with coords
                        $('#areaToJoinTo').text(validShape);
                        $('#teamsContainer').css('display', 'inline-block');
                    } else $('#teamsContainer').css('display', 'none');
                });
                actualShape = [];
            }   
        } else alert('Select at least 3 point to close a polygonal shape');
    });
    // Enable teams definer
    $('#picker').on('click', function() {
        $('#pickerContainer').toggle();
    });
    // Get mouse click coordinates
    // Get clicked point colour 
    // and update html input color value 
    $('#pickCanvas').on('mouseup', function(e){
        let vertex = [];
        // Click coordinates
        if(e.offsetX) 
            vertex.push(e.offsetX, e.offsetY);
        else if(e.layerX) 
            vertex.push(e.layerX, e.layerY);
        // RGB point colour (first 3 of the 4 returned list items)
        // getImageData() return data referred to pixels included into the input rectangle
        // This case rectangle is 1 pixel wide and 1 pixel tall
        // because data are required only for clicked point
        pointColour = pickCtx.getImageData(vertex[0], vertex[1], 1, 1).data;
        // Input picked colour on html color picker
        $('#color').val(rgb2hex(pointColour));
    });
    // Define new team if not already saved
    $('#colorSaver').on('click', function() {
        let alreadyPicked = false;
        // Check if a div colour from list corresponds to just picked colour
        $('#colors li div').each(function(){
            // CSS bg-color property is RGB or RGBA formatted
            // Must convert color values from HTML elements to compare them to those coming from CSS
            if ($(this).css('background-color') == hex2rgb($('#color').val())) alreadyPicked = true;
        });
        if (alreadyPicked) alert('Already picked');
        else {
            // Add color to list to let user view defined team
            $("#colors").append(`<li><div style="background-color:${$('#color').val()};width:25px;height:25px;margin-bottom:1px;"></div></li>`);
            // Add selectable team color to associater
            $('#assocSaverContainer').before(`<div class="colorSaver">
                <input type="checkbox" id="${$('#color').val()}">
                <label for="${$('#color').val()}">
                    <div style="background-color:${$('#color').val()};width:10px;height:10px;margin-bottom:2px;display:inline-block;">
                    </div>
                </label>
                </div>`);
        }
    });
    // Enable associater
    $('#associater').on('click', function() {
        if ($('#areasContainer').is(":hidden")) {
            // Check if at least one area and one team have been already defined before show associater 
            let canBeEnabled = false;
            if ($('#shapes li').length && $('#colors li').length) canBeEnabled = true; 
            if (canBeEnabled) $('#areasContainer').css('display', 'inline-block');
            else alert('Define at least one area and one team first');
        } else $('#areasContainer').css('display', 'none');
    });
    // Save new association
    $('#assocSaver').on('click', function(){
        // Check if at least one team has been selected
        let selection = false;
        $("#teamsContainer div input[type='checkbox']").each(function(){
            if ($(this).is(':checked')) selection = true;
        });
        if (selection) {
            // Get referred shape
            let shape = $('#areaToJoinTo').text();
            // Format shape as array of points as arrays
            shapePoints = [];
            // Each coordinate is separated by an underscore
            coords = shape.split('_');
            // Temporary point value to be updated
            point = [];
            // Match coords into points
            coords.forEach(coord => {
                if (point.length < 2) point.push(parseInt(coord));
                if (point.length == 2) {
                    // Cannot directly push point array because
                    // after the next instruction 
                    // the corresponding item in shape array would be cleared too
                    shapePoints.push([point[0], point[1]]);
                    // Clear point to let it host new coordinates
                    point.length = 0;
                }
            });
            // Get choosen colors
            let colors = [];
            $("#teamsContainer div").each(function(){
                if ($(this).children('input[type="checkbox"]').is(':checked'))
                    // Remove 'rgb' sign before push
                    colors.push($(this).find("div").css("background-color").slice(3));
            });
            // Assemble each association between area and teams in an object
            let rule = {
                shape: shapePoints,
                teams: colors
            };
            // Check if rule is already setted
            // First: is already there a rule for the quested area?
            let areaAlreadyListed = false;
            // Rule which eventually already refers to such area
            let itemRule;
            // Compare each already listed area
            $('#rules li div input').each(function(){
                // Parse value to read referred area
                let value = $(this).val();
                let newItemRule = JSON.parse(value);
                equalShapes = true;
                if (newItemRule.shape.length == rule.shape.length) {
                    for (let i = 0; i < newItemRule.shape.length; i++) {
                        if (newItemRule.shape[i][0] != rule.shape[i][0] || 
                            newItemRule.shape[i][1] != rule.shape[i][1]) {
                            equalShapes = false;
                            break;
                        }
                    }
                } else equalShapes = false;
                if (equalShapes) {
                    areaAlreadyListed = true;
                    itemRule = newItemRule;
                }
            });
            if (areaAlreadyListed) {
                // Second: are selected teams already linked to area in that rule?
                rule.teams.forEach(team => {
                    // Add team to rule if not already listed
                    if (!itemRule.teams.includes(team)) {
                        stringedItemRule = JSON.stringify(itemRule).replaceAll("\"", "\\\"");
                        itemRule.teams.push(team);
                        stringedUpdatedItemRule = JSON.stringify(itemRule);
                        // Reformulate input id and value
                        $(`#rules li div input[value="${stringedItemRule}"]`)
                        .attr("value", stringedUpdatedItemRule)
                        .prop("id", stringedUpdatedItemRule);
                        // Re-anchor input label and append team marker to it
                        $(`#rules li div label[for="${stringedItemRule}"]`)
                        .attr('for', stringedUpdatedItemRule)
                        .append(`<div style="background-color:rgb${team};width:10px;height:10px;margin-bottom:2px;margin-left:2px;display:inline-block;">
                        </div>`);
                    } else alert(`Rule already established for team ${team} and area ${itemRule.shape}`);
                });
            } else {
                // Append rule to list
                // Display checkboxes and shape
                // Convert to string for request transmission
                stringedRule = JSON.stringify(rule);
                // Don't let double quotes in stringed JSONs to interfere with HTML decoding or jQuery selectors
                stringedRule = stringedRule.replaceAll("\"", "&quot;");
                $('#rules').append(`<li>
                    <div class="colorSaver">
                        <input type="checkbox" name="rule" value="${stringedRule}" id="${stringedRule}" checked>
                        <label for="${stringedRule}">
                            <p class="inline">
                                ${shape}
                            </p>
                        </label>
                    </div>
                </li>`);
                // Add teams as coloured squares to checkbox labels
                // Don't let double quotes in stringed JSONs to interfere with jQuery selectors
                stringedRule = stringedRule.replaceAll("&quot;", "\\\"");
                rule.teams.forEach(color => {
                    $(`#rules li div label[for="${stringedRule}"]`)
                    .append(`<div style="background-color:rgb${color};width:10px;height:10px;margin-bottom:2px;margin-left:2px;display:inline-block;">
                    </div>`);
                });
            }
        } else alert('Select at least one team to invest');
    });
    // Check if at least one detailed selection (by checkboxing) has been made on submission
    $('form').submit(function(e){
        // Check if at least one rule is selected
        let selectedARule = false;
        // First check if rules already setted
        if ($('#rules li').length) {
            $('#rules li div input').each(function(){
                if ($(this).is(':checked')) selectedARule = true;
            });
        }
        if (!($('#interference').is(':checked') || $('#pose').is(':checked'))) {
            alert('No selection');
            e.preventDefault(e);
        }
        // Check details both for PPE and Detection...
        else if ($('#interference').is(':checked')) {
            if(!($('#people').is(':checked') ||
            $('#helmets').is(':checked') ||
            $('#suits').is(':checked'))) {
                alert('Send only detailed request');
                e.preventDefault(e);
            }
            else if ($('#interferences').is(':checked')) {
                if (!selectedARule) {
                    alert('Send only detailed interference detection request');
                    e.preventDefault(e);
                }
            }
        }
        // ... And Pose
        else if ($('#pose').is(':checked')) {
            if(!($('#upstanding').is(':checked') ||
            $('#walking').is(':checked') ||
            $('#sitting').is(':checked') ||
            $('#lyingdown').is(':checked') ||
            $('#standingup').is(':checked') ||
            $('#sittingdown').is(':checked') ||
            $('#fallendown').is(':checked'))) {
                alert('Send only detailed request');
                e.preventDefault(e);
            }
        }
    });
});

// Get click position over canvas element
// Reject if already saved
// Eventually draw
function shapeVertex(canvas, points, event) { // Points as array of points coordinates
    let rect = canvas.getBoundingClientRect(); 
    let x = event.clientX - rect.left; 
    let y = event.clientY - rect.top;
    x = Math.round(x);
    y = Math.round(y);
    for (let point of points) {
        if (point[0] == x && point[1] == y) {
            alert('Already clicked');
            return []
        }
    }
    let ctx = canvas.getContext("2d");
    ctx.beginPath();
    // Draw point on canvas
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    // Fill it with orange
    ctx.fillStyle = 'yellow';
    ctx.fill();
    // Draw point border
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff6600';
    ctx.stroke();   
    return [x, y];
}

// Convert an array represented rgb colour to stringed hexadecimal one
function rgb2hex(rgb) {
    // Convert each colour component to stringed hexadecimal corresponding value
    // and fill eventual omitted 0s (this happen when value is less than 16: 
    // 15 would become 'f' instead of '0f', which is required)
    let hexR = rgb[0].toString(16);
    hexR = hexR.padStart(2, '0');
    let hexG = rgb[1].toString(16);
    hexG = hexG.padStart(2, '0');
    let hexB = rgb[2].toString(16);
    hexB = hexB.padStart(2, '0');
    return `#${hexR}${hexG}${hexB}`;
}

// Function to convert hex format to RGB like 'rgb(r, g, b)'
// Hex value comes as a string here
function hex2rgb(hex) {
    // Remove '#'
    hex = hex.slice(1);
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
}

// # To be checked
// Wait till video is loaded by browser
// Could be useful if don't want to wait the video to be loaded with the rest of the document
// $('#resource').on('loadmetadata', function() {
//     const canvas = $("#shapeCanvas");
//     // Set canvas dimensions same as video source dimensions
//     canvas.attr('width', $(this).attr('width'));
//     canvas.attr('height', $(this).attr('height'));
//     const ctx = canvas.getContext("2d");
//     // const video = $("#resource");
//     ctx.drawImage($(this), 0, 0, $(this).attr('width'), $(this).attr('height'));
// });