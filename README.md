# fanuctpp README

This extension is for Fanuc proprietary Teach Pendant Programming. It contains a defined syntax and custom theme, as well as multiple coding efficiency, autofill features, commands, and interactive webviews.

## Features

- **Automatic Line Renumbering**: Automatically renumbers in-text lines in .ls files when changes are made.
- **Automatic Semicolon Placement**: Automatically ends in-text lines in .ls files with a semicolon.
- **Label Webview Command**: View all the Labels and Jump Labels in your code and move to the line number.
- **Ctrl+Click to Open Filename**: Automatically open a file through text by clicking on it while holding ctrl.

- **Themed LS Files**: Custom theme for .LS files
- **Themed KL Files**: Custom theme for .KL files
- **Themed DT Files**: Custom theme for .DT files
- **Themed CF Files**: Custom theme for .CF files

## Requirements

VS Code 1.95.0

## Usage

- **Fanuc Theme**: Set using the Color Theme option in VS Code.
- **Automatic Line Renumbering**: This feature is enabled by default.
    CAN BE DISABLED with user setting "autoLineRenumber": false
- **Automatic Semicolon Placement**: Attached to Line Renumbering.
- **Label Webview Command**: Use the command `fanuctpp.openLabelView` to open the label webview. Ctrl+Shift+P
- **Ctrl+Click to Open Filename**: Ctrl+click on a program name in `CALL/RUN 'programName'` to open the corresponding file if it exists in the same directory.

## Installation

1. Install the extension from the VS Code Marketplace.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

[MIT](https://github.com/NateyJayBee/fanuctpp/blob/master/LICENSE.md)

## Known Issues

To see current issues and to report issues, please visit our [GitHub Issues Page](https://github.com/NateyJayBee/fanuctpp/issues).

## Release Notes

Fanuctpp release 0.0.3
- Repurposed existing syntax for (.DT) and (.CF) files

Fanuctpp release 0.0.2
- Created themed syntax for (.KL) files
- Minor bugfixes

Fanuctpp release 0.0.1
- Created label webview and command to open it
- Created ctrl+click definition to open filename if it's in the same directory as current file

Fanuctpp pre-release 0.0.1
- Created extension with themed syntax for (.LS) files
- Created first version of event handling for document changes

**Enjoy!**
