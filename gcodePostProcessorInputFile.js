const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB in bytes
export let gcodeArray = [];

export function createDBInstance(dbName) {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, 1);
    request.onerror = function (event) {
      reject("IndexedDB error: " + event.target.errorCode);
    };
    request.onsuccess = function (event) {
      const db = event.target.result;
      resolve(db);
    };
    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      const objectStore = db.createObjectStore("lines", {
        keyPath: "lineNumber",
      });
      objectStore.transaction.oncomplete = function (event) {
        resolve(db);
      };
    };
  });
}

export async function openFile(event) {
  return new Promise((resolve, reject) => {
    const input = event.target;
    const reader = new FileReader();

    reader.onload = async function () {
      const data = reader.result;
      // Split the data into lines
      const lines = data.split("\n");
      gcodeArray = lines;

      const totalSize = data.length;
      const numChunks = Math.ceil(totalSize / CHUNK_SIZE);

      for (let currentChunk = 0; currentChunk < numChunks; currentChunk++) {
        const dbName = `testDb_${currentChunk}`;
        const db = await createDBInstance(dbName);

        const transaction = db.transaction(["lines"], "readwrite");
        const objectStore = transaction.objectStore("lines");

        const currentLine = currentChunk * CHUNK_SIZE;
        const chunkEnd = Math.min(currentLine + CHUNK_SIZE, lines.length);
        for (let i = currentLine; i < chunkEnd; i++) {
          objectStore.add({ lineNumber: i + 1, content: lines[i] });
        }

        db.close();
      }

      //document.getElementById("gcodeTable").value = data;
      let sString = document.getElementById("preFilterInput").value;
      const filteredGcode = preFilterGcode(gcodeArray, sString);
      processSelectedLines(filteredGcode);
      resolve();
    };
    reader.onerror = function () {
      reject(reader.error);
    };

    reader.readAsText(input.files[0]);
  });
}

function preFilterGcode(gcode, sString) {
  const re = new RegExp(sString);
  const filteredGcode = [];
  for (let index = 0; index < gcode.length; index++) {
    if (gcode[index].match(re)) {
      filteredGcode.push({ gcodeArrayIndex: index, gcodeLine: gcode[index] });
    }
  }
  return filteredGcode;
}

/**
 * Searches a string from the end, stopping based on the specified amount of the string to search
 * @param stringToSearch String to search (mainly for a Gcode line)
 * @param characterToMatch Character to find within string
 * @param percentageToSearch Integer representing the percentage of the string to search from the end
 * */
function reverseStringCharacterSearch(
  stringToSearch,
  characterToMatch,
  percentageToSearch = 100
) {
  if (percentageToSearch > 100) {
    percentageToSearch = 100;
  }
  if (percentageToSearch < 0) {
    percentageToSearch = 0;
  }

  let characterCountToStopSearch = Math.floor(
    (stringToSearch.length - 1) * (percentageToSearch / 100)
  );

  for (
    let i = stringToSearch.length - 1;
    i >= stringToSearch.length - 1 - characterCountToStopSearch;
    i--
  ) {
    if (stringToSearch[i] == characterToMatch) {
      return true;
    }
  }
  return false;
}

export function processSelectedLines(data) {
  // Get the table element
  const table = document.getElementById("gcodeTable");

  // Clear the previous table content (optional)
  table.innerHTML = "";

  // Split the input file content into lines
  // Create a new row for each line and add it to the table
  let prevSelection = null;
  data.forEach((line, index) => {
    const row = table.insertRow();
    const cell = row.insertCell();
    cell.innerHTML = line.gcodeLine;
    cell.value = line.gcodeArrayIndex;

    // Add a click event listener to the row to handle the click
    row.addEventListener("click", (event) => {
      // Here you can perform any action you want when a row is clicked

      // Function to handle the click event on individual lines
      if (event.target.tagName === "TD") {
        const selectedCell = event.target;
        const selectedCollection =
          document.getElementsByClassName("selected-line");
        const selectedCount = selectedCollection.length;
        let breakFunction = false;
        let isAlreadySelected = false;

        if (
          selectedCell.classList.length == 1 &&
          selectedCell.classList[0] != "selected-line"
        ) {
          breakFunction = true;
        }

        if (selectedCell.classList.length == 2) {
          breakFunction = true;
        }

        for (const selected of selectedCollection) {
          if (selected.value === selectedCell.value) {
            isAlreadySelected = true;
            break;
          }
        }

        if (!isAlreadySelected && selectedCount == 2 && prevSelection) {
          if (
            !breakFunction &&
            selectedCollection[0].value != prevSelection.value
          ) {
            prevSelection = selectedCell;
            selectedCollection[0].classList.remove("selected-line");
            selectedCell.classList.add("selected-line");
            breakFunction = true;
          }
          if (
            !breakFunction &&
            selectedCollection[1].value != prevSelection.value
          ) {
            prevSelection = selectedCell;
            selectedCollection[1].classList.remove("selected-line");
            selectedCell.classList.add("selected-line");
            breakFunction = true;
          }
        }

        if (!breakFunction && isAlreadySelected && selectedCount == 2) {
          if (
            !breakFunction &&
            selectedCollection[0].value == selectedCell.value
          ) {
            prevSelection = selectedCollection[1];
            selectedCell.classList.remove("selected-line");
            breakFunction = true;
          }

          if (
            !breakFunction &&
            selectedCollection[1].value == selectedCell.value
          ) {
            prevSelection = selectedCollection[0];
            selectedCell.classList.remove("selected-line");
            breakFunction = true;
          }
        }

        if (!breakFunction && isAlreadySelected && selectedCount == 1) {
          selectedCell.classList.remove("selected-line");
          prevSelection = null;
          breakFunction = true;
        }

        if (!breakFunction && !isAlreadySelected && selectedCount <= 1) {
          selectedCell.classList.add("selected-line");
          prevSelection = selectedCell;
          breakFunction = true;
        }
      }
    });
  });
}

export function getGcodeArray() {
  return gcodeArray;
}

export async function saveToFile() {
  const lines = document.getElementById("textArea").value;
  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });

  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = "output.txt";

  // Simulate a click event to trigger the download
  downloadLink.click();
}
