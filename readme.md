# 3D Print GCode Manipulation

**Innovating 3D Printing with Enhanced Interlayer Bonding**

## Introduction
The 3D Print GCode Manipulation Tool introduces a method to boost the structural integrity of 3D printed objects. It enhances interlayer bonding by modifying GCode files for subsequent plastic injection into strategically created voids.

## Overview
This tool elevates the durability of 3D printed objects by intelligently creating voids within each layer's perimeters. These voids, designed for later plastic injection, are placed in areas most likely to experience shear stress. This approach ensures reinforced bonding at critical points, significantly reducing the risk of layer separation.

## Key Features
- **Advanced GCode Analysis**: Interprets GCode files to map each layer's structure.
- **Strategic Void Creation**: Generates voids for subsequent plastic injection, targeting stress-prone areas.
- **Layer-by-Layer Comparison**: Employs hashing algorithms for consistent void placement.
- **Customizable Parameters**: Offers adjustable settings for void size, spacing, and injection parameters.
- **Enhanced Structural Integrity**: Focuses on reinforcing areas susceptible to shear stress, thereby improving the object's overall strength.

## Installation and Setup
_Demo_: Experience the tool in action [here](https://coding-mechanism.github.io/3d-print-gcode-manipulation/)

**or**

1. Clone the repository: `git clone https://github.com/c0rdurb0y/3d-print-gcode-manipulation.git`
2. Navigate to the project directory: `cd 3d-print-gcode-manipulation`
3. Open the `index.html` file in your browser. or for the terminal:
    - **Windows**: `start index.html`
    - **macOS**: `open index.html`
    - **Linux**: `xdg-open index.html`
4. For changing the code, create a new branch, save your changes and manually refresh the page.

## Usage
1. Filter the Gcode file by specifying a string to reduce file load time.
2. Open a Gcode file for post-processing.
3. Select two rows indicating layer changes and match lines in the file.
4. Input values for void size, spacing, and plastic injection parameters.
5. Run the program and specify an output directory for the modified Gcode.

## Contributing
We welcome contributions! Here's how you can help:

- **Reporting Bugs**: Open an issue with a clear description and reproduction steps.
- **Suggesting Enhancements**: Propose new features or improvements through issues.
- **Submitting Code**:
  - Fork the repository.
  - Create a feature branch (`git checkout -b feature/YourFeatureName`).
  - Commit your changes (`git commit -am 'Add some feature'`).
  - Push to the branch (`git push origin feature/YourFeatureName`).
  - Open a Pull Request.

**Contribution Guidelines**:
- Follow the existing code style for consistency.
- Add tests for new features.
- Update documentation as needed.
- Use issue and PR labels for categorization.

**Getting Started**:
- Look for issues tagged with 'good first issue' or 'help wanted'.
- Don't hesitate to ask for help.

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contact
For more information, feedback, or questions, please contact me at andrewizick0@gmail.com.
