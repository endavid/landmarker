import $ from './jquery.module.js';
import UiUtils from './uiutils.js';

// Unfortunately, I wasn't able to import saveAs as a module
const { saveAs } = window;

const landmarkPresets = [
  { value: 'Nose', name: 'nose' },
  { value: 'Neck', name: 'neck' },
  { value: 'RShoulder', name: 'right shoulder' },
  { value: 'RElbow', name: 'right elbow' },
  { value: 'RWrist', name: 'right wrist' },
  { value: 'LShoulder', name: 'left shoulder' },
  { value: 'LElbow', name: 'left elbow' },
  { value: 'LWrist', name: 'left wrist' },
  { value: 'RHip', name: 'right hip' },
  { value: 'RKnee', name: 'right knee' },
  { value: 'RAnkle', name: 'right ankle' },
  { value: 'LHip', name: 'left hip' },
  { value: 'LKnee', name: 'left knee' },
  { value: 'LAnkle', name: 'left ankle' },
];

/*
  E.g.
  "August2000-01.jp2": {
    "Nose": {
      "x": 848.00625,
      "y": 561.35625
    }
  },
  "August2000-02.jp2": {
    "Nose": {
      "x": 521.40625,
      "y": 1094.21875
    }
  },
*/
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

function getFileNameWithoutExtension(file) {
  const iSlash = file.lastIndexOf('/') + 1;
  const iDot = file.lastIndexOf('.');
  return file.substr(iSlash, iDot - iSlash);
}

// https://stackoverflow.com/a/17130415/1765629
function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

function getSelectedLandmark() {
  return $('#landmark').val();
}

function updateLandmarkPosition(imageId, position) {
  const landmark = getSelectedLandmark();
  annotations[imageId][landmark] = { x: position.x, y: position.y };
}

function saveJson(filename, json) {
  const text = JSON.stringify(json, null, '  ');
  const t = `text/plain;charset=${document.characterSet}`;
  saveAs(new Blob([text], { type: t }), filename);
}

function saveLandmarksPlain() {
  const filename = 'landmarks.json';
  saveJson(filename, annotations);
  setInfo(`File saved: ${filename}`);
}

function saveLandmarksKeypoints() {
  const json = {
    version: '1.0',
    people: [
      {
        face_keypoints: [],
        pose_keypoints: [],
        hand_right_keypoints: [],
        hand_left_keypoints: [],
      },
    ],
  };
  // we trust humans to be 90% accurate
  const confidence = 0.9;
  const imgIds = Object.keys(annotations);
  const files = [];
  imgIds.forEach((id) => {
    const coords = [];
    landmarkPresets.forEach((preset) => {
      const key = preset.value;
      const lnd = annotations[id][key];
      coords.push(lnd.x);
      coords.push(lnd.y);
      coords.push(confidence);
    });
    json.people[0].pose_keypoints = coords;
    const imgName = getFileNameWithoutExtension(id);
    const filename = `${imgName}.json`;
    saveJson(filename, json);
    files.push(filename);
  });
  setInfo(`Files saved: ${files.join(' ')}`);
}

function saveLandmarks(e) {
  const type = $(`#${e.target.id}_select`).val();
  if (type === '.json') {
    saveLandmarksPlain();
  } else if (type === 'keypoints.json') {
    saveLandmarksKeypoints();
  } else {
    setError('Unknown format');
  }
}

function showLandmarks() {
  const imgIds = Object.keys(annotations);
  imgIds.forEach((id) => {
    const pos = annotations[id][getSelectedLandmark()];
    const cnvs = document.getElementById(id);
    cnvs.drawIconImageCoords(pos);
  });
}

function populateControls() {
  function createCanvas(obj) {
    const width = 320;
    const canvas = $('<canvas>').attr('id', obj.name);
    const img = new Image();
    img.onload = () => {
      const cnvs = document.getElementById(obj.name);
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
      cnvs.drawIconImageCoords = (pos) => {
        if (pos) {
          drawIconCanvas({
            x: pos.x * width / img.width,
            y: pos.y * height / img.height,
          });
        } else {
          drawIconCanvas();
        }
      };
      function drawIcon(e) {
        const pos = getMousePos(cnvs, e);
        drawIconCanvas(pos);
        updateLandmarkPosition(obj.name, {
          x: pos.x * img.width / width,
          y: pos.y * img.height / height,
        });
      }
      cnvs.addEventListener('mouseup', (e) => {
        isDragging = false;
        drawIcon(e);
      });
      cnvs.addEventListener('mousedown', (e) => {
        isDragging = true;
        drawIcon(e);
      });
      cnvs.addEventListener('mousemove', (e) => {
        if (isDragging) {
          drawIcon(e);
        }
      });
    };
    img.src = obj.uri;
    return canvas;
  }

  function onChangeFileBrowser(values) {
    $('#mainarea').empty();
    annotations = {};
    for (let i = 0; i < values.length; i += 1) {
      annotations[values[i].name] = {};
      $('#mainarea').append(createCanvas(values[i]));
    }
  }

  // Create the UI controls
  UiUtils.addGroup('gFile', 'File', [
    UiUtils.createFileBrowser('fileBrowser', 'load images', true, onChangeFileBrowser),
    UiUtils.createButtonWithOptions('saveFile', 'save landmarks', 'as',
      [
        { name: 'Json', value: '.json' },
        { name: 'Keypoints', value: 'keypoints.json' },
      ],
      saveLandmarks),
  ]);
  UiUtils.addGroup('gLandmarks', 'Landmarks', [
    UiUtils.createDropdownList('landmark', landmarkPresets, showLandmarks),
  ]);
}

$(document).ready(() => {
  populateControls();
});
