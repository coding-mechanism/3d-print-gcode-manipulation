import {
  createDBInstance,
  openFile,
  getGcodeArray,
  saveToFile,
  processSelectedLines,
  gcodeArray,
} from "./gcodePostProcessorInputFile.js";

class Layer {
  constructor(
    fullLayerGcode,
    allIndicesOfPolygonsInLayer,
    listOfAllPolygonsInLayer,
    allPolygonObjectsInLayer,
    sortedPolygonObjectListByDescendingArea
  ) {
    this.fullLayerGcode = fullLayerGcode;
    this.allIndicesOfPolygonsInLayer = [];
    //        this.listOfAllPolygonsInLayer = this.findPolygonsInLayer(fullLayerGcode);
    //        this.listOfAllPolygonsInLayer = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[11, 0], [16, 0], [16, 5], [11, 5], [11, 0]], [[12, 1], [13, 1], [13, 2], [12, 2], [12, 1]]];

    //        this.allPolygonObjectsInLayer = this.createListOfPolygonObjectsInLayer();
    //        this.sortedPolygonObjectListByDescendingArea = this.sortPolygonObjectListByDescendingArea(self.allPolygonObjectsInLayer);
    //        print(this.sortedPolygonObjectListByDescendingArea);
  }

  //return this.listOfAllPolygonsInLayer;
}

function processGcode(layer) {
  let listOfAllPolygonsInLayer = [];
  let polygonCoordinatePoints = [];
  let currentG0_X = -1;
  let currentG0_Y = -1;
  let currentG1_X = -1;
  let currentG1_Y = -1;
  let firstG1ExtrusionMove = -1;
  let lastExtrusionMoveIndex = -1;

  for (let index = 0; index < layer.length; index++) {
    const line = layer[index];
    const splitGcodeLine = line.split(" ");

    if (
      splitGcodeLine.length === 5 &&
      line.match(/^G1 F[0-9]+ X[0-9]+\.[0-9]+ Y[0-9]+\.[0-9]+ E[0-9]+\.[0-9]+$/)
    ) {
      firstG1ExtrusionMove = index;
      currentG1_X = findSubstringInStringList(
        splitGcodeLine,
        "^X[0-9]+\\.[0-9]+$"
      );
      currentG1_Y = findSubstringInStringList(
        splitGcodeLine,
        "^Y[0-9]+\\.[0-9]+$"
      );
      polygonCoordinatePoints.push([
        parseFloat(currentG1_X[1]),
        parseFloat(currentG1_Y[1]),
      ]);
    }

    if (splitGcodeLine.length === 4 && splitGcodeLine[0] === "G1") {
      lastExtrusionMoveIndex = index;
      currentG1_X = findSubstringInStringList(
        splitGcodeLine,
        "^X[0-9]+\\.[0-9]+$"
      );
      currentG1_Y = findSubstringInStringList(
        splitGcodeLine,
        "^Y[0-9]+\\.[0-9]+$"
      );
      polygonCoordinatePoints.push([
        parseFloat(currentG1_X[1]),
        parseFloat(currentG1_Y[1]),
      ]);
    }

    if (splitGcodeLine[0] === "G0") {
      polygonCoordinatePoints = [];
      currentG0_X = findSubstringInStringList(
        splitGcodeLine,
        "^X[0-9]+\\.[0-9]+$"
      );
      currentG0_Y = findSubstringInStringList(
        splitGcodeLine,
        "^Y[0-9]+\\.[0-9]+$"
      );
      polygonCoordinatePoints.push([
        parseFloat(currentG0_X[1]),
        parseFloat(currentG0_Y[1]),
      ]);
    }

    if (
      currentG0_X === currentG1_X &&
      currentG0_Y === currentG1_Y &&
      currentG0_X !== -1 &&
      currentG0_Y !== -1
    ) {
      listOfAllPolygonsInLayer.push(polygonCoordinatePoints);
    }
  }
}

function findSubstringInStringList(list, subString) {
  let returnIndex = -1;
  for (let count = 0; count < list.length; count++) {
    const element = list[count];
    const subStringFound = new RegExp(subString).test(element);
    if (subStringFound) {
      return count;
    }
  }
  return returnIndex;
}

