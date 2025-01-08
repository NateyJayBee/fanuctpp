# fanuctpp README

This extension is for Fanuc proprietary Teach Pendant Programming. It contains a defined syntax and custom theme, as well as multiple coding efficiency, autofill features, commands, and interactive webviews.

## Features

- **Themed LS Files**: Custom theme for .ls files
- **Automatic Line Renumbering**: Automatically renumbers in-text lines in .ls files when changes are made.
- **Automatic Semicolon Placement**: Automatically ends in-text lines in .ls files with a semicolon.
- **Label Webview Command**: View all the Labels and Jump Labels in your code and move to the line number.
- **Ctrl+Click to Open Filename**: Automatically open a file through text by clicking on it while holding ctrl.

## Requirements

VS Code 1.95.0

## Usage

- **Automatic Line Renumbering**: This feature is enabled by default.
    CAN BE DISABLED with user setting "autoLineRenumber": false
- **Automatic Semicolon Placement**: Attached to Line Renumbering.
- **Label Webview Command**: Use the command `extension.openLabelView` to open the label webview. Ctrl+Shift+P
- **Ctrl+Click to Open Filename**: Ctrl+click on a program name in `CALL 'programName'` to open the corresponding file if it exists in the same directory.

## Installation

1. Install the extension from the VS Code Marketplace.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

[MIT](https://github.com/NateyJayBee/fanuctpp/blob/master/LICENSE.md)

## Known Issues

Some numbers may not be colored with this theme

## Release Notes

Fanuctpp release 0.0.1

Release:
    Created label webview and command to open it
    Created ctrl+click definition to open filename if it's in the same directory as current file

Fanuctpp pre-release 0.0.1

Pre Release:
    Created extension with themed syntax for (.ls) files
    Created first version of event handling for document changes

**Enjoy!**
