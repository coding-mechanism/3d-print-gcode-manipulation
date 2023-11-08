# G-Code Post-Processor

## Overview

This G-code Post-Processor is a tool designed to read, analyze, and manipulate G-code files for 3D printing or CNC machining. It provides a user interface to load G-code files, filter lines based on user input, highlight and select specific lines for pattern matching, and visualize the layer-by-layer construction of a part. https://c0rdurb0y.github.io/3d-print-gcode-manipulation/

## Features

- **G-code File Handling**: Load G-code files and process them into manageable chunks for easier handling and storage in an IndexedDB instance.
- **Layer Analysis**: Break down the G-code into individual layers and extract relevant information for each layer.
- **Pattern Matching**: Identify and highlight specific patterns within the G-code, allowing for comparison and analysis of layer changes.
- **User Interface**: A web-based interface to interact with the G-code, including buttons to load files, refresh the view, and compare patterns.
- **Dynamic Updates**: The interface updates dynamically to reflect changes in the G-code, such as highlighting layer changes or selected lines for pattern matching.

## Classes and Functions

### `Part`
- Constructs a part from the full G-code and an array of layer change indices.
- Builds layers and provides methods to retrieve a single layer or all layers.

### `Layer`
- Represents a single layer within the G-code, including its number, start, and end indices.
- Processes the G-code for the layer to identify and list all polygons.

### `GcodeProcessor`
- Main class handling the processing of G-code, including updating the table with layer changes and managing the selection of lines for pattern matching.

### Utility Functions
- `createDBInstance(dbName)`: Creates a new IndexedDB instance to store G-code lines.
- `openFile(event)`: Opens and reads a G-code file, splitting it into lines and processing them.
- `processSelectedLines(data)`: Processes lines selected by the user for pattern matching.
- `saveToFile()`: Saves the processed G-code back to a file.

## HTML Interface

The HTML file provides a structured layout for the user interface, including:

- Input fields for loading and filtering G-code files.
- Buttons for file operations and pattern matching.
- Text areas for displaying information and the processed G-code.
- Styling to visually distinguish different states of the interface elements.

## Usage

1. Load a G-code file using the file input button.
2. Enter a string to filter the G-code lines.
3. Use the compare button to highlight patterns and layer changes.
4. Select lines to find a pattern for layer changes.
5. Refresh the view to clear selections and highlights.

## Installation

To set up the G-code Post-Processor, clone the repository and open the `index.html` file in a modern web browser.

```bash
git clone https://github.com/c0rdurb0y/3d-print-gcode-manipulation
cd 3d-print-gcode-manipulation
open index.html
```
## Contributing

Contributions to the G-code Post-Processor are welcome. Please fork the repository, make your changes, and submit a pull request.
