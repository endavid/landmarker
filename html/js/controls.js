import $ from './jquery.module.js';
import UiUtils from './uiutils.js';

// Unfortunately, I wasn't able to import saveAs as a module
const { saveAs } = window;

const landmarkPresets = [
  { name: "left eye", value: "LEye" },
  { name: "right eye", value: "REye" },
  { name: "nose", value: "Nose" },
];

let annotations = {};

const landmarkIcon = new Image();
landmarkIcon.src = './resources/dot_circle.png';

function setInfo(text) {
  $('#infoDiv').text(text);
}

function setWarning(text) {
  setInfo(`[WARNING] ${text}`);
}

function setError(e) {
  console.error(e);
  setInfo(`[ERROR] ${e}`);
}

function progressBarUpdate(ratio) {
  const percentage = Math.round(100 * ratio);
  $('#progressBar').css('width', `${percentage}%`);
}

// https://stackoverflow.com/a/17130415/1765629
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function getSelectedLandmark() {
  return $('#landmark').val();
}

function updateLandmarkPosition(imageId, position) {
  const landmark = getSelectedLandmark();
  annotations[imageId][landmark] = {x: position.x, y: position.y};
}

function saveLandmarks() {
  const text = JSON.stringify(annotations, null, '  ');
  const t = `text/plain;charset=${document.characterSet}`;
  saveAs(
    new Blob([text], { type: t }),
    'landmarks.json',
  );
}

function showLandmarks() {
  const imgIds = Object.keys(annotations);
  imgIds.forEach(id => {
    const pos = annotations[id][getSelectedLandmark()];
    const cnvs = document.getElementById(id);
    cnvs.drawIconImageCoords(pos);
  });
}

function populateControls() {
  function createCanvas(obj) {
    const width = 320;
    const canvas = $('<canvas>').attr('id', obj.name);
    var img = new Image();
    img.onload = function() {
      const cnvs = document.getElementById(obj.name)
      const ctx = cnvs.getContext('2d');
      const height = img.height * width / img.width;
      cnvs.width = width;
      cnvs.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      let isDragging = false;
      function drawIconCanvas(pos) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        if (pos) {
          ctx.drawImage(landmarkIcon, pos.x - 10, pos.y - 10, 20, 20);
        }
      }
      cnvs.drawIconImageCoords = function(pos) {
        if (pos) {
          drawIconCanvas({
            x: pos.x * width / img.width,
            y: pos.y * height / img.height
          });
        } else {
          drawIconCanvas();
        }
      }
      function drawIcon(e) {
        var pos = getMousePos(cnvs, e);
        drawIconCanvas(pos);
        updateLandmarkPosition(obj.name, {
          x: pos.x * img.width / width,
          y: pos.y * img.height / height
        });
      }
      cnvs.addEventListener('mouseup', e => {
        isDragging = false;
        drawIcon(e);
      });
      cnvs.addEventListener('mousedown', e => {
        isDragging = true;
        drawIcon(e);
      })
      cnvs.addEventListener('mousemove', e => {
        if (isDragging) {
          drawIcon(e);
        }
      })
    };
    img.src = obj.uri;
    return canvas;
  }

  function onChangeFileBrowser(values) {
    $("#mainarea").empty();
    annotations = {};
    for (let i = 0; i < values.length; i += 1) {
      annotations[values[i].name] = {};
      $("#mainarea").append(createCanvas(values[i]));
    }
  }

  // Create the UI controls
  UiUtils.addGroup('gFile', 'File', [
    UiUtils.createFileBrowser('fileBrowser', 'load images', true, onChangeFileBrowser),
    UiUtils.createButton('saveFile', 'save landmarks', saveLandmarks)
  ]);
  UiUtils.addGroup('gLandmarks', 'Landmarks', [
    UiUtils.createDropdownList('landmark', landmarkPresets, (obj) => {
      showLandmarks();
    })
  ]);
}

$(document).ready(() => {
  populateControls();
});
