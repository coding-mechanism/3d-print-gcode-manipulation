import {
  createDBInstance,
  openFile,
  getGcodeArray,
  saveToFile,
  processSelectedLines,
} from "./gcodePostProcessorInputFile.js";

class Part {
  constructor(fullPartGcode, layerChangeIndicesArray) {
    this.layerChangeIndicesArray = layerChangeIndicesArray;
    this.fullPartGcode = fullPartGcode;
    this.layers = [];
    this.layerBuilder();
  }

  layerBuilder() {
    const newLayer = new Layer(
      this.fullPartGcode,
      0,
      0,
      this.layerChangeIndicesArray[0].gcodeLayerChangeFileIndex
    );
    this.layers.push(newLayer);
    for (let i = 1; i < this.layerChangeIndicesArray.length; i++) {
      const newLayer = new Layer(
        this.fullPartGcode,
        i,
        this.layerChangeIndicesArray[i - 1].gcodeLayerChangeFileIndex,
        this.layerChangeIndicesArray[i].gcodeLayerChangeFileIndex
      );
      this.layers.push(newLayer);
    }
  }

  getLayer(index) {
    return this.layers[index];
  }

  getAllLayers() {
    return this.layers;
  }
}

class Layer {
  constructor(fullPartGcode, layerNumber, layerStart, layerEnd) {
    this.fullPartGcode = fullPartGcode;
    this.layerNumber = layerNumber;
    this.layerStart = layerStart;
    this.layerEnd = layerEnd;
    this.layerGcode = this.getLayerGcode();
    this.listOfAllPolygonsInLayer = [];
    this.processLayerGcode(this.layerGcode);
  }

  getLayerGcode() {
    return this.fullPartGcode.slice(this.layerStart, this.layerEnd + 1);
  }

  processLayerGcode(layer) {
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
        line.match(
          /^G1 F[0-9]+ X[0-9]+\.[0-9]+ Y[0-9]+\.[0-9]+ E[0-9]+\.[0-9]+$/
        )
      ) {
        firstG1ExtrusionMove = index;
        currentG1_X = matchStringInStringList(
          splitGcodeLine,
          "^X[0-9]+\\.[0-9]+$"
        );
        currentG1_Y = matchStringInStringList(
          splitGcodeLine,
          "^Y[0-9]+\\.[0-9]+$"
        );
        polygonCoordinatePoints.push([
          parseFloat(currentG1_X),
          parseFloat(currentG1_Y),
        ]);
      }

      if (splitGcodeLine.length === 4 && splitGcodeLine[0] === "G1") {
        lastExtrusionMoveIndex = index;
        currentG1_X = matchStringInStringList(
          splitGcodeLine,
          "^X[0-9]+\\.[0-9]+$"
        );
        currentG1_Y = matchStringInStringList(
          splitGcodeLine,
          "^Y[0-9]+\\.[0-9]+$"
        );
        polygonCoordinatePoints.push([
          parseFloat(currentG1_X),
          parseFloat(currentG1_Y),
        ]);
      }

      if (splitGcodeLine[0] === "G0") {
        polygonCoordinatePoints = [];
        currentG0_X = matchStringInStringList(
          splitGcodeLine,
          "^X[0-9]+\\.[0-9]+$"
        );
        currentG0_Y = matchStringInStringList(
          splitGcodeLine,
          "^Y[0-9]+\\.[0-9]+$"
        );
        polygonCoordinatePoints.push([
          parseFloat(currentG1_X),
          parseFloat(currentG1_Y),
        ]);
      }

      if (
        currentG0_X === currentG1_X &&
        currentG0_Y === currentG1_Y &&
        currentG0_X !== -1 &&
        currentG0_Y !== -1
      ) {
        this.listOfAllPolygonsInLayer.push(
          new Polygon(polygonCoordinatePoints)
        );
      }
    }
  }
}

class Polygon {
  constructor(pointList) {
    this.points = this.createPoints(pointList);
    this.area = this.findAreaOfPolygon(this.points);
  }