async function startProcessing(event) {
  createDBInstance("gcode");
  loadingDotsContainer = document.getElementById("loadingDotsContainer");
  if (event.target.files[0]) {
    loadingDotsContainer.classList.remove("fade-out");
    loadingDotsContainer.style.display = "flex";
  }

  try {
    await openFile(event);
    loadingDotsContainer.classList.add("fade-out");
    sendInfoToTextArea("File loaded", document.getElementById("infoTextArea"));

    const layerChangeIndicesArray = [];

    const currentLayer = gcodeArray.slice(
      layerChangeIndicesArray[0],
      layerChangeIndicesArray[1]
    );
    const newLayer = new Layer(currentLayer);
  } catch (error) {
    console.error("Error reading the file:", error);
  }
}

function handlePreFilterInput(event) {
  let openFileButton = document.getElementById("openFileButtonId");
  let refreshButton = document.getElementById("refreshButton");
  let compareButton = document.getElementById("compareButton");
  let infoInput = document.getElementById("infoTextArea");

  if (event.target.value) {
    openFileButton.removeAttribute("disabled");
    refreshButton.removeAttribute("disabled");
    compareButton.removeAttribute("disabled");
    sendInfoToTextArea("Open a Gcode file", infoInput);
  } else {
    openFileButton.setAttribute("disabled", "true");
    refreshButton.setAttribute("disabled", "true");
    compareButton.setAttribute("disabled", "true");
    sendInfoToTextArea("Pre-filter string must be specified", infoInput);
  }
}

function getInputValue(elementId) {
  return getElementById(`"${elementId}"`).value;
}

function getCurrentGcodeTable() {
  gcodeTable = document.getElementById("gcodeTable");
  return Array.from(gcodeTable.rows).map((line) => {
    return line.innerText;
  });
}

/**
 * @param info String to send to HTML element
 * @param element Target element to send string to
 * @param newLine Creates a new line at the end of the string (true by default)
 * @param scrollToBottom Flag to auto vertical scroll to bottom of element (true by default)
 */
function sendInfoToTextArea(
  info,
  element,
  newLine = true,
  scrollToBottom = true
) {
  let CR = "\n";
  if (newLine != true) {
    CR = "";
  }
  element.value += info.toString() + CR;
  if (scrollToBottom) {
    element.scrollTop = element.scrollHeight;
  }
}

function changeTablesRowsToDefault() {
  let infoInput = document.getElementById("infoTextArea");
  let selectedCollection = document.getElementsByClassName("selected-line");
  if (getGcodeArray().length == 0) {
    sendInfoToTextArea("Open a Gcode file", infoInput);
    return "";
  }

  if (selectedCollection.length) {
    sendInfoToTextArea("Deselecting lines", infoInput);
    let layerChangeRows = document.getElementsByTagName("TD");
    for (const layerChangeRow of layerChangeRows) {
      layerChangeRow.classList = "";
    }
  } else {
    sendInfoToTextArea("No lines to deselect", infoInput);
  }
}

function getLayerChangeIndices(){
  return layerChangeIndices;
}

function updateGcodeTableWithLayerChanges() {
  let currentGcodeTableInnerText = getCurrentGcodeTable();
  let layerChangePattern = getSelectedLinesPattern();
  let updatedGcodeTable = document.getElementById("gcodeTable");
  let newGcodeTableArray = [];
  let numberOfMatches = 0;
  if (layerChangePattern) {
    sendInfoToTextArea(
      `Matching Gcode Lines to pattern: ${layerChangePattern}`,
      document.getElementById("infoTextArea")
    );
    let layerChangeTableIndex = 0;
    for (const line of currentGcodeTableInnerText) {
      let j = 0;
      for (let i = 0; i < line.length; i++) {
        if (/[A-Za-z]/.test(line[i])) {
          if (line[i] == layerChangePattern[j]) {
            j++;
          } else {
            updatedGcodeTable.children[0].children[
              layerChangeTableIndex
            ].children[0].classList.add("layer-change-highlight-no-go");
            break;
          }
          if (j == layerChangePattern.length) {
            newGcodeTableArray.push({
              gcodeLayerChangeFileIndex:
                updatedGcodeTable.children[0].children[layerChangeTableIndex]
                  .children[0].value,
              innerText: currentGcodeTableInnerText[layerChangeTableIndex],
            });
            updatedGcodeTable.children[0].children[
              layerChangeTableIndex
            ].children[0].classList.add("layer-change-highlight-go");
            console.log(line);
            numberOfMatches++;
            break;
          }
        }
      }
      layerChangeTableIndex++;
    }
    console.log(newGcodeTableArray);
    sendInfoToTextArea(
      `Matching complete, total lines matched: ${numberOfMatches}`,
      document.getElementById("infoTextArea")
    );
  }
}