  findAreaOfPolygon(polygon) {
    //Gauss' shoelace formula
    let polygonArea = 0;
    for (let index = 0; index < polygon.length; index++) {
      // Break if it's the last vertex
      if (index === polygon.length - 1) {
        break;
      }
      const currentX = polygon[index].x;
      const currentY = polygon[index].y;
      const nextX = polygon[index + 1].x;
      const nextY = polygon[index + 1].y;
      polygonArea += currentX * nextY - currentY * nextX;
    }
    return Math.abs(polygonArea / 2);
  }

  createPoints(pointList) {
    return pointList.map(([x, y]) => new Point(x, y));
  }

  isPointInsidePolygon(point) {
    let minX = this.points[0].x;
    let maxX = this.points[0].x;
    let minY = this.points[0].y;
    let maxY = this.points[0].y;

    this.points.forEach((p) => {
      minX = Math.min(p.x, minX);
      maxX = Math.max(p.x, maxX);
      minY = Math.min(p.y, minY);
      maxY = Math.max(p.y, maxY);
    });

    let numberOfIntersections = 0;
    for (let i = 0; i < this.points.length; i++) {
      let nextIndex = (i + 1) % this.points.length;
      let lineSegment = [this.points[i], this.points[nextIndex]];
      if (lineSegment[0].x > point.x || lineSegment[1].x > point.x) {
        if (
          this.doLinesIntersect(lineSegment, [
            point,
            new Point(maxX + 1, point.y),
          ])
        ) {
          numberOfIntersections++;
        }
      }
    }
    return numberOfIntersections % 2 !== 0;
  }

  doLinesIntersect(line1, line2) {
    const orientation = (p, q, r) => {
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (val === 0) return 0; // collinear
      return val > 0 ? 1 : 2; // clock or counterclock wise
    };

    const onSegment = (p, q, r) => {
      return (
        q.x <= Math.max(p.x, r.x) &&
        q.x >= Math.min(p.x, r.x) &&
        q.y <= Math.max(p.y, r.y) &&
        q.y >= Math.min(p.y, r.y)
      );
    };

    const p1 = line1[0];
    const q1 = line1[1];
    const p2 = line2[0];
    const q2 = line2[1];

    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;

    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
  }

  checkIfPolygonIsInPolygon(otherPolygon) {
    return this.points.every((point) =>
      otherPolygon.isPointInsidePolygon(point)
    );
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function matchStringInStringList(list, subString) {
  let returnIndex = -1;
  for (let count = 0; count < list.length; count++) {
    const element = list[count];
    const subStringFound = new RegExp(subString).test(element);
    if (subStringFound) {
      return element.slice(1);
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

class GcodeProcessor {
  constructor() {
    this.fullPartGcode = [];
    this.newGcodeTableArray = [];
  }

  updateGcodeTableWithLayerChanges() {
    let currentGcodeTableInnerText = this.getCurrentGcodeTable();
    let layerChangePattern = this.getSelectedLinesPattern();
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
              numberOfMatches++;
              break;
            }
          }
        }
        layerChangeTableIndex++;
      }
      this.newGcodeTableArray = newGcodeTableArray;
      const part = new Part(this.fullPartGcode, this.newGcodeTableArray);

      sendInfoToTextArea(
        `Matching complete, total lines matched: ${numberOfMatches}`,
        document.getElementById("infoTextArea")
      );
    }
  }

  getLayerChanges() {
    return this.newGcodeTableArray;
  }

  getCurrentGcodeTable() {
    gcodeTable = document.getElementById("gcodeTable");
    return Array.from(gcodeTable.rows).map((line) => {
      return line.innerText;
    });
  }

  changeTablesRowsToDefault() {
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

  getSelectedLinesPattern() {
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
    this.fullPartGcode = getGcodeArray();
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
}

const gcodeProcessor = new GcodeProcessor();

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("compareButton").addEventListener("click", () => {
    gcodeProcessor.updateGcodeTableWithLayerChanges();
  });
  document
    .getElementById("refreshButton")
    .addEventListener("click", () =>
      gcodeProcessor.changeTablesRowsToDefault()
    );
  document
    .getElementById("preFilterInput")
    .addEventListener("input", handlePreFilterInput);

  document.getElementById("infoTextArea").value =
    "Pre-filter string must be specified" + "\n";
});
window.startProcessing = startProcessing;