function getSelectedLinesPattern() {
  let selectedLinesCollection =
    document.getElementsByClassName("selected-line");
  let firstSelectedGcodeLine = "";
  let secondSelectedGcodeLine = "";
  let infoInput = document.getElementById("infoTextArea");

  if (getGcodeArray().length == 0) {
    sendInfoToTextArea("Open a Gcode file", infoInput);
    return "";
  }

  if (selectedLinesCollection.length != 2 && getGcodeArray().length > 0) {
    sendInfoToTextArea("Two lines must be selected", infoInput);
    return "";
  }

  sendInfoToTextArea("Finding pattern between selected lines", infoInput);

  firstSelectedGcodeLine = selectedLinesCollection[0].innerText;
  secondSelectedGcodeLine = selectedLinesCollection[1].innerText;

  let linesAreIterating = true;
  let charIndex = 0;
  let firstLineTotalPreviousChars = 0;
  let secondLineTotalPreviousChars = 0;
  let firstLinePreviousChar = "";
  let secondLinePreviousChar = "";
  let firstLinePreviousChars = "";
  let secondLinePreviousChars = "";
  let firstLineIterated = false;
  let secondLineIterated = false;
  let charLine1 = "";
  let charLine2 = "";

  while (linesAreIterating) {
    charLine1 = firstSelectedGcodeLine[charIndex];
    charLine2 = secondSelectedGcodeLine[charIndex];

    if (
      !firstLineIterated &&
      charIndex < firstSelectedGcodeLine.length &&
      /[A-Za-z]/.test(firstSelectedGcodeLine[charIndex])
    ) {
      firstLineTotalPreviousChars++;
      firstLinePreviousChar = charLine1;
      firstLinePreviousChars += firstLinePreviousChar;
    }

    if (
      !secondLineIterated &&
      charIndex < secondSelectedGcodeLine.length &&
      /[A-Za-z]/.test(secondSelectedGcodeLine[charIndex])
    ) {
      secondLineTotalPreviousChars++;
      secondLinePreviousChar = charLine2;
      secondLinePreviousChars += secondLinePreviousChar;
    }

    if (charIndex >= firstSelectedGcodeLine.length) {
      firstLineIterated = true;
    }

    if (charIndex >= secondSelectedGcodeLine.length) {
      secondLineIterated = true;
    }

    if (
      firstLineTotalPreviousChars === secondLineTotalPreviousChars &&
      firstLinePreviousChar != secondLinePreviousChar
    ) {
      linesAreIterating = false;
    }

    if (
      firstLineIterated &&
      secondLineIterated &&
      firstLineTotalPreviousChars == secondLineTotalPreviousChars &&
      firstLinePreviousChar === secondLinePreviousChar
    ) {
      linesAreIterating = false;
    }

    charIndex++;
  }
  if (firstLinePreviousChars) {
    sendInfoToTextArea(
      `Found pattern based on first selected line: ${firstLinePreviousChars}`,
      infoInput
    );
  }

  return firstLinePreviousChars;
}


// Add a click event listener to the button to handle the button click

window.startProcessing = startProcessing;
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("compareButton")
    .addEventListener("click", updateGcodeTableWithLayerChanges);
  document
    .getElementById("refreshButton")
    .addEventListener("click", changeTablesRowsToDefault);
  document
    .getElementById("preFilterInput")
    .addEventListener("input", handlePreFilterInput);

  document.getElementById("infoTextArea").value =
    "Pre-filter string must be specified" + "\n";
});
